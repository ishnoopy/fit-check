import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getItemFromLocalStorage = (key: string) => {
  if (localStorage === undefined) {
    return null;
  }

  const item = localStorage?.getItem(key);
  return item || null;
};

/**
 * Maps RPE (Rate of Perceived Exertion) value to corresponding emoji
 * @param rpe - Rate of Perceived Exertion value (6-10)
 * @returns Emoji string representing the RPE level
 */
export function getRpeEmoji(rpe?: number): string {
  if (!rpe) return "";

  const rpeMap: Record<number, string> = {
    6: "😌",
    7: "🙂",
    8: "😮‍💨",
    9: "😤",
    10: "🔥",
  };

  return rpeMap[rpe] || "";
}

/**
 * Maps RPE (Rate of Perceived Exertion) value to user-friendly label
 * @param rpe - Rate of Perceived Exertion value (6-10)
 * @returns Label string describing the RPE level
 */
export function getRpeLabel(rpe?: number): string {
  if (!rpe) return "";

  const rpeLabels: Record<number, string> = {
    6: "Easy",
    7: "Challenging",
    8: "Hard",
    9: "Very Hard",
    10: "Max Effort",
  };

  return rpeLabels[rpe] || "";
}

/** Format seconds as "M:SS" (e.g. 90 → "1:30", 5 → "0:05") */
export function formatSecondsToMinutesSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const RECENT_POST_MS = 60 * 60 * 1000; // 1 hour → relative "x mins ago"

function formatTime12h(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Post timestamp for feed/profile: relative for the last hour, else "h:mm AM/PM".
 */
export function formatPostTime(
  isoDate: string | undefined,
  now: Date = new Date(),
): string {
  if (!isoDate?.trim()) return "";

  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";

  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) {
    return formatTime12h(d);
  }

  const oneMin = 60 * 1000;
  if (diffMs < oneMin) {
    return "Just now";
  }
  if (diffMs < RECENT_POST_MS) {
    const mins = Math.floor(diffMs / oneMin);
    return mins === 1 ? "1 min ago" : `${mins} mins ago`;
  }

  return formatTime12h(d);
}
