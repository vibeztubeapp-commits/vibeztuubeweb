import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: params.id },
      include: {
        author: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    const formatted = comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      parentId: c.parentId,
      authorId: c.authorId,
      text: c.text,
      likes: c.likesCount,
      comments: c.commentsCount,
      views: c.viewsCount,
      createdAt: c.createdAt.toISOString(),
      authorProfile: c.author ? {
        uid: c.author.id,
        username: c.author.username,
        displayName: c.author.displayName,
        avatarUrl: c.author.avatarUrl,
        verifiedBadge: c.author.verifiedBadge,
      } : null,
    }))

    return NextResponse.json(formatted)
  } catch (err: any) {
    console.error("Get comments API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json()
    const { authorId, text, parentCommentId } = body
    const postId = params.id

    if (!authorId || !text) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId,
        text,
        parentId: parentCommentId || null,
      },
      include: {
        author: true,
      },
    })

    // Increment comment count on Post
    await prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    })

    // If it's a nested reply, increment count on parent comment
    if (parentCommentId) {
      await prisma.comment.update({
        where: { id: parentCommentId },
        data: { commentsCount: { increment: 1 } },
      })
    }

    return NextResponse.json({
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      authorId: comment.authorId,
      text: comment.text,
      likes: comment.likesCount,
      comments: comment.commentsCount,
      views: comment.viewsCount,
      createdAt: comment.createdAt.toISOString(),
      authorProfile: comment.author ? {
        uid: comment.author.id,
        username: comment.author.username,
        displayName: comment.author.displayName,
        avatarUrl: comment.author.avatarUrl,
        verifiedBadge: comment.author.verifiedBadge,
      } : null,
    })
  } catch (err: any) {
    console.error("Create comment API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
