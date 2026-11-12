import React from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowUpRight, Sparkles } from 'lucide-react'

const sectionMeta: Record<string, { label: string; desc: string }> = {
  '/': { label: 'Home', desc: 'A clearer view of your brand workspace' },
  '/dashboard': { label: 'Dashboard', desc: 'Your workspace at a glance' },
  '/repository': { label: 'Repository', desc: 'Approved facts and brand guidelines' },
  '/content': { label: 'Content', desc: 'Bring your content in for review' },
  '/blast-radius': { label: 'Blast Radius', desc: 'Explore the reach of a fact change' },
  '/findings': { label: 'Findings', desc: 'Review evidence and make a decision' },
  '/rule-tests': { label: 'Rule Tests', desc: 'Explore guideline tests and possible gaps' },
  '/about': { label: 'About', desc: 'How it works and its limitations' },
}

export default function Header() {
  const { pathname } = useLocation()
  const meta = sectionMeta[pathname] ?? { label: 'BrandGuard', desc: '' }
  return <div className="workspace-breadcrumb"><div className="workspace-breadcrumb-path"><span>WORKSPACE</span><ArrowUpRight size={13} /><strong>{meta.label}</strong><span className="workspace-page-desc">{meta.desc}</span></div><span className="workspace-human"><Sparkles size={13} /> HUMAN-LED REVIEW</span></div>
}
