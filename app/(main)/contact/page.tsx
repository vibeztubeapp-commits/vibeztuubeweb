import { Mail } from "lucide-react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function ContactPage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Contact Us" subtitle="Get in touch" />}>
        <SectionPlaceholder
          icon={Mail}
          title="Contact Us"
          description="Need help? Email our support team at support@vibeztube.com for all account and technical inquiries."
        />
      </FeedColumn>
      <RightRail />
    </div>
  )
}
