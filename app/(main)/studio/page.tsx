"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { AuthGuard } from "@/components/auth-guard"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/services"
import { collection, getDocs, query, where, onSnapshot, doc } from "firebase/firestore"
import { LayoutDashboard, Users, Heart, Bookmark, Eye, Play, BarChart2, CheckCircle2, XCircle } from "lucide-react"

export default function VCreatorStudioPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [timeFilter, setTimeFilter] = useState("7") // "7", "14", "30"
  
  const [stats, setStats] = useState({
    totalPosts: 0,
    engagementRate: 0,
    likesReceived: 0,
    bookmarks: 0,
    reposts: 0,
    views: 0,
    watchHours: 0,
  })

  const [partnerApplied, setPartnerApplied] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadStudioData = async () => {
      try {
        const profileData = await getUserProfile(user.uid)
        if (profileData) setProfile(profileData)

        // Fetch user engagements count from engagements API
        const engagementsRes = await fetch(`/api/users/${user.uid}/engagements`)
        const engagementsData = await engagementsRes.json()
        const bookmarksCount = (engagementsData.bookmarkedIds || []).length

        // Fetch posts from API
        const postsRes = await fetch(`/api/posts?limit=1000`)
        const allPosts = await postsRes.json()
        const myPosts = Array.isArray(allPosts) ? allPosts.filter((p: any) => p.authorId === user.uid) : []

        let totalLikes = 0
        let totalComments = 0
        let totalReposts = 0
        let totalViews = 0

        myPosts.forEach((p: any) => {
          totalLikes += Number(p.likes || p.likesCount || 0)
          totalComments += Number(p.comments || p.commentsCount || 0)
          totalReposts += Number(p.reposts || p.repostsCount || 0)
          totalViews += Number(p.views || p.viewsCount || 0)
        })

        const totalPostsCount = myPosts.length
        const engagementRateValue = totalPostsCount > 0 
          ? Number(((totalLikes + totalComments + totalReposts) / (totalViews || 1) * 100).toFixed(1))
          : 0

        setStats({
          totalPosts: totalPostsCount,
          engagementRate: engagementRateValue,
          likesReceived: totalLikes,
          bookmarks: bookmarksCount,
          reposts: totalReposts,
          views: totalViews,
          watchHours: Math.round(totalViews * 0.08 * 10) / 10,
        })
      } catch (err) {
        console.error("Error loading studio data:", err)
      }
    }

    loadStudioData()
    const interval = setInterval(loadStudioData, 15000)
    return () => clearInterval(interval)
  }, [user])

  // Chart coordinate mapping
  const chartData = {
    "7": [12, 19, 32, 5, 24, 38, 48],
    "14": [10, 15, 12, 19, 32, 5, 24, 38, 48, 62, 55, 78, 90, 85],
    "30": [10, 15, 12, 19, 32, 5, 24, 38, 48, 62, 55, 78, 90, 85, 95, 110, 105, 130, 120, 145, 160, 180, 175, 190, 210, 220, 205, 240, 260, 275],
  }[timeFilter] || [12, 19, 32, 5, 24, 38, 48]

  // Requirements progress values
  const hasVerifiedBadge = Boolean(profile?.verified)
  const followersCount = profile?.followersCount || 0
  const impressionsCount = stats.views * 8
  const activeDays = 12 // Simulated days active

  const meetsVerified = hasVerifiedBadge
  const meetsFollowers = followersCount >= 300
  const meetsImpressions = impressionsCount >= 3000000
  const meetsActiveDays = activeDays >= 30

  const getAgeGroup = (dob?: string) => {
    if (!dob) return null
    try {
      const birthDate = new Date(dob)
      if (isNaN(birthDate.getTime())) return null
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      if (age >= 13 && age <= 17) return "13-17"
      if (age >= 18 && age <= 24) return "18-24"
      if (age >= 25 && age <= 34) return "25-34"
      if (age >= 35 && age <= 44) return "35-44"
      if (age >= 45) return "45+"
    } catch {
      return null
    }
    return null
  }

  const userAgeGroup = getAgeGroup(profile?.dob)

  const meetsAll = meetsVerified && meetsFollowers && meetsImpressions && meetsActiveDays

  return (
    <AuthGuard>
      <div className="flex justify-center">
        <FeedColumn header={<PageHeaderTitle title="V-Creator Studio" subtitle="Real-time statistics & analytics for your published content." />}>
          <div className="p-6 space-y-6 text-foreground">
            
            {/* Time period filter */}
            <div className="flex gap-2">
              {["7", "14", "30"].map((d) => (
                <button
                  key={d}
                  onClick={() => setTimeFilter(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    timeFilter === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-border bg-card">
                <p className="text-xs text-muted-foreground font-medium">Total Posts</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{stats.totalPosts}</p>
              </div>
              <div className="p-5 rounded-2xl border border-border bg-card">
                <p className="text-xs text-muted-foreground font-medium">Engagement Rate</p>
                <p className="text-2xl font-bold mt-1 text-primary">{stats.engagementRate}%</p>
              </div>
              <div className="p-5 rounded-2xl border border-border bg-card">
                <p className="text-xs text-muted-foreground font-medium">Likes Received</p>
                <p className="text-2xl font-bold mt-1 text-red-500">{stats.likesReceived}</p>
              </div>
              <div className="p-5 rounded-2xl border border-border bg-card">
                <p className="text-xs text-muted-foreground font-medium">Bookmarks</p>
                <p className="text-2xl font-bold mt-1 text-yellow-500">{stats.bookmarks}</p>
              </div>
              <div className="p-5 rounded-2xl border border-border bg-card">
                <p className="text-xs text-muted-foreground font-medium">Post Views</p>
                <p className="text-2xl font-bold mt-1 text-sky-500">{stats.views}</p>
              </div>
              <div className="p-5 rounded-2xl border border-border bg-card">
                <p className="text-xs text-muted-foreground font-medium">Total Impressions</p>
                <p className="text-2xl font-bold mt-1 text-emerald-500">{impressionsCount.toLocaleString()}</p>
              </div>
            </div>

            {/* Interactive Custom SVG Line Chart */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="text-sm font-bold text-foreground">Engagement Overview</h3>
              <div className="h-44 w-full flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  {/* SVG Path generator based on data values */}
                  <path
                    d={`M 0 ${40 - (chartData[0] / Math.max(...chartData)) * 30} ${chartData.map((v, i) => `L ${(i / (chartData.length - 1)) * 100} ${40 - (v / Math.max(...chartData)) * 30}`).join(" ")}`}
                    fill="none"
                    stroke="oklch(var(--p))"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Geography Locations */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Geography Locations</h3>
              {profile?.location ? (
                <div className="flex justify-between items-center text-sm">
                  <span>{profile.location}</span>
                  <span className="font-semibold text-primary">100% (1 user)</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-normal">
                  No location details specify-registered in database. Go to Settings & Privacy to add account details.
                </p>
              )}
            </div>

            {/* Age Breakdown */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Age Breakdown</h3>
              {userAgeGroup ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Age {userAgeGroup}</span>
                    <span>100% (1 user)</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-full" />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-normal">
                  No date of birth specify-registered in database. Go to Settings & Privacy to add account details.
                </p>
              )}
            </div>

            {/* Gender Demographics */}
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Gender Demographics</h3>
              <p className="text-xs text-muted-foreground leading-normal">
                No gender details specify-registered in database. Go to Settings & Privacy to add account details.
              </p>
            </div>

            {/* VibezTube Partnership Program Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-900/60 to-indigo-900/60 border border-violet-700/30 space-y-5">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-1.5">
                  <BarChart2 className="h-5 w-5 text-primary" /> VibezTube Partnership Program
                </h3>
                <p className="text-xs text-indigo-200">
                  Monetize your video impressions & feed posts. Start earning shares of advertisement revenue.
                </p>
              </div>

              {/* Progress bars requirements list */}
              <div className="space-y-3 text-xs">
                {/* Rule 1: Get Verified */}
                <div className="flex items-center justify-between text-indigo-100">
                  <span className="flex items-center gap-1.5">
                    {meetsVerified ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                    Get Verified Status
                  </span>
                  <span className="font-semibold">{meetsVerified ? "Complete" : "Required"}</span>
                </div>

                {/* Rule 2: 300 Verified Followers */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-indigo-100">
                    <span className="flex items-center gap-1.5">
                      {meetsFollowers ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                      Get 300 verified Followers
                    </span>
                    <span className="font-semibold">{followersCount} / 300</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${Math.min(100, (followersCount / 300) * 100)}%` }} />
                  </div>
                </div>

                {/* Rule 3: 3M Impressions */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-indigo-100">
                    <span className="flex items-center gap-1.5">
                      {meetsImpressions ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                      3M Post Impressions
                    </span>
                    <span className="font-semibold">{(impressionsCount / 1000000).toFixed(3)}M / 3.000M</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${Math.min(100, (impressionsCount / 3000000) * 100)}%` }} />
                  </div>
                </div>

                {/* Rule 4: Active for 30 Days */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-indigo-100">
                    <span className="flex items-center gap-1.5">
                      {meetsActiveDays ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                      Active for 30 Days
                    </span>
                    <span className="font-semibold">{activeDays} / 30 Days</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${Math.min(100, (activeDays / 30) * 100)}%` }} />
                  </div>
                </div>
              </div>

              <Button
                disabled={true}
                className="w-full rounded-full font-bold bg-white/10 text-muted-foreground hover:bg-white/10 cursor-not-allowed"
              >
                Coming Soon
              </Button>
            </div>

          </div>
        </FeedColumn>
        <RightRail />
      </div>
    </AuthGuard>
  )
}
