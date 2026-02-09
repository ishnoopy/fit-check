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
