import React from 'react'
import StatusChip, { severityToTone } from './StatusChip'

/** SeverityBadge — kept API-compatible with the original; now renders a StatusChip. */
export default function SeverityBadge({ severity }: { severity: string }) {
  return <StatusChip tone={severityToTone(severity)} label={severity} />
}
