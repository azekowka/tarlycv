'use client'
import { db } from '@/lib/constants'
import { createPreview } from '@/lib/utils/pdf-utils'
import { pdfjs } from 'react-pdf'
import { tx } from '@instantdb/react'

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

export async function savePdfToStorage(blob: Blob, pathname: string, projectId: string): Promise<void> {
  
  const pdfFile = new File([blob], 'main.pdf', { type: blob.type })
  console.log('Uploading to InstantDB Storage:', { pathname, pdfFile });
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
  try {
    const result = await db.storage.upload(pathname, pdfFile)
    
    // The upload might return an object with an error property
    if (result && (result as any).error) {
      console.error('Error during db.storage.upload:', (result as any).error);
      throw (result as any).error;
    }

    console.log('InstantDB upload result:', result);

    const downloadURL = await db.storage.getDownloadUrl(pathname)
    db.transact([
      tx.projects[projectId].update({
        cachedPdfUrl: downloadURL,
        cachedPdfExpiresAt: expiresAt,
        last_compiled: new Date().toISOString()
      })
    ])
  } catch (error) {
    console.error('Caught exception during upload:', error);
    if (error && typeof error === 'object' && 'body' in error) {
      console.error('Upload error body:', (error as any).body);
    }
    throw error;
  }
}

export async function savePreviewToStorage(blob: Blob, pathname: string, projectId: string): Promise<void> {
  const pdfDocument = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise
  const { previewFile } = await createPreview(pdfDocument, pathname)
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
  await db.storage.upload(pathname, previewFile)
  const downloadURL = await db.storage.getDownloadUrl(pathname)
  db.transact([
    tx.projects[projectId].update({
      cachedPreviewUrl: downloadURL,
      cachedPreviewExpiresAt: expiresAt
    })
  ])
}
