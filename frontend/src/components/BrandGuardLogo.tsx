import React from 'react'

interface LogoProps {
  size?: number
  showText?: boolean
  color?: string
  className?: string
}

/** Scalable, self-contained brand mark shared by the app and sign-in page. */
export default function BrandGuardLogo({ size = 32, showText = true, color, className = '' }: LogoProps) {
  const ink = color ?? 'var(--primary-accent)'
  const line = color ? '#173c39' : 'white'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="44" height="44" rx="14" fill={ink} />
        <path d="M24 9.5 12.5 14v9.4c0 7.4 4.8 12.3 11.5 15.1 6.7-2.8 11.5-7.7 11.5-15.1V14L24 9.5Z" stroke={line} strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M18.2 23.9 22.2 28l8-8.3" stroke={line} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="34.5" cy="12.5" r="3" fill="#C7F36B" stroke={ink} strokeWidth="1.5" />
      </svg>
      {showText && <span className="brand-wordmark" style={{ fontSize: Math.max(17, size * 0.53) }}>brand<span>guard</span><span className="brand-wordmark-dot">.</span></span>}
    </span>
  )
}
