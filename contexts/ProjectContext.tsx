'use client'
import React, { createContext, useContext, ReactNode, useState } from 'react'
import { useProjectData, useProjectFiles } from '@/hooks/data';
import { useFrontend } from '@/contexts/FrontendContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// TODO: Add better types
interface ProjectContextType {
  project: any
  files: any
  isLoading: boolean
  error: any
  updateDocument?: (newContent: string) => void
  setUpdateDocument?: (fn: (newContent: string) => void) => void
}

export const ProjectContext = createContext<any>(undefined)

export function ProjectProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const { user, isLoading: isUserLoading } = useFrontend();
  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useProjectData(projectId, user?.id)
  const { data: filesData, isLoading: isFilesLoading, error: filesError } = useProjectFiles(projectId, user?.id)
  const currentlyOpen = filesData?.files?.find((file) => file.isOpen === true)
  const [updateDocument, setUpdateDocument] = useState<((newContent: string) => void) | undefined>(undefined)
  
  const value = {
    projectId,
    project: projectData?.projects?.[0],
    isLoading: isProjectLoading || isFilesLoading || isUserLoading,
    error: projectError || filesError,
    files: filesData?.files,
    currentlyOpen,
    updateDocument,
    setUpdateDocument,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export const useProject = () => {
  return useContext(ProjectContext)
}
