import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const recipientId = searchParams.get("recipientId")

    if (!recipientId) {
      return NextResponse.json({ error: "Missing recipientId" }, { status: 400 })
    }

    const list = await prisma.notification.findMany({
      where: { recipientId },
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const formatted = list.map((n) => ({
      id: n.id,
      recipientId: n.recipientId,
      senderId: n.senderId,
      postId: n.postId || null,
      type: n.type,
      text: n.text,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      senderProfile: n.sender ? {
        uid: n.sender.id,
        username: n.sender.username,
        displayName: n.sender.displayName,
        avatarUrl: n.sender.avatarUrl,
        verifiedBadge: n.sender.verifiedBadge,
      } : null,
    }))

    return NextResponse.json(formatted)
  } catch (err: any) {
    console.error("Get notifications API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { notificationId, action, recipientId } = body

    if (action === "readAll" && recipientId) {
      await prisma.notification.updateMany({
        where: { recipientId, read: false },
        data: { read: true },
      })
      return NextResponse.json({ success: true })
    }

    if (!notificationId) {
      return NextResponse.json({ error: "Missing notificationId" }, { status: 400 })
    }

    if (action === "read") {
      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    console.error("Update notification API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
