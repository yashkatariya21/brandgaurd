import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { factsApi, rulesApi, contentApi, findingsApi } from '../api'
import { useAuth } from '../auth'

interface Stats {
  facts: number | null
  rules: number | null
  content: number | null
  openFindings: number | null
  criticalFindings: number | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadIssues, setLoadIssues] = useState<string[]>([])

  useEffect(() => {
    Promise.allSettled([
      factsApi.list(),
      rulesApi.list(),
      contentApi.list(),
      findingsApi.list(),
    ]).then(([f, r, c, fi]) => {
      const failures = [
        f.status === 'rejected' ? 'facts' : null,
        r.status === 'rejected' ? 'rules' : null,
        c.status === 'rejected' ? 'content' : null,
        fi.status === 'rejected' ? 'findings' : null,
      ].filter((value): value is string => value !== null)
      setLoadIssues(failures)
      const allFindings = fi.status === 'fulfilled' ? fi.value : null
      setStats({
        facts: f.status === 'fulfilled' ? f.value.length : null,
        rules: r.status === 'fulfilled' ? r.value.length : null,
        content: c.status === 'fulfilled' ? c.value.length : null,
        openFindings: allFindings?.filter((x) => x.status === 'open').length ?? null,
        criticalFindings: allFindings?.filter((x) => x.status === 'open' && x.severity === 'critical').length ?? null,
      })
    }).finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-500 text-sm">{greeting}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
          {user?.displayName ?? 'Welcome back'}
        </h1>
      </div>

      {loadIssues.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          Some dashboard data could not be loaded ({loadIssues.join(', ')}). Unavailable counts are shown as —, not zero.
        </div>
      )}

      {/* Stats row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
              <div className="h-7 w-10 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link to="/repository" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors group">
            <p className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{stats.facts ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-0.5">Approved facts</p>
          </Link>
          <Link to="/repository" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors group">
            <p className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{stats.rules ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-0.5">Brand rules</p>
          </Link>
          <Link to="/content" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors group">
            <p className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{stats.content ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-0.5">Content items</p>
          </Link>
          <Link to="/findings" className={`rounded-xl p-5 border transition-colors group ${
            stats.criticalFindings !== null && stats.criticalFindings > 0
              ? 'bg-red-50 border-red-200 hover:border-red-400'
              : stats.openFindings !== null && stats.openFindings > 0
              ? 'bg-amber-50 border-amber-200 hover:border-amber-400'
              : 'bg-white border-gray-200 hover:border-green-300'
          }`}>
            <p className={`text-2xl font-bold ${
              stats.criticalFindings !== null && stats.criticalFindings > 0 ? 'text-red-700' : stats.openFindings !== null && stats.openFindings > 0 ? 'text-amber-700' : 'text-gray-700'
            }`}>{stats.openFindings ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-0.5">Open findings</p>
            {stats.criticalFindings !== null && stats.criticalFindings > 0 && (
              <p className="text-xs text-red-600 font-medium mt-1">{stats.criticalFindings} critical</p>
            )}
          </Link>
        </div>
      ) : null}

      {/* How it works */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">How BrandGuard works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              title: 'Build your fact repository',
              desc: 'Add approved facts — customer counts, prices, certifications, product names — with version history and expiry dates.',
              to: '/repository',
              cta: 'Go to Repository →',
            },
            {
              step: '02',
              title: 'Submit content for analysis',
              desc: 'Paste text or upload a PDF/DOCX. BrandGuard extracts every factual claim and checks it against your approved facts.',
              to: '/content',
              cta: 'Submit Content →',
            },
            {
              step: '03',
              title: 'Review findings & blast radius',
              desc: 'See exactly what\'s wrong, decide to accept, edit, or dismiss each finding. Run blast-radius to catch stale content across all assets.',
              to: '/findings',
              cta: 'View Findings →',
            },
          ].map((s) => (
            <Link
              key={s.step}
              to={s.to}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
            >
              <span className="text-xs font-bold text-indigo-400 tracking-widest">{s.step}</span>
              <h3 className="font-semibold text-gray-900 mt-2 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-3">{s.desc}</p>
              <span className="text-sm text-indigo-600 font-medium group-hover:underline">{s.cta}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Roles reference */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Demo roles — NimbusDesk workspace</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { role: 'admin', email: 'admin@nimbusdesk.example', color: 'text-violet-700', badge: 'bg-violet-100' },
            { role: 'brand_manager', email: 'brand@nimbusdesk.example', color: 'text-indigo-700', badge: 'bg-indigo-100' },
            { role: 'approver', email: 'approver@nimbusdesk.example', color: 'text-emerald-700', badge: 'bg-emerald-100' },
            { role: 'creator', email: 'creator@nimbusdesk.example', color: 'text-amber-700', badge: 'bg-amber-100' },
          ].map((r) => (
            <div key={r.role} className="bg-white border border-slate-200 rounded-lg p-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${r.badge} ${r.color}`}>
                {r.role.replace('_', ' ')}
              </span>
              <p className="text-xs text-gray-500 mt-2 font-mono break-all">{r.email}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Password for all demo accounts: <span className="font-mono">password</span></p>
      </div>
    </div>
  )
}
