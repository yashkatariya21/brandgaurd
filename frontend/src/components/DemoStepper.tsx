import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { IS_DEMO_MODE } from '../lib/demoAccounts'
import { resetProgress, useDemoProgress } from '../lib/demoProgress'

const STEPS = [
  { title: 'Propose the fact change', role: 'Brand Manager', roleId: 'brand_manager', to: '/repository', instruction: 'Open Customer count; submit its draft v2 (65,000+ customers) for approval, or propose that value.', expected: 'The change is ready for approval.', feature: 'Brand-as-Code with Blast-Radius Intelligence' },
  { title: 'Approve it', role: 'Approver', roleId: 'approver', to: '/repository', instruction: 'Open Customer count and approve the pending v2 as a different user.', expected: 'The new version is approved.', feature: 'Brand-as-Code with Blast-Radius Intelligence' },
  { title: 'See the Blast Radius', role: 'Brand Manager or any permitted role', to: '/blast-radius', instruction: 'Select Customer count (customer_count) and run the scan.', expected: 'Review Confirmed and Possible matches and the registered-content scope note.', feature: 'Brand-as-Code with Blast-Radius Intelligence' },
  { title: 'Run the Red Team', role: 'Brand Manager or a permitted content reviewer', to: '/content', instruction: 'Create “Demo risk copy” with “Guaranteed 100% uptime. ISO 27001 certified. Project Heron launches Q1.” Open it and run Red Team.', expected: 'Review the Possible findings and the demo-mode notice; actual results may vary.', feature: 'Adversarial Brand Red Team' },
  { title: 'Decide on a finding', role: 'A permitted reviewer', to: '/findings', instruction: 'Open Show debate, then close it and select Decide on an open finding.', expected: 'The human decision is recorded; content is not changed or published.', feature: 'Adversarial Brand Red Team' },
  { title: 'Test a rule', role: 'A permitted reviewer', to: '/rule-tests', instruction: 'Choose R-01 – Friendly and professional tone and run the test.', expected: 'Review the heuristic interpretations and ambiguity flag; agreement is not correctness.', feature: 'Guideline Chaos Testing' },
  { title: 'Done', role: 'Any', to: '/about', instruction: 'Review the recap and limitations.', expected: 'A human remains responsible for decisions.', feature: '' },
]

export default function DemoStepper({ role, canSwitchRole, switching, switchRole }: { role?: string; canSwitchRole: boolean; switching: boolean; switchRole: (role: string) => Promise<void> }) {
  const progress = useDemoProgress()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<number | null>(null)
  const [copyMessage, setCopyMessage] = useState('')
  const current = STEPS.findIndex((_, i) => i < 6 && !progress.includes(i + 1))
  const active = current < 0 ? 6 : current
  const previous = useRef(active)
  useEffect(() => {
    if (previous.current !== active) { setOpen(false); setView(null); previous.current = active }
  }, [active])
  if (!IS_DEMO_MODE || location.pathname === '/login' || location.pathname === '/') return null
  const shown = view ?? active
  const step = STEPS[shown]
  const close = () => { setOpen(false); try { sessionStorage.setItem('brandguard-tour-hidden', 'true') } catch { /* optional preference */ } }
  const select = (i: number) => { setView(i); if (i !== 6) navigate(STEPS[i].to); else setOpen(true) }
  const copy = async () => {
    try { await navigator.clipboard.writeText('65,000+ customers'); setCopyMessage('Copied.') }
    catch { setCopyMessage('Copy unavailable. Enter 65,000+ customers manually.') }
  }
  return <nav className="tour" aria-label="Demo walkthrough">
    <div className="tour-bar"><div className="tour-dots">{STEPS.map((s, i) => <button key={s.title} className={`tour-dot ${i === active ? 'current' : ''} ${progress.includes(i + 1) ? 'done' : ''}`} onClick={() => select(i)} aria-label={`${i + 1}. ${s.title}${progress.includes(i + 1) ? ', completed' : ''}`} aria-current={i === active ? 'step' : undefined} title={s.title}>{progress.includes(i + 1) ? <Check size={14} /> : i + 1}</button>)}</div>
      <span className="tour-title">Step {active + 1} of 7 — {STEPS[active].title}</span><span className="sr-only" aria-live="polite">Step {active + 1} of 7: {STEPS[active].title}</span>
      <button className="tour-action" onClick={() => { setView(null); if (active === 6) setOpen(true); else navigate(STEPS[active].to) }}>Next action</button>
      <button className="tour-toggle" aria-expanded={open} aria-controls="tour-panel" onClick={() => open ? close() : setOpen(true)}>{open ? 'Hide' : 'Expand'} {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
    </div>
    {open && <section id="tour-panel" className="tour-panel" aria-label="Walkthrough details">
      <p className="tour-feature">{step.feature || 'WALKTHROUGH RECAP'}</p><h2>{step.title}</h2><p><strong>Role:</strong> {step.role}</p><p><strong>Next:</strong> {step.instruction}</p><p><strong>Expected:</strong> {step.expected}</p>
      {step.roleId && role !== step.roleId && <p>This step needs the {step.role}. {canSwitchRole && <button className="tour-link" disabled={switching} onClick={() => void switchRole(step.roleId!)}>Switch to {step.role}</button>}</p>}
      {shown === 0 && <p><button className="tour-link" onClick={() => void copy()}>Copy value</button> <span role="status">{copyMessage}</span></p>}
      {shown === 6 && <div className="tour-recap"><p><strong>Brand-as-Code with Blast-Radius Intelligence:</strong> fact changes and registered-content matches.</p><p><strong>Adversarial Brand Red Team:</strong> possible risks, debate and a human decision.</p><p><strong>Guideline Chaos Testing:</strong> heuristic rule interpretations and ambiguity.</p><p><Link to="/about">About</Link> · <a href="https://github.com/yashkatariya21/brandgaurd#readme" target="_blank" rel="noreferrer">README</a></p></div>}
      <div className="tour-panel-actions"><button disabled={shown === 0} onClick={() => setView(shown - 1)}>Back</button><button disabled={shown === 6} onClick={() => setView(shown + 1)}>Skip</button><button onClick={() => { navigate(step.to); close() }}>Go to page</button><button onClick={() => { resetProgress(); setView(null); setOpen(false) }}>{shown === 6 ? 'Restart demo' : 'Reset demo progress'}</button></div>
      <p className="tour-note">Skipping only changes the view; progress is recorded after successful actions.</p>
    </section>}
  </nav>
}
