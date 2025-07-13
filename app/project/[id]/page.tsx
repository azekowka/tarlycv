'use client'
import '@ungap/with-resolvers'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import SideNav from '@/components/nav/side-nav'
import LatexRenderer from '@/components/latex-render/latex'
import EditorContainer from '@/components/editor/editor-container'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { useParams } from 'next/navigation'
import { useFrontend } from '@/contexts/FrontendContext'
import { useState, useEffect } from 'react'
export const maxDuration = 30

export default function Home() {
  const { id } = useParams<{ id: string }>()
  const [sideNavSize, setSideNavSize] = useState(20) // Default size for SSR
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Set client-specific sizes after hydration
    setIsClient(true)
    setSideNavSize(window.innerWidth < 1440 ? 20 : 16)
  }, [])

  return (
    <ProjectProvider projectId={id}>
      <main className="flex flex-col h-screen">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={sideNavSize} collapsible={true}>
            <SideNav />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40}>
            <EditorContainer />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40}>
            <LatexRenderer />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </ProjectProvider>
  )
}
