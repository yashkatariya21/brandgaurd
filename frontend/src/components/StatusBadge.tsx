import React from 'react'
import StatusChip, { statusToTone } from './StatusChip'

/** StatusBadge — kept API-compatible with the original; now renders a StatusChip. */
export default function StatusBadge({ status }: { status: string }) {
  return <StatusChip tone={statusToTone(status)} label={status.replace(/_/g, ' ')} />
}
