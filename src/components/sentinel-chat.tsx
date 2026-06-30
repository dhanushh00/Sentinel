"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { askSentinel } from "@/lib/api"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  "What is RSI and how should I use it?",
  "Explain MACD in simple terms",
  "What makes a stock bullish?",
  "How do I read a Sentinel report?",
]

const STORAGE_KEY = "sentinel_chat_history"
const MAX_STORED_MESSAGES = 40

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Omit<ChatMessage, "timestamp"> & { timestamp: string }>
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }))
  } catch {
    return []
  }
}

function saveHistory(messages: ChatMessage[]) {
  try {
    const toStore = messages.slice(-MAX_STORED_MESSAGES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    // ignore
  }
}

/** Extract the stock symbol from a stock detail page path, e.g. /stocks/TCS.NS → TCS.NS */
function extractSymbolFromPath(pathname: string): string | undefined {
  const match = pathname.match(/\/stocks\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

export function SentinelChat() {
  const pathname = usePathname()
  const currentSymbol = extractSymbolFromPath(pathname)

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load history on mount (client-only)
  useEffect(() => {
    setMessages(loadHistory())
    setIsLoaded(true)
  }, [])

  // Persist history on every change
  useEffect(() => {
    if (isLoaded) saveHistory(messages)
  }, [messages, isLoaded])

  // Scroll to bottom on new messages or open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        inputRef.current?.focus()
      }, 120)
    }
  }, [isOpen, messages.length])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const response = await askSentinel(trimmed, currentSymbol)
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I couldn't reach the Sentinel AI. Please make sure the backend is running.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm shadow-2xl rounded-2xl border bg-background flex flex-col overflow-hidden"
            style={{ maxHeight: "min(520px, calc(100vh - 100px))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Ask Sentinel</p>
                  {currentSymbol && (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Context: {currentSymbol}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                  onClick={() => {
                    setMessages([])
                    localStorage.removeItem(STORAGE_KEY)
                  }}
                >
                  Clear
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {/* Welcome state */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="flex flex-col items-center text-center gap-2 py-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Hi, I&apos;m Sentinel AI</p>
                    <p className="text-xs text-muted-foreground max-w-[200px]">
                      Ask me anything about stocks, technical indicators, or market analysis.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left text-xs border rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Message bubbles */}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      msg.role === "assistant"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted border"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 items-center"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Thinking…</span>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage(input)
                }}
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    currentSymbol
                      ? `Ask about ${currentSymbol.replace(/\.(NS|BO)$/i, "")}…`
                      : "Ask about any stock or indicator…"
                  }
                  className="flex-1 h-8 text-xs"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
              <p className="text-[9px] text-muted-foreground/50 mt-1.5 text-center">
                Powered by Gemini — not financial advice
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button */}
      <motion.button
        className={cn(
          "fixed bottom-4 right-4 sm:right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors",
          isOpen
            ? "bg-foreground text-background"
            : "bg-primary text-primary-foreground"
        )}
        onClick={() => setIsOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ y: { repeat: Infinity, duration: 3, ease: "easeInOut", delay: 2 } }}
        aria-label="Open Sentinel Chat"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}
