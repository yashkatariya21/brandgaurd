/**
 * expiry.ts — pure helpers for computing and labelling fact expiry dates.
 */

export type ExpiryStatus = 'none' | 'far' | 'soon' | 'imminent' | 'expired'

export interface ExpiryInfo {
  status: ExpiryStatus
  label: string
  /** Days until expiry (negative = already expired). Null when no expiry date. */
  daysRemaining: number | null
}

/**
 * Compute expiry information relative to `now` (defaults to current time).
 * @param expiresAt ISO date string or null
 */
export function getExpiryInfo(expiresAt: string | null | undefined, now = new Date()): ExpiryInfo {
  if (!expiresAt) {
    return { status: 'none', label: 'No expiry', daysRemaining: null }
  }

  const expDate = new Date(expiresAt)
  if (isNaN(expDate.getTime())) {
    return { status: 'none', label: 'No expiry', daysRemaining: null }
  }

  const msRemaining = expDate.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))

  if (daysRemaining < 0) {
    const ago = Math.abs(daysRemaining)
    return {
      status: 'expired',
      label: `Expired ${ago} day${ago !== 1 ? 's' : ''} ago`,
      daysRemaining,
    }
  }
  if (daysRemaining <= 7) {
    return {
      status: 'imminent',
      label: `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
      daysRemaining,
    }
  }
  if (daysRemaining <= 30) {
    return {
      status: 'soon',
      label: `Expires in ${daysRemaining} days`,
      daysRemaining,
    }
  }
  return {
    status: 'far',
    label: `Expires in ${daysRemaining} days`,
    daysRemaining,
  }
}

/** Tailwind + inline-style config per expiry status. */
export const EXPIRY_STYLE: Record<
  ExpiryStatus,
  { cls: string; color: string; bg: string; border: string }
> = {
  none:     { cls: 'text-muted',       color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  far:      { cls: 'text-muted',       color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  soon:     { cls: 'text-amber-700',   color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  imminent: { cls: 'text-red-700',     color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  expired:  { cls: 'text-red-700',     color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
}
