import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getItemFromLocalStorage = (key: string) => {

  if (localStorage === undefined) {
    return null;
  }

  const item = localStorage?.getItem(key);
  return item || null;
};
