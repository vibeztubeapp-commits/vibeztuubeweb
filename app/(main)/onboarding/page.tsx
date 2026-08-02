"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { Button } from "@/components/ui/button"
import { followUser, updateUserProfile } from "@/lib/services"
import { UserAvatar } from "@/components/user-avatar"
import { Check, CheckCircle2, ChevronRight, UserPlus, UserCheck } from "lucide-react"

const interestTopics: Record<string, string[]> = {
  Entertainment: ["Celebrities", "Television", "Reality Shows", "Podcasts", "Events"],
  Music: ["Hip Hop", "Pop", "Rock", "Electronic", "Jazz", "Classical", "Afrobeats"],
  Sports: ["Football (Soccer)", "Basketball", "Tennis", "Formula 1", "Athletics", "UFC"],
  Technology: ["AI", "Software Development", "Gadgets", "Web3", "Cybersecurity", "Space Tech"],
  Gaming: ["PC Gaming", "Consoles", "Esports", "Mobile Gaming", "Retro Gaming", "Game Dev"],
  Business: ["Startups", "Venture Capital", "Marketing", "E-commerce", "Leadership"],
  Education: ["Science", "History", "Language Learning", "Self Improvement", "Online Courses"],
  Movies: ["Action", "Sci-Fi", "Drama", "Documentaries", "Anime", "Directing"],
  Comedy: ["Stand-up", "Memes", "Sketches", "Improv", "Dark Humor"],
  News: ["World News", "Local News", "Tech News", "Financial News", "Politics News"],
  Fashion: ["Streetwear", "Haute Couture", "Sustainable Fashion", "Sneakers", "Styling"],
  Lifestyle: ["Minimalism", "Organization", "Relationships", "Home Decor", "Productivity"],
  Health: ["Fitness", "Nutrition", "Mental Health", "Yoga", "Biohacking"],
  Politics: ["Elections", "International Relations", "Public Policy", "Debates"],
  Science: ["Physics", "Astronomy", "Biology", "Neuroscience", "Evolution"],
  Finance: ["Investing", "Cryptocurrency", "Personal Finance", "Stock Market", "Real Estate"],
  Travel: ["Backpacking", "Luxury Travel", "Solo Travel", "Food Tourism", "Road Trips"],
}

export default function OnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [screen, setScreen] = useState(1)
  const [loading, setLoading] = useState(false)

  // Screen 1: Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  // Screen 2: Topics
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  // Screen 3: Suggested Users
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [followedUsers, setFollowedUsers] = useState<string[]>([])

  // Load suggested users on screen 3
  useEffect(() => {
    if (screen === 3 && user) {
      const loadSuggestions = async () => {
        try {
          const res = await fetch("/api/users/suggestions")
          if (!res.ok) throw new Error("Failed to load suggestions")
          const list = await res.json()

          if (list.length === 0) {
            setSuggestedUsers([
              { uid: "mkbhd", displayName: "Marques Brownlee", username: "mkbhd", bio: "Tech reviewer, ultimate frisbee player.", avatarColor: "oklch(0.6 0.25 20)" },
              { uid: "mrbeast", displayName: "MrBeast", username: "mrbeast", bio: "Creating wild videos and helping people.", avatarColor: "oklch(0.55 0.2 200)" },
              { uid: "taylorswift", displayName: "Taylor Swift", username: "taylorswift", bio: "Singer-songwriter, storyteller.", avatarColor: "oklch(0.7 0.15 320)" },
              { uid: "elonmusk", displayName: "Elon Musk", username: "elonmusk", bio: "Tesla, SpaceX, xAI, Neuralink.", avatarColor: "oklch(0.4 0.1 220)" },
            ])
          } else {
            setSuggestedUsers(list.filter((p: any) => p.uid !== user.uid))
          }
        } catch (e) {
          console.error("Failed suggestions load", e)
        }
      }
      void loadSuggestions()
    }
  }, [screen, user])

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    )
  }

  const handleFollow = async (targetUid: string) => {
    if (!user) return
    setFollowedUsers((prev) => [...prev, targetUid])
    try {
      await followUser(targetUid)
    } catch (e) {
      console.error(e)
    }
  }

  // Aggregate topics for selected interests
  const availableTopics = useMemo(() => {
    return selectedInterests.flatMap((interest) => interestTopics[interest] || [])
  }, [selectedInterests])

  const handleNext = async () => {
    if (screen === 1) {
      if (selectedInterests.length === 0) return
      setScreen(2)
    } else if (screen === 2) {
      setScreen(3)
    } else if (screen === 3) {
      if (!user) return
      setLoading(true)
      try {
        await updateUserProfile(user.uid, {
          interests: selectedInterests,
          topics: selectedTopics,
          onboarded: true,
        })
        router.replace("/")
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="flex justify-center min-h-screen">
      <FeedColumn
        header={
          <PageHeaderTitle
            title="Welcome to VibezTube"
            subtitle={`Step ${screen} of 3: Customize your experience`}
          />
        }
      >
        <div className="px-6 py-6 space-y-6">
          {screen === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold">What are you interested in?</h2>
                <p className="text-sm text-muted-foreground mt-1">Select at least one to continue</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.keys(interestTopics).map((interest) => {
                  const isSelected = selectedInterests.includes(interest)
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`relative flex h-24 flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-md scale-[1.02]"
                          : "border-border bg-card text-card-foreground hover:bg-accent"
                        }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-primary animate-in zoom-in duration-200" />
                      )}
                      <span className="text-sm">{interest}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {screen === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold">Pick your topics</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose specific themes to customize your feed</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {availableTopics.map((topic) => {
                  const isSelected = selectedTopics.includes(topic)
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={`px-4 py-2 rounded-full border text-xs transition-all cursor-pointer ${isSelected
                          ? "border-primary bg-primary text-primary-foreground font-bold"
                          : "border-border bg-card text-muted-foreground hover:bg-accent"
                        }`}
                    >
                      {topic}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {screen === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold">Suggested creators to follow</h2>
                <p className="text-sm text-muted-foreground mt-1">Build your initial feed with top accounts</p>
              </div>

              <div className="divide-y divide-border">
                {suggestedUsers.map((u) => {
                  const isFollowed = followedUsers.includes(u.uid)
                  return (
                    <div key={u.uid} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={u} className="h-10 w-10" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{u.displayName || u.name}</p>
                          <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                          {u.bio && <p className="truncate text-xs text-muted-foreground mt-0.5">{u.bio}</p>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isFollowed ? "secondary" : "default"}
                        className="rounded-full"
                        onClick={() => !isFollowed && handleFollow(u.uid)}
                      >
                        {isFollowed ? (
                          <>
                            <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Follow
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            {screen > 1 && (
              <Button variant="ghost" onClick={() => setScreen((s) => s - 1)}>
                Back
              </Button>
            )}
            <Button
              disabled={screen === 1 && selectedInterests.length === 0}
              onClick={handleNext}
              className="px-6"
            >
              {loading ? (
                "Initializing..."
              ) : (
                <>
                  {screen === 3 ? "Complete" : "Next"} <ChevronRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </FeedColumn>
    </div>
  )
}
