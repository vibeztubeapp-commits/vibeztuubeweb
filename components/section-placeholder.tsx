import type { LucideIcon } from "lucide-react"

export function SectionPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-8 w-8" />
      </span>
      <div className="max-w-sm">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>
      </div>
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Waiting for connected backend data</span>
    </div>
  )
}
