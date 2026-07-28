import { Check } from "lucide-react"

export function VerifiedBadge({ type }: { type?: "blue" | "gray" | "purple" | "gold" | "gov" }) {
  if (!type) return null

  let colorClass = "text-sky-400"
  if (type === "blue") colorClass = "text-sky-400"
  if (type === "gray") colorClass = "text-slate-400"
  if (type === "purple") colorClass = "text-purple-500"
  if (type === "gold") colorClass = "text-yellow-500"
  if (type === "gov") colorClass = "text-slate-500"

  return (
    <span className={`inline-flex items-center justify-center shrink-0 ml-1.5 ${colorClass}`} title="Verified Account">
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" className="stroke-background stroke-[2px] fill-background" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    </span>
  )
}
