"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { AuthGuard } from "@/components/auth-guard"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { Button } from "@/components/ui/button"
import { VerifiedBadge } from "@/components/verified-badge"
import { db, getUserProfile, updateUserProfile } from "@/lib/services"
import { doc, onSnapshot } from "firebase/firestore"
import { ShieldCheck, Loader2 } from "lucide-react"

export default function GetVerifiedPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loadingBadge, setLoadingBadge] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState("")

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, "profiles", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setProfile(data)

        // Check if there is an active review
        if (data.underReview && data.reviewStartedAt) {
          const started = data.reviewStartedAt.toDate ? data.reviewStartedAt.toDate().getTime() : new Date(data.reviewStartedAt).getTime()
          const now = Date.now()
          const elapsed = now - started
          const remaining = Math.max(0, 60000 - elapsed)

          if (remaining > 0) {
            setStatusMessage(`Your verification request for "${data.reviewBadge}" badge is under review. Please wait...`)
            setLoadingBadge(data.reviewBadge)

            const timer = setTimeout(() => {
              void approveVerification(data.reviewBadge)
            }, remaining)
            return () => clearTimeout(timer)
          } else {
            void approveVerification(data.reviewBadge)
          }
        } else {
          setLoadingBadge(null)
          setStatusMessage("")
        }
      }
    })
    return () => unsub()
  }, [user])

  const approveVerification = async (badgeType: string) => {
    if (!user) return
    try {
      await updateUserProfile({
        verified: true,
        verifiedBadge: badgeType as any,
        underReview: false,
        reviewBadge: null,
        reviewStartedAt: null,
      } as any)
      setStatusMessage(`Congratulations! Your profile has been rewarded with the ${badgeType} badge.`)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingBadge(null)
    }
  }

  const handleSubscribe = async (badgeType: string) => {
    if (!user) return
    setLoadingBadge(badgeType)
    setStatusMessage("Your subscription request is under review. This will take exactly 1 minute...")
    try {
      await updateUserProfile({
        underReview: true,
        reviewBadge: badgeType,
        reviewStartedAt: new Date().toISOString() as any, // fallback or serverTimestamp
      } as any)

      // Start the 60 seconds approval timer
      setTimeout(() => {
        void approveVerification(badgeType)
      }, 60000)
    } catch (e) {
      console.error(e)
      setStatusMessage("Subscription failed. Please try again.")
      setLoadingBadge(null)
    }
  }

  return (
    <AuthGuard>
      <div className="flex justify-center">
        <FeedColumn header={<PageHeaderTitle title="Get Verified" subtitle="Choose your premium badge or verify your org" />}>
          <div className="p-6 space-y-8 bg-background text-foreground">
            
            {statusMessage && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-sm animate-pulse">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <p className="font-semibold text-primary">{statusMessage}</p>
              </div>
            )}

            {/* Premium Badges */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Premium Badges</h2>

              {/* Premium Blue */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="flex items-center text-md font-bold text-foreground">
                    <VerifiedBadge type="blue" /> <span className="ml-1">Premium Blue</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">Standard</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Unlock the classic light blue verification checkmark badge adjacent to your profile name across all pages.
                </p>
                <Button
                  disabled={true}
                  className="w-full rounded-full font-bold bg-muted text-muted-foreground cursor-not-allowed"
                >
                  Disabled
                </Button>
              </div>

              {/* Premium Gray */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="flex items-center text-md font-bold text-foreground">
                    <VerifiedBadge type="gray" /> <span className="ml-1">Premium Gray</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">Silver Premium</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Upgrade to the sleek grey checkmark badge style for a minimal aesthetic look.
                </p>
                <Button
                  disabled={true}
                  className="w-full rounded-full font-bold bg-muted text-muted-foreground cursor-not-allowed"
                >
                  Disabled
                </Button>
              </div>

              {/* Premium Dark Purple */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="flex items-center text-md font-bold text-foreground">
                    <VerifiedBadge type="purple" /> <span className="ml-1">Premium Dark Purple</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">Deluxe Premium</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Stand out with the royal dark purple verification badge profile aesthetic.
                </p>
                <Button
                  onClick={() => handleSubscribe("purple")}
                  disabled={loadingBadge !== null || profile?.verifiedBadge === "purple"}
                  className="w-full rounded-full font-bold bg-white text-black hover:bg-neutral-200"
                >
                  {loadingBadge === "purple" ? "Processing..." : (profile?.verifiedBadge === "purple" ? "Subscribed" : "Subscribe")}
                </Button>
              </div>
            </div>

            {/* Organization Verification */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Organization Verification</h2>

              {/* Gold Organization */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="flex items-center text-md font-bold text-foreground">
                    <VerifiedBadge type="gold" /> <span className="ml-1">Gold Organization</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">Commercial</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Receive the prestigious gold badge checkmark verifying this account represents a verified business entity.
                </p>
                <Button
                  disabled={true}
                  className="w-full rounded-full font-bold bg-muted text-muted-foreground cursor-not-allowed"
                >
                  Disabled
                </Button>
              </div>

              {/* Government Grey */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="flex items-center text-md font-bold text-foreground">
                    <VerifiedBadge type="gov" /> <span className="ml-1">Government Grey</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">Official</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Official government agencies, political leaders, or multilateral organizations identifier badge.
                </p>
                <Button
                  disabled={true}
                  className="w-full rounded-full font-bold bg-muted text-muted-foreground cursor-not-allowed"
                >
                  Disabled
                </Button>
              </div>
            </div>

          </div>
        </FeedColumn>
        <RightRail />
      </div>
    </AuthGuard>
  )
}
