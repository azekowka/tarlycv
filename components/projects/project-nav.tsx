'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ModeToggle } from '../ui/mode-toggle'
import { Separator } from '../ui/separator'

export default function ProjectNav() {
  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold">Projects</h1>
      </div>
      <div className="flex items-center space-x-4">
        <ModeToggle />
      </div>
    </nav>
  )
}
