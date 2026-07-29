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

    // 1. Single listener for all likes
    const qLikes = query(collectionGroup(db, "likes"), where("uid", "==", user.uid))
    const unsubLikes = onSnapshot(qLikes, (snap) => {
      const ids = new Set<string>()
      snap.docs.forEach((docSnap) => {
        const postRef = docSnap.ref.parent.parent
        if (postRef) {
          ids.add(postRef.id)
        }
      })
      setLikedIds(ids)
    }, (err) => console.error("Error listening to user likes:", err))

    // 2. Single listener for all reposts
    const qReposts = query(collectionGroup(db, "reposts"), where("uid", "==", user.uid))
    const unsubReposts = onSnapshot(qReposts, (snap) => {
      const ids = new Set<string>()
      snap.docs.forEach((docSnap) => {
        const postRef = docSnap.ref.parent.parent
        if (postRef) {
          ids.add(postRef.id)
        }
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
