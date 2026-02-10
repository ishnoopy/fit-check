import { api } from "@/lib/api";
import type {
  ChatMessage,
  CoachIntent,
  IConversation,
  IConversationListItem,
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
  sendMessage: (text: string, intent?: CoachIntent) => void;
  startNewChat: () => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
}

function createInitialMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "coach",
    content:
      "Hey 👋! Ask me about today's workout, your progress, or what to focus on next.",
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    createInitialMessage(),
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<IConversationListItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      setMessages([createInitialMessage(), ...loaded]);
      setConversationId(id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, id);
      }
    } catch {
      setMessages([
        createInitialMessage(),
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
  }, []);

  /** Delete a conversation */
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/api/coach/conversations/${id}`);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        // If we deleted the active conversation, reset to new chat
        if (conversationId === id) {
          setMessages([createInitialMessage()]);
          setConversationId(null);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
          }
        }
      } catch {
        // Silently fail
      }
    },
    [conversationId],
  );

  /** Start a fresh conversation */
  const startNewChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([createInitialMessage()]);
    setConversationId(null);
    setIsLoading(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    }
  }, []);

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

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${BASE_URL}/api/coach/chat`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            intent,
            conversationId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
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
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === coachMessageId
                      ? { ...m, content: m.content + payload.content }
                      : m,
                  ),
                );
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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === coachMessageId ? { ...m, isStreaming: false } : m,
                ),
              );
            }

            if (currentEvent === "error" && parsed.data) {
              try {
                const payload = JSON.parse(parsed.data) as {
                  error: string;
                };
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

        // Finalize streaming state
        setMessages((prev) =>
          prev.map((m) =>
            m.id === coachMessageId ? { ...m, isStreaming: false } : m,
          ),
        );

        // Refresh conversations list after a successful exchange
        fetchConversations();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const errorContent =
          err instanceof Error
            ? `Sorry, something went wrong: ${err.message}`
            : "Sorry, an unexpected error occurred. Please try again.";
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
    [isLoading, conversationId, fetchConversations],
  );

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
  }, [loadConversation, fetchConversations]);

  return {
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
  };
}
