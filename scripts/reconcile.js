const { PrismaClient } = require("@prisma/client")
const { initializeApp, cert } = require("firebase-admin/app")
const { getFirestore } = require("firebase-admin/firestore")
const fs = require("fs")
const path = require("path")

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://vibeztube_user:vibeztube_secure_pwd_998@localhost:5432/vibeztube_db?schema=public",
    },
  },
})

// Initialize Firebase Admin SDK
const serviceAccountPath = "/service-account.json"
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: service-account.json not found at " + serviceAccountPath)
  process.exit(1)
}

const serviceAccount = require(serviceAccountPath)
initializeApp({
  credential: cert(serviceAccount),
})
const db = getFirestore()

async function audit() {
  console.log("====================================================")
  console.log("    VIBEZTUBE FIREBASE -> POSTGRESQL RECONCILIATION   ")
  console.log("====================================================")

  // 1. Audit Users
  const fbProfilesSnap = await db.collection("profiles").get()
  const fbUsersCount = fbProfilesSnap.size
  const pgUsersCount = await prisma.user.count()
  
  let matchedUsers = 0
  let missingUsers = []
  let duplicateUsernames = new Map()

  for (const doc of fbProfilesSnap.docs) {
    const data = doc.data()
    const pgUser = await prisma.user.findUnique({ where: { id: doc.id } })
    if (pgUser) {
      matchedUsers++
    } else {
      missingUsers.push({ uid: doc.id, username: data.username, email: data.email })
    }

    const usernameLower = (data.username || "").toLowerCase()
    if (usernameLower) {
      if (duplicateUsernames.has(usernameLower)) {
        duplicateUsernames.get(usernameLower).push(doc.id)
      } else {
        duplicateUsernames.set(usernameLower, [doc.id])
      }
    }
  }

  // Filter duplicate usernames that exist on different UIDs
  const duplicateUserGroups = []
  for (const [username, uids] of duplicateUsernames.entries()) {
    if (uids.length > 1) {
      duplicateUserGroups.push({ username, uids })
    }
  }

  // 2. Audit Posts
  const fbPostsSnap = await db.collection("posts").get()
  const fbPostsCount = fbPostsSnap.size
  const pgPostsCount = await prisma.post.count()

  let matchedPosts = 0
  let missingPosts = []
  let orphanedPosts = []

  for (const doc of fbPostsSnap.docs) {
    const data = doc.data()
    const pgPost = await prisma.post.findUnique({ where: { id: doc.id } })
    if (pgPost) {
      matchedPosts++
      // Check if author exists in PG
      const pgAuthor = await prisma.user.findUnique({ where: { id: pgPost.authorId } })
      if (!pgAuthor) {
        orphanedPosts.push({ postId: pgPost.id, authorId: pgPost.authorId })
      }
    } else {
      missingPosts.push({ id: doc.id, authorId: data.authorId })
    }
  }

  // 3. Audit Follows
  const fbFollowsSnap = await db.collection("follows").get()
  const fbFollowsCount = fbFollowsSnap.size
  const pgFollowsCount = await prisma.follow.count()

  console.log("\n--- RECONCILIATION DRY-RUN REPORT ---")
  console.log(`Users:`)
  console.log(`  - Total Firebase (Firestore): ${fbUsersCount}`)
  console.log(`  - Total PostgreSQL Users:     ${pgUsersCount}`)
  console.log(`  - Successfully Matched:       ${matchedUsers}`)
  console.log(`  - Missing in PostgreSQL:      ${missingUsers.length}`)
  console.log(`  - Duplicate Username Groups:  ${duplicateUserGroups.length}`)

  console.log(`Posts:`)
  console.log(`  - Total Firebase Posts:       ${fbPostsCount}`)
  console.log(`  - Total PostgreSQL Posts:     ${pgPostsCount}`)
  console.log(`  - Successfully Matched:       ${matchedPosts}`)
  console.log(`  - Missing in PostgreSQL:      ${missingPosts.length}`)
  console.log(`  - Orphaned (Author Missing):  ${orphanedPosts.length}`)

  console.log(`Follows:`)
  console.log(`  - Total Firebase Follows:     ${fbFollowsCount}`)
  console.log(`  - Total PostgreSQL Follows:   ${pgFollowsCount}`)
  console.log("====================================================")
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
