const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://vibeztube_user:vibeztube_secure_pwd_998@localhost:5432/vibeztube_db?schema=public",
    },
  },
})

async function clean() {
  console.log("Starting database deduplication and cleanup...")

  // 1. Clean duplicate follows
  console.log("Cleaning duplicate follows...")
  const follows = await prisma.follow.findMany()
  const followKeys = new Set()
  let deletedFollowsCount = 0

  for (const follow of follows) {
    const key = `${follow.followerUid}_${follow.followeeUid}`
    if (followKeys.has(key)) {
      await prisma.follow.delete({
        where: {
          followerUid_followeeUid: {
            followerUid: follow.followerUid,
            followeeUid: follow.followeeUid,
          },
        },
      })
      deletedFollowsCount++
    } else {
      followKeys.add(key)
    }
  }
  console.log(`Removed ${deletedFollowsCount} duplicate follows.`)

  // 2. Clean duplicate likes
  console.log("Cleaning duplicate likes...")
  const likes = await prisma.like.findMany()
  const likeKeys = new Set()
  let deletedLikesCount = 0

  for (const like of likes) {
    const key = `${like.userId}_${like.postId}`
    if (likeKeys.has(key)) {
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: like.userId,
            postId: like.postId,
          },
        },
      })
      deletedLikesCount++
    } else {
      likeKeys.add(key)
    }
  }
  console.log(`Removed ${deletedLikesCount} duplicate likes.`)

  // 3. Clean duplicate reposts
  console.log("Cleaning duplicate reposts...")
  const reposts = await prisma.repost.findMany()
  const repostKeys = new Set()
  let deletedRepostsCount = 0

  for (const repost of reposts) {
    const key = `${repost.userId}_${repost.postId}`
    if (repostKeys.has(key)) {
      await prisma.repost.delete({
        where: {
          userId_postId: {
            userId: repost.userId,
            postId: repost.postId,
          },
        },
      })
      deletedRepostsCount++
    } else {
      repostKeys.add(key)
    }
  }
  console.log(`Removed ${deletedRepostsCount} duplicate reposts.`)

  // 4. Clean duplicate users (same username, different IDs)
  console.log("Resolving duplicate usernames...")
  const users = await prisma.user.findMany()
  const usernames = new Map()
  let resolvedUsersCount = 0

  for (const user of users) {
    const lowerUsername = user.username.toLowerCase()
    if (usernames.has(lowerUsername)) {
      const primaryUser = usernames.get(lowerUsername)
      console.log(`Found duplicate username @${user.username}. Keeping ID ${primaryUser.id}, deleting/merging ID ${user.id}`)

      // Merge user relations to the primary user
      await prisma.post.updateMany({
        where: { authorId: user.id },
        data: { authorId: primaryUser.id },
      })
      await prisma.comment.updateMany({
        where: { authorId: user.id },
        data: { authorId: primaryUser.id },
      })
      await prisma.like.updateMany({
        where: { userId: user.id },
        data: { userId: primaryUser.id },
      }).catch(() => {}) // Ignore errors if like already exists on primary
      await prisma.repost.updateMany({
        where: { userId: user.id },
        data: { userId: primaryUser.id },
      }).catch(() => {})
      await prisma.bookmark.updateMany({
        where: { userId: user.id },
        data: { userId: primaryUser.id },
      }).catch(() => {})

      // Delete the duplicate user record
      await prisma.user.delete({ where: { id: user.id } })
      resolvedUsersCount++
    } else {
      usernames.set(lowerUsername, user)
    }
  }
  console.log(`Successfully merged/deleted ${resolvedUsersCount} duplicate user accounts.`)
  console.log("Database cleanup completed successfully!")
}

clean()
  .catch(err => console.error("Cleanup error:", err))
  .finally(() => prisma.$disconnect())
