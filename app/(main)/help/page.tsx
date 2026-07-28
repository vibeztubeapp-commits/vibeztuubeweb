import { HelpCircle } from "lucide-react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function HelpPage() {
  return (
    <div className="flex justify-center">
      <FeedColumn header={<PageHeaderTitle title="Help & Support" subtitle="Get assistance" />}>
        <SectionPlaceholder
          icon={HelpCircle}
          title="Help & Support"
          description="Have questions about your VibezTube account or features? Support tickets and self-serve articles are coming soon."
        />
      </FeedColumn>
      <RightRail />
    </div>
  )
}
