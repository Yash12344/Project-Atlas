import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names, resolving Tailwind conflicts in favour of the last one.
 *
 * `clsx` alone would leave `px-2 px-4` both present, and which wins depends on
 * stylesheet order rather than call order — so a caller could not reliably
 * override a component's default padding. `twMerge` makes the later class win,
 * which is what every consumer expects.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
