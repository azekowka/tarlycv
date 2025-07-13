'use client'
import FileTree from '@/components/file-tree/file-tree'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import LoadingSideNav from '@/components/nav/loading-side-nav'
import { useProject } from '@/contexts/ProjectContext'

export default function SideNav() {
  const { project, isProjectLoading, projectId } = useProject();
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
        <FileTree projectId={projectId} query={query} />
      </div>

    </div>
  )
}
