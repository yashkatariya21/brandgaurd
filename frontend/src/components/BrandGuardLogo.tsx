import React from 'react'

/**
 * BrandGuardLogo — the BrandGuard shield wordmark.
 * Inline SVG so it works without any image hosting and respects CSS colour vars.
 */

interface LogoProps {
  /** Size of the shield icon (width = height). Default 32. */
  size?: number
  /** Show the text wordmark alongside the shield. Default true. */
  showText?: boolean
  /** Explicit fill colour for the shield. Falls back to CSS var(--primary-accent). */
  color?: string
  className?: string
}

export default function BrandGuardLogo({
  size = 32,
  showText = true,
  color,
  className = '',
}: LogoProps) {
  const fill = color ?? 'var(--primary-accent)'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Shield icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Shield body */}
        <path
          d="M20 3L5 9v11c0 8.284 6.364 15.618 15 18 8.636-2.382 15-9.716 15-18V9L20 3z"
          fill={fill}
          opacity="0.15"
        />
        <path
          d="M20 3L5 9v11c0 8.284 6.364 15.618 15 18 8.636-2.382 15-9.716 15-18V9L20 3z"
          stroke={fill}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Check mark */}
        <path
          d="M13 20.5l5 5 9-9"
          stroke={fill}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span className="font-newsreader font-bold tracking-tight leading-none" style={{ fontSize: size * 0.5 }}>
          BrandGuard
        </span>
      )}
    </span>
  )
}
