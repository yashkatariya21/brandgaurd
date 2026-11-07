import React from 'react'
import { Clock } from 'lucide-react'
import { getExpiryInfo, EXPIRY_STYLE } from '../lib/expiry'

interface ExpiryChipProps {
  expiresAt: string | null | undefined
  className?: string
}

export default function ExpiryChip({ expiresAt, className = '' }: ExpiryChipProps) {
  const info = getExpiryInfo(expiresAt)
  const style = EXPIRY_STYLE[info.status]

  if (info.status === 'none') {
    return <span className={`text-xs text-muted ${className}`}>—</span>
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${className}`}
      style={{ color: style.color, backgroundColor: style.bg, borderColor: style.border }}
    >
      <Clock size={11} strokeWidth={1.75} />
      {info.label}
    </span>
  )
}
