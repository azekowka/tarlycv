'use client'
import '@ungap/with-resolvers'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import SideNav from '@/components/nav/side-nav'
import LatexRenderer from '@/components/latex-render/latex'
import dynamic from 'next/dynamic';

const EditorContainer = dynamic(() => import('@/components/editor/editor-container'), { ssr: false });
import { ProjectProvider } from '@/contexts/ProjectContext'
import { useParams } from 'next/navigation'
import { useFrontend } from '@/contexts/FrontendContext'
import { useState, useEffect } from 'react'
import { CreateResumeDialog } from '@/components/CreateResumeDialog'
import { Resume } from '@/types/resume'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
export const maxDuration = 30

export default function Home() {
  const { id: projectId } = useParams<{ id: string }>()
  const { user } = useFrontend()
  const [sideNavSize, setSideNavSize] = useState(20) // Default size for SSR
  const [isClient, setIsClient] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    // Set client-specific sizes after hydration
    setIsClient(true)
    setSideNavSize(window.innerWidth < 1440 ? 20 : 16)
  }, [])

  const handleCreateResume = (resume: Resume) => {
    // Create a new file in the current project
    const newFileId = id()
    
    db.transact([
      tx.files[newFileId].update({
        user_id: user?.id,
        projectId: projectId,
        name: `${resume.title}.tex`,
        type: 'file',
        parent_id: null,
        content: resume.latexCode || resume.content,
        created_at: new Date(),
        isExpanded: null,
        isOpen: true,
        main_file: false,
        pathname: `${resume.title}.tex`,
      }),
    ])
  }

  return (
    <ProjectProvider projectId={projectId}>
      <main className="flex flex-col h-screen">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={sideNavSize} collapsible={true}>
            <SideNav onOpenCreateDialog={() => setIsCreateDialogOpen(true)} />
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
        
        <CreateResumeDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreateResume={handleCreateResume}
        />
      </main>
    </ProjectProvider>
  )
}
