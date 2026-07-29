"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./auth-provider"
import { db } from "@/lib/services"
import { collection, collectionGroup, onSnapshot, query, where } from "firebase/firestore"

type EngagementContextValue = {
  likedIds: Set<string>
  repostedIds: Set<string>
  bookmarkedIds: Set<string>
  isLiked: (postId: string) => boolean
  isReposted: (postId: string) => boolean
  isBookmarked: (postId: string) => boolean
}

const EngagementContext = createContext<EngagementContextValue | undefined>(undefined)

export function EngagementProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.uid) {
      setLikedIds(new Set())
      setRepostedIds(new Set())
      setBookmarkedIds(new Set())
      return
    }

    // 1. Single listener for all likes (Simple subcollection, no composite index needed)
    const unsubLikes = onSnapshot(collection(db, "profiles", user.uid, "likes"), (snap) => {
      const ids = new Set<string>()
      snap.docs.forEach((docSnap) => {
        ids.add(docSnap.id)
      })
      setLikedIds(ids)
    }, (err) => console.error("Error listening to user likes:", err))

    // 2. Single listener for all reposts (Simple subcollection, no composite index needed)
    const unsubReposts = onSnapshot(collection(db, "profiles", user.uid, "reposts"), (snap) => {
      const ids = new Set<string>()
      snap.docs.forEach((docSnap) => {
        ids.add(docSnap.id)
      })
      setRepostedIds(ids)
    }, (err) => console.error("Error listening to user reposts:", err))

    // 3. Single listener for all bookmarks
    const qBookmarks = query(collection(db, "bookmarks"), where("uid", "==", user.uid))
    const unsubBookmarks = onSnapshot(qBookmarks, (snap) => {
      const ids = new Set<string>()
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data()
        if (data.postId) {
          ids.add(data.postId)
        }
      })
      setBookmarkedIds(ids)
    }, (err) => console.error("Error listening to user bookmarks:", err))

    return () => {
      unsubLikes()
      unsubReposts()
      unsubBookmarks()
    }
  }, [user?.uid])

  const isLiked = (postId: string) => likedIds.has(postId)
  const isReposted = (postId: string) => repostedIds.has(postId)
  const isBookmarked = (postId: string) => bookmarkedIds.has(postId)

  return (
    <EngagementContext.Provider
      value={{
        likedIds,
        repostedIds,
        bookmarkedIds,
        isLiked,
        isReposted,
        isBookmarked,
      }}
    >
      {children}
    </EngagementContext.Provider>
  )
}

export function useEngagement() {
  const context = useContext(EngagementContext)
  if (!context) {
    throw new Error("useEngagement must be used within an EngagementProvider")
  }
  return context
}
