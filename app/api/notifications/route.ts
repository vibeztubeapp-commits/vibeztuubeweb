import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth-session"

export async function GET() {
  try {
    const userId = await getSessionUser()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        sender: true,
        post: true
      }
    })

    const formatted = notifications.map((n) => ({
      id: n.id,
      recipientId: n.recipientId,
      senderId: n.senderId,
      postId: n.postId,
      type: n.type,
      text: n.text,
      read: n.read,
      createdAt: n.createdAt,
      senderProfile: n.sender ? {
        uid: n.sender.id,
        username: n.sender.username,
        displayName: n.sender.displayName,
        avatarUrl: n.sender.avatarUrl,
        verifiedBadge: n.sender.verifiedBadge
      } : null
    }))

    return NextResponse.json(formatted)
  } catch (err: any) {
    console.error("GET notifications API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUser()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action || "readAll"

    if (action === "readOne" && body.notificationId) {
      await prisma.notification.updateMany({
        where: { id: body.notificationId, recipientId: userId },
        data: { read: true },
      })
      return NextResponse.json({ success: true })
    }

    await prisma.notification.updateMany({
      where: { recipientId: userId, read: false },
      data: { read: true }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("POST notifications API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
