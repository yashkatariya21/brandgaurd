import React from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Sparkles,
  Info,
  X,
  FileText,
  type LucideIcon,
} from 'lucide-react'

/**
 * StatusChip — the reusable status pill ported from the BrandGuard reference.
 * Triple-encoding: colour + dedicated icon + label.
 * Tones cover both the reference's risk severities and the main project's
 * finding/content/rule vocabularies.
 */

interface ToneConfig {
  color: string
  bg: string
  border: string
  Icon: LucideIcon
  label: string
}

export type Tone =
  | 'violation' | 'critical'
  | 'risk' | 'high'
  | 'medium' | 'low'
  | 'clear' | 'approved' | 'accepted'
  | 'review' | 'in_review' | 'pending_approval'
  | 'simulation'
  | 'draft' | 'superseded' | 'rejected'
  | 'open' | 'dismissed' | 'escalated' | 'edited'
  | 'confirmed' | 'possible' | 'published' | 'scheduled'
  | 'findings_ready' | 'analysing' | 'running' | 'done' | 'failed'
  | 'none'

const TONES: Record<Tone, ToneConfig> = {
  violation: { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', Icon: ShieldAlert, label: 'Confirmed Violation' },
  critical: { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', Icon: ShieldAlert, label: 'Critical' },
  risk: { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', Icon: AlertTriangle, label: 'Possible Risk' },
  high: { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', Icon: AlertTriangle, label: 'High' },
  medium: { color: '#CA8A04', bg: '#FEF9C3', border: '#FDE68A', Icon: AlertTriangle, label: 'Medium' },
  low: { color: '#475569', bg: '#F1F5F9', border: '#E2E8F0', Icon: Info, label: 'Low' },
  clear: { color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', Icon: CheckCircle2, label: 'Clear / Approved' },
  approved: { color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', Icon: CheckCircle2, label: 'Approved' },
  accepted: { color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', Icon: CheckCircle2, label: 'Accepted' },
  review: { color: '#1D4ED8', bg: '#DBEAFE', border: '#BFDBFE', Icon: Clock3, label: 'In Review' },
  in_review: { color: '#1D4ED8', bg: '#DBEAFE', border: '#BFDBFE', Icon: Clock3, label: 'In Review' },
  pending_approval: { color: '#1D4ED8', bg: '#DBEAFE', border: '#BFDBFE', Icon: Clock3, label: 'Pending Approval' },
  simulation: { color: '#7E22CE', bg: '#F3E8FF', border: '#E9D5FF', Icon: Sparkles, label: 'Demo Simulation' },
  draft: { color: '#475569', bg: '#F1F5F9', border: '#E2E8F0', Icon: Clock3, label: 'Draft' },
  superseded: { color: '#4338CA', bg: '#E0E7FF', border: '#C7D2FE', Icon: Clock3, label: 'Superseded' },
  rejected: { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', Icon: ShieldAlert, label: 'Rejected' },
  open: { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', Icon: AlertTriangle, label: 'Open' },
  dismissed: { color: '#475569', bg: '#F1F5F9', border: '#E2E8F0', Icon: X, label: 'Dismissed' },
  escalated: { color: '#7E22CE', bg: '#F3E8FF', border: '#E9D5FF', Icon: AlertTriangle, label: 'Escalated' },
  edited: { color: '#1D4ED8', bg: '#DBEAFE', border: '#BFDBFE', Icon: FileText, label: 'Edited' },
  confirmed: { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', Icon: ShieldAlert, label: 'Confirmed' },
  possible: { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', Icon: AlertTriangle, label: 'Possible' },
  published: { color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', Icon: CheckCircle2, label: 'Published' },
  scheduled: { color: '#4338CA', bg: '#E0E7FF', border: '#C7D2FE', Icon: Clock3, label: 'Scheduled' },
  findings_ready: { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', Icon: AlertTriangle, label: 'Findings Ready' },
  analysing: { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', Icon: Clock3, label: 'Analysing' },
  running: { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', Icon: Clock3, label: 'Running' },
  done: { color: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', Icon: CheckCircle2, label: 'Done' },
  failed: { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', Icon: ShieldAlert, label: 'Failed' },
  none: { color: '#475569', bg: '#F1F5F9', border: '#E2E8F0', Icon: Info, label: 'None' },
}

export function severityToTone(severity: string): Tone {
  return (severity as Tone) in TONES ? (severity as Tone) : 'low'
}

export function statusToTone(status: string): Tone {
  return (status as Tone) in TONES ? (status as Tone) : 'none'
}

interface StatusChipProps {
  tone: Tone | string
  label?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function StatusChip({
  tone,
  label,
  showIcon = true,
  size = 'sm',
  className = '',
}: StatusChipProps) {
  const cfg = TONES[tone as Tone] ?? TONES.none
  const sizeCls =
    size === 'lg'
      ? 'text-sm px-3.5 py-1.5'
      : size === 'md'
      ? 'text-xs px-2.5 py-1'
      : 'text-[11px] px-2 py-0.5'
  const iconSize = size === 'lg' ? 16 : size === 'md' ? 14 : 12

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-tight ${sizeCls} ${className}`}
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      {showIcon && <cfg.Icon size={iconSize} strokeWidth={1.5} />}
      <span>{label ?? cfg.label}</span>
    </span>
  )
}
