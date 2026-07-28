import { cn } from "@/lib/utils"

// Centered content column with an optional sticky page header.
// Used by feed-style pages (Home, Explore, Notifications, Profile).
export function FeedColumn({
  children,
  header,
  className,
}: {
  children: React.ReactNode
  header?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl border-border lg:border-x", className)}>
      {header ? (
        <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-lg">{header}</div>
      ) : null}
      {children}
    </div>
  )
}

export function PageHeaderTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 py-3">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  )
}
