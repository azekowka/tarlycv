'use client'

import React from 'react'
import { ModeToggle } from '../ui/mode-toggle'

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
