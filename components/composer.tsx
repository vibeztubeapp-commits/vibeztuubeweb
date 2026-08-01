"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { db, getUserProfile, createPost, uploadToMinIO } from "@/lib/services"
import { ImageIcon, Clapperboard, Radio, Smile, MapPin, Globe, Loader2, X, Plus, Camera, FolderOpen, Shield, BellRing, Navigation } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const MAX = 280

export function Composer({ compact = false, onPostSuccess }: { compact?: boolean; onPostSuccess?: () => void }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [value, setValue] = useState("")
  const [audience, setAudience] = useState("Everyone")
  const [showAudienceMenu, setShowAudienceMenu] = useState(false)
  const [location, setLocation] = useState("")
  
  // Media uploads state
  const [mediaItems, setMediaItems] = useState<Array<{ type: string; src: string; name: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [posting, setPosting] = useState(false)
  
  // Web Dialog template state
  const [activeModal, setActiveModal] = useState<"location" | "media-picker" | "space-picker" | "permission-sync" | null>(null)
  const [permissionType, setPermissionType] = useState<"location" | "camera" | "gallery" | "notifications" | null>(null)
  const [permissionStep, setPermissionStep] = useState<"request" | "granted" | "denied">("request")

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Real-time updates for composer profile picture
  useEffect(() => {
    if (!user) return
    void getUserProfile(user.uid).then(setProfile)
  }, [user])

  // Auto expanding textarea logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
  }

  // Handle Drag and Drop media
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(Array.from(e.target.files))
    }
  }

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    setUploadProgress(0)
    try {
      const uploads = files.map(async (file) => {
        const isVideo = file.type.startsWith("video/")
        const type = isVideo ? "video" : "image"
        const src = await uploadToMinIO(file, "vibeztube", (percent) => {
          setUploadProgress(percent)
        })
        return { type, src, name: file.name }
      })
      const results = await Promise.all(uploads)
      setMediaItems((prev) => [...prev, ...results])
    } catch (err) {
      console.error("Media upload failed", err)
      alert("Failed to upload media.")
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const removeMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Insert Emoji at cursor position
  const handleAddEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const text = textareaRef.current.value
      const nextText = text.substring(0, start) + emoji + text.substring(end)
      setValue(nextText)
      
      // Reset selection range after update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length
          textareaRef.current.focus()
        }
      }, 0)
    } else {
      setValue((prev) => prev + emoji)
    }
  }

  const handlePost = async () => {
    if (!user) {
      alert("Please log in to publish a post.")
      return
    }
    if (!value.trim() && mediaItems.length === 0) return
    if (value.length > MAX) return

    setPosting(true)
    try {
      await createPost({
        authorId: user.uid,
        text: value,
        media: mediaItems.map((m) => ({ type: m.type, src: m.src })),
        audience,
        location: location.trim() || undefined,
      })
      
      // Reset composer state on success
      setValue("")
      setMediaItems([])
      setLocation("")
      onPostSuccess?.()
    } catch (err) {
      console.error(err)
      alert("Failed to publish post.")
    } finally {
      setPosting(false)
    }
  }

  const requestPermission = async (type: "location" | "camera" | "gallery" | "notifications") => {
    setPermissionType(type)
    setPermissionStep("request")
    setActiveModal("permission-sync")

    if (type === "location") {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.")
        setActiveModal(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(`${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°E`)
          setPermissionStep("granted")
          setTimeout(() => setActiveModal(null), 1000)
        },
        (err) => {
          console.warn("Location permission denied", err)
          setPermissionStep("denied")
        }
      )
    } else if (type === "camera" || type === "notifications") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "camera" })
        stream.getTracks().forEach((track) => track.stop())
        setPermissionStep("granted")
        setTimeout(() => {
          setActiveModal(null)
          if (type === "camera") {
            fileInputRef.current?.click()
          }
        }, 1000)
      } catch (err) {
        console.warn("Media device permission denied", err)
        setPermissionStep("denied")
      }
    } else if (type === "gallery") {
      setPermissionStep("granted")
      setTimeout(() => {
        setActiveModal(null)
        fileInputRef.current?.click()
      }, 800)
    }
  }

  const handleOpenSettingsInstruction = () => {
    alert("To enable permissions, click the lock/settings icon in your browser's address bar and set access to 'Allow'.")
  }

  const remaining = MAX - value.length
  const over = remaining < 0
  const activeUser = profile || user

  return (
    <div
      className={cn("flex gap-3 border-b border-border px-4 py-3 bg-card/10", compact && "border-b-0")}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <UserAvatar user={activeUser} className="h-11 w-11 shrink-0" />
      
      <div className="min-w-0 flex-1 space-y-2">
        {/* Audience Selector Button */}
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setShowAudienceMenu(!showAudienceMenu)}
            className="flex items-center gap-1 rounded-full border border-primary/40 px-3 py-0.5 text-xs font-semibold text-primary bg-background/50 hover:bg-primary/10 transition-colors"
          >
            <Globe className="h-3 w-3" /> {audience}
          </button>
          
          {showAudienceMenu && (
            <div className="absolute left-0 mt-1 w-40 bg-card border border-border rounded-xl p-1.5 shadow-xl z-50 space-y-0.5">
              {["Everyone", "Followers Only"].map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setAudience(a)
                    setShowAudienceMenu(false)
                  }}
                  className={cn(
                    "w-full text-left text-xs font-semibold p-2 rounded-lg transition-colors hover:bg-accent/40",
                    audience === a ? "text-primary" : "text-foreground"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Input area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          placeholder="What's the vibe?"
          rows={compact ? 2 : 3}
          disabled={posting}
          className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-muted-foreground focus:ring-0 border-0 p-0"
        />

        {/* Location display badge */}
        {location && (
          <div className="inline-flex gap-1.5 items-center bg-primary/10 border border-primary/20 text-primary text-xs rounded-full px-3 py-0.5 font-semibold">
            <MapPin className="h-3 w-3" />
            <span>{location}</span>
            <button onClick={() => setLocation("")} className="hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Uploaded Media Previews */}
        {mediaItems.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {mediaItems.map((item, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden border border-border bg-muted group">
                {item.type === "video" ? (
                  <video src={item.src} className="w-full h-32 object-cover" controls />
                ) : (
                  <img src={item.src} alt={item.name} className="w-full h-32 object-cover" />
                )}
                <button
                  onClick={() => removeMedia(idx)}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 p-1.5 rounded-full text-white cursor-pointer opacity-90 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress indicator */}
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1.5">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            Uploading: {uploadProgress}%
          </div>
        )}

        {/* Bottom Bar controls */}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <div className="flex items-center gap-0.5 text-primary">
            {/* Hidden Input Refs */}
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />

            <IconBtn label="Add image" icon={ImageIcon} onClick={() => setActiveModal("media-picker")} />
            <IconBtn label="Add short" icon={Clapperboard} onClick={() => videoInputRef.current?.click()} />
            
            {/* Start Space Dialog */}
            <IconBtn label="Start a Space" icon={Radio} onClick={() => setActiveModal("space-picker")} />
            
            {/* Standard Emoji Picker popup shortcut */}
            <div className="relative group">
              <IconBtn label="Add emoji" icon={Smile} onClick={() => handleAddEmoji("🔥")} />
              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex bg-card border border-border rounded-xl p-1.5 gap-1.5 shadow-lg z-50">
                {["🔥", "🎬", "✨", "🎵", "💬", "❤️"].map((e) => (
                  <button key={e} onClick={() => handleAddEmoji(e)} className="text-sm hover:scale-125 transition-transform">
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <IconBtn label="Add location" icon={MapPin} onClick={() => setActiveModal("location")} />
          </div>
          
          <div className="flex items-center gap-3">
            {value.length > 0 && (
              <span className={cn("text-xs font-bold tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
                {remaining}
              </span>
            )}
            <Button
              disabled={posting || uploading || (value.length === 0 && mediaItems.length === 0) || over}
              onClick={() => void handlePost()}
              className="rounded-full font-bold px-5"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </Button>
          </div>
        </div>
      </div>

      {/* --- PREMIUM WEB PERMISSIONS & OPTIONS DIALOG TEMPLATES --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setActiveModal(null)}>
          
          {/* Main Dialog Panel (slide up on mobile, center card on desktop) */}
          <div
            className="w-full md:max-w-md bg-card border border-border rounded-t-3xl md:rounded-2xl p-6 shadow-2xl space-y-4 animate-slide-in md:animate-fade-in text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border/60">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                {activeModal === "location" && "Tag Location"}
                {activeModal === "media-picker" && "Select Photo/Video Source"}
                {activeModal === "space-picker" && "Start Live Space"}
                {activeModal === "permission-sync" && "Permission Request"}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-accent rounded-full text-muted-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Contents */}
            {activeModal === "location" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Search location or sync device GPS to tag where you are publishing from.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search locations (e.g. Paris, Tokyo)..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="text-xs rounded-xl border-border bg-card/60"
                  />
                  <Button onClick={() => setActiveModal(null)} size="sm" className="rounded-xl font-bold">Apply</Button>
                </div>
                <button
                  onClick={() => requestPermission("location")}
                  className="w-full flex items-center justify-center gap-2 border border-border hover:bg-accent/40 rounded-xl p-3 text-xs font-bold transition-colors text-primary"
                >
                  <Navigation className="h-4 w-4" /> Use Current Location
                </button>
              </div>
            )}

            {activeModal === "media-picker" && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => requestPermission("camera")}
                  className="flex flex-col items-center justify-center border border-border hover:bg-accent/40 rounded-2xl p-4 gap-2 transition-all group"
                >
                  <Camera className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Take Photo</span>
                </button>
                <button
                  onClick={() => requestPermission("gallery")}
                  className="flex flex-col items-center justify-center border border-border hover:bg-accent/40 rounded-2xl p-4 gap-2 transition-all group"
                >
                  <FolderOpen className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Upload Gallery</span>
                </button>
              </div>
            )}

            {activeModal === "space-picker" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Select how you want to broadcast live with your followers in real-time.</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setActiveModal(null); requestPermission("notifications"); }}
                    className="flex items-center gap-3 border border-border hover:bg-accent/40 rounded-xl p-3 text-left transition-colors"
                  >
                    <Radio className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Start Live Audio Space</p>
                      <p className="text-[10px] text-muted-foreground">Interactive room with live speaker seats</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveModal(null); requestPermission("notifications"); }}
                    className="flex items-center gap-3 border border-border hover:bg-accent/40 rounded-xl p-3 text-left transition-colors"
                  >
                    <Clapperboard className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Start Live Video Stream</p>
                      <p className="text-[10px] text-muted-foreground">HD video streaming with live comments sidebar</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {activeModal === "permission-sync" && (
              <div className="text-center space-y-4 py-4">
                {permissionStep === "request" && (
                  <>
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary animate-pulse">
                      {permissionType === "location" && <Navigation className="h-7 w-7" />}
                      {permissionType === "camera" && <Camera className="h-7 w-7" />}
                      {permissionType === "gallery" && <FolderOpen className="h-7 w-7" />}
                      {permissionType === "notifications" && <BellRing className="h-7 w-7" />}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm">Allow VibezTube to use device {permissionType}?</h4>
                      <p className="text-xs text-muted-foreground px-4">
                        This permission is synchronized with your web browser and allows real-time data streaming feeds.
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setActiveModal(null)} className="flex-1 rounded-xl font-bold">Deny</Button>
                      <Button onClick={() => void requestPermission(permissionType!)} className="flex-1 rounded-xl font-bold">Allow Access</Button>
                    </div>
                  </>
                )}

                {permissionStep === "granted" && (
                  <>
                    <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
                      <Shield className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-emerald-500">Permission Granted!</h4>
                      <p className="text-xs text-muted-foreground px-4">
                        Access synchronized. Continuing with your action...
                      </p>
                    </div>
                  </>
                )}

                {permissionStep === "denied" && (
                  <>
                    <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                      <X className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-red-500">Access Blocked</h4>
                      <p className="text-xs text-muted-foreground px-4">
                        We need {permissionType} permission to proceed. Please enable permission access to continue.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <Button onClick={() => void requestPermission(permissionType!)} className="w-full rounded-xl font-bold">Retry Access</Button>
                      <Button variant="outline" onClick={handleOpenSettingsInstruction} className="w-full rounded-xl font-bold">How to Enable</Button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}

function IconBtn({ label, icon: Icon, onClick }: { label: string; icon: any; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-primary/10 cursor-pointer"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
