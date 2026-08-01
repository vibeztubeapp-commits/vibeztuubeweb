import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSession } from "@/lib/auth-session"

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
          // 1. Move posts and comments (no user-based unique constraints here)
          await prisma.post.updateMany({ where: { authorId: oldId }, data: { authorId: uid } })
          await prisma.comment.updateMany({ where: { authorId: oldId }, data: { authorId: uid } })

          // 2. Move likes (upsert to skip duplicates safely)
          const oldLikes = await prisma.like.findMany({ where: { userId: oldId } })
          for (const like of oldLikes) {
            try {
              await prisma.like.upsert({
                where: { userId_postId: { userId: uid, postId: like.postId } },
                update: {},
                create: { userId: uid, postId: like.postId, createdAt: like.createdAt }
              })
            } catch (err) {
              console.warn(`Skipped merging duplicate like for post ${like.postId}:`, err)
            }
          }
          await prisma.like.deleteMany({ where: { userId: oldId } })

          // 3. Move reposts (upsert to skip duplicates safely)
          const oldReposts = await prisma.repost.findMany({ where: { userId: oldId } })
          for (const repost of oldReposts) {
            try {
              await prisma.repost.upsert({
                where: { userId_postId: { userId: uid, postId: repost.postId } },
                update: {},
                create: { userId: uid, postId: repost.postId, createdAt: repost.createdAt }
              })
            } catch (err) {
              console.warn(`Skipped merging duplicate repost for post ${repost.postId}:`, err)
            }
          }
          await prisma.repost.deleteMany({ where: { userId: oldId } })

          // 4. Move bookmarks (upsert to skip duplicates safely)
          const oldBookmarks = await prisma.bookmark.findMany({ where: { userId: oldId } })
          for (const bookmark of oldBookmarks) {
            try {
              await prisma.bookmark.upsert({
                where: { userId_postId: { userId: uid, postId: bookmark.postId } },
                update: {},
                create: { userId: uid, postId: bookmark.postId, createdAt: bookmark.createdAt }
              })
            } catch (err) {
              console.warn(`Skipped merging duplicate bookmark for post ${bookmark.postId}:`, err)
            }
          }
          await prisma.bookmark.deleteMany({ where: { userId: oldId } })

          // 5. Move follows (upsert to skip duplicates safely)
          const oldFollows = await prisma.follow.findMany({ where: { followerUid: oldId } })
          for (const f of oldFollows) {
            try {
              await prisma.follow.upsert({
                where: { followerUid_followeeUid: { followerUid: uid, followeeUid: f.followeeUid } },
                update: {},
                create: { followerUid: uid, followeeUid: f.followeeUid, createdAt: f.createdAt }
              })
            } catch (err) {
              console.warn(`Skipped merging duplicate follow (following):`, err)
            }
          }
          await prisma.follow.deleteMany({ where: { followerUid: oldId } })

          const oldFollowers = await prisma.follow.findMany({ where: { followeeUid: oldId } })
          for (const f of oldFollowers) {
            try {
              await prisma.follow.upsert({
                where: { followerUid_followeeUid: { followerUid: f.followerUid, followeeUid: uid } },
                update: {},
                create: { followerUid: f.followerUid, followeeUid: uid, createdAt: f.createdAt }
              })
            } catch (err) {
              console.warn(`Skipped merging duplicate follow (follower):`, err)
            }
          }
          await prisma.follow.deleteMany({ where: { followeeUid: oldId } })

          // 6. Move notifications
          await prisma.notification.updateMany({ where: { recipientId: oldId }, data: { recipientId: uid } })
          await prisma.notification.updateMany({ where: { senderId: oldId }, data: { senderId: uid } })

          // 7. Transfer user bio and badge if present
          await prisma.user.update({
            where: { id: uid },
            data: {
              bio: existingUserByEmail.bio || undefined,
              verifiedBadge: existingUserByEmail.verifiedBadge || undefined,
            }
          })

          // 8. Delete the old user record
          await prisma.user.delete({ where: { id: oldId } })

          // 9. Re-store original username to the active user
          await prisma.user.update({
            where: { id: uid },
            data: { username: existingUserByEmail.username },
          })

          console.log(`Auto-merge completed successfully from "${oldId}" to "${uid}"`)
        } catch (txErr) {
          console.error("Self-healing merge execution error during auth sync:", txErr)
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

    await createSession(user.id)

    return NextResponse.json(user)
  } catch (err: any) {
    console.error("User profile sync error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
