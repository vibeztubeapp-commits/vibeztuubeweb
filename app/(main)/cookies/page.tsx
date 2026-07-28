import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"

export default function CookiesPage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Cookie Policy" subtitle="Last updated: July 2026" />}>
        <div className="px-6 py-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>
            VibezTube uses cookies and similar local storage technologies to enhance your experience, store preferences, and authenticate sessions.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">1. What are Cookies?</h2>
          <p>
            Cookies are small text files stored on your browser. We use local browser persistence via Firebase to keep you signed in securely across browser sessions.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">2. Types of Cookies We Use</h2>
          <p>
            - **Essential**: Necessary for account login, security, and session management.
            - **Performance**: Used to measure page load times and network optimization.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">3. Managing Preferences</h2>
          <p>
            You can disable cookies in your browser settings, though doing so may prevent you from logging in or using real-time features.
          </p>
        </div>
      </FeedColumn>
      <RightRail />
    </div>
  )
}
