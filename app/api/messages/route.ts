import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth-session"

export async function POST(req: Request) {
  try {
    const userId = await getSessionUser()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId, text } = await req.json()
    if (!conversationId || !text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        text
      },
      include: {
        sender: true
      }
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json(message)
  } catch (err: any) {
    console.error("POST message API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
