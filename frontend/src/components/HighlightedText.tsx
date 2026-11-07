import React, { useCallback } from 'react'
import { buildSegments, type AnnotatedRange } from '../lib/segments'

/**
 * HighlightedText — renders a body of text with coloured, keyboard-accessible
 * highlight spans for findings and claims.
 *
 * Colour is NOT the only signal: each highlight also has an underline style
 * and the severity label is surfaced via aria-label and title.
 */

const SEV_STYLE: Record<
  string,
  { bg: string; border: string; underline: string; text: string }
> = {
  critical: { bg: '#fef2f2', border: '#fecaca', underline: '#dc2626', text: '#991b1b' },
  high:     { bg: '#fff7ed', border: '#fed7aa', underline: '#ea580c', text: '#9a3412' },
  medium:   { bg: '#fefce8', border: '#fde68a', underline: '#ca8a04', text: '#92400e' },
  low:      { bg: '#f8fafc', border: '#e2e8f0', underline: '#64748b', text: '#475569' },
  claim:    { bg: '#eff6ff', border: '#bfdbfe', underline: '#3b82f6', text: '#1e40af' },
}

function getStyle(range: AnnotatedRange) {
  if (range.kind === 'claim') return SEV_STYLE.claim
  return SEV_STYLE[range.severity] ?? SEV_STYLE.low
}

interface HighlightedTextProps {
  text: string
  ranges: AnnotatedRange[]
  /** Currently selected highlight id */
  selectedId?: string | null
  onSelect: (id: string | null) => void
}

/** Small inline severity legend */
export function SeverityLegend() {
  const items = [
    { label: 'Critical', ...SEV_STYLE.critical },
    { label: 'High',     ...SEV_STYLE.high },
    { label: 'Medium',   ...SEV_STYLE.medium },
    { label: 'Low',      ...SEV_STYLE.low },
    { label: 'Claim',    ...SEV_STYLE.claim },
  ]
  return (
    <div className="flex items-center gap-3 flex-wrap" role="list" aria-label="Highlight legend">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1" role="listitem">
          <span
            className="inline-block w-3 h-3 rounded-sm border"
            style={{ background: i.bg, borderColor: i.border, borderBottomColor: i.underline, borderBottomWidth: 2 }}
            aria-hidden="true"
          />
          <span className="text-[11px] text-muted">{i.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function HighlightedText({
  text,
  ranges,
  selectedId,
  onSelect,
}: HighlightedTextProps) {
  const segments = buildSegments(text, ranges)

  const handleKey = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(selectedId === id ? null : id)
      }
    },
    [selectedId, onSelect],
  )

  return (
    <p
      className="text-sm text-main whitespace-pre-wrap leading-relaxed"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {segments.map((seg, i) => {
        if (seg.ranges.length === 0) {
          return <span key={i}>{seg.text}</span>
        }
        const r = seg.ranges[0]
        const style = getStyle(r)
        const isSelected = selectedId === r.id
        return (
          <mark
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`Finding: ${r.label} (${r.severity})`}
            title={`${r.severity.toUpperCase()} · ${r.label}`}
            onClick={() => onSelect(isSelected ? null : r.id)}
            onKeyDown={(e) => handleKey(e, r.id)}
            className="cursor-pointer rounded-sm transition-all duration-150 outline-none"
            style={{
              background: style.bg,
              borderBottom: `2px solid ${style.underline}`,
              color: style.text,
              padding: '0 2px',
              boxShadow: isSelected
                ? `0 0 0 2px ${style.underline}40, 0 0 0 4px ${style.underline}20`
                : undefined,
              fontWeight: isSelected ? 600 : undefined,
            }}
          >
            {seg.text}
          </mark>
        )
      })}
    </p>
  )
}
