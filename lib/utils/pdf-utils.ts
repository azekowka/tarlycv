'use client'
import '@ungap/with-resolvers';
import { PDFDocumentProxy } from 'pdfjs-dist'
import { RAILWAY_ENDPOINT_URL } from '@/lib/constants'  

export async function createPreview(
  pdfDocument: PDFDocumentProxy,
  pathname: string
): Promise<{ previewFile: File; previewPathname: string }> {
  const page = await pdfDocument.getPage(1)
  const viewport = page.getViewport({ scale: 1.0 })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.height = viewport.height
  canvas.width = viewport.width

  if (!context) {
    throw new Error('Failed to get canvas context')
  }

  await page.render({ canvasContext: context, viewport: viewport }).promise

  const previewBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      'image/webp',
      0.8
    )
  })

  const previewFile = new File([previewBlob], 'preview.webp', { type: 'image/webp' })
  const previewPathname = `${pathname}/preview.webp`

  return { previewFile, previewPathname }
}

interface EditorFiles {
  [key: string]: any;
}

export async function fetchPdf(files: EditorFiles[]) {
    const mainFile = files.find(file => file.main_file);

    if (!mainFile) {
        const errorData = {
            error: 'Missing Main File',
            message: 'No main file designated for compilation.',
            details: 'Please ensure one file is set as the main document.'
        };
        console.error('Error fetching PDF:', errorData);
        throw new Error(`${errorData.error}: ${errorData.message}\n\nDetails: ${errorData.details}`);
    }

    console.log('=== DEBUG: LaTeX Content Being Sent ===');
    console.log('Main file name:', mainFile.name);
    console.log('Main file content:');
    console.log(mainFile.content);
    console.log('=== END DEBUG ===');

    const formData = new FormData();
    
    for (const file of files) {
        if (file.type === 'file') {
            const isMain = file.id === mainFile.id;
            const fileName = isMain ? 'main.tex' : file.pathname;
            const extension = file.name.split('.').pop()?.toLowerCase();
            let mimeType: string;
            
            switch (extension) {
                case 'tex':
                    mimeType = 'text/plain';
                    break;
                case 'png':
                    mimeType = 'image/png';
                    break;
                case 'jpg':
                case 'jpeg':
                    mimeType = 'image/jpeg';
                    break;
                case 'svg':
                    mimeType = 'image/svg+xml';
                    break;
                default:
                    // If it's the main file but doesn't have a .tex extension, treat it as one.
                    if (isMain) {
                        mimeType = 'text/plain';
                    } else {
                        continue;
                    }
            }

            let blob: Blob;
            if (extension !== 'tex' && typeof file.content === 'string' && !isMain) {
                const response = await fetch(file.content);
                blob = await response.blob();
            } else {
                blob = new Blob([file.content], { type: mimeType });
            }
            formData.append(fileName, blob, fileName);
        }
    }

    let response;
    try {
        response = await fetch(RAILWAY_ENDPOINT_URL, {
            method: 'POST',
            body: formData,
        });
    } catch (networkError) {
        console.error("Network error during fetch to Railway:", networkError);
        throw networkError;
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error("--- RAW ERROR FROM SERVER ---");
        console.error(`Status: ${response.status} ${response.statusText}`);
        console.error("Response Body:", errorText);
        console.error("-----------------------------");
        // Throw a new, informative error
        throw new Error(`Server responded with status ${response.status}: ${errorText}`);
    }
    
    return response.blob();
}