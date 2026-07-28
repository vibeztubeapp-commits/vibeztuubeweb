"use client"

import type { ReactNode } from "react"
import { LeftRail } from "@/components/shell/left-rail"
import { BottomNav } from "@/components/shell/bottom-nav"
import { MobileHeader } from "@/components/shell/mobile-header"
import { Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isChatScreen = pathname === "/messages"

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1400px]">
      <LeftRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </div>
      <BottomNav />
      
      {/* Mobile Floating Action Button (FAB) for Creating Post */}
      {!isChatScreen && (
        <Link
          href="/compose"
          className="fixed bottom-20 right-4 z-40 md:hidden flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          aria-label="Create new post"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </Link>
      )}
    </div>
  )
}
