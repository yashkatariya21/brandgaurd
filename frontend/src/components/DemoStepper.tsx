import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { IS_DEMO_MODE } from '../lib/demoAccounts'

const STEPS = [
  { label: 'Change a fact', hint: 'Repository → Facts → Propose v2', to: '/repository' },
  { label: 'Blast Radius', hint: 'Explore affected content', to: '/blast-radius' },
  { label: 'Red Team', hint: 'Content → Run Red Team', to: '/content' },
  { label: 'Decide', hint: 'Findings → Show debate → Decide', to: '/findings' },
  { label: 'Rule Tests', hint: 'Select a rule → Run Test', to: '/rule-tests' },
]
const STORAGE_KEY = 'brandguard-demo-stepper-dismissed'

export default function DemoStepper() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) !== 'true' } catch { return true }
  })
  if (!IS_DEMO_MODE || pathname === '/login' || pathname === '/') return null
  const current = STEPS.findIndex(step => step.to === pathname)
  function toggle() {
    if (open) { try { sessionStorage.setItem(STORAGE_KEY, 'true') } catch { /* Storage may be unavailable. */ } }
    setOpen(!open)
  }
  return <div className="demo-stepper"><div className="demo-stepper-inner">
    <button className="demo-stepper-toggle" onClick={toggle} aria-expanded={open} aria-controls="demo-steps">
      <span>Demo walkthrough{current >= 0 ? ` · Step ${current + 1}/5` : ' · Step —/5'}</span>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {open && <nav id="demo-steps" className="demo-steps" aria-label="Demo walkthrough steps">{STEPS.map((step, index) =>
      <NavLink key={step.to} to={step.to} title={step.hint} className={`demo-step ${current === index ? 'is-current' : ''}`} aria-current={current === index ? 'step' : undefined}><span>{index + 1}</span>{step.label}</NavLink>
    )}</nav>}
  </div></div>
}
