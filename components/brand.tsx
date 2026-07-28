import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]">
        <path d="M9 7.5v9l7-4.5-7-4.5Z" fill="currentColor" />
      </svg>
    </span>
  )
}

export function Wordmark({ className, showIcon = true }: { className?: string; showIcon?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {showIcon && <Logo className="h-8 w-8" />}
      <span className="text-xl font-extrabold tracking-tight">
        Vibez<span className="text-primary">Tube</span>
      </span>
    </span>
  )
}
