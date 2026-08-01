import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth-session"

export async function GET() {
  try {
    const userId = await getSessionUser()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all conversations this user is a member of
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: true
              }
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                sender: true
              }
            }
          }
        }
      }
    })

    const conversations = memberships.map((m) => {
      const conv = m.conversation
      const otherMembers = conv.members.filter((mem) => mem.userId !== userId).map((mem) => mem.user)
      const lastMessage = conv.messages[0]

      return {
        id: conv.id,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        otherUser: otherMembers[0] || null,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          text: lastMessage.text,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
        } : null
      }
    })

    return NextResponse.json(conversations)
  } catch (err: any) {
    console.error("GET conversations API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUser()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recipientId } = await req.json()
    if (!recipientId) {
      return NextResponse.json({ error: "Missing recipientId" }, { status: 400 })
    }

    // Check if conversation already exists between these two users
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: recipientId } } }
        ]
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })

    if (existing) {
      const otherUser = existing.members.find((m) => m.userId !== userId)?.user
      return NextResponse.json({ id: existing.id, otherUser })
    }

    // Create new conversation
    const newConv = await prisma.conversation.create({
      data: {
        members: {
          create: [
            { userId },
            { userId: recipientId }
          ]
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })

    const otherUser = newConv.members.find((m) => m.userId !== userId)?.user
    return NextResponse.json({ id: newConv.id, otherUser })
  } catch (err: any) {
    console.error("POST conversations API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
