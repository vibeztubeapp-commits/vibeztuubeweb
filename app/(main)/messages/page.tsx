"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { AuthGuard } from "@/components/auth-guard"
import { FeedColumn, PageHeaderTitle } from "@/components/shell/feed-column"
import { RightRail } from "@/components/shell/right-rail"
import { UserAvatar } from "@/components/user-avatar"
import { VerifiedBadge } from "@/components/verified-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db, getUserProfile, searchUsers, createConversation, sendMessage } from "@/lib/services"
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, serverTimestamp, addDoc, getDocs, limit } from "firebase/firestore"
import { Send, Search, ArrowLeft, MessageSquare, Plus, Loader2 } from "lucide-react"

type ChatMessage = {
  id: string
  senderUid: string
  text: string
  createdAt: any
}

type ConversationItem = {
  id: string
  userIds: string[]
  lastMessage: string
  unreadCount?: number
  lastSenderId?: string
  updatedAt: any
  otherProfile?: any
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeChat, setActiveChat] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Listen for real-time active conversation list
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, "conversations"),
      where("userIds", "array-contains", user.uid)
    )

    const unsub = onSnapshot(q, async (snap) => {
      const list: ConversationItem[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const otherId = data.userIds.find((id: string) => id !== user.uid) || "guest"
        const otherProfile = await getUserProfile(otherId)

        list.push({
          id: d.id,
          userIds: data.userIds,
          lastMessage: data.lastMessage || "",
          unreadCount: data.unreadCount || 0,
          lastSenderId: data.lastSenderId || "",
          updatedAt: data.updatedAt,
          otherProfile,
        })
      }

      // Sort by last message timestamp client-side
      list.sort((a, b) => {
        const timeA = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt).getTime()
        const timeB = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt).getTime()
        return timeB - timeA
      })

      setConversations(list)
    })

    return () => unsub()
  }, [user])

  // Listen for messages inside the active conversation in real-time
  useEffect(() => {
    if (!activeChat) {
      setMessages([])
      return
    }

    // Reset unread count for this conversation
    if (activeChat.unreadCount && activeChat.unreadCount > 0 && activeChat.lastSenderId !== user?.uid) {
      void updateDoc(doc(db, "conversations", activeChat.id), { unreadCount: 0 })
    }

    const q = query(
      collection(db, "conversations", activeChat.id, "messages"),
      orderBy("createdAt", "asc")
    )

    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = []
      snap.docs.forEach((d) => {
        const data = d.data()
        msgs.push({
          id: d.id,
          senderUid: data.senderUid,
          text: data.text,
          createdAt: data.createdAt,
        })
      })
      setMessages(msgs)
    })

    return () => unsub()
  }, [activeChat, user])

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const results = await searchUsers(searchQuery)
      // Exclude active user from results
      setSearchResults(results.filter((u: any) => u.id !== user?.uid))
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const startChat = async (recipient: any) => {
    if (!user) return
    
    // Check if conversation already exists
    const existing = conversations.find((c) => c.userIds.includes(recipient.id))
    if (existing) {
      setActiveChat(existing)
      setMobileThreadOpen(true)
      setSearchQuery("")
      setSearchResults([])
      return
    }

    try {
      const cid = await createConversation({
        userIds: [user.uid, recipient.id],
        lastMessage: "Conversation started",
      })

      const newConv: ConversationItem = {
        id: cid,
        userIds: [user.uid, recipient.id],
        lastMessage: "Conversation started",
        updatedAt: new Date().toISOString(),
        otherProfile: recipient,
      }

      setActiveChat(newConv)
      setMobileThreadOpen(true)
      setSearchQuery("")
      setSearchResults([])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSend = async () => {
    if (!activeChat || !inputText.trim() || !user) return
    const text = inputText.trim()
    setInputText("")

    try {
      // Send message doc
      await addDoc(collection(db, "conversations", activeChat.id, "messages"), {
        senderUid: user.uid,
        text,
        createdAt: serverTimestamp(),
      })

      // Update parent conversation summary
      await updateDoc(doc(db, "conversations", activeChat.id), {
        lastMessage: text,
        lastSenderId: user.uid,
        unreadCount: activeChat.unreadCount !== undefined ? activeChat.unreadCount + 1 : 1,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <AuthGuard>
      <div className="flex justify-center min-h-screen">
        <FeedColumn header={<PageHeaderTitle title="Chat" />}>
          <div className="flex h-[calc(100vh-120px)] bg-background border border-border rounded-2xl overflow-hidden relative">
            
            {/* Inbox / Conversations List Pane */}
            <div className={`w-full md:w-80 border-r border-border flex flex-col ${
              mobileThreadOpen ? "hidden md:flex" : "flex"
            }`}>
              {/* User search bar */}
              <div className="p-3 border-b border-border space-y-2.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search people..."
                      className="pl-8 text-xs rounded-full border-border bg-card"
                      onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
                    />
                  </div>
                  <Button onClick={() => void handleSearch()} size="icon" className="rounded-full shrink-0">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-2 space-y-2 max-h-40 overflow-y-auto shadow-lg">
                    {searchResults.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => void startChat(r)}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent/40 cursor-pointer"
                      >
                        <UserAvatar user={r} className="h-7 w-7" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground flex items-center gap-0.5">
                            <span>{r.displayName || r.name}</span>
                            <VerifiedBadge type={r.verifiedBadge} />
                          </p>
                          <p className="text-[10px] text-muted-foreground">@{r.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conversations feed */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {conversations.length > 0 ? (
                  conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setActiveChat(c)
                        setMobileThreadOpen(true)
                      }}
                      className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-accent/30 ${
                        activeChat?.id === c.id ? "bg-accent/20" : ""
                      }`}
                    >
                      <UserAvatar user={c.otherProfile} className="h-10 w-10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-baseline">
                          <p className="font-bold text-sm text-foreground truncate flex items-center gap-0.5">
                            <span>{c.otherProfile?.displayName || "User"}</span>
                            <VerifiedBadge type={c.otherProfile?.verifiedBadge} />
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate leading-normal mt-0.5">
                          {c.lastMessage}
                        </p>
                      </div>
                      
                      {c.unreadCount ? (c.unreadCount > 0 && c.lastSenderId !== user?.uid) && (
                        <span className="h-4 min-w-4 flex items-center justify-center rounded-full bg-primary text-[9px] font-bold px-1 text-primary-foreground">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-2">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground font-medium">No conversations yet</p>
                    <p className="text-[10px] text-muted-foreground px-4">
                      Search for users above to start a secure dynamic direct message chat thread.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Thread Pane */}
            <div className={`flex-1 flex flex-col bg-card/10 ${
              mobileThreadOpen ? "flex" : "hidden md:flex"
            }`}>
              {activeChat ? (
                <>
                  {/* Chat header */}
                  <div className="p-4 border-b border-border flex items-center gap-3 bg-card/40">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden rounded-full mr-1 cursor-pointer"
                      onClick={() => setMobileThreadOpen(false)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <UserAvatar user={activeChat.otherProfile} className="h-9 w-9" />
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-0.5">
                        <span>{activeChat.otherProfile?.displayName || "User"}</span>
                        <VerifiedBadge type={activeChat.otherProfile?.verifiedBadge} />
                      </h4>
                      <p className="text-[10px] text-muted-foreground">@{activeChat.otherProfile?.username}</p>
                    </div>
                  </div>

                  {/* Messages Bubble View */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                    {messages.map((m) => {
                      const isMe = m.senderUid === user?.uid
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-accent/60 text-foreground rounded-tl-none border border-border/40"
                            }`}
                          >
                            <p>{m.text}</p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input Panel */}
                  <div className="p-3.5 border-t border-border flex gap-2.5 bg-card/20">
                    <Input
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message..."
                      className="text-xs rounded-full border-border bg-card/60 flex-1"
                      onKeyDown={(e) => e.key === "Enter" && void handleSend()}
                    />
                    <Button onClick={() => void handleSend()} size="icon" className="rounded-full shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-accent/40 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Select a conversation</h3>
                  <p className="text-xs text-muted-foreground max-w-xs text-center leading-normal">
                    Choose an existing conversation from the inbox pane, or search for other users to begin chatting.
                  </p>
                </div>
              )}
            </div>
            
            {/* Mobile Floating Action Button (FAB) for Starting a Chat */}
            {!mobileThreadOpen && (
              <button
                onClick={() => searchInputRef.current?.focus()}
                className="fixed bottom-20 right-4 z-40 md:hidden flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform cursor-pointer"
                aria-label="New Chat"
              >
                <MessageSquare className="h-6 w-6" />
              </button>
            )}

          </div>
        </FeedColumn>
        <RightRail />
      </div>
    </AuthGuard>
  )
}
