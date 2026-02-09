"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SendHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatRole = "user" | "coach";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const quickPrompts = [
  "How did I do today?",
  "What should I am for next time?",
  "Am I Progressing?",
  "Why was this session hard?",
  "Any helpful tips?",
] as const;

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "coach",
      content:
        "Coach Mode is ready. Ask me about today’s workout, your progress, or what to focus on next.",
    },
    {
      id: "m2",
      role: "user",
      content: "How did I do today?",
    },
    {
      id: "m3",
      role: "coach",
      content:
        "Nice work showing up. I’m a placeholder for now — once wired up, I’ll reference your logs and plans to give specific feedback.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const appendMessage = (role: ChatRole, content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        content,
      },
    ]);
  };

  const sendText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    appendMessage("user", trimmed);
    setDraft("");

    // Placeholder response for now
    window.setTimeout(() => {
      appendMessage(
        "coach",
        "Got it. I’m a placeholder response — next step is wiring me to your logs, plans, and stats.",
      );
    }, 350);
  };

  return (
    <div className="min-h-screen pb-24 flex flex-col">
      <div className="border-b border-border bg-background/70 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
          <h1 className="font-display tracking-normal text-xl">Coach Mode</h1>
          <p className="text-sm text-muted-foreground">
            Chat with your coach and get quick feedback.
          </p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex w-full",
                  isUser ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed border",
                    isUser
                      ? "bg-primary text-primary-foreground border-primary/30"
                      : "bg-background/80 text-foreground border-border",
                  )}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => sendText(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              className="min-h-12"
            />
            <Button
              type="button"
              onClick={() => sendText(draft)}
              disabled={!canSend}
              size="icon-lg"
              aria-label="Send message"
            >
              <SendHorizontal className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
