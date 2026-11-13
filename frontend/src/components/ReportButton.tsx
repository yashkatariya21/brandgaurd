import React, { useState } from 'react'
import { FileDown } from 'lucide-react'
import type { ResultReport } from '../lib/resultReports'

import { printResultReport } from '../lib/printReport'

export default function ReportButton({ report }: { report: ResultReport }) {
  const [error, setError] = useState('')
  return <div className="space-y-1">
    <button type="button" onClick={() => {
      setError('')
      try { printResultReport(report) } catch { setError('Could not open the print dialog. Try a browser that supports printing.') }
    }} className="inline-flex items-center gap-2 border border-subtle rounded-lg px-3 py-2 text-sm font-medium text-main hover:bg-accent-subtle">
      <FileDown size={15} /> Print / Save as PDF
    </button>
    <p className="text-xs text-muted">Choose “Save as PDF” in your browser’s print dialog. The report may contain sensitive content.</p>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>
}
