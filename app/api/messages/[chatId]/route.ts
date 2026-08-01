import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth-session"

export async function GET(req: Request, props: { params: Promise<{ chatId: string }> }) {
  const params = await props.params;
  try {
    const userId = await getSessionUser()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { chatId } = params

    // Verify user is a member of this conversation
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: chatId,
          userId
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized to view this chat" }, { status: 403 })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: chatId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: true
      }
    })

    return NextResponse.json(messages)
  } catch (err: any) {
    console.error("GET messages API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
