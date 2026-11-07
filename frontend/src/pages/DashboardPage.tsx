import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ShieldAlert, CheckCircle2, Scale, ArrowUpRight, Sparkles } from 'lucide-react'
import { factsApi, rulesApi, contentApi, findingsApi, ContentItem, Finding } from '../api'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import StatusBadge from '../components/StatusBadge'
import SeverityBadge from '../components/SeverityBadge'
import Footer from '../components/Footer'

interface Stats {
  facts: number
  rules: number
  content: number
  openFindings: number
  criticalFindings: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { isAuthority } = useTheme()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [content, setContent] = useState<ContentItem[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      factsApi.list(),
      rulesApi.list(),
      contentApi.list(),
      findingsApi.list(),
    ]).then(([f, r, c, fi]) => {
      const allFindings = fi.status === 'fulfilled' ? fi.value : []
      setStats({
        facts: f.status === 'fulfilled' ? f.value.length : 0,
        rules: r.status === 'fulfilled' ? r.value.length : 0,
        content: c.status === 'fulfilled' ? c.value.length : 0,
        openFindings: allFindings.filter((x) => x.status === 'open').length,
        criticalFindings: allFindings.filter(
          (x) => x.status === 'open' && x.severity === 'critical',
        ).length,
      })
      if (c.status === 'fulfilled') setContent(c.value)
      if (fi.status === 'fulfilled') setFindings(fi.value)
    }).finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const kpis = [
    {
      label: 'Approved Facts',
      value: stats?.facts ?? 0,
      to: '/repository',
      Icon: Scale,
      color: '#2a7f8e',
    },
    {
      label: 'Brand Rules',
      value: stats?.rules ?? 0,
      to: '/repository',
      Icon: CheckCircle2,
      color: '#15803D',
    },
    {
      label: 'Content Items',
      value: stats?.content ?? 0,
      to: '/content',
      Icon: ArrowUpRight,
      color: '#1D4ED8',
    },
    {
      label: 'Open Findings',
      value: stats?.openFindings ?? 0,
      to: '/findings',
      Icon: stats?.criticalFindings ? ShieldAlert : AlertTriangle,
      color: stats?.criticalFindings ? '#DC2626' : '#B45309',
      sub: stats?.criticalFindings ? `${stats.criticalFindings} critical` : undefined,
    },
  ]

  // findings grouped by severity for the "exposure matrix"
  const sevCounts: Record<string, number> = {}
  for (const f of findings) sevCounts[f.severity] = (sevCounts[f.severity] ?? 0) + 1
  const totalFindings = findings.length || 1
  const exposure = [
    { label: 'Critical', pct: Math.round(((sevCounts.critical ?? 0) / totalFindings) * 100), color: '#DC2626' },
    { label: 'High', pct: Math.round(((sevCounts.high ?? 0) / totalFindings) * 100), color: '#B45309' },
    { label: 'Medium', pct: Math.round(((sevCounts.medium ?? 0) / totalFindings) * 100), color: '#CA8A04' },
    { label: 'Low', pct: Math.round(((sevCounts.low ?? 0) / totalFindings) * 100), color: '#475569' },
  ]

  const recentFindings = [...findings]
    .sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1))
    .slice(0, 6)

  return (
    <div className="min-h-full">
      <div className="space-y-6 max-w-[1440px] mx-auto p-6 pb-12">
        {/* Title header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
              {greeting}, {user?.displayName ?? 'Counsel'}
            </p>
            <h1
              className={`text-main ${
                isAuthority ? 'font-newsreader text-3xl' : 'font-jakarta text-2xl font-bold'
              }`}
            >
              Executive Scorecard
            </h1>
            <p className="text-sm text-muted mt-1">
              Governance posture across every registered content asset.
            </p>
          </div>
          <button
            onClick={() => navigate('/content')}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg text-white bg-accent transition-colors hover:opacity-90"
          >
            <Sparkles size={15} strokeWidth={1.75} />
            Submit New Content
          </button>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl glass-panel animate-pulse" />
              ))
            : kpis.map((k) => (
                <button
                  key={k.label}
                  onClick={() => navigate(k.to)}
                  className="text-left p-4 rounded-xl glass-panel transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${k.color}1a`, color: k.color }}
                    >
                      <k.Icon size={18} strokeWidth={1.75} />
                    </span>
                    <ArrowUpRight size={14} className="text-muted/40" />
                  </div>
                  <p className="font-mono-numbers text-3xl font-semibold text-main">{k.value}</p>
                  <p className="text-xs text-muted mt-1">{k.label}</p>
                  {k.sub && <p className="text-[11px] mt-1 font-medium text-red-600">{k.sub}</p>}
                </button>
              ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent content table */}
          <div className="lg:col-span-2 rounded-xl glass-panel overflow-hidden">
            <div className="px-5 py-3 border-b border-subtle flex items-center justify-between">
              <h2 className="text-sm font-semibold text-main">Registered Content</h2>
              <button
                onClick={() => navigate('/content')}
                className="text-xs text-accent font-medium hover:underline"
              >
                View all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle">
                    {['Content', 'Channel', 'Status', 'State'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-muted text-sm">
                        Loading…
                      </td>
                    </tr>
                  ) : content.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-muted text-sm">
                        No content registered yet.
                      </td>
                    </tr>
                  ) : (
                    content.slice(0, 7).map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => navigate('/content')}
                        className="governance-row cursor-pointer"
                      >
                        <td className="px-5 py-3 font-medium text-main max-w-xs truncate">
                          {c.title}
                        </td>
                        <td className="px-5 py-3 text-muted text-xs capitalize">{c.channel}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-5 py-3">
                          {c.registered_state !== 'none' ? (
                            <StatusBadge status={c.registered_state} />
                          ) : (
                            <span className="text-xs text-muted/50">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Severity exposure matrix */}
          <div className="rounded-xl glass-panel p-5">
            <h2 className="text-sm font-semibold text-main mb-4">Finding Exposure</h2>
            <div className="space-y-3">
              {exposure.map((e) => (
                <div key={e.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted">{e.label}</span>
                    <span className="font-mono-numbers text-main font-medium">
                      {findings.length === 0 ? 0 : e.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${findings.length === 0 ? 0 : e.pct}%`, backgroundColor: e.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-subtle">
              <p className="text-[11px] text-muted uppercase tracking-wide font-semibold mb-2">
                Recent findings
              </p>
              <div className="space-y-2">
                {recentFindings.length === 0 ? (
                  <p className="text-xs text-muted/60">No findings recorded.</p>
                ) : (
                  recentFindings.slice(0, 4).map((f) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <SeverityBadge severity={f.severity} />
                      <span className="text-xs text-muted truncate flex-1">{f.content_title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
