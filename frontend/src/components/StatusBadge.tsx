import React from 'react'

const colors: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-600',
  superseded: 'bg-blue-100 text-blue-600',
  rejected: 'bg-red-100 text-red-600',
  open: 'bg-orange-100 text-orange-700',
  accepted: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
  escalated: 'bg-purple-100 text-purple-700',
  edited: 'bg-blue-100 text-blue-700',
  findings_ready: 'bg-orange-100 text-orange-700',
  analysing: 'bg-yellow-100 text-yellow-600',
  in_review: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  none: 'bg-gray-100 text-gray-500',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        colors[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
