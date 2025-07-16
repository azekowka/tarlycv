'use client'
import '@ungap/with-resolvers'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import LatexRenderer from '@/components/latex-render/latex'
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react'
import { CreateResumeDialog } from '@/components/CreateResumeDialog'
import { Resume } from '@/types/resume'
import { useFrontend } from '@/contexts/FrontendContext'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { useRouter } from 'next/navigation'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

const EditorContainer = dynamic(() => import('@/components/editor/editor-container'), { ssr: false });

export default function ProjectsPage() {
  const { user } = useFrontend()
  const router = useRouter()
  const [sideNavSize, setSideNavSize] = useState(20) // Default size for SSR
  const [isClient, setIsClient] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    // Set client-specific sizes after hydration
    setIsClient(true)
    setSideNavSize(window.innerWidth < 1440 ? 20 : 16)
  }, [])

  const handleCreateResume = (resume: Resume) => {
    const newProjectId = id()

    // Create the project in the database
    db.transact([
      tx.projects[newProjectId].update({
        user_id: user?.id,
        title: resume.title,
        project_content: resume.latexCode || resume.content,
        template: 'resume',
        last_compiled: new Date(),
        word_count: 0,
        page_count: 0,
        document_class: 'resume',
        created_at: new Date(),
      }),
      // Create the main.tex file
      tx.files[id()].update({
        user_id: user?.id,
        projectId: newProjectId,
        name: 'main.tex',
        type: 'file',
        parent_id: null,
        content: resume.latexCode || resume.content,
        created_at: new Date(),
        isExpanded: null,
        isOpen: true,
        main_file: true,
        pathname: 'main.tex',
      }),
    ])

    // Navigate to the new project
    router.push(`/project/${newProjectId}`)
  }

  // Empty editor components without ProjectProvider
  const EmptyEditor = () => (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center text-muted-foreground">
        <p>No file open</p>
      </div>
    </div>
  )

  const EmptyLatexRenderer = () => (
    <div className="h-full flex items-center justify-center bg-muted/25">
      <div className="text-center text-muted-foreground">
        <p>Preview will appear here</p>
      </div>
    </div>
  )

  const EmptySideNav = () => (
    <div className="w-full h-full flex flex-col bg-muted/25">
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tarly CVs</h1>
        <ModeToggle />
      </div>
      <div className="p-4 flex space-x-2 relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resumes..."
          className="flex-grow pl-10"
        />
      </div>
      <div className="flex-grow overflow-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Files</span>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2.75C8 2.47386 7.77614 2.25 7.5 2.25C7.22386 2.25 7 2.47386 7 2.75V7H2.75C2.47386 7 2.25 7.22386 2.25 7.5C2.25 7.77614 2.47386 8 2.75 8H7V12.25C7 12.5261 7.22386 12.75 7.5 12.75C7.77614 12.75 8 12.5261 8 12.25V8H12.25C12.5261 8 12.75 7.77614 12.75 7.5C12.75 7.22386 12.5261 7 12.25 7H8V2.75Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
          <div className="text-center text-muted-foreground text-sm py-8">
            <p>No files yet</p>
            <p className="text-xs mt-1">Click + to create your first file</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <main className="flex flex-col h-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={sideNavSize} collapsible={true}>
          <EmptySideNav />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40}>
          <EmptyEditor />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40}>
          <EmptyLatexRenderer />
        </ResizablePanel>
      </ResizablePanelGroup>
      
      <CreateResumeDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateResume={handleCreateResume}
      />
    </main>
  )
} 