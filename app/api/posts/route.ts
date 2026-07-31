import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const authorId = searchParams.get("authorId")
    const limitParam = Number(searchParams.get("limit") || "20")

    let posts = []

    if (authorId) {
      // Query specific user's posts
      posts = await prisma.post.findMany({
        where: { authorId },
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limitParam,
      })
    } else {
      // Feed recommendation algorithm (fetch posts, include authors)
      posts = await prisma.post.findMany({
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limitParam,
      })
    }

    // Map fields to match client-side expected post model schema
    const formatted = posts.map((p) => ({
      id: p.id,
      authorId: p.authorId,
      text: p.text,
      media: p.media,
      likes: p.likesCount,
      comments: p.commentsCount,
      reposts: p.repostsCount,
      views: String(p.viewsCount),
      createdAt: p.createdAt.toISOString(),
      authorProfile: p.author ? {
        uid: p.author.id,
        username: p.author.username,
        displayName: p.author.displayName,
        avatarUrl: p.author.avatarUrl,
        verifiedBadge: p.author.verifiedBadge,
        bio: p.author.bio,
      } : null,
    }))

    return NextResponse.json(formatted)
  } catch (err: any) {
    console.error("Fetch posts API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { authorId, text, media } = body

    if (!authorId || !text) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const post = await prisma.post.create({
      data: {
        authorId,
        text,
        media: media || [],
      },
      include: {
        author: true,
      },
    })

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
      } : null,
    })
  } catch (err: any) {
    console.error("Create post API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
