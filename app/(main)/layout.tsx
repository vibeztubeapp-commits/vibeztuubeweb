import type { ReactNode } from "react"
import { LeftRail } from "@/components/shell/left-rail"
import { BottomNav } from "@/components/shell/bottom-nav"
import { MobileHeader } from "@/components/shell/mobile-header"

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1400px]">
      <LeftRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
