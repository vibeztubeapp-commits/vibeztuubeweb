import { MessageCircle } from "lucide-react"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { SectionPlaceholder } from "@/components/section-placeholder"

export default function MessagesPage() {
  return (
    <FeedColumn header={<PageHeaderTitle title="Messages" />}>
      <SectionPlaceholder
        icon={MessageCircle}
        title="Direct Messages"
        description="A two-pane inbox with conversations and a real-time chat thread is coming in a later step."
      />
    </FeedColumn>
  )
}
