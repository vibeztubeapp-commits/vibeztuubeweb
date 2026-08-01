const { PrismaClient } = require("@prisma/client")
const { initializeApp, cert } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const fs = require("fs")
const path = require("path")

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://vibeztube_user:vibeztube_secure_pwd_998@localhost:5432/vibeztube_db?schema=public",
    },
  },
})

// Load Firebase Admin
const serviceAccountPath = "/service-account.json"
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Error: service-account.json not found at " + serviceAccountPath)
  process.exit(1)
}

const serviceAccount = require(serviceAccountPath)
initializeApp({
  credential: cert(serviceAccount),
})

async function run() {
  const email = "addiee69019@gmail.com"
  console.log(`Checking Firebase Auth record for email: ${email}...`)

  let firebaseUser
  try {
    firebaseUser = await getAuth().getUserByEmail(email)
    console.log(`Found Firebase user. Active UID: "${firebaseUser.uid}"`)
  } catch (err) {
    console.error("Error fetching user from Firebase Auth:", err.message)
    process.exit(1)
  }

  // Find user in PostgreSQL
  const dbUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  })

  if (!dbUser) {
    console.log(`No user found in PostgreSQL database with email: ${email}`)
    process.exit(1)
  }

  console.log(`Found database user. DB UID: "${dbUser.id}"`)

  if (dbUser.id === firebaseUser.uid) {
    console.log("Success: The database UID already matches the active Firebase Auth UID. No re-keying needed!")
    process.exit(0)
  }

  console.log(`Mismatch detected. Re-keying user from "${dbUser.id}" to "${firebaseUser.uid}"...`)

  const oldId = dbUser.id
  const newId = firebaseUser.uid

  await prisma.$transaction(async (tx) => {
    // 1. Create a temporary user with the new ID (to satisfy foreign key constraints during reference updates)
    await tx.user.create({
      data: {
        id: newId,
        username: `${dbUser.username}_new_${Math.random().toString(36).substr(2, 5)}`,
        displayName: dbUser.displayName,
        email: dbUser.email,
        bio: dbUser.bio,
        avatarUrl: dbUser.avatarUrl,
        verifiedBadge: dbUser.verifiedBadge,
        followersCount: dbUser.followersCount,
        followingCount: dbUser.followingCount,
      },
    })

    // 2. Update all relation tables
    console.log("Updating posts references...")
    await tx.post.updateMany({ where: { authorId: oldId }, data: { authorId: newId } })

    console.log("Updating comments references...")
    await tx.comment.updateMany({ where: { authorId: oldId }, data: { authorId: newId } })

    console.log("Updating likes references...")
    await tx.like.updateMany({ where: { userId: oldId }, data: { userId: newId } })

    console.log("Updating reposts references...")
    await tx.repost.updateMany({ where: { userId: oldId }, data: { userId: newId } })

    console.log("Updating bookmarks references...")
    await tx.bookmark.updateMany({ where: { userId: oldId }, data: { userId: newId } })

    console.log("Updating follows (follower) references...")
    await tx.follow.updateMany({ where: { followerUid: oldId }, data: { followerUid: newId } })

    console.log("Updating follows (followee) references...")
    await tx.follow.updateMany({ where: { followeeUid: oldId }, data: { followeeUid: newId } })

    console.log("Updating notifications (recipient) references...")
    await tx.notification.updateMany({ where: { recipientId: oldId }, data: { recipientId: newId } })

    console.log("Updating notifications (sender) references...")
    await tx.notification.updateMany({ where: { senderId: oldId }, data: { senderId: newId } })

    // 3. Delete the old user record
    console.log("Deleting old user record...")
    await tx.user.delete({ where: { id: oldId } })

    // 4. Update the temporary user's username to the correct original username
    console.log("Restoring original username...")
    await tx.user.update({
      where: { id: newId },
      data: { username: dbUser.username },
    })
  })

  console.log(`Successfully re-keyed user and linked all posts/followers to the new active UID: "${newId}"!`)
}

run()
  .catch((err) => console.error("Re-keying error:", err))
  .finally(() => prisma.$disconnect())
