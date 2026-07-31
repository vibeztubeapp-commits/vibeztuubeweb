const { PrismaClient } = require("@prisma/client")
const admin = require("firebase-admin")
const fs = require("fs")
const path = require("path")

// Initialize Prisma connecting to host-mapped port 5432
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://vibeztube_user:vibeztube_secure_pwd_998@localhost:5432/vibeztube_db?schema=public",
    },
  },
})

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, "../service-account.json")
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: service-account.json not found at " + serviceAccountPath)
  process.exit(1)
}

const serviceAccount = require(serviceAccountPath)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function main() {
  console.log("Starting database migration from Firestore to PostgreSQL...")

  // 1. Migrate Profiles -> Users
  console.log("Fetching profiles from Firestore...")
  const profilesSnap = await db.collection("profiles").get()
  console.log(`Found ${profilesSnap.size} profiles to migrate.`)

  for (const doc of profilesSnap.docs) {
    const data = doc.data()
    try {
      await prisma.user.upsert({
        where: { id: doc.id },
        update: {
          username: data.username || doc.id.toLowerCase(),
          displayName: data.displayName || "Creator",
          bio: data.bio || "",
          avatarUrl: data.avatarUrl || "",
          email: data.email || null,
          verifiedBadge: data.verifiedBadge || null,
        },
        create: {
          id: doc.id,
          username: data.username || doc.id.toLowerCase(),
          displayName: data.displayName || "Creator",
          bio: data.bio || "",
          avatarUrl: data.avatarUrl || "",
          email: data.email || null,
          verifiedBadge: data.verifiedBadge || null,
        },
      })
      console.log(`Migrated user profile: @${data.username} (${doc.id})`)
    } catch (err) {
      console.error(`Failed to migrate profile ${doc.id}:`, err.message)
    }
  }

  // 2. Migrate Follows
  console.log("Fetching follows from Firestore...")
  const followsSnap = await db.collection("follows").get()
  console.log(`Found ${followsSnap.size} follow connections.`)

  for (const doc of followsSnap.docs) {
    const data = doc.data()
    const followerUid = data.followerUid
    const followeeUid = data.followedUid || data.followeeUid

    if (!followerUid || !followeeUid) continue

    try {
      // Ensure users exist first to satisfy FK constraints
      const followerExists = await prisma.user.findUnique({ where: { id: followerUid } })
      const followeeExists = await prisma.user.findUnique({ where: { id: followeeUid } })

      if (followerExists && followeeExists) {
        await prisma.follow.upsert({
          where: {
            followerUid_followeeUid: { followerUid, followeeUid },
          },
          update: {},
          create: { followerUid, followeeUid },
        })
        console.log(`Migrated follow: ${followerUid} -> ${followeeUid}`)
      }
    } catch (err) {
      console.error(`Failed to migrate follow:`, err.message)
    }
  }

  // 3. Migrate Posts
  console.log("Fetching posts from Firestore...")
  const postsSnap = await db.collection("posts").get()
  console.log(`Found ${postsSnap.size} posts to migrate.`)

  for (const doc of postsSnap.docs) {
    const data = doc.data()
    const authorId = data.authorId

    if (!authorId) continue

    try {
      const authorExists = await prisma.user.findUnique({ where: { id: authorId } })
      if (!authorExists) {
        // Create skeleton user if author profile is missing
        await prisma.user.create({
          data: {
            id: authorId,
            username: `user_${authorId.slice(0, 6)}`,
            displayName: "Creator",
          },
        })
      }

      const media = data.media || []

      await prisma.post.upsert({
        where: { id: doc.id },
        update: {
          text: data.text || "",
          media: media,
          likesCount: Number(data.likes || 0),
          commentsCount: Number(data.comments || 0),
          repostsCount: Number(data.reposts || 0),
          viewsCount: Number(data.views || 0),
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        },
        create: {
          id: doc.id,
          authorId: authorId,
          text: data.text || "",
          media: media,
          likesCount: Number(data.likes || 0),
          commentsCount: Number(data.comments || 0),
          repostsCount: Number(data.reposts || 0),
          viewsCount: Number(data.views || 0),
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        },
      })
      console.log(`Migrated post ID: ${doc.id}`)
    } catch (err) {
      console.error(`Failed to migrate post ${doc.id}:`, err.message)
    }
  }

  // 4. Update follows aggregates
  console.log("Re-calculating user follows aggregate counters...")
  const users = await prisma.user.findMany()
  for (const u of users) {
    const followers = await prisma.follow.count({ where: { followeeUid: u.id } })
    const following = await prisma.follow.count({ where: { followerUid: u.id } })
    await prisma.user.update({
      where: { id: u.id },
      data: { followersCount: followers, followingCount: following },
    })
  }

  console.log("Database migration successfully finished!");
}

main()
  .catch((e) => {
    console.error("Migration script crashed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
