import React from 'react'
import { Info } from 'lucide-react'
import { useTheme } from '../theme'

/**
 * AIDisclaimerFooter — the standardised disclosure footer required on all
 * verification / scoring / analysis screens. Ported from the reference.
 */
export default function AIDisclaimerFooter({ className = '' }: { className?: string }) {
  const { isAuthority } = useTheme()
  return (
    <footer
      role="contentinfo"
      className={`flex items-center gap-2 px-6 py-3 text-[12px] border-t ${className}`}
      style={
        isAuthority
          ? { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#64748B' }
          : { background: 'rgba(244,243,238,0.6)', borderColor: 'rgba(79,93,117,0.08)', color: '#4F5D75' }
      }
    >
      <Info size={14} strokeWidth={1.5} className="flex-shrink-0" />
      <span>AI risk perspective, not legal advice. A person makes every final decision.</span>
    </footer>
  )
}
