'use client'
import '@ungap/with-resolvers'
import { useState, useEffect, useMemo } from 'react'
import { pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import LatexError from './latex-error'
import { Label } from '@/components/ui/label'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Download } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useFrontend } from '@/contexts/FrontendContext'
import { fetchPdf } from '@/lib/utils/pdf-utils'
import { Loader2 } from 'lucide-react'
import LatexLoading from './latex-loading'
import LatexCanvas from './latex-canvas'
import { updateProject } from '@/hooks/data'
import { checkPaymentStatus, createCheckoutSession } from '@/lib/utils/payment-utils'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

function LatexRenderer() {
  const { user } = useFrontend();
  const { project: data, isLoading: isDataLoading, projectId, currentlyOpen, files } = useProject();
  const scale = data?.projectScale ?? 0.9;
  const autoFetch = data?.isAutoFetching ?? false;
  const latex = currentlyOpen?.content

  const [numPages, setNumPages] = useState<number>(0)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDocumentReady, setIsDocumentReady] = useState(false)
  const [isPaid, setIsPaid] = useState<boolean | null>(null)
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)

  useEffect(() => {
    if (!isDataLoading && data?.cachedPdfUrl) {
      setPdfUrl(data.cachedPdfUrl)
    }
  }, [isDataLoading, data])

  const handlePdf = async () => {
    if (isDataLoading || !user) return
    setIsLoading(true)
    setError(null)
    setIsDocumentReady(false)
    try {
      console.log("Files being sent to fetchPdf:", JSON.stringify(files, null, 2));
      const blob = await fetchPdf(files);
      // const pathname = createPathname(user.id, projectId)
      // await savePdfToStorage(blob, pathname + 'main.pdf', projectId)
      // await savePreviewToStorage(blob, pathname + 'preview.webp', projectId)
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (error) {
      console.error('Error fetching PDF:', error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (autoFetch && latex && latex.trim() !== '') {
          handlePdf()
        }
      }, 1000)
    }

    resetTimer()

    return () => clearTimeout(debounceTimer)
  }, [latex, autoFetch, isDataLoading, user])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsDocumentReady(true)
  }

  // Options for PDF.js rendering
  // cMapUrl: URL for character map (cMap) files
  // cMapPacked: Use packed character maps for better performance
  const options = useMemo(
    () => ({
      cMapUrl: 'cmaps/',
      cMapPacked: true,
    }),
    []
  )

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.1, 2.0)
    updateProject(projectId, { projectScale: newScale })
  }

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.1, 0.5)
    updateProject(projectId, { projectScale: newScale })
  }

  const handleResetZoom = () => {
    updateProject(projectId, { projectScale: 0.9 })
  }

  // Check payment status on component mount and when window regains focus
  useEffect(() => {
    const checkPayment = async () => {
      if (projectId) {
        setIsCheckingPayment(true);
        const paymentStatus = await checkPaymentStatus(projectId);
        setIsPaid(paymentStatus);
        setIsCheckingPayment(false);
      }
    };
    
    checkPayment();
    
    // Listen for window focus to refresh payment status when user returns from payment
    const handleFocus = () => {
      checkPayment();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [projectId]);

  const handleDownload = async () => {
    if (!pdfUrl) return;

    setIsCheckingPayment(true);
    
    try {
      // Check current payment status
      const currentPaymentStatus = await checkPaymentStatus(projectId);
      setIsPaid(currentPaymentStatus);

      if (currentPaymentStatus) {
        // Project is paid, proceed with download
        fetch(pdfUrl)
          .then(response => response.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data?.title || 'document'}.pdf`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          })
          .catch(error => console.error('Error downloading PDF:', error));
      } else {
        // Project not paid, redirect to checkout
        const checkoutUrl = await createCheckoutSession(projectId, data?.title || 'Resume');
        
        if (checkoutUrl) {
          window.open(checkoutUrl, '_blank');
        } else {
          alert('Failed to create payment session. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error processing download:', error);
      alert('Error processing request. Please try again.');
    } finally {
      setIsCheckingPayment(false);
    }
  }

  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        <LatexLoading />
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center border-b shadow-sm p-2 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handlePdf} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Compile PDF'
            )}
          </Button>
          <Switch checked={autoFetch} onCheckedChange={(checked) => updateProject(projectId, { isAutoFetching: checked })} />
          <Label htmlFor="auto-fetch">Auto Compile</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetZoom}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant={isPaid ? "destructive" : "default"} 
            className="flex items-center gap-2" 
            onClick={handleDownload}
            disabled={isCheckingPayment}
          >
            <Download className="h-4 w-4" />
            {isCheckingPayment ? 'Checking...' : isPaid ? 'Export PDF' : 'Export PDF'}
          </Button>
        </div>
      </div>
      {isLoading ? (
        <LatexLoading />
      ) : error ? (
        <div className="flex justify-center items-start w-full h-full">
          <LatexError error={error} />
        </div>
      ) : pdfUrl ? (
        <LatexCanvas
          pdfUrl={pdfUrl}
          onDocumentLoadSuccess={onDocumentLoadSuccess}
          options={options}
          isDocumentReady={isDocumentReady}
          numPages={numPages}
          scale={scale}
        />
      ) : (
        null
      )}
    </div>
  )
}

export default LatexRenderer