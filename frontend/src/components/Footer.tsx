import React from 'react'
import BrandGuardLogo from './BrandGuardLogo'

/** Footer — restyled to the BrandGuard light theme. */
export default function Footer() {
  return (
    <footer className="border-t border-subtle bg-surface mt-12">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <BrandGuardLogo size={36} />
            <p className="text-sm text-muted mt-1">
              Intelligent operating system for brand truth.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-main mb-3 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>Brand-as-Code with Blast-Radius Intelligence</li>
              <li>Adversarial Brand Red Team</li>
              <li>Guideline Chaos Testing</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-main mb-3 text-sm">Resources</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>Documentation</li>
              <li>API Reference</li>
              <li>Disclosure</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-main mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>Inkloom AI</li>
              <li>Hackathon 2026</li>
            </ul>
          </div>
        </div>
        <div className="pt-4 border-t border-subtle flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted">
          <p>© {new Date().getFullYear()} BrandGuard — Built for Inkloom AI Hackathon</p>
          <p className="italic">AI risk perspective, not legal advice. A human makes every decision.</p>
        </div>
      </div>
    </footer>
  )
}
