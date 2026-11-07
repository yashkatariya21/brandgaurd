/**
 * segments.ts — pure text-range segmentation for highlight rendering.
 *
 * buildSegments(text, ranges) takes a body of text and a list of annotated
 * ranges, resolves overlaps (highest severity wins), and returns an array of
 * segments ready for rendering. Each segment is either plain text or a
 * highlighted span with one or more associated ranges.
 */

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export interface AnnotatedRange {
  id: string
  start: number
  end: number
  severity: string
  label: string
  kind: 'finding' | 'claim'
}

export interface TextSegment {
  text: string
  ranges: AnnotatedRange[]
}

/** Validate a range against the text length. */
function isValid(r: AnnotatedRange, textLen: number): boolean {
  return (
    Number.isInteger(r.start) &&
    Number.isInteger(r.end) &&
    r.start >= 0 &&
    r.end > r.start &&
    r.end <= textLen
  )
}

/**
 * Build non-overlapping text segments from the given ranges.
 * Overlapping ranges are resolved: the one with the highest severity wins.
 * Gaps between ranges are plain-text segments with an empty ranges array.
 */
export function buildSegments(text: string, ranges: AnnotatedRange[]): TextSegment[] {
  const len = text.length
  if (len === 0 || ranges.length === 0) return [{ text, ranges: [] }]

  // Filter and sort valid ranges by start, then by severity descending
  const valid = ranges
    .filter((r) => isValid(r, len))
    .sort((a, b) => a.start - b.start || (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0))

  if (valid.length === 0) return [{ text, ranges: [] }]

  // Merge overlapping ranges keeping the highest severity for each character
  // We build a list of non-overlapping "winning" ranges
  const merged: AnnotatedRange[] = []
  for (const r of valid) {
    if (merged.length === 0) {
      merged.push({ ...r })
      continue
    }
    const prev = merged[merged.length - 1]
    if (r.start >= prev.end) {
      // No overlap
      merged.push({ ...r })
    } else {
      // Overlap: keep whichever has higher severity; if tied, keep previous
      const prevSev = SEVERITY_ORDER[prev.severity] ?? 0
      const curSev = SEVERITY_ORDER[r.severity] ?? 0
      if (curSev > prevSev) {
        // Current wins — replace the end of prev with the current range
        prev.end = Math.min(prev.end, r.start)
        if (prev.end > prev.start) {
          merged.push({ ...r })
        } else {
          merged[merged.length - 1] = { ...r }
        }
      }
      // else: previous range wins, discard current overlap
    }
  }

  // Build final segment list
  const segments: TextSegment[] = []
  let cursor = 0
  for (const r of merged) {
    if (r.start > cursor) {
      segments.push({ text: text.slice(cursor, r.start), ranges: [] })
    }
    segments.push({ text: text.slice(r.start, r.end), ranges: [r] })
    cursor = r.end
  }
  if (cursor < len) {
    segments.push({ text: text.slice(cursor), ranges: [] })
  }

  return segments
}
