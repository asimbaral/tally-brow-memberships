import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parse a stored YYYY-MM-DD string as a local-midnight Date (avoids UTC off-by-one).
export function formatLocalDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString()
}

// Return today's date as a YYYY-MM-DD string in local time.
export function getLocalDateString(): string {
  return new Date().toLocaleDateString('en-CA')
}
