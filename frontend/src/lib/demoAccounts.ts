/**
 * demoAccounts.ts — seeded demo account mapping.
 *
 * IS_DEMO_MODE defaults to true so the demo section is always visible
 * in the submitted build. It can be overridden to false via the
 * VITE_DEMO_MODE=false env var at build time.
 *
 * DEMO_PASSWORD is read from VITE_DEMO_PASSWORD if set; falls back to
 * the well-known seed default so the demo works without configuring env vars.
 */

export interface DemoAccount {
  label: string
  email: string
  role: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: 'Admin',            email: 'admin@nimbusdesk.example',    role: 'admin' },
  { label: 'Brand Manager',    email: 'brand@nimbusdesk.example',    role: 'brand_manager' },
  { label: 'Approver',         email: 'approver@nimbusdesk.example', role: 'approver' },
  { label: 'Manager',          email: 'manager@nimbusdesk.example',  role: 'manager' },
  { label: 'Content Creator',  email: 'creator@nimbusdesk.example',  role: 'creator' },
  { label: 'External Agency',  email: 'agency@nimbusdesk.example',   role: 'external_creator' },
]

/** Org slug for all demo accounts. */
export const ORG_SLUG: string =
  (import.meta.env as Record<string, string | undefined>).VITE_ORG_SLUG ?? 'nimbusdesk'

/**
 * Demo password.
 * Falls back to the known seed default so the UI works without configuring
 * VITE_DEMO_PASSWORD explicitly. When a real backend is running, this must
 * match the SEED_PASSWORD used when seeding the database.
 */
export const DEMO_PASSWORD: string =
  (import.meta.env as Record<string, string | undefined>).VITE_DEMO_PASSWORD ?? 'demo-password'

/**
 * Demo mode flag — TRUE by default so the demo section is always shown.
 * Set VITE_DEMO_MODE=false at build time to hide it in a production deploy.
 */
export const IS_DEMO_MODE: boolean =
  (import.meta.env as Record<string, string | undefined>).VITE_DEMO_MODE !== 'false'

export const personas: Record<string, { name: string; initials: string; description: string }> = {
  admin: { name: 'Aarav Sharma', initials: 'AS', description: 'Set up the workspace' },
  brand_manager: { name: 'Ananya Rao', initials: 'AR', description: 'Keep the brand on track' },
  approver: { name: 'Priya Mehta', initials: 'PM', description: 'Review and decide' },
  manager: { name: 'Rohan Shah', initials: 'RS', description: 'Coordinate the team' },
  creator: { name: 'Kavya Nair', initials: 'KN', description: 'Create with confidence' },
  external_creator: { name: 'Aditya Iyer', initials: 'AI', description: 'Collaborate on content' },
}

