"use client"

import { useState } from "react"
import { ImageIcon, Clapperboard, Radio, Smile, MapPin, Globe } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { currentUser } from "@/lib/production-data"
import { cn } from "@/lib/utils"

const MAX = 280

export function Composer({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState("")
  const remaining = MAX - value.length
  const over = remaining < 0

  return (
    <div className={cn("flex gap-3 border-b border-border px-4 py-3", compact && "border-b-0")}>
      <UserAvatar user={currentUser} className="h-11 w-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <button type="button" className="mb-1 flex items-center gap-1 rounded-full border border-primary/40 px-3 py-0.5 text-xs font-semibold text-primary">
          <Globe className="h-3 w-3" /> Everyone
        </button>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="What's the vibe?"
          rows={compact ? 2 : 3}
          className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <div className="flex items-center gap-0.5 text-primary">
            <IconBtn label="Add image" icon={ImageIcon} />
            <IconBtn label="Add short" icon={Clapperboard} />
            <IconBtn label="Start a Space" icon={Radio} />
            <IconBtn label="Add emoji" icon={Smile} />
            <IconBtn label="Add location" icon={MapPin} />
          </div>
          <div className="flex items-center gap-3">
            {value.length > 0 ? (
              <span className={cn("text-sm tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>{remaining}</span>
            ) : null}
            <Button disabled={value.length === 0 || over} className="rounded-full font-bold">
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IconBtn({ label, icon: Icon }: { label: string; icon: typeof ImageIcon }) {
  return (
    <button type="button" aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-primary/10">
      <Icon className="h-5 w-5" />
    </button>
  )
}
