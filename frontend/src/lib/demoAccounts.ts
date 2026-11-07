/**
 * demoAccounts.ts — seeded demo account mapping for the demo role switcher.
 * Passwords are read from env vars at runtime, never hardcoded here.
 */

export interface DemoAccount {
  label: string
  email: string
  role: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: 'Admin', email: 'admin@nimbusdesk.example', role: 'admin' },
  { label: 'Brand Manager', email: 'brand@nimbusdesk.example', role: 'brand_manager' },
  { label: 'Approver', email: 'approver@nimbusdesk.example', role: 'approver' },
  { label: 'Manager', email: 'manager@nimbusdesk.example', role: 'manager' },
  { label: 'Content Creator', email: 'creator@nimbusdesk.example', role: 'creator' },
  { label: 'External Agency', email: 'agency@nimbusdesk.example', role: 'external_creator' },
]

/** Org slug used for all demo accounts. Override via VITE_ORG_SLUG env var. */
export const ORG_SLUG: string =
  (import.meta.env as Record<string, string | undefined>).VITE_ORG_SLUG ?? 'nimbusdesk'

/** Demo password — only set when VITE_DEMO_MODE === 'true'. Never hardcoded. */
export const DEMO_PASSWORD: string =
  (import.meta.env as Record<string, string | undefined>).VITE_DEMO_PASSWORD ?? ''

export const IS_DEMO_MODE: boolean =
  (import.meta.env as Record<string, string | undefined>).VITE_DEMO_MODE === 'true'
