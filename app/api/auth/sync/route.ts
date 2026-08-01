import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { uid, username, displayName, email, avatarUrl } = body

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 })
    }

    // 1. Self-healing mapping: check if there's a database user with the same email but a different ID (old ID)
    if (email) {
      const existingUserByEmail = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          id: { not: uid },
        },
      })

      if (existingUserByEmail) {
        const oldId = existingUserByEmail.id
        console.log(`Auto-merging old UID "${oldId}" to new active UID "${uid}" for email: ${email}`)

        try {
          await prisma.$transaction([
            // Create temporary new ID holder
            prisma.user.create({
              data: {
                id: uid,
                username: `${existingUserByEmail.username}_new_${Math.random().toString(36).substr(2, 4)}`,
                displayName: displayName || existingUserByEmail.displayName,
                email: email,
                bio: existingUserByEmail.bio || "",
                avatarUrl: avatarUrl || existingUserByEmail.avatarUrl || "",
                verifiedBadge: existingUserByEmail.verifiedBadge || "",
                followersCount: existingUserByEmail.followersCount,
                followingCount: existingUserByEmail.followingCount,
              },
            }),
            // Re-key references
            prisma.post.updateMany({ where: { authorId: oldId }, data: { authorId: uid } }),
            prisma.comment.updateMany({ where: { authorId: oldId }, data: { authorId: uid } }),
            prisma.like.updateMany({ where: { userId: oldId }, data: { userId: uid } }),
            prisma.repost.updateMany({ where: { userId: oldId }, data: { userId: uid } }),
            prisma.bookmark.updateMany({ where: { userId: oldId }, data: { userId: uid } }),
            prisma.follow.updateMany({ where: { followerUid: oldId }, data: { followerUid: uid } }),
            prisma.follow.updateMany({ where: { followeeUid: oldId }, data: { followeeUid: uid } }),
            prisma.notification.updateMany({ where: { recipientId: oldId }, data: { recipientId: uid } }),
            prisma.notification.updateMany({ where: { senderId: oldId }, data: { senderId: uid } }),
            // Delete old record
            prisma.user.delete({ where: { id: oldId } }),
            // Re-store original username
            prisma.user.update({
              where: { id: uid },
              data: { username: existingUserByEmail.username },
            }),
          ])
        } catch (txErr) {
          console.error("Self-healing transaction error during auth sync:", txErr)
        }
      }
    }

    // 2. Upsert user profile into PostgreSQL
    const user = await prisma.user.upsert({
      where: { id: uid },
      update: {
        displayName: displayName || undefined,
        avatarUrl: avatarUrl || undefined,
        email: email || undefined,
      },
      create: {
        id: uid,
        username: username || `user_${Math.random().toString(36).substr(2, 9)}`,
        displayName: displayName || "Creator",
        avatarUrl: avatarUrl || "",
        email: email || "",
        bio: "",
        verifiedBadge: "",
      },
    })

    return NextResponse.json(user)
  } catch (err: any) {
    console.error("User profile sync error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
