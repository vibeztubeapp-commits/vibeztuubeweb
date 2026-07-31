import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    })

    const wordCounts: Record<string, { term: string; count: number; category: string; views: number }> = {}
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", "at", "from", "by", "for", "with", "about", 
      "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "of", "in", 
      "on", "this", "that", "these", "those", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", 
      "do", "does", "did", "will", "would", "shall", "should", "can", "could", "may", "might", "must", "they", "them", 
      "their", "theirs", "him", "her", "his", "hers", "its", "our", "ours", "us", "you", "your", "yours", "i", "me", "my", "mine"
    ])

    posts.forEach((p) => {
      const text = p.text || ""
      const views = p.viewsCount

      let category = "Trending"
      const textLower = text.toLowerCase()
      if (textLower.match(/(sport|football|soccer|basketball|tennis|olympics|game|match)/)) {
        category = "Sports"
      } else if (textLower.match(/(music|song|movie|entertainment|celeb|pop|star|show)/)) {
        category = "Entertainment"
      } else if (textLower.match(/(science|space|tech|ai|robot|physics|biology|health)/)) {
        category = "Science"
      } else if (textLower.match(/(news|politics|world|breaking)/)) {
        category = "News"
      }

      const regex = /(#\w+|\b[a-zA-Z]{4,}\b)/g
      const matches = text.match(regex) || []
      matches.forEach((match: string) => {
        const lower = match.toLowerCase()
        if (stopWords.has(lower)) return

        const term = match.startsWith("#") ? match : match.charAt(0).toUpperCase() + match.slice(1)
        if (!wordCounts[term]) {
          wordCounts[term] = { term, count: 0, category, views: 0 }
        }
        wordCounts[term].count += 1
        wordCounts[term].views += views
      })
    })

    const sorted = Object.values(wordCounts)
      .sort((a, b) => (b.count * 1000 + b.views) - (a.count * 1000 + a.views))
      .map((item) => ({
        tag: item.term,
        posts: `${item.count} post${item.count > 1 ? "s" : ""}`,
        category: item.category,
      }))
      .slice(0, 5)

    if (sorted.length === 0) {
      return NextResponse.json([
        { tag: "VibezTube", posts: "24 posts", category: "News" },
        { tag: "Shorts", posts: "18 posts", category: "Entertainment" },
        { tag: "Live", posts: "12 posts", category: "Technology" },
        { tag: "Video", posts: "8 posts", category: "Trending" },
        { tag: "Explore", posts: "6 posts", category: "Sports" },
      ])
    }

    return NextResponse.json(sorted)
  } catch (err: any) {
    console.error("Fetch trends API error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
