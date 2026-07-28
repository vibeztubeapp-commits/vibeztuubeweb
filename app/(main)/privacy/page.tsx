import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"

export default function PrivacyPage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Privacy Policy" subtitle="Last updated: July 2026" />}>
        <div className="px-6 py-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>
            Welcome to VibezTube. Your privacy is important to us. This Privacy Policy explains how we collect, use,
            and protect your personal data when you use our services.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us when creating an account, posting content, sending messages, or participating in live Spaces and Streams.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">2. How We Use Your Information</h2>
          <p>
            We use your data to personalize your experience, maintain account security, host real-time streams and spaces, and process media uploads securely.
          </p>
          <h2 className="text-lg font-bold text-foreground mt-4">3. Data Sharing & Security</h2>
          <p>
            We do not sell your personal data. We utilize industry-standard security via Firebase and secure tokens to protect your login session and media content.
          </p>
        </div>
      </FeedColumn>
      <RightRail />
    </div>
  )
}
