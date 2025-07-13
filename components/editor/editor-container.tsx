'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { CodeEditor } from './editor'
import { useProject } from '@/contexts/ProjectContext'
import ImageViewer from './image-viewer'
import { Skeleton } from '@/components/ui/skeleton'
import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import { Command } from 'lucide-react'

const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.')
  if (parts.length > 1) {
    return parts[parts.length - 1]
  }
  return ''
}

const EditorContainer = () => {
  const { theme, systemTheme } = useTheme()
  const [localContent, setLocalContent] = useState('')
  const [openFile, setOpenFile] = useState<any>(null)
  const { currentlyOpen, isFilesLoading, isProjectLoading, setUpdateDocument } = useProject();
  const [isStreaming,setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const fileType = getFileExtension(currentlyOpen?.name || '');
  const [isMac, setIsMac] = useState(false);
  

  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileType.toLowerCase());

  useEffect(() => {
    setIsMac(navigator.userAgent.includes('Macintosh'));
  }, []);

  useEffect(() => {
    if (currentlyOpen && currentlyOpen.id !== openFile?.id) {
      setOpenFile(currentlyOpen)
      setLocalContent(currentlyOpen.content)
    }
  }, [currentlyOpen?.id])

  // Register document update function in context
  useEffect(() => {
    if (setUpdateDocument && openFile) {
      const updateDocumentFunction = (newContent: string) => {
        console.log('📝 Updating document content via context...');
        setLocalContent(newContent);
        db.transact([tx.files[openFile.id].update({ content: newContent })]);
        console.log('✅ Document updated successfully');
      };
      
      setUpdateDocument(() => updateDocumentFunction);
      
      // Cleanup function
      return () => setUpdateDocument(undefined);
    }
  }, [setUpdateDocument, openFile]);
  
  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (newCode !== localContent && !isStreamingRef.current) {
        setLocalContent(newCode);
        db.transact([tx.files[openFile.id].update({ content: newCode })]);
      }
    },
    [localContent, openFile]
  )

  const handleIsStreamingChange = useCallback((streaming: boolean) => {
    setIsStreaming(streaming);
    isStreamingRef.current = streaming;
  }, []);

  if (isProjectLoading || isFilesLoading) {
    return (
      <div className="flex flex-col w-full h-full">
        <div className="flex justify-end items-center border-b shadow-sm p-2">
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="flex-grow" />
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between w-full items-center border-b shadow-sm p-2">
        <div className="flex items-center border space-x-2 px-3 h-9 rounded-md text-sm text-muted-foreground">
          {isMac ? (
            <>
              <Command className="h-4 w-4" />
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background/50 border rounded">⇧</kbd>
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background/50 border rounded">F</kbd>
            </>
          ) : (
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background border rounded">Ctrl+Shift+F</kbd>
          )}
          <span>to Fix Document</span>
        </div>
        
        <div className="flex items-center border space-x-2 px-3 h-9 rounded-md text-sm text-muted-foreground">
          <span>Select and</span>
          {isMac ? (
            <>
              <Command className="h-4 w-4" />
              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background/50 border rounded">K</kbd>
            </>
          ) : (
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-background border rounded">Ctrl+K</kbd>
          )}
          <span>for AI Autocomplete</span>
        </div>
      </div>
      {!currentlyOpen ? (
        <div className="flex-grow flex items-center justify-center text-muted-foreground">
          No file open
        </div>
      ) : isImageFile ? (
        <div className="flex-grow flex items-center justify-center bg-background">
          <div className="relative w-full h-full" style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border) / 0.5) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border) / 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}>
            <ImageViewer
              src={currentlyOpen?.content || ''}
              alt={currentlyOpen?.name || 'Image'}
            />
          </div>
        </div>
      ) : (
        <CodeEditor onChange={handleCodeChange} setIsStreaming={handleIsStreamingChange} value={localContent} key={`${theme || systemTheme}-${openFile?.id}`} />
      )}
    </div>
  )
}

export default EditorContainer
