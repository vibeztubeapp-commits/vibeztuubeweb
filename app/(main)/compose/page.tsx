"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Send, Loader2 } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/components/auth-provider"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createPost, uploadMedia } from "@/lib/services"

function ComposeView() {
  const router = useRouter()
  const { user } = useAuth()
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!user || !text.trim()) return
    setUploading(true)
    try {
      let media: Array<{ type: string; src: string }> = []
      if (file) {
        media = await uploadMedia(file, user.uid)
      }
      await createPost({ authorId: user.uid, text, media })
      router.replace("/")
    } finally {
      setUploading(false)
    }
  }

  return (
    <FeedColumn header={<PageHeaderTitle title="Create" subtitle="Publish to Firestore" />}>
      <div className="space-y-4 px-4 py-6">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What's happening?" className="min-h-32" />
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="mr-2 h-4 w-4" /> Add media
          </Button>
          <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button onClick={() => void handleSubmit()} disabled={uploading || !text.trim()}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post
          </Button>
        </div>
        {file ? <p className="text-sm text-muted-foreground">Selected: {file.name}</p> : null}
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
