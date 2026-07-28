"use client"

import Link from "next/link"
import { Wordmark } from "@/components/brand"
import { UserAvatar } from "@/components/user-avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { currentUser } from "@/lib/production-data"

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur-lg md:hidden">
      <Link href="/profile" aria-label="Your profile">
        <UserAvatar user={currentUser} className="h-9 w-9" />
      </Link>
      <Link href="/" aria-label="VibezTube home">
        <Wordmark />
      </Link>
      <ThemeToggle />
    </header>
  )
}
