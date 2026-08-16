import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names, and lets a later one win.
 *
 * This is the helper every component below takes from ShadCN. `clsx` drops
 * anything false, and `twMerge` resolves two Tailwind classes that set the
 * same property, so a caller can pass `p-6` to a component whose default is
 * `p-4` and get one padding rather than two fighting.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
