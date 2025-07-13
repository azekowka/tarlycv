'use client'
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Tree } from 'react-arborist'
import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileTreeNode from './file-tree-node';
import FileTreeSkeleton from './file-tree-loading';
import { useFrontend } from '@/contexts/FrontendContext';

const FileTree = ({ projectId, query = '', onOpenCreateDialog }) => {
  const { user } = useFrontend()
  const {
    data: filesData,
    error,
    isLoading,
  } = db.useQuery({
    files: {
      $: {
        where: {
          projectId: projectId,
        },
      },
    },
  })
  const transformedData = useMemo(() => {
    if (!filesData?.files) return []

    const buildTree = (parentId = null, parentPath = '') => {
      return filesData.files
        .filter((file) => file.parent_id === parentId)
        .map((file) => {
          const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name
          const node = {
            id: file.id,
            name: file.name,
            type: file.type,
            hover: true,
            isOpen: file.isOpen ?? false,
            isExpanded: file.isExpanded ?? false,
            pathname: currentPath,
            user_id: user.id,
          }

          if (file.type === 'folder') {
            const children = buildTree(file.id, currentPath)
            if (children.length > 0 || file.name.toLowerCase().includes(query.toLowerCase())) {
              node.children = children
              return node
            }
          } else if (file.name.toLowerCase().includes(query.toLowerCase())) {
            return node
          }

          return null
        })
        .filter(Boolean)
    }

    return buildTree()
  }, [filesData, query])

  const initialOpenState = useMemo(() => {
    if (!filesData?.files) return {}

    return filesData.files.reduce((acc, file) => {
      acc[file.id] = file.isExpanded ?? false
      return acc
    }, {})
  }, [filesData])

  const treeContainerRef = useRef(null)
  const [treeContainer, setTreeContainer] = useState({
    width: 256,
    height: 735,
  })

  const [newItemType, setNewItemType] = useState(null)
  const [newItemParentId, setNewItemParentId] = useState(null)

  const handleAddItem = useCallback(
    (type, parentId = null) => {
      const newItemId = id()
      const parentPath = filesData.files.find((file) => file.id === parentId)?.pathname || ''
      const newItemPath = parentPath ? `${parentPath}/${type === 'file' ? 'untitled.tex' : 'Untitled Folder'}` : (type === 'file' ? 'untitled.tex' : 'Untitled Folder')
      const newItem = {
        id: newItemId,
        name: type === 'file' ? 'untitled.tex' : 'Untitled Folder',
        type: type,
        parent_id: parentId,
        projectId: projectId,
        isExpanded: type === 'folder' ? true : null,
        content: '',
        created_at: new Date(),
        pathname: newItemPath,
        user_id: user.id,
      }

      db.transact([tx.files[newItemId].update(newItem)])

      setNewItemType(type)
      setNewItemParentId(parentId)
    },
    [projectId, filesData]
  )

  const handleAddFile = useCallback(() => {
    if (onOpenCreateDialog) {
      // Open the CreateResumeDialog
      onOpenCreateDialog()
    } else {
      // Fallback to the original behavior
      handleAddItem('file')
    }
  }, [onOpenCreateDialog, handleAddItem])

  const handleRename = useCallback(({ id, name }) => {
    const file = filesData.files.find((file) => file.id === id)
    const newPathname = file.pathname.replace(/[^/]+$/, name)
    db.transact([tx.files[id].update({ name: name, pathname: newPathname })])
  }, [filesData])

  const handleMove = ({ dragIds, parentId, index }) => {
    const updates = dragIds.map((id) => {
      const file = filesData.files.find((file) => file.id === id)
      const parentPath = filesData.files.find((file) => file.id === parentId)?.pathname || ''
      const newPathname = parentPath ? `${parentPath}/${file.name}` : file.name
      return {
        id: id,
        parent_id: parentId,
        pathname: newPathname,
      }
    })

    // Get all files with the same parent_id
    const siblingFiles = filesData.files.filter((file) => file.parent_id === parentId)

    // Insert the moved files at the specified index
    const updatedSiblings = [...siblingFiles.slice(0, index), ...updates, ...siblingFiles.slice(index)]

    // Update the order of all affected files
    const orderUpdates = updatedSiblings.map((file, i) => ({
      id: file.id,
      order: i,
    }))

    // Combine all updates
    const allUpdates = [...updates, ...orderUpdates]

    // Perform the database transaction
    db.transact(allUpdates.map((update) => tx.files[update.id].update(update)))
  }

  const handleDelete = ({ ids, type }) => {
    if (type === 'file') {
      db.transact([tx.files[ids[0]].delete()])
    } else if (type === 'folder') {
      // Recursive function to collect all child files and folders
      const collectChildren = (folderId) => {
        return filesData.files
          .filter((file) => file.parent_id === folderId)
          .flatMap((child) => {
            if (child.type === 'folder') {
              return [child.id, ...collectChildren(child.id)]
            }
            return child.id
          })
      }

      const childrenIds = collectChildren(ids[0])

      // Delete the folder and all its children
      db.transact([...childrenIds.map((id) => tx.files[id].delete()), tx.files[ids[0]].delete()])
    }
  }

  const handleToggle = ({ id, isExpanded, type, isOpen }) => {
    if (type === 'folder') {
      db.transact([tx.files[id].update({ isExpanded: isExpanded })])
    } else if (type === 'file') {
      const updates = [];
      
      // Set the clicked file as the main file and open it
      updates.push(tx.files[id].update({ isOpen: true, main_file: true }));
      
      // Find any other file that was previously the main file and unmark it
      const previousMainFile = filesData.files.find(file => file.main_file && file.id !== id);
      if (previousMainFile) {
        updates.push(tx.files[previousMainFile.id].update({ main_file: false, isOpen: false }));
      }
      
      // Also, ensure any file that was just 'open' but not main is also closed.
      const previouslyOpenFile = filesData.files.find((file) => file.isOpen && file.id !== id);
      if (previouslyOpenFile && previouslyOpenFile.id !== (previousMainFile && previousMainFile.id)) {
        updates.push(tx.files[previouslyOpenFile.id].update({ isOpen: false }));
      }
      
      db.transact(updates)
    }
  }

  useEffect(() => {

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setTreeContainer({
        width: width,
        height: height - 65,
      })
    })

    const observeElement = () => {
      if (treeContainerRef.current) {
        resizeObserver.observe(treeContainerRef.current)
      } else {
        setTimeout(observeElement, 100)
      }
    }

    observeElement()

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  if (isLoading) return <FileTreeSkeleton />
  if (error) return <div>Error: {error.message}</div>

  return (
    <div ref={treeContainerRef} className="flex flex-col grow h-full shadow-sm w-full">
      <div className="flex items-center justify-between  px-4 border-b py-2">
        <div className="text-sm font-medium">Files</div>
        <div className="flex items-center">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleAddFile}>
                <FilePlus2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add file</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex-grow w-full overflow-hidden py-1">
        <Tree
          data={transformedData}
          onMove={handleMove}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onRename={handleRename}
          className="text-foreground tree-overflow"
          width={treeContainer.width}
          height={treeContainer.height}
          rowHeight={36}
          initialOpenState={initialOpenState}
          newItemType={newItemType}
          newItemParentId={newItemParentId}
          onAddItem={handleAddItem}
        >
          {FileTreeNode}
        </Tree>
      </div>
    </div>
  )
}

export default FileTree
