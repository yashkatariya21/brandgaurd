import React from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronRight, Sparkles } from 'lucide-react'

const sectionMeta: Record<string, { label: string; desc: string }> = {
  '/': { label: 'Home', desc: 'What BrandGuard is, its features, and how it works' },
  '/dashboard': { label: 'Dashboard', desc: 'Governance posture across every content asset' },
  '/repository': { label: 'Repository', desc: 'Approved facts and brand governance rules' },
  '/content': { label: 'Content', desc: 'Submit and analyse brand content' },
  '/blast-radius': { label: 'Blast Radius', desc: 'Impact analysis when a fact changes' },
  '/findings': { label: 'Findings', desc: 'Review findings and decide with debate' },
  '/rule-tests': { label: 'Rule Tests', desc: 'Test tone rules for ambiguity' },
  '/about': { label: 'About', desc: 'Future work and about' },
}

export default function Header() {
  const location = useLocation()
  const meta = sectionMeta[location.pathname] ?? { label: 'BrandGuard', desc: '' }

  return (
    <div className="h-16 px-6 sticky top-14 z-20 border-b flex items-center justify-between bg-surface border-subtle">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs text-muted font-medium">Governance</span>
        <ChevronRight size={14} className="text-muted/50 flex-shrink-0" />
        <span className="text-sm font-semibold text-main truncate">{meta.label}</span>
      </div>

      {/* Right: description + AI pill */}
      <div className="flex items-center gap-3">
        <span className="hidden xl:inline text-xs text-muted truncate max-w-md">{meta.desc}</span>
        <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-tint text-accent border border-accent/20">
          <Sparkles size={12} strokeWidth={1.75} />
          AI Governance Active
        </span>
      </div>
    </div>
  )
}
