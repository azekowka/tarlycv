'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchIcon, PlusIcon } from 'lucide-react'
import ProjectNav from '@/components/projects/project-nav'
import { CreateResumeDialog } from '@/components/CreateResumeDialog'
import { useFrontend } from '@/contexts/FrontendContext'
import { Resume } from '@/types/resume'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'

export default function ProjectsPage() {
  const { user } = useFrontend()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

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

  return (
    <div className="min-h-screen bg-background">
      <ProjectNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div className="relative flex-grow mr-4">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10 py-5 text-sm w-full"
              placeholder="Search resumes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            className="whitespace-nowrap" 
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add file
          </Button>
        </div>

        {/* Empty state - default page */}
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="text-muted-foreground mb-4">
            <SearchIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-medium mb-2">No resumes yet</h2>
            <p className="text-sm">Click the "+" button to create your first resume</p>
          </div>
        </div>
      </main>

      <CreateResumeDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateResume={handleCreateResume}
      />
    </div>
  )
} 