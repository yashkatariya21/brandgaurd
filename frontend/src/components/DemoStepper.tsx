import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronUp, Crosshair, Database, FileText, ShieldAlert, Atom, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../theme'
import { IS_DEMO_MODE } from '../lib/demoAccounts'

/**
 * DemoStepper — shown only when VITE_DEMO_MODE === 'true'.
 * Links the five demo steps and highlights the one matching the current route.
 * Collapsible. Hidden on /login and / (home).
 */

const STEPS = [
  {
    n: 1,
    label: 'Change a fact',
    hint: 'Repository → Facts → Propose v2',
    to: '/repository',
    Icon: Database,
  },
  {
    n: 2,
    label: 'Blast Radius',
    hint: 'Explore affected content',
    to: '/blast-radius',
    Icon: Crosshair,
  },
  {
    n: 3,
    label: 'Run Red Team',
    hint: 'Content → Run Red Team',
    to: '/content',
    Icon: FileText,
  },
  {
    n: 4,
    label: 'Decide',
    hint: 'Findings → Show debate → Decide',
    to: '/findings',
    Icon: ShieldAlert,
  },
  {
    n: 5,
    label: 'Rule Tests',
    hint: 'Select R-01 → Run Test',
    to: '/rule-tests',
    Icon: Atom,
  },
]

const HIDE_ON: string[] = ['/login', '/']

export default function DemoStepper() {
  const { isAuthority } = useTheme()
  const location = useLocation()
  const [open, setOpen] = useState(true)

  // Only show in demo mode
  const isDemoMode = IS_DEMO_MODE
  if (!isDemoMode) return null

  // Hide on login and home
  if (HIDE_ON.includes(location.pathname)) return null

  const currentStep = STEPS.find((s) => s.to === location.pathname)?.n ?? null

  const accentColor = isAuthority ? '#2a7f8e' : '#7e69ab'
  const bgColor     = isAuthority ? '#1f3a5f' : '#f5f2fc'
  const textColor   = isAuthority ? '#e2e8f0' : '#2D3142'
  const borderColor = isAuthority ? '#162c4a' : 'rgba(126,105,171,0.15)'

  return (
    <div
      className="border-b"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-5 py-2 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v) } }}
        aria-expanded={open}
        aria-label="Demo walkthrough steps"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} style={{ color: accentColor }} />
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            Demo walkthrough
          </span>
          {currentStep && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: accentColor, color: '#fff' }}
            >
              Step {currentStep}/5
            </span>
          )}
        </div>
        {open
          ? <ChevronUp size={14} style={{ color: textColor, opacity: 0.5 }} />
          : <ChevronDown size={14} style={{ color: textColor, opacity: 0.5 }} />
        }
      </div>

      {/* Steps */}
      {open && (
        <div className="flex items-stretch overflow-x-auto scrollbar-thin px-3 pb-2 gap-1">
          {STEPS.map((step, i) => {
            const isActive = location.pathname === step.to
            const isDone   = currentStep != null && step.n < currentStep

            return (
              <React.Fragment key={step.to}>
                <NavLink
                  to={step.to}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-center min-w-[88px] transition-all flex-shrink-0 no-underline"
                  style={{
                    background: isActive
                      ? `${accentColor}20`
                      : 'transparent',
                    border: isActive
                      ? `1px solid ${accentColor}40`
                      : '1px solid transparent',
                  }}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {/* Icon circle */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isActive
                        ? accentColor
                        : isDone
                        ? `${accentColor}30`
                        : 'rgba(255,255,255,0.08)',
                      border: `2px solid ${isActive ? accentColor : isDone ? accentColor : borderColor}`,
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2
                        size={14}
                        style={{ color: accentColor }}
                      />
                    ) : (
                      <step.Icon
                        size={14}
                        style={{ color: isActive ? '#fff' : textColor, opacity: isActive ? 1 : 0.55 }}
                        strokeWidth={1.75}
                      />
                    )}
                  </div>

                  {/* Step number + label */}
                  <div>
                    <p
                      className="text-[10px] font-bold leading-tight"
                      style={{ color: isActive ? accentColor : textColor, opacity: isActive ? 1 : 0.55 }}
                    >
                      {step.n}. {step.label}
                    </p>
                    <p
                      className="text-[9px] leading-snug mt-0.5 max-w-[80px]"
                      style={{ color: textColor, opacity: 0.35 }}
                    >
                      {step.hint}
                    </p>
                  </div>
                </NavLink>

                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="flex items-center self-center flex-shrink-0">
                    <div
                      className="w-4 h-px"
                      style={{
                        background: isDone && (currentStep ?? 0) > step.n + 1
                          ? accentColor
                          : borderColor,
                        opacity: 0.5,
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
