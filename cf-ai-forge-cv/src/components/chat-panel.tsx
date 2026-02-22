"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useResumeStore } from "@/lib/resume-store"
import { generateChatResponse } from "@/lib/ai-engine"

export function ChatPanel() {
  const { chatMessages, addChatMessage, resume, jobDescription } =
    useResumeStore()
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSend = () => {
    const msg = input.trim()
    if (!msg) return
    setInput("")
    addChatMessage("user", msg)
    setIsTyping(true)

    setTimeout(() => {
      const response = generateChatResponse(msg, resume, jobDescription)
      addChatMessage("assistant", response)
      setIsTyping(false)
    }, 800 + Math.random() * 600)
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex items-center px-4 py-2.5 border-t border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Chat
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
          <div className="flex flex-col gap-3 px-4 py-2">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Bot className="size-6 text-muted-foreground/40" />
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-[200px]">
                  Upload a resume to start chatting. I can help you tailor, rewrite, and optimize.
                </p>
              </div>
            )}
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5 text-xs leading-relaxed",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full mt-0.5",
                    msg.role === "user"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="size-2.5" />
                  ) : (
                    <Bot className="size-2.5" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 max-w-[85%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground mt-0.5">
                  <Bot className="size-2.5" />
                </div>
                <div className="rounded-lg bg-secondary px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
                    <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about your resume..."
          className="text-xs h-8 bg-secondary/30 border-border"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="text-muted-foreground hover:text-primary shrink-0"
          aria-label="Send message"
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
