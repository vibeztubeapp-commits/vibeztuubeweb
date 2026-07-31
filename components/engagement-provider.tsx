"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./auth-provider"

type EngagementContextValue = {
  likedIds: Set<string>
  repostedIds: Set<string>
  bookmarkedIds: Set<string>
  isLiked: (postId: string) => boolean
  isReposted: (postId: string) => boolean
  isBookmarked: (postId: string) => boolean
  toggleLikeLocal: (postId: string) => void
  toggleRepostLocal: (postId: string) => void
  toggleBookmarkLocal: (postId: string) => void
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

    fetch(`/api/users/${user.uid}/engagements`)
      .then((res) => res.json())
      .then((data) => {
        setLikedIds(new Set(data.likedIds || []))
        setRepostedIds(new Set(data.repostedIds || []))
        setBookmarkedIds(new Set(data.bookmarkedIds || []))
      })
      .catch((err) => console.error("Error fetching user engagements:", err))
  }, [user?.uid])

  const isLiked = (postId: string) => likedIds.has(postId)
  const isReposted = (postId: string) => repostedIds.has(postId)
  const isBookmarked = (postId: string) => bookmarkedIds.has(postId)

  const toggleLikeLocal = (postId: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  const toggleRepostLocal = (postId: string) => {
    setRepostedIds((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  const toggleBookmarkLocal = (postId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  return (
    <EngagementContext.Provider
      value={{
        likedIds,
        repostedIds,
        bookmarkedIds,
        isLiked,
        isReposted,
        isBookmarked,
        toggleLikeLocal,
        toggleRepostLocal,
        toggleBookmarkLocal,
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
