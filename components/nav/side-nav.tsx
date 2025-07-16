'use client'
import FileTree from '@/components/file-tree/file-tree'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import LoadingSideNav from '@/components/nav/loading-side-nav'
import { useProject } from '@/contexts/ProjectContext'

interface SideNavProps {
  onOpenCreateDialog?: () => void;
}

export default function SideNav({ onOpenCreateDialog }: SideNavProps) {
  const projectContext = useProject();

  if (!projectContext) {
    return (
      <div className="w-full h-full flex flex-col bg-muted/25">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Tarly CVs</h1>
          <ModeToggle />
        </div>
        <div className="p-4 flex space-x-2 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search resumes..." className="flex-grow pl-10" />
        </div>
        <div className="flex-grow overflow-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Files</span>
              <button
                onClick={onOpenCreateDialog}
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
    );
  }

  const { project, isProjectLoading, projectId } = projectContext;
  const projectTitle = project?.title
  const [query, setQuery] = useState('')
  if (isProjectLoading) {
    return <LoadingSideNav />
  }

  return (
    <div className="w-full h-full flex flex-col  bg-muted/25">
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tarly CVs</h1>
        <ModeToggle />
      </div>
      <div className="p-4 flex space-x-2 relative">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search resumes..." className="flex-grow pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="flex-grow overflow-auto">
        <FileTree projectId={projectId} query={query} onOpenCreateDialog={onOpenCreateDialog} />
      </div>

    </div>
  )
}
