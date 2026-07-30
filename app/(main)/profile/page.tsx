"use client"

import { useEffect, useState, useTransition, Suspense } from "react"
import { useAuth } from "@/components/auth-provider"
import { AuthGuard } from "@/components/auth-guard"
import { FeedColumn } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/user-avatar"
import { PostCard } from "@/components/post-card"
import { db, getUserProfile, updateUserProfile, uploadToCloudinary, isUsernameAvailable, confirmUsernameReservation, followUser, unfollowUser } from "@/lib/services"
import { collection, getDocs, query, where, orderBy, doc, getDoc, deleteDoc, onSnapshot, setDoc, serverTimestamp, collectionGroup } from "firebase/firestore"
import { CalendarDays, Link as LinkIcon, MapPin, Share2, Camera, X, Check, Loader2, UserPlus, UserCheck, Bell, BellRing, MessageSquare } from "lucide-react"
import { VerifiedBadge } from "@/components/verified-badge"
import { useSearchParams, useRouter } from "next/navigation"

function ProfileView() {
  const { user, signOut } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryUid = searchParams?.get("uid")
  const targetUid = queryUid || user?.uid

  const [profile, setProfile] = useState<any>(null)
  const [following, setFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState("posts")
  const [posts, setPosts] = useState<any[]>([])
  const [replies, setReplies] = useState<any[]>([])
  const [media, setMedia] = useState<any[]>([])
  const [likes, setLikes] = useState<any[]>([])
  const [reposts, setReposts] = useState<any[]>([])

  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const [showFollowsModal, setShowFollowsModal] = useState(false)
  const [followsModalType, setFollowsModalType] = useState<"followers" | "following">("followers")
  const [followsList, setFollowsList] = useState<any[]>([])
  const [loadingFollows, setLoadingFollows] = useState(false)

  const openFollowsModal = async (type: "followers" | "following") => {
    setFollowsModalType(type)
    setShowFollowsModal(true)
    setLoadingFollows(true)
    setFollowsList([])
    
    try {
      const q = query(
        collection(db, "follows"),
        where(type === "followers" ? "followeeUid" : "followerUid", "==", targetUid)
      )
      const snap = await getDocs(q)
      const list: any[] = []
      
      for (const docSnap of snap.docs) {
        const data = docSnap.data()
        const otherUid = type === "followers" ? data.followerUid : data.followeeUid
        if (otherUid) {
          const profileData = await getUserProfile(otherUid)
          if (profileData) {
            list.push({ ...profileData, uid: otherUid })
          }
        }
      }
      setFollowsList(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingFollows(false)
    }
  }

  useEffect(() => {
    if (!user || !targetUid || targetUid === user.uid) return
    const followRef = doc(db, "follows", `${user.uid}_${targetUid}`)
    return onSnapshot(followRef, (snap) => {
      setFollowing(snap.exists())
    })
  }, [user, targetUid])

  useEffect(() => {
    if (!targetUid) return
    const q = query(collection(db, "follows"), where("followeeUid", "==", targetUid))
    return onSnapshot(q, (snap) => {
      setFollowersCount(snap.size)
    })
  }, [targetUid])

  useEffect(() => {
    if (!targetUid) return
    const q = query(collection(db, "follows"), where("followerUid", "==", targetUid))
    return onSnapshot(q, (snap) => {
      setFollowingCount(snap.size)
    })
  }, [targetUid])

  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!user || !targetUid || targetUid === user.uid) return
    const subRef = doc(db, "subscriptions", `${user.uid}_${targetUid}`)
    return onSnapshot(subRef, (snap) => {
      setSubscribed(snap.exists() && snap.data()?.enabled)
    })
  }, [user, targetUid])

  const handleSubscribeToggle = async () => {
    if (!user || !targetUid) return
    const subRef = doc(db, "subscriptions", `${user.uid}_${targetUid}`)
    try {
      if (subscribed) {
        await deleteDoc(subRef)
      } else {
        await setDoc(subRef, { followerUid: user.uid, creatorUid: targetUid, enabled: true, createdAt: serverTimestamp() })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleFollowToggle = async () => {
    if (!user || !targetUid) return
    try {
      if (following) {
        await unfollowUser(targetUid)
      } else {
        await followUser(targetUid)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editLocation, setEditLocation] = useState("")
  const [editWebsite, setEditWebsite] = useState("")
  const [editAvatarUrl, setEditAvatarUrl] = useState("")
  const [editBannerUrl, setEditBannerUrl] = useState("")
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadProfile = async () => {
    if (!targetUid) return
    const p = await getUserProfile(targetUid)
    if (p) {
      setProfile(p)
      setEditDisplayName(p.displayName || "")
      setEditUsername(p.username || "")
      setEditBio(p.bio || "")
      setEditLocation(p.location || "")
      setEditWebsite(p.website || "")
      setEditAvatarUrl(p.avatarUrl || "")
      setEditBannerUrl(p.bannerUrl || "")
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [targetUid])

  // Load Timeline items
  useEffect(() => {
    if (!targetUid) return
    const loadTimeline = async () => {
      try {
        // Query user's posts
        const qPosts = query(
          collection(db, "posts"),
          where("authorId", "==", targetUid)
        )
        const snapPosts = await getDocs(qPosts)
        const postsList = snapPosts.docs.map((d) => ({ id: d.id, ...d.data() }))
        postsList.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime())
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime())
          return timeB - timeA
        })
        // Set posts state to original posts only (repostOf is null or undefined)
        setPosts(postsList.filter((p: any) => !p.repostOf))

        // Filter Media posts
        setMedia(postsList.filter((p: any) => !p.repostOf && p.media && p.media.length > 0))

        // Query comments (Replies) (Simple collection query, no index needed)
        const snapReplies = await getDocs(collection(db, "profiles", targetUid, "replies"))
        const repliesList = snapReplies.docs.map((d) => ({ id: d.id, ...d.data() }))
        repliesList.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime())
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime())
          return timeB - timeA
        })
        setReplies(repliesList)

        // Query Likes (Simple collection query, no index needed)
        const snapLikes = await getDocs(collection(db, "profiles", targetUid, "likes"))
        const likedPosts: any[] = []
        for (const lDoc of snapLikes.docs) {
          const postRef = doc(db, "posts", lDoc.id)
          const postSnap = await getDoc(postRef)
          if (postSnap.exists()) {
            likedPosts.push({ id: postSnap.id, ...postSnap.data() })
          }
        }
        likedPosts.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime())
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime())
          return timeB - timeA
        })
        setLikes(likedPosts)

        // Query Reposts (Filter postsList where repostOf is present)
        setReposts(postsList.filter((p: any) => p.repostOf != null))
      } catch (e) {
        console.error("Error loading timeline", e)
      }
    }
    void loadTimeline()
  }, [targetUid, activeTab])

  const handleShare = async () => {
    if (typeof window === "undefined") return
    const shareUrl = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile?.displayName || "VibezTube Profile",
          url: shareUrl,
        })
      } catch (e) {
        console.error(e)
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert("Profile link copied to clipboard!")
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadToCloudinary(file)
      setEditAvatarUrl(url)
    } catch (err) {
      console.error(err)
      alert("Avatar upload failed")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    try {
      const url = await uploadToCloudinary(file)
      setEditBannerUrl(url)
    } catch (err) {
      console.error(err)
      alert("Banner upload failed")
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !profile) return
    setSaving(true)
    try {
      const originalUsername = profile.username || ""
      const cleanNewUsername = editUsername.trim().replace(/^@/, "").toLowerCase()
      
      if (cleanNewUsername !== originalUsername) {
        if (cleanNewUsername.length < 3) {
          alert("Handle must be at least 3 characters long")
          setSaving(false)
          return
        }
        
        const available = await isUsernameAvailable(cleanNewUsername)
        if (!available) {
          alert("That handle is already taken. Please try another one.")
          setSaving(false)
          return
        }
        
        await confirmUsernameReservation(cleanNewUsername, user.uid)
        
        if (originalUsername) {
          try {
            await deleteDoc(doc(db, "username-reservations", originalUsername))
          } catch (err) {
            console.warn("Failed to delete old username reservation:", err)
          }
        }
      }

      await updateUserProfile({
        displayName: editDisplayName,
        username: cleanNewUsername || undefined,
        bio: editBio,
        location: editLocation,
        website: editWebsite,
        avatarUrl: editAvatarUrl,
        bannerUrl: editBannerUrl,
      })
      await loadProfile()
      setIsEditOpen(false)
    } catch (e) {
      console.error(e)
      alert("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "July 2026"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  return (
    <div className="flex justify-center min-h-screen">
      <FeedColumn header={
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold flex items-center">
              <span>{profile?.displayName || "Profile"}</span>
              <VerifiedBadge type={profile?.verifiedBadge} />
            </h1>
            <p className="text-xs text-muted-foreground">{posts.length} posts</p>
          </div>
        </div>
      }>
        <div className="relative">
          {/* Cover Photo */}
          <div className="relative h-44 w-full bg-neutral-800">
            {profile?.bannerUrl || editBannerUrl ? (
              <img
                src={profile?.bannerUrl || editBannerUrl}
                alt="Profile banner"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-violet-600 to-indigo-600" />
            )}
          </div>

          {/* Profile Details Row */}
          <div className="px-4 pb-4">
            <div className="flex justify-between items-end -mt-16 mb-4">
              {/* Profile Avatar */}
              <div className="relative h-28 w-28 rounded-full border-4 border-background bg-card overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                    {(profile?.displayName || "U")[0]}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full h-9 w-9 p-0" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                {targetUid === user?.uid ? (
                  <Button size="sm" variant="outline" className="rounded-full font-bold px-4 h-9" onClick={() => setIsEditOpen(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full h-9 w-9 p-0 flex items-center justify-center border border-border"
                      onClick={() => router.push(`/messages?userId=${targetUid}`)}
                      title="Chat"
                    >
                      <MessageSquare className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant={subscribed ? "default" : "outline"}
                      className="rounded-full h-9 w-9 p-0 flex items-center justify-center border border-border"
                      onClick={handleSubscribeToggle}
                      title={subscribed ? "Turn off notifications" : "Turn on new post notifications"}
                    >
                      {subscribed ? (
                        <Bell className="h-4.5 w-4.5 fill-red-500 text-red-500" />
                      ) : (
                        <Bell className="h-4.5 w-4.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={following ? "outline" : "default"}
                      className="rounded-full h-9 w-9 p-0 flex items-center justify-center border border-border"
                      onClick={handleFollowToggle}
                      title={following ? "Unfollow" : "Follow"}
                    >
                      {following ? (
                        <UserCheck className="h-4.5 w-4.5 text-emerald-500" />
                      ) : (
                        <UserPlus className="h-4.5 w-4.5" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-extrabold text-foreground leading-tight flex items-center">
                  <span>{profile?.displayName || "VibezTube User"}</span>
                  <VerifiedBadge type={profile?.verifiedBadge} />
                </h2>
                <p className="text-sm text-muted-foreground">@{profile?.username || "username"}</p>
              </div>

              {profile?.bio && <p className="text-sm text-foreground leading-normal whitespace-pre-wrap">{profile.bio}</p>}

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {profile?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {profile.location}
                  </span>
                )}
                {profile?.website && (
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <LinkIcon className="h-3.5 w-3.5" /> {profile.website}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> Joined {formatDate(profile?.createdAt)}
                </span>
              </div>

              <div className="flex gap-4 text-sm pt-1">
                <button onClick={() => void openFollowsModal("following")} className="text-muted-foreground hover:underline cursor-pointer">
                  <strong className="text-foreground font-semibold">{followingCount}</strong> Following
                </button>
                <button onClick={() => void openFollowsModal("followers")} className="text-muted-foreground hover:underline cursor-pointer">
                  <strong className="text-foreground font-semibold">{followersCount}</strong> Followers
                </button>
              </div>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="flex border-b border-border overflow-x-auto">
            {["posts", "replies", "media", "likes", "reposts"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold capitalize transition-all border-b-2 text-center min-w-[80px] cursor-pointer ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent/40"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Timeline Feed Container */}
          {/* Timeline Feed Container */}
          <div className="divide-y divide-border min-h-[300px]">
            {activeTab === "posts" && (
              posts.filter(p => !p.repostOf).length > 0 ? (
                posts.filter(p => !p.repostOf).map((p) => (
                  <PostCard key={p.id} post={p} />
                ))
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No posts yet.</div>
              )
            )}

            {activeTab === "reposts" && (
              reposts.length > 0 ? (
                reposts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No reposts yet.</div>
              )
            )}

            {activeTab === "likes" && (
              likes.length > 0 ? (
                likes.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No liked posts yet.</div>
              )
            )}

            {activeTab === "media" && (
              media.length > 0 ? (
                media.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No media posts found.</div>
              )
            )}

            {activeTab === "replies" && (
              replies.length > 0 ? (
                replies.map((reply) => (
                  <div key={reply.id} className="p-4 hover:bg-accent/10 transition-colors">
                    <div className="flex gap-2.5 items-start">
                      <UserAvatar user={profile} className="h-8 w-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-bold text-foreground">{profile?.displayName || "User"}</span>
                          <VerifiedBadge type={profile?.verifiedBadge} />
                          <span className="text-muted-foreground truncate">@{profile?.username}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-[10px] text-primary font-medium mt-0.5">
                          Replied on thread:
                        </p>
                        <p className="text-xs text-foreground/90 mt-1 whitespace-pre-wrap leading-relaxed">{reply.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No replies yet.</div>
              )
            )}
          </div>
        </div>
      </FeedColumn>
      <RightRail />

      {/* Edit Profile Modal Dialog */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-full p-1.5 hover:bg-accent text-muted-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-bold">Edit Profile</h3>
              </div>
              <Button
                size="sm"
                onClick={() => void handleSaveProfile()}
                disabled={saving || uploadingAvatar || uploadingBanner}
                className="font-bold rounded-full px-5"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>

            {/* Scrollable Container */}
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
              {/* Banner Upload */}
              <div className="relative h-32 w-full bg-neutral-800 rounded-xl overflow-hidden border border-border">
                {editBannerUrl ? (
                  <img src={editBannerUrl} alt="banner preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-r from-violet-600 to-indigo-600" />
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition-opacity hover:opacity-100 opacity-90">
                  <Camera className="h-6 w-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                </label>
                {uploadingBanner && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Avatar Upload */}
              <div className="flex gap-4 items-center">
                <div className="relative h-20 w-20 rounded-full overflow-hidden border border-border bg-muted">
                  {editAvatarUrl ? (
                    <img src={editAvatarUrl} alt="avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                      {editDisplayName[0] || "U"}
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/45 cursor-pointer opacity-90 hover:opacity-100">
                    <Camera className="h-5 w-5 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">Profile Photo</p>
                  <p className="text-xs text-muted-foreground">Supported format: JPG, PNG, WEBP</p>
                </div>
              </div>

              {/* Display Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Display Name
                </label>
                <Input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>

              {/* Username Handle Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Username Handle
                </label>
                <Input
                  value={editUsername.startsWith("@") || !editUsername ? editUsername : `@${editUsername}`}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. @yourhandle"
                />
              </div>

              {/* Bio Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bio
                </label>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  rows={3}
                />
              </div>

              {/* Location Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Location
                </label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                />
              </div>

              {/* Website Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Website
                </label>
                <Input
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="e.g. vibeztube.com"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follows List Modal Dialog */}
      {showFollowsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold capitalize">
                {followsModalType === "followers" ? "Followers" : "Following"}
              </h3>
              <button
                type="button"
                onClick={() => setShowFollowsModal(false)}
                className="rounded-full p-1.5 hover:bg-accent text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {loadingFollows ? (
                <div className="py-12 flex justify-center items-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                  Loading list...
                </div>
              ) : followsList.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {followsList.map((u) => (
                    <div 
                      key={u.uid || u.id}
                      onClick={() => {
                        setShowFollowsModal(false)
                        router.push(`/profile?uid=${u.uid || u.id}`)
                      }}
                      className="flex items-center gap-3 py-3 px-2 hover:bg-accent/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <UserAvatar user={u} className="h-9 w-9 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs flex items-center gap-0.5 text-foreground truncate">
                          <span>{u.displayName || u.name || "User"}</span>
                          <VerifiedBadge type={u.verifiedBadge} />
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">@{u.username || "username"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No {followsModalType} found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="py-20 text-center text-xs text-muted-foreground">Loading profile...</div>}>
        <ProfileView />
      </Suspense>
    </AuthGuard>
  )
}
