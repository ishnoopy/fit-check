import { api } from "@/lib/api";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────

export interface BuddyPartner {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
}

export interface BuddyStreak {
  currentCount: number;
  longestCount: number;
  lastActiveDate: string | null;
}

export interface BuddyNudgeStatus {
  iNudgedToday: boolean;
  theyNudgedToday: boolean;
  today: string;
}

/** A user in the followers/following list */
interface FollowListUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
}

/** Enriched mutual follower — may or may not be a gym buddy */
export interface MutualItem {
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
  };
  isBuddy: boolean;
  buddyId?: string;
  streak?: BuddyStreak;
  nudgeStatus?: BuddyNudgeStatus;
}

interface BuddyListResponse {
  data: {
    id: string;
    establishedAt: string;
    streak: BuddyStreak;
    partner: BuddyPartner;
  }[];
}

interface NudgeStatusResponse {
  data: BuddyNudgeStatus & {
    buddy: { id: string; streak: BuddyStreak };
  };
}

interface NudgeResponse {
  data: {
    nudge: unknown;
    streak: BuddyStreak;
  };
}

interface EstablishBuddyResponse {
  data: {
    id: string;
    userA: { id: string } | null;
    userB: { id: string } | null;
    streak: BuddyStreak;
  };
}

// ─── Mock data for development ─────────────────────────────────────────

const MOCK_MUTUALS: MutualItem[] = [
  {
    user: {
      id: "mock-user-1",
      username: "jennifer_sweat",
      firstName: "Jennifer",
      avatar: null,
    },
    isBuddy: true,
    buddyId: "mock-buddy-1",
    streak: { currentCount: 12, longestCount: 12, lastActiveDate: new Date().toISOString() },
    nudgeStatus: {
      iNudgedToday: true,
      theyNudgedToday: true,
      today: new Date().toISOString(),
    },
  },
  {
    user: {
      id: "mock-user-2",
      username: "marcus_lifts",
      firstName: "Marcus",
      avatar: null,
    },
    isBuddy: true,
    buddyId: "mock-buddy-2",
    streak: { currentCount: 7, longestCount: 14, lastActiveDate: new Date(Date.now() - 86400000).toISOString() },
    nudgeStatus: {
      iNudgedToday: false,
      theyNudgedToday: true,
      today: new Date().toISOString(),
    },
  },
  {
    user: {
      id: "mock-user-3",
      username: "priya_fit",
      firstName: "Priya",
      avatar: null,
    },
    isBuddy: true,
    buddyId: "mock-buddy-3",
    streak: { currentCount: 5, longestCount: 8, lastActiveDate: new Date().toISOString() },
    nudgeStatus: {
      iNudgedToday: true,
      theyNudgedToday: false,
      today: new Date().toISOString(),
    },
  },
  {
    user: {
      id: "mock-user-4",
      username: "alex_b",
      firstName: "Alex",
      avatar: null,
    },
    isBuddy: true,
    buddyId: "mock-buddy-4",
    streak: { currentCount: 3, longestCount: 6, lastActiveDate: new Date(Date.now() - 172800000).toISOString() },
    nudgeStatus: {
      iNudgedToday: false,
      theyNudgedToday: false,
      today: new Date().toISOString(),
    },
  },
  {
    user: {
      id: "mock-user-5",
      username: "samantha_runs",
      firstName: "Samantha",
      avatar: null,
    },
    isBuddy: false,
  },
  {
    user: {
      id: "mock-user-6",
      username: "jordan_gym",
      firstName: "Jordan",
      avatar: null,
    },
    isBuddy: false,
  },
  {
    user: {
      id: "mock-user-7",
      username: "taylor_fit",
      firstName: "Taylor",
      avatar: null,
    },
    isBuddy: false,
  },
];

// ─── Cheer messages for first nudge of the day ─────────────────────────

const CHEER_MESSAGES = [
  "Bro fist sent! Keep that streak alive. 🔥",
  "Nudged! Your gym bro is counting on you.",
  "Fist bump delivered. Don't break the chain!",
  "Sent! Consistency is everything.",
  "Nudge away! The streak grows stronger.",
  "Locked in for today. Stay on the grind! 💪",
  "Bro fist! Another day, another streak day.",
  "Nudge received by the universe (and your gym bro).",
];

// ─── API helpers ───────────────────────────────────────────────────────

async function fetchBuddyList() {
  return api.get<BuddyListResponse>("/api/buddies");
}

async function fetchBuddyNudgeStatus(buddyId: string) {
  return api.get<NudgeStatusResponse>(`/api/buddies/${buddyId}/nudge-status`);
}

async function sendNudge(buddyId: string) {
  return api.post<NudgeResponse>(`/api/buddies/${buddyId}/nudge`);
}

async function fetchFollowers(username: string) {
  return api.get<{ data: FollowListUser[] }>(
    `/api/users/${encodeURIComponent(username)}/followers`,
  );
}

async function fetchFollowing(username: string) {
  return api.get<{ data: FollowListUser[] }>(
    `/api/users/${encodeURIComponent(username)}/following`,
  );
}

async function establishBuddy(userId: string) {
  return api.post<EstablishBuddyResponse>("/api/buddies", { userId });
}

// ─── useMutuals: all mutual followers with buddy status ────────────────

export function useMutuals(username?: string) {
  return useQuery({
    queryKey: ["mutuals", username],
    queryFn: async (): Promise<MutualItem[]> => {
      // Development mock data
      if (
        process.env.NODE_ENV === "development" &&
        !localStorage.getItem("tuff_use_real_data")
      ) {
        await new Promise((r) => setTimeout(r, 400));
        return MOCK_MUTUALS;
      }

      if (!username) return [];

      // Fetch followers, following, and buddies in parallel
      const [followersRes, followingRes, buddiesRes] = await Promise.all([
        fetchFollowers(username),
        fetchFollowing(username),
        fetchBuddyList(),
      ]);

      // Compute mutuals: intersection of follower IDs and following IDs
      const followerIds = new Set(followersRes.data.map((u) => u.id));
      const mutuals = followingRes.data.filter((u) =>
        followerIds.has(u.id),
      );

      if (mutuals.length === 0) return [];

      // Index buddies by partner ID for quick lookup
      const buddyByPartnerId = new Map<string, BuddyListResponse["data"][0]>();
      for (const b of buddiesRes.data) {
        buddyByPartnerId.set(b.partner.id, b);
      }

      // Enrich mutuals
      const enriched: MutualItem[] = mutuals.map((m) => {
        const buddy = buddyByPartnerId.get(m.id);
        return {
          user: { id: m.id, username: m.username, firstName: m.firstName, lastName: m.lastName, avatar: m.avatar },
          isBuddy: !!buddy,
          buddyId: buddy?.id,
          streak: buddy?.streak,
        };
      });

      // Fetch nudge status for buddies in parallel
      const buddyItems = enriched.filter((e) => e.isBuddy);
      if (buddyItems.length > 0) {
        const statuses = await Promise.allSettled(
          buddyItems.map((b) => fetchBuddyNudgeStatus(b.buddyId!)),
        );
        for (let i = 0; i < buddyItems.length; i++) {
          const s = statuses[i];
          if (s.status === "fulfilled") {
            const d = s.value.data;
            buddyItems[i].nudgeStatus = {
              iNudgedToday: d.iNudgedToday,
              theyNudgedToday: d.theyNudgedToday,
              today: d.today,
            };
            buddyItems[i].streak = d.buddy.streak;
          }
        }
      }

      // Sort: need-to-nudge buddies → other buddies → non-buddies (alpha by firstName)
      return enriched.sort((a, b) => {
        if (a.isBuddy && b.isBuddy) {
          const aNeedsNudge =
            a.nudgeStatus?.theyNudgedToday && !a.nudgeStatus?.iNudgedToday
              ? 0
              : 1;
          const bNeedsNudge =
            b.nudgeStatus?.theyNudgedToday && !b.nudgeStatus?.iNudgedToday
              ? 0
              : 1;
          if (aNeedsNudge !== bNeedsNudge) return aNeedsNudge - bNeedsNudge;
          return (b.streak?.currentCount ?? 0) - (a.streak?.currentCount ?? 0);
        }
        if (a.isBuddy && !b.isBuddy) return -1;
        if (!a.isBuddy && b.isBuddy) return 1;
        return (a.user.firstName ?? a.user.username).localeCompare(
          b.user.firstName ?? b.user.username,
        );
      });
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ─── Nudge mutation ────────────────────────────────────────────────────

export function useNudgeBuddy(username?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (buddyId: string) => sendNudge(buddyId),
    onMutate: async (buddyId) => {
      await queryClient.cancelQueries({ queryKey: ["mutuals", username] });

      const previous = queryClient.getQueryData<MutualItem[]>([
        "mutuals",
        username,
      ]);

      // Remember if this is the first nudge today (before optimistic update)
      const buddy = previous?.find((m) => m.buddyId === buddyId);
      const wasFirstNudgeToday = !buddy?.nudgeStatus?.iNudgedToday;

      queryClient.setQueryData<MutualItem[]>(["mutuals", username], (old) => {
        if (!old) return old;
        return old.map((m) => {
          if (!m.isBuddy || m.buddyId !== buddyId) return m;
          return {
            ...m,
            nudgeStatus: m.nudgeStatus
              ? { ...m.nudgeStatus, iNudgedToday: true }
              : undefined,
          };
        });
      });

      return { previous, wasFirstNudgeToday };
    },
    onSuccess: (response, buddyId, context) => {
      queryClient.setQueryData<MutualItem[]>(["mutuals", username], (old) => {
        if (!old) return old;
        return old.map((m) => {
          if (!m.isBuddy || m.buddyId !== buddyId) return m;
          return {
            ...m,
            streak: response.data.streak,
            nudgeStatus: m.nudgeStatus
              ? { ...m.nudgeStatus, iNudgedToday: true }
              : undefined,
          };
        });
      });

      // First nudge today → random encouragement; subsequent → "already made"
      if (context?.wasFirstNudgeToday) {
        const phrase =
          CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)];
        toast.success(phrase);
      }
    },
    onError: (error, _buddyId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["mutuals", username], context.previous);
      }
      const message =
        error instanceof Error ? error.message : "Failed to send nudge";
      if (message === "Bro fist already made today!") {
        toast.success("Bro fist already made today!");
      } else {
        toast.error(message);
      }
    },
  });
}

// ─── Establish buddy mutation ──────────────────────────────────────────

export function useEstablishBuddy(username?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: string) => establishBuddy(targetUserId),
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ["mutuals", username] });

      const previous = queryClient.getQueryData<MutualItem[]>([
        "mutuals",
        username,
      ]);

      // Optimistically mark the target as a buddy
      queryClient.setQueryData<MutualItem[]>(
        ["mutuals", username],
        (old) => {
          if (!old) return old;
          return old.map((m) => {
            if (m.user.id !== targetUserId) return m;
            return {
              ...m,
              isBuddy: true,
              buddyId: "pending", // placeholder, replaced on success
              streak: {
                currentCount: 0,
                longestCount: 0,
                lastActiveDate: null,
              },
              nudgeStatus: {
                iNudgedToday: false,
                theyNudgedToday: false,
                today: new Date().toISOString(),
              },
            };
          });
        },
      );

      return { previous };
    },
    onSuccess: (response, targetUserId) => {
      // Update with real server data
      queryClient.setQueryData<MutualItem[]>(
        ["mutuals", username],
        (old) => {
          if (!old) return old;
          return old.map((m) => {
            if (m.user.id !== targetUserId) return m;
            return {
              ...m,
              isBuddy: true,
              buddyId: response.data.id,
              streak: response.data.streak,
              nudgeStatus: {
                iNudgedToday: true, // the act of establishing counts as a nudge
                theyNudgedToday: false,
                today: new Date().toISOString(),
              },
            };
          });
        },
      );
      toast.success("Gym buddy added! 🎉");
    },
    onError: (error, _targetUserId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["mutuals", username], context.previous);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to add gym buddy",
      );
    },
  });
}
