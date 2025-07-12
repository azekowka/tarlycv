'use client'
import FileTree from '@/components/file-tree/file-tree'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import Link from 'next/link'
import Profile from '@/components/profile/profile'
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
        <Link href="/projects" className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-sm font-medium text-primary-foreground">
              {projectTitle
                ? projectTitle
                    .split(' ')
                    .map((word: string) => word[0])
                    .join('')
                : ''}
            </span>
          </div>
          <span className="text-sm text-medium text-foreground">{projectTitle}</span>
        </Link>
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
