import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"

export default function CommunityGuidelinesPage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Community Guidelines" subtitle="Last updated: July 2026" />}>
        <div className="px-6 py-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>
            VibezTube is a place to share your vibe. We require all users to respect each other to maintain a safe, welcoming community.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">1. Respectful Interactions</h2>
          <p>
            Do not engage in harassment, hate speech, or abuse. We maintain a zero-tolerance policy for targeted bullying or discrimination.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">2. Safe Media Uploads</h2>
          <p>
            Any uploaded images or videos must respect copyright laws and must not contain explicit, violent, or illegal content.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">3. Spams and Scams</h2>
          <p>
            Do not use automated bots, fake accounts, or spamming mechanisms to inflate likes, reposts, or follower metrics.
          </p>
        </div>
      </FeedColumn>
      <RightRail />
    </div>
  )
}
