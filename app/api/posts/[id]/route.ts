import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        author: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: post.id,
      authorId: post.authorId,
      text: post.text,
      media: post.media,
      likes: post.likesCount,
      comments: post.commentsCount,
      reposts: post.repostsCount,
      views: String(post.viewsCount),
      createdAt: post.createdAt.toISOString(),
      authorProfile: post.author ? {
        uid: post.author.id,
        username: post.author.username,
        displayName: post.author.displayName,
        avatarUrl: post.author.avatarUrl,
        verifiedBadge: post.author.verifiedBadge,
        bio: post.author.bio,
      } : null,
    })
  } catch (err: any) {
    console.error("Get single post API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json()
    const { action, userId } = body

    if (!action || !userId) {
      return NextResponse.json({ error: "Missing required params" }, { status: 400 })
    }

    const postId = params.id

    if (action === "view") {
      const updated = await prisma.post.update({
        where: { id: postId },
        data: { viewsCount: { increment: 1 } },
      })
      return NextResponse.json({ views: updated.viewsCount })
    }

    if (action === "like") {
      const existing = await prisma.like.findUnique({
        where: { userId_postId: { userId, postId } },
      })

      if (existing) {
        await prisma.like.delete({
          where: { userId_postId: { userId, postId } },
        })
        const post = await prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        })
        return NextResponse.json({ liked: false, likes: post.likesCount })
      } else {
        await prisma.like.create({
          data: { userId, postId },
        })
        const post = await prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        })
        
        // Notify author
        if (post.authorId !== userId) {
          await prisma.notification.create({
            data: {
              recipientId: post.authorId,
              senderId: userId,
              postId: post.id,
              type: "like",
              text: "liked your post",
            },
          })
        }
        return NextResponse.json({ liked: true, likes: post.likesCount })
      }
    }

    if (action === "repost") {
      const existing = await prisma.repost.findUnique({
        where: { userId_postId: { userId, postId } },
      })

      if (existing) {
        await prisma.repost.delete({
          where: { userId_postId: { userId, postId } },
        })
        const post = await prisma.post.update({
          where: { id: postId },
          data: { repostsCount: { decrement: 1 } },
        })
        return NextResponse.json({ reposted: false, reposts: post.repostsCount })
      } else {
        await prisma.repost.create({
          data: { userId, postId },
        })
        const post = await prisma.post.update({
          where: { id: postId },
          data: { repostsCount: { increment: 1 } },
        })

        // Notify author
        if (post.authorId !== userId) {
          await prisma.notification.create({
            data: {
              recipientId: post.authorId,
              senderId: userId,
              postId: post.id,
              type: "repost",
              text: "reposted your post",
            },
          })
        }
        return NextResponse.json({ reposted: true, reposts: post.repostsCount })
      }
    }

    if (action === "bookmark") {
      const existing = await prisma.bookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      })

      if (existing) {
        await prisma.bookmark.delete({
          where: { userId_postId: { userId, postId } },
        })
        return NextResponse.json({ bookmarked: false })
      } else {
        await prisma.bookmark.create({
          data: { userId, postId },
        })
        return NextResponse.json({ bookmarked: true })
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    console.error("Action on post API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await prisma.post.delete({
      where: { id: params.id },
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Delete post API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
