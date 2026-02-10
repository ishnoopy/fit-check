/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useUser } from "@/app/providers";
import { DeerMark } from "@/components/DeerMark";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCoach } from "@/hooks/useCoach";
import { cn } from "@/lib/utils";
import type { IConversationListItem, QuickPrompt } from "@/types";
import {
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  Lock,
  MessageSquarePlus,
  SendHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MAX_MESSAGE_LENGTH = 300;

const quickPrompts: QuickPrompt[] = [
  { text: "How did I do today?", intent: "SESSION_FEEDBACK" },
  { text: "What should I aim for next time?", intent: "NEXT_WORKOUT" },
  { text: "Am I progressing?", intent: "PROGRESS_CHECK" },
  { text: "Why was this session hard?", intent: "DIFFICULTY_ANALYSIS" },
  { text: "Any helpful tips?", intent: "TIPS" },
];

export default function CoachPage() {
  const { user } = useUser();

  // Guard: Only pioneers can access Coach Mode
  if (!user?.isPioneer) {
    return (
      <div className="min-h-screen pb-24 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 border border-primary/20">
            <Lock className="size-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl tracking-tight">Coming Soon</h1>
          <p className="text-muted-foreground">
            Coach Mode is currently in beta and only available to pioneer users.
            We&apos;re working hard to make it available to everyone soon!
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
  const {
    messages,
    conversationId,
    conversations,
    isLoading,
    isLoadingConversations,
    sendMessage,
    startNewChat,
    loadConversation,
    deleteConversation,
    fetchConversations,
  } = useCoach();

  const [draft, setDraft] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !isLoading,
    [draft, isLoading],
  );

  const charactersRemaining = MAX_MESSAGE_LENGTH - draft.length;
  const isOverLimit = charactersRemaining < 0;

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!canSend || isOverLimit) return;
    sendMessage(draft);
    setDraft("");
  };

  const handleQuickPrompt = (prompt: QuickPrompt) => {
    if (isLoading) return;
    sendMessage(prompt.text, prompt.intent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
    setIsHistoryOpen(false);
  };

  const handleNewChat = () => {
    startNewChat();
    setIsHistoryOpen(false);
  };

  return (
    <div className="min-h-screen pb-24 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/70 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display tracking-normal text-xl">Coach </h1>
            <p className="text-sm text-muted-foreground">
              Chat with your coach and get quick feedback.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsHistoryOpen((prev) => !prev)}
              aria-label="Toggle conversation history"
              title="Conversation history"
            >
              <History className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              aria-label="New conversation"
              title="New conversation"
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conversation History Panel */}
      {isHistoryOpen && (
        <ConversationPanel
          conversations={conversations}
          activeConversationId={conversationId}
          isLoading={isLoadingConversations}
          onSelect={handleSelectConversation}
          onDelete={deleteConversation}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex w-full gap-2",
                  isUser ? "justify-end" : "justify-start",
                )}
              >
                {!isUser && <ChatHead role="coach" />}

                <div
                  className={cn(
                    "flex flex-col",
                    isUser ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed border shadow-xs",
                      isUser
                        ? "bg-primary text-primary-foreground border-primary/30"
                        : "bg-background/80 text-foreground border-border",
                    )}
                  >
                    {m.content ? (
                      isUser ? (
                        m.content
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold">{children}</strong>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-6 mb-2 space-y-1">
                                {children}
                              </ol>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-6 mb-2 space-y-1">
                                {children}
                              </ul>
                            ),
                            li: ({ children }) => <li>{children}</li>,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      )
                    ) : (
                      m.isStreaming && <StreamingIndicator />
                    )}
                  </div>
                  <span className="mt-1 text-[11px] tabular-nums text-muted-foreground/70">
                    {formatMessageTimestamp(m.createdAt, m.id)}
                  </span>
                </div>

                {isUser && <ChatHead role="user" avatarUrl={user?.avatar} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          {/* Quick Prompts Section */}
          {showQuickPrompts && (
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt.text}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="h-7 text-xs px-2.5 py-0"
                >
                  {prompt.text}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowQuickPrompts((prev) => !prev)}
              aria-label="Toggle quick prompts"
              title={
                showQuickPrompts ? "Hide quick prompts" : "Show quick prompts"
              }
              className="mb-0.5"
            >
              {showQuickPrompts ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
            <div className="flex-1 relative">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                className={cn(
                  "min-h-12 pr-16",
                  isOverLimit && "border-destructive",
                )}
                maxLength={MAX_MESSAGE_LENGTH + 50}
                disabled={isLoading}
              />
              <span
                className={cn(
                  "absolute bottom-2 right-3 text-xs tabular-nums",
                  isOverLimit
                    ? "text-destructive"
                    : charactersRemaining <= 50
                      ? "text-amber-500"
                      : "text-muted-foreground/50",
                )}
              >
                {charactersRemaining}
              </span>
            </div>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!canSend || isOverLimit}
              size="icon-lg"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <SendHorizontal className="size-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatHead({
  role,
  avatarUrl,
}: {
  role: "user" | "coach";
  avatarUrl?: string;
}) {
  return (
    <div className="mt-0.5 size-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40 flex items-center justify-center">
      {role === "coach" ? (
        <DeerMark className="size-7" />
      ) : avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Your avatar"
          width={36}
          height={36}
          className="h-full w-full object-cover"
        />
      ) : (
        <UserRound className="size-4.5 text-muted-foreground" />
      )}
    </div>
  );
}

function formatMessageTimestamp(createdAt: string | undefined, id: string) {
  const date = createdAt ? new Date(createdAt) : dateFromMessageId(id);
  if (!date || Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isSameDay = now.toDateString() === date.toDateString();
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isSameDay) return time;
  return `${date.toLocaleDateString()} ${time}`;
}

function dateFromMessageId(id: string): Date | null {
  // IDs created in useCoach look like: role-<epochMs>-<random>
  const parts = id.split("-");
  const epochMs = Number(parts[1]);
  if (!Number.isFinite(epochMs)) return null;
  return new Date(epochMs);
}

/** Pulsing dots shown while waiting for the first token */
function StreamingIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label="Coach is typing"
    >
      <span className="size-1.5 rounded-full bg-current animate-pulse" />
      <span className="size-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
    </span>
  );
}

/** Conversation history side panel */
function ConversationPanel({
  conversations,
  activeConversationId,
  isLoading,
  onSelect,
  onDelete,
  onClose,
}: {
  conversations: IConversationListItem[];
  activeConversationId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Conversations
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onClose}
            aria-label="Close history"
          >
            <X className="size-3.5" />
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            No previous conversations. Start chatting to create one.
          </p>
        )}

        {!isLoading && conversations.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                  )}
                  onClick={() => onSelect(conv.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSelect(conv.id);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{conv.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatRelativeDate(conv.updatedAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Format a date string as a relative time label */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
