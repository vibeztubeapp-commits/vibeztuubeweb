"use client"

import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { Composer } from "@/components/composer"

function ComposeView() {
  const router = useRouter()

  return (
    <FeedColumn header={<PageHeaderTitle title="Create" />}>
      <div className="border border-border rounded-2xl overflow-hidden mt-4 mx-4 bg-card/20">
        <Composer onPostSuccess={() => router.replace("/")} />
      </div>
    </FeedColumn>
  )
}

export default function ComposePage() {
  return (
    <AuthGuard>
      <ComposeView />
    </AuthGuard>
  )
}
