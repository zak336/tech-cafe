import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format INR currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format time from "HH:MM:SS" → "8:00 AM"
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`
}

// Format date to readable string
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

// Format datetime
export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

// Get today's date as YYYY-MM-DD
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Get tomorrow's date as YYYY-MM-DD
export function getTomorrowDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// Generate a UUID v4
export function generateId(): string {
  return crypto.randomUUID()
}

// Truncate text
export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '…' : str
}

// Order status label + color
export function getOrderStatusInfo(status: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: 'Pending',    color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    confirmed:  { label: 'Confirmed',  color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
    preparing:  { label: 'Preparing',  color: 'text-orange-400', bg: 'bg-orange-400/10' },
    ready:      { label: 'Ready! 🎉',  color: 'text-green-400',  bg: 'bg-green-400/10'  },
    completed:  { label: 'Completed',  color: 'text-text-muted', bg: 'bg-surface-2'     },
    cancelled:  { label: 'Cancelled',  color: 'text-red-400',    bg: 'bg-red-400/10'    },
    refunded:   { label: 'Refunded',   color: 'text-purple-400', bg: 'bg-purple-400/10' },
  }
  return map[status] ?? { label: status, color: 'text-text-muted', bg: 'bg-surface-2' }
}

// Calculate order item unit price
export function calcUnitPrice(
  basePrice: number,
  variantDelta: number,
  addOnsTotal: number
): number {
  return basePrice + variantDelta + addOnsTotal
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
