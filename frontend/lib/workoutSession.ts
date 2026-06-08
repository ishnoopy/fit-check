import { ILog } from "@/types";

const ACTIVE_SESSION_KEY = "activeWorkoutSession";
const LAST_SESSION_KEY = "lastWorkoutSession";

export interface WorkoutSession {
  planId: string;
  workoutId: string;
  /** Epoch milliseconds when the workout was started. */
  startedAt: number;
}

export interface FinishedWorkoutSession extends WorkoutSession {
  /** Epoch milliseconds when the workout was finished. */
  finishedAt: number;
}

export interface SessionStats {
  exerciseCount: number;
  totalSets: number;
  totalReps: number;
  /** Sum of reps × weight across every set, in kg. */
  totalVolume: number;
  /** Average rate of perceived exertion (6-10), or null when none recorded. */
  averageRpe: number | null;
  durationSeconds: number;
}

const parse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Failed to parse workout session", error);
    return null;
  }
};

export function getActiveSession(): WorkoutSession | null {
  if (typeof window === "undefined") return null;
  return parse<WorkoutSession>(localStorage.getItem(ACTIVE_SESSION_KEY));
}

export function startSession(
  planId: string,
  workoutId: string,
): WorkoutSession {
  const session: WorkoutSession = {
    planId,
    workoutId,
    startedAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

/**
 * Stamps the active session as finished, stores it as the last session for the
 * summary screen, clears the active session, and returns it.
 */
export function finishSession(): FinishedWorkoutSession | null {
  const active = getActiveSession();
  if (!active) return null;

  const finished: FinishedWorkoutSession = {
    ...active,
    finishedAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(finished));
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
  return finished;
}

export function getLastSession(): FinishedWorkoutSession | null {
  if (typeof window === "undefined") return null;
  return parse<FinishedWorkoutSession>(localStorage.getItem(LAST_SESSION_KEY));
}

export function summarizeSession(
  logs: ILog[],
  durationSeconds: number,
): SessionStats {
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  const rpeValues: number[] = [];

  for (const log of logs) {
    const sets = log.sets ?? [];
    totalSets += sets.length;
    for (const set of sets) {
      totalReps += set.reps;
      totalVolume += set.reps * set.weight;
    }
    if (typeof log.rateOfPerceivedExertion === "number") {
      rpeValues.push(log.rateOfPerceivedExertion);
    }
  }

  const averageRpe =
    rpeValues.length > 0
      ? Math.round(
          (rpeValues.reduce((sum, value) => sum + value, 0) /
            rpeValues.length) *
            10,
        ) / 10
      : null;

  return {
    exerciseCount: logs.length,
    totalSets,
    totalReps,
    totalVolume: Math.round(totalVolume),
    averageRpe,
    durationSeconds: Math.max(0, Math.floor(durationSeconds)),
  };
}

/** Formats seconds as H:MM:SS past an hour, otherwise M:SS. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainder)}`;
  }
  return `${minutes}:${pad(remainder)}`;
}
