import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ShieldAlert, CheckCircle2, Scale,
  ArrowUpRight, Sparkles, Clock, Layers, TrendingUp,
} from 'lucide-react'
import { factsApi, rulesApi, contentApi, findingsApi, Fact, Rule, ContentItem, Finding } from '../api'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import StatusBadge from '../components/StatusBadge'
import SeverityBadge from '../components/SeverityBadge'
import ExpiryChip from '../components/ExpiryChip'
import Footer from '../components/Footer'
import { getExpiryInfo } from '../lib/expiry'
import { MOCK_FACTS, MOCK_RULES, MOCK_CONTENT, MOCK_FINDINGS } from '../lib/mockData'

async function withFallback<T>(apiFn: () => Promise<T>, fallback: T): Promise<{ data: T; isMock: boolean }> {
  try { return { data: await apiFn(), isMock: false } } catch { return { data: fallback, isMock: true } }
}

// ─── Skeleton loader ────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-canvas-secondary rounded animate-pulse ${className}`} />
}

// ─── Health card: expiring facts ─────────────────────────────────────────────

function ExpiringFactsCard({
  facts,
  loading,
}: {
  facts: Fact[]
  loading: boolean
}) {
  const navigate = useNavigate()
  const now = new Date()
  const expiring = facts
    .filter((f) => {
      const info = getExpiryInfo(f.expires_at, now)
      return info.status === 'imminent' || info.status === 'soon' || info.status === 'expired'
    })
    .sort((a, b) => {
      const da = getExpiryInfo(a.expires_at, now).daysRemaining ?? 999
      const db = getExpiryInfo(b.expires_at, now).daysRemaining ?? 999
      return da - db
    })

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100 text-amber-700">
            <Clock size={16} />
          </span>
          <h3 className="text-sm font-semibold text-main">Expiring Facts</h3>
        </div>
        <button
          onClick={() => navigate('/repository')}
          className="text-xs text-accent hover:underline"
        >
          View all
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-8 w-3/5" />
        </div>
      ) : expiring.length === 0 ? (
        <div className="flex flex-col items-center py-4 gap-1">
          <CheckCircle2 size={22} className="text-green-500" />
          <p className="text-xs text-muted">All facts are current</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-bold font-mono-numbers text-amber-700">{expiring.length}</p>
          {expiring.slice(0, 3).map((f) => (
            <div
              key={f.id}
              onClick={() => navigate('/repository')}
              className="flex items-center justify-between gap-2 cursor-pointer hover:bg-accent-subtle rounded-lg px-2 py-1.5 -mx-2 transition-colors"
            >
              <span className="text-xs text-main truncate">{f.label}</span>
              <ExpiryChip expiresAt={f.expires_at} className="flex-shrink-0" />
            </div>
          ))}
          {expiring.length > 3 && (
            <p className="text-xs text-muted">{expiring.length - 3} more in Repository</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Health card: open findings by severity ──────────────────────────────────

function FindingsBySeverityCard({
  findings,
  loading,
}: {
  findings: Finding[]
  loading: boolean
}) {
  const navigate = useNavigate()
  const open = findings.filter((f) => f.status === 'open')

  const sevs = [
    { label: 'Critical', key: 'critical', color: '#dc2626', bg: '#fee2e2' },
    { label: 'High',     key: 'high',     color: '#ea580c', bg: '#ffedd5' },
    { label: 'Medium',   key: 'medium',   color: '#ca8a04', bg: '#fefce8' },
    { label: 'Low',      key: 'low',      color: '#64748b', bg: '#f1f5f9' },
  ]

  const counts = sevs.map((s) => ({
    ...s,
    count: open.filter((f) => f.severity === s.key).length,
  }))

  const total = open.length || 1

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-700">
            <ShieldAlert size={16} />
          </span>
          <h3 className="text-sm font-semibold text-main">Open Findings</h3>
        </div>
        <button
          onClick={() => navigate('/findings')}
          className="text-xs text-accent hover:underline"
        >
          Review all
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : open.length === 0 ? (
        <div className="flex flex-col items-center py-4 gap-1">
          <CheckCircle2 size={22} className="text-green-500" />
          <p className="text-xs text-muted">No open findings</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-bold font-mono-numbers text-red-700">{open.length}</p>
          {/* Stacked CSS bar */}
          <div className="h-4 rounded-full overflow-hidden flex w-full">
            {counts.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.key}
                  style={{
                    width: `${(s.count / total) * 100}%`,
                    backgroundColor: s.color,
                  }}
                  title={`${s.label}: ${s.count}`}
                />
              ) : null,
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {counts
              .filter((s) => s.count > 0)
              .map((s) => (
                <span key={s.key} className="flex items-center gap-1 text-[11px]">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-muted">{s.label}</span>
                  <span className="font-semibold text-main">{s.count}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Health card: pending approvals ──────────────────────────────────────────

function PendingApprovalsCard({
  facts,
  rules,
  loading,
}: {
  facts: Fact[]
  rules: Rule[]
  loading: boolean
}) {
  const navigate = useNavigate()

  const pendingFacts = facts.filter((f) => f.version_status === 'pending_approval')
  const pendingRules = rules.filter((r) => r.version_status === 'pending_approval')
  const total = pendingFacts.length + pendingRules.length

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-700">
            <Layers size={16} />
          </span>
          <h3 className="text-sm font-semibold text-main">Pending Approvals</h3>
        </div>
        <button
          onClick={() => navigate('/repository')}
          className="text-xs text-accent hover:underline"
        >
          Go to Repository
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-12 w-full" />
      ) : total === 0 ? (
        <div className="flex flex-col items-center py-4 gap-1">
          <CheckCircle2 size={22} className="text-green-500" />
          <p className="text-xs text-muted">Nothing awaiting approval</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-bold font-mono-numbers text-blue-700">{total}</p>
          <div className="flex flex-wrap gap-2">
            {pendingFacts.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                {pendingFacts.length} fact{pendingFacts.length !== 1 ? 's' : ''}
              </span>
            )}
            {pendingRules.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                {pendingRules.length} rule{pendingRules.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {pendingFacts.slice(0, 2).map((f) => (
            <p key={f.id} className="text-xs text-muted truncate">• {f.label}</p>
          ))}
          {pendingRules.slice(0, 2).map((r) => (
            <p key={r.id} className="text-xs text-muted truncate">• {r.label}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
  const [facts, setFacts] = useState<Fact[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      withFallback(factsApi.list,    MOCK_FACTS),
      withFallback(rulesApi.list,    MOCK_RULES),
      withFallback(contentApi.list,  MOCK_CONTENT),
      withFallback(findingsApi.list, MOCK_FINDINGS),
    ]).then(([f, r, c, fi]) => {
      const allFacts    = f.status  === 'fulfilled' ? f.value.data  : MOCK_FACTS
      const allRules    = r.status  === 'fulfilled' ? r.value.data  : MOCK_RULES
      const allContent  = c.status  === 'fulfilled' ? c.value.data  : MOCK_CONTENT
      const allFindings = fi.status === 'fulfilled' ? fi.value.data : MOCK_FINDINGS
      const mock = (f.status === 'fulfilled' && f.value.isMock) ||
                   (fi.status === 'fulfilled' && fi.value.isMock) ||
                   (r.status === 'fulfilled' && r.value.isMock) ||
                   (c.status === 'fulfilled' && c.value.isMock)
      setUsingMock(mock)

      setFacts(allFacts)
      setRules(allRules)
      setContent(allContent)
      setFindings(allFindings)

      setStats({
        facts:            allFacts.length,
        rules:            allRules.length,
        content:          allContent.length,
        openFindings:     allFindings.filter((x) => x.status === 'open').length,
        criticalFindings: allFindings.filter((x) => x.status === 'open' && x.severity === 'critical').length,
      })
    }).finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const kpis = [
    { label: 'Approved Facts',  value: stats?.facts         ?? 0, to: '/repository', Icon: Scale,         color: '#2a7f8e' },
    { label: 'Brand Rules',     value: stats?.rules         ?? 0, to: '/repository', Icon: CheckCircle2,  color: '#15803D' },
    { label: 'Content Items',   value: stats?.content       ?? 0, to: '/content',    Icon: TrendingUp,    color: '#1D4ED8' },
    {
      label: 'Open Findings',
      value: stats?.openFindings ?? 0,
      to: '/findings',
      Icon: stats?.criticalFindings ? ShieldAlert : AlertTriangle,
      color: stats?.criticalFindings ? '#DC2626' : '#B45309',
      sub: stats?.criticalFindings ? `${stats.criticalFindings} critical` : undefined,
    },
  ]

  // Severity exposure bars
  const sevCounts: Record<string, number> = {}
  for (const f of findings) sevCounts[f.severity] = (sevCounts[f.severity] ?? 0) + 1
  const totalFindings = findings.length || 1
  const exposure = [
    { label: 'Critical', pct: Math.round(((sevCounts.critical ?? 0) / totalFindings) * 100), color: '#DC2626' },
    { label: 'High',     pct: Math.round(((sevCounts.high     ?? 0) / totalFindings) * 100), color: '#B45309' },
    { label: 'Medium',   pct: Math.round(((sevCounts.medium   ?? 0) / totalFindings) * 100), color: '#CA8A04' },
    { label: 'Low',      pct: Math.round(((sevCounts.low      ?? 0) / totalFindings) * 100), color: '#475569' },
  ]

  const recentFindings = [...findings]
    .sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1))
    .slice(0, 4)

  return (
    <div className="min-h-full">
      <div className="space-y-6 max-w-[1440px] mx-auto p-4 md:p-6 pb-12">

        {/* Title */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
              {greeting}, {user?.displayName ?? 'Counsel'}
            </p>
            <h1 className={`text-main ${isAuthority ? 'font-newsreader text-3xl' : 'font-jakarta text-2xl font-bold'}`}>
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

        {/* Mock data notice */}
        {usingMock && (
          <div className="px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800">
            <span>⚡</span>
            <span>
              <strong>Demo data</strong> — backend not connected. Connect your backend by setting{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">VITE_API_URL</code> in Vercel environment variables.
            </span>
          </div>
        )}

        {/* ── Brand health cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ExpiringFactsCard facts={facts} loading={loading} />
          <FindingsBySeverityCard findings={findings} loading={loading} />
          <PendingApprovalsCard facts={facts} rules={rules} loading={loading} />
        </div>

        {/* ── KPI counts ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading
            ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
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
          {/* Recent content */}
          <div className="lg:col-span-2 rounded-xl glass-panel overflow-hidden">
            <div className="px-5 py-3 border-b border-subtle flex items-center justify-between">
              <h2 className="text-sm font-semibold text-main">Registered Content</h2>
              <button onClick={() => navigate('/content')} className="text-xs text-accent font-medium hover:underline">
                View all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle">
                    {['Content', 'Channel', 'Status', 'State'].map((h) => (
                      <th key={h} className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-muted text-sm">Loading…</td></tr>
                  ) : content.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-muted text-sm">No content registered yet.</td></tr>
                  ) : (
                    content.slice(0, 7).map((c) => (
                      <tr key={c.id} onClick={() => navigate('/content')} className="governance-row cursor-pointer">
                        <td className="px-5 py-3 font-medium text-main max-w-xs truncate">{c.title}</td>
                        <td className="px-5 py-3 text-muted text-xs capitalize">{c.channel}</td>
                        <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-5 py-3">
                          {c.registered_state !== 'none'
                            ? <StatusBadge status={c.registered_state} />
                            : <span className="text-xs text-muted/50">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Exposure + recent findings */}
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
              <p className="text-[11px] text-muted uppercase tracking-wide font-semibold mb-2">Recent findings</p>
              <div className="space-y-2">
                {loading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
                ) : recentFindings.length === 0 ? (
                  <p className="text-xs text-muted/60">No findings recorded.</p>
                ) : (
                  recentFindings.map((f) => (
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
