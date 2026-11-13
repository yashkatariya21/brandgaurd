import React, { useEffect, useMemo, useRef, useState } from 'react'
import { graphApi, GraphNode, GraphResult, GraphFactPaths } from '../api'

const columns: GraphNode['node_type'][] = ['fact', 'claim', 'content', 'channel']

export default function DependencyGraph() {
  const [graph, setGraph] = useState<GraphResult | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [channel, setChannel] = useState('all')
  const [match, setMatch] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [paths, setPaths] = useState<GraphFactPaths | null>(null)
  const [pathBusy, setPathBusy] = useState(false)
  const [pathError, setPathError] = useState('')
  const pathRequest = useRef(0)
  const load = async (rebuild = false) => {
    pathRequest.current++; setPathBusy(false)
    setBusy(true); setError(''); setPaths(null); setPathError('')
    try {
      if (rebuild) await graphApi.rebuild()
      setGraph(await graphApi.get())
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load graph') }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [])
  const channels = graph?.nodes.filter(n => n.node_type === 'channel') ?? []
  const view = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] }
    const contentIds = new Set(graph.nodes.filter(n => n.node_type === 'content' && (channel === 'all' || n.meta.channel === channel)).map(n => n.id))
    const contentRefs = new Set(graph.nodes.filter(n => contentIds.has(n.id)).map(n => n.ref_id))
    let claims = graph.nodes.filter(n => n.node_type === 'claim' && contentRefs.has(String(n.meta.content_id)))
    const supports = graph.edges.filter(e => e.edge_type === 'supports' && (match === 'all' || e.evidence.match_type === match))
    if (match !== 'all') claims = claims.filter(n => supports.some(e => e.dst_id === n.id))
    const claimIds = new Set(claims.map(n => n.id))
    const factIds = new Set(supports.filter(e => claimIds.has(e.dst_id)).map(e => e.src_id))
    const nodes = graph.nodes.filter(n => (n.node_type === 'content' && contentIds.has(n.id)) || (n.node_type === 'claim' && claimIds.has(n.id)) || (n.node_type === 'fact' && (channel === 'all' && match === 'all' || factIds.has(n.id))) || (n.node_type === 'channel' && (channel === 'all' || n.ref_id === channel)))
    const ids = new Set(nodes.map(n => n.id))
    const edges = graph.edges.filter(e => ids.has(e.src_id) && ids.has(e.dst_id) && (e.edge_type !== 'supports' || match === 'all' || e.evidence.match_type === match))
    return { nodes, edges }
  }, [graph, channel, match])
  const groups = columns.map(type => view.nodes.filter(n => n.node_type === type))
  const positions = new Map<string, {x: number; y: number}>()
  groups.forEach((nodes, col) => nodes.forEach((n, i) => positions.set(n.id, {x: 115 + col * 230, y: 55 + i * 48})))
  const height = Math.max(150, ...groups.map(g => 75 + g.length * 48))
  const detail = graph?.nodes.find(n => n.id === selected)
  const explorePaths = async (factId: string) => {
    const request = ++pathRequest.current
    setPathBusy(true); setPathError(''); setPaths(null)
    try { const result = await graphApi.factPaths(factId); if (request === pathRequest.current) setPaths(result) }
    catch (e) { if (request === pathRequest.current) setPathError(e instanceof Error ? e.message : 'Could not explore paths.') }
    finally { if (request === pathRequest.current) setPathBusy(false) }
  }
  const connected = graph?.edges.filter(e => e.src_id === selected || e.dst_id === selected) ?? []
  return <section className="glass-panel rounded-xl p-5 space-y-4" aria-label="Dependency graph">
    <div className="flex justify-between flex-wrap gap-3"><div><h2 className="font-semibold text-main">Dependency-graph Blast Radius</h2><p className="text-sm text-muted">Explore derived fact, claim, content and channel relationships.</p></div>
      <button disabled={busy} onClick={() => void load(true)} className="px-3 py-2 rounded bg-accent text-white disabled:opacity-50">{busy ? 'Loading…' : 'Rebuild graph'}</button></div>
    <p className="text-xs text-muted">{graph?.scope_note} {graph?.limitations}</p>
    {error && <div role="alert" className="text-red-700">{error} <button onClick={() => void load()} className="underline">Retry</button></div>}
    <div className="flex flex-wrap gap-3 text-sm"><label>Channel <select className="bg-surface text-main border border-subtle rounded p-1" value={channel} onChange={e => setChannel(e.target.value)}><option value="all">All</option>{channels.map(c => <option key={c.id} value={c.ref_id}>{c.label}</option>)}</select></label>
      <label>Fact match <select className="bg-surface text-main border border-subtle rounded p-1" value={match} onChange={e => setMatch(e.target.value)}><option value="all">All</option><option value="confirmed">Confirmed</option><option value="possible">Possible</option></select></label></div>
    {graph && view.nodes.length === 0 ? <p className="text-sm text-muted">No graph nodes. Rebuild after registering content and approved facts.</p> : graph && <div className="overflow-auto max-h-[600px] border border-subtle rounded" aria-label="Scrollable dependency graph">
      <svg viewBox={`0 0 920 ${height}`} width="920" height={height} role="img" aria-label="Fact, claim, content and channel dependency graph; use the list below for keyboard access">
        {columns.map((c, i) => <text key={c} x={115 + i * 230} y="22" textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor">{c.toUpperCase()}</text>)}
        {view.edges.map(e => { const a = positions.get(e.src_id); const b = positions.get(e.dst_id); if (!a || !b) return null; return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.evidence.match_type === 'possible' ? '#b45309' : '#64748b'} strokeDasharray={e.evidence.match_type === 'possible' ? '5 4' : undefined} /> })}
        {view.nodes.map(n => { const p = positions.get(n.id)!; return <g key={n.id} onClick={() => { pathRequest.current++; setPathBusy(false); setSelected(n.id); setPaths(null); setPathError('') }} style={{cursor: 'pointer'}}><rect x={p.x - 90} y={p.y - 14} width="180" height="28" rx="6" fill="#f8fafc" stroke="#64748b"/><text x={p.x} y={p.y + 4} textAnchor="middle" fill="#0f172a" fontSize="11">{n.label.length > 25 ? n.label.slice(0, 24) + '…' : n.label}</text></g> })}
      </svg></div>}
    {detail && <div className="border border-subtle rounded p-3 text-sm text-main" aria-live="polite"><strong>{detail.node_type}: {detail.label}</strong>{detail.node_type === 'fact' && <button disabled={pathBusy} onClick={() => void explorePaths(detail.ref_id)} className="ml-3 px-2 py-1 rounded bg-accent text-white text-xs disabled:opacity-50">{pathBusy ? 'Loading paths…' : 'Explore fact paths'}</button>}<pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(detail.meta, null, 2)}</pre><ul>{connected.map(e => <li key={e.id}>{e.edge_type} · {e.match_method}{e.score !== null ? ` · score ${e.score}` : ''}{e.evidence.match_type ? ` · ${e.evidence.match_type}` : ''}{e.evidence.quote ? ` · “${e.evidence.quote}”` : ''}</li>)}</ul></div>}
    {pathError && <p role="alert" className="text-sm text-red-700">{pathError}</p>}
    {paths && <section className="border border-subtle rounded p-3 text-sm text-main" aria-label="Fact relationship paths">
      <h3 className="font-semibold">Paths from {paths.fact_label}</h3><p className="text-xs text-muted mt-1">{paths.scope_note} {paths.limitations}</p>
      {!paths.paths.length ? <p className="mt-2">No relationship paths in this graph snapshot.</p> : <ul className="mt-2 space-y-2 max-h-80 overflow-auto">{paths.paths.map((p, i) => <li key={`${p.content_id}-${p.span_start}-${p.method}-${i}`} className="border border-subtle rounded p-2"><strong>{p.title}</strong> · {p.registered_state || p.status || 'unknown'} · {p.channels.length ? p.channels.join(', ') : 'no channel'}<p>Fact → “{p.claim}” → content → channel</p><p className="text-xs text-muted">{p.match_type} relationship · {p.method}{p.score != null ? ` · score ${p.score}` : ''} · review before acting</p></li>)}</ul>}
    </section>}
    <details><summary className="cursor-pointer text-sm font-medium text-main">Graph text list (keyboard accessible)</summary><ul className="max-h-64 overflow-auto mt-2 space-y-1">{view.nodes.map(n => <li key={n.id}><button onClick={() => { pathRequest.current++; setPathBusy(false); setSelected(n.id); setPaths(null); setPathError('') }} className="text-sm text-accent underline text-left">{n.node_type}: {n.label}</button></li>)}</ul></details>
  </section>
}
