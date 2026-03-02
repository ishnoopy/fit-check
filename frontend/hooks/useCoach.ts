import { useUser } from "@/app/providers";
import { api } from "@/lib/api";
import type {
  ChatMessage,
  CoachIntent,
  IConversation,
  IConversationListItem,
  ICoachQuota,
} from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

const BASE_URL =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_API_URL || "http://backend:4000"
    : "";
const ACTIVE_CONVERSATION_STORAGE_KEY = "coachActiveConversationId";

interface UseCoachReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  conversations: IConversationListItem[];
  isLoading: boolean;
  isLoadingConversations: boolean;
  quota: ICoachQuota | null;
  isLoadingQuota: boolean;
  sendMessage: (text: string, intent?: CoachIntent) => void;
  startNewChat: () => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
}

function createInitialMessage({ clientName }: { clientName?: string | null } = {}): ChatMessage {
  return {
    id: "welcome",
    role: "coach",
    content:
      `Hey ${clientName ?? "there"} 👋, ask me about today's workout, your progress, or what to focus on next.`,
    createdAt: new Date().toISOString(),
  };
}

/** Generate a unique message ID */
function createMessageId(role: string): string {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/** Parse a single SSE line into event type and data */
function parseSSELine(line: string): { event?: string; data?: string } | null {
  if (line.startsWith("event:")) {
    return { event: line.slice(6).trim() };
  }
  if (line.startsWith("data:")) {
    return { data: line.slice(5).trim() };
  }
  return null;
}

/**
 * Custom hook for the AI coach chat with conversation persistence.
 * Handles SSE streaming, conversation management, and loading state.
 */
export function useCoach(): UseCoachReturn {
  const { user } = useUser();
  const clientName = user?.firstName ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createInitialMessage({ clientName }),
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<IConversationListItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [quota, setQuota] = useState<ICoachQuota | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const typingBufferRef = useRef("");
  const typingIntervalRef = useRef<number | null>(null);
  const streamCompletedRef = useRef(false);
  const activeCoachMessageIdRef = useRef<string | null>(null);

  const fetchQuota = useCallback(async () => {
    setIsLoadingQuota(true);
    try {
      const result = await api.get<{ success: boolean; data: ICoachQuota }>(
        "/api/coach/quota",
      );
      setQuota(result.data);
    } catch {
      // Silently fail - quota panel is non-critical
    } finally {
      setIsLoadingQuota(false);
    }
  }, []);

  /** Fetch the list of conversations for the sidebar */
  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const result = await api.get<{
        success: boolean;
        data: IConversationListItem[];
        total: number;
      }>("/api/coach/conversations?limit=50");
      setConversations(result.data);
    } catch {
      // Silently fail - conversations list is non-critical
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  /** Load an existing conversation's messages */
  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const result = await api.get<{
        success: boolean;
        data: IConversation;
      }>(`/api/coach/conversations/${id}`);
      const loaded: ChatMessage[] = result.data.messages.map((m, idx) => ({
        id: `persisted-${id}-${idx}`,
        role: m.role,
        content: m.content,
        intent: m.intent as CoachIntent | undefined,
        createdAt: m.createdAt ?? result.data.updatedAt,
      }));
      setMessages([createInitialMessage({ clientName }), ...loaded]);
      setConversationId(id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, id);
      }
    } catch {
      setMessages([
        createInitialMessage({ clientName }),
        {
          id: createMessageId("coach"),
          role: "coach",
          content: "Failed to load conversation. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [clientName]);

  /** Delete a conversation */
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/api/coach/conversations/${id}`);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        // If we deleted the active conversation, reset to new chat
        if (conversationId === id) {
          setMessages([createInitialMessage({ clientName })]);
          setConversationId(null);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
          }
        }
      } catch {
        // Silently fail
      }
    },
    [conversationId, clientName],
  );

  /** Start a fresh conversation */
  const startNewChat = useCallback(() => {
    abortControllerRef.current?.abort();
    typingBufferRef.current = "";
    streamCompletedRef.current = false;
    activeCoachMessageIdRef.current = null;
    if (typingIntervalRef.current !== null) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setMessages([createInitialMessage({ clientName })]);
    setConversationId(null);
    setIsLoading(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    }
  }, [clientName]);

  /** Send a message and stream the coach response */
  const sendMessage = useCallback(
    async (text: string, intent?: CoachIntent) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: ChatMessage = {
        id: createMessageId("user"),
        role: "user",
        content: trimmed,
        intent,
        createdAt: new Date().toISOString(),
      };

      const coachMessageId = createMessageId("coach");
      const coachPlaceholder: ChatMessage = {
        id: coachMessageId,
        role: "coach",
        content: "",
        isStreaming: true,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, coachPlaceholder]);
      setIsLoading(true);
      typingBufferRef.current = "";
      streamCompletedRef.current = false;
      activeCoachMessageIdRef.current = coachMessageId;
      if (typingIntervalRef.current !== null) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }

      abortControllerRef.current = new AbortController();

      const ensureTypingInterval = () => {
        if (typingIntervalRef.current !== null) return;
        typingIntervalRef.current = window.setInterval(() => {
          const targetMessageId = activeCoachMessageIdRef.current;
          if (!targetMessageId) return;

          if (!typingBufferRef.current.length) {
            if (streamCompletedRef.current) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === targetMessageId ? { ...m, isStreaming: false } : m,
                ),
              );
              window.clearInterval(typingIntervalRef.current!);
              typingIntervalRef.current = null;
              activeCoachMessageIdRef.current = null;
              streamCompletedRef.current = false;
            }
            return;
          }

          const chunkSize = typingBufferRef.current.length > 40 ? 4 : 2;
          const nextSlice = typingBufferRef.current.slice(0, chunkSize);
          typingBufferRef.current = typingBufferRef.current.slice(chunkSize);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === targetMessageId
                ? { ...m, content: m.content + nextSlice }
                : m,
            ),
          );
        }, 20);
      };

      try {
        const response = await fetch(`${BASE_URL}/api/coach/chat`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            intent,
            ...(conversationId ? { conversationId } : {}),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          let errorMessage = `Request failed with status ${response.status}`;
          try {
            const payload = (await response.json()) as { message?: string };
            if (payload?.message) {
              errorMessage = payload.message;
            }
          } catch {
            // no-op
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No readable stream in response");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              currentEvent = "";
              continue;
            }
            const parsed = parseSSELine(trimmedLine);
            if (!parsed) continue;

            if (parsed.event) {
              currentEvent = parsed.event;
              continue;
            }

            if (parsed.data && currentEvent === "delta") {
              try {
                const payload = JSON.parse(parsed.data) as {
                  content: string;
                };
                typingBufferRef.current += payload.content;
                ensureTypingInterval();
              } catch {
                // Skip malformed JSON chunks
              }
            }

            if (parsed.data && currentEvent === "intent") {
              try {
                const payload = JSON.parse(parsed.data) as {
                  intent: CoachIntent;
                };
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === coachMessageId
                      ? { ...m, intent: payload.intent }
                      : m,
                  ),
                );
              } catch {
                // Skip malformed JSON chunks
              }
            }

            if (currentEvent === "done" && parsed.data) {
              try {
                const payload = JSON.parse(parsed.data) as {
                  done: boolean;
                  conversationId?: string;
                };
                if (payload.conversationId) {
                  setConversationId(payload.conversationId);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem(
                      ACTIVE_CONVERSATION_STORAGE_KEY,
                      payload.conversationId,
                    );
                  }
                }
              } catch {
                // Skip malformed JSON chunks
              }
              streamCompletedRef.current = true;
              ensureTypingInterval();
            }

            if (currentEvent === "error" && parsed.data) {
              try {
                const payload = JSON.parse(parsed.data) as {
                  error: string;
                };
                typingBufferRef.current = "";
                streamCompletedRef.current = false;
                if (typingIntervalRef.current !== null) {
                  window.clearInterval(typingIntervalRef.current);
                  typingIntervalRef.current = null;
                }
                activeCoachMessageIdRef.current = null;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === coachMessageId
                      ? {
                        ...m,
                        content: `Sorry, something went wrong: ${payload.error}`,
                        isStreaming: false,
                      }
                      : m,
                  ),
                );
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        }

        streamCompletedRef.current = true;
        ensureTypingInterval();

        // Refresh conversations list after a successful exchange
        fetchConversations();
        fetchQuota();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          typingBufferRef.current = "";
          streamCompletedRef.current = false;
          activeCoachMessageIdRef.current = null;
          if (typingIntervalRef.current !== null) {
            window.clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === coachMessageId ? { ...m, isStreaming: false } : m,
            ),
          );
          return;
        }
        const errorContent =
          err instanceof Error
            ? `Sorry, something went wrong: ${err.message}`
            : "Sorry, an unexpected error occurred. Please try again.";
        typingBufferRef.current = "";
        streamCompletedRef.current = false;
        activeCoachMessageIdRef.current = null;
        if (typingIntervalRef.current !== null) {
          window.clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === coachMessageId
              ? { ...m, content: errorContent, isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [isLoading, conversationId, fetchConversations, fetchQuota],
  );

  /** Update welcome message when user loads (user may be null on initial render) */
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.id !== "welcome") return prev;
      const updated = createInitialMessage({ clientName });
      if (prev[0]?.content === updated.content) return prev;
      return [updated];
    });
  }, [clientName]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedConversationId: string | null =
      window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    if (storedConversationId) {
      void loadConversation(storedConversationId);
    }
    void fetchConversations();
    void fetchQuota();
  }, [loadConversation, fetchConversations, fetchQuota]);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current !== null) {
        window.clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  return {
    messages,
    conversationId,
    conversations,
    isLoading,
    isLoadingConversations,
    quota,
    isLoadingQuota,
    sendMessage,
    startNewChat,
    loadConversation,
    deleteConversation,
    fetchConversations,
  };
}
