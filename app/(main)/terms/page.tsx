import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"

export default function TermsPage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Terms of Service" subtitle="Last updated: July 2026" />}>
        <div className="px-6 py-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>
            By accessing or using VibezTube, you agree to comply with and be bound by these Terms of Service. Please read them carefully.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">1. Use of Service</h2>
          <p>
            You must be at least 13 years old to use VibezTube. You are responsible for maintaining the security of your account credentials and for all actions taken under your handle.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">2. User Content & Conduct</h2>
          <p>
            You retain ownership of any media, posts, or transcripts you share. However, you grant VibezTube a license to host and broadcast your content. Content violating our Community Guidelines will be removed immediately.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">3. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violations of our terms or rules.
          </p>
        </div>
      </FeedColumn>
      <RightRail />
    </div>
  )
}
