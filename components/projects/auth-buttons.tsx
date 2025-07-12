'use client'
import { Button } from '@/components/ui/button'
import { LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import { ModeToggle } from '@/components/ui/mode-toggle';

export default function AuthButtons() {
  return (
    <div className="flex items-center gap-4">
      <Button
        size="sm"
        className="dark:bg-transparent dark:border-primary/75 dark:border dark:text-primary dark:hover:bg-primary/5 light:border-primary/75 light:border light:text-primary light:hover:bg-primary/10"
        asChild
      >
        <Link href="/projects">
          <LayoutGrid className="h-4 w-4" />
          <span className="ml-2">Projects</span>
        </Link>
      </Button>
      <ModeToggle />
    </div>
  )
}
