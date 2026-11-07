/**
 * localUsers.ts — a small local "database" of application users.
 *
 * Stored entirely in the browser via localStorage (no server required).
 * Each user has: id, name, phone, password, createdAt.
 *
 * NOTE: This is a lightweight local demo store. Passwords are stored as
 * provided (basic login). Do not use this approach for production auth.
 */

export interface LocalUser {
  id: string
  name: string
  phone: string
  password: string
  createdAt: string
}

const USERS_KEY = 'bg_local_users'
const SESSION_KEY = 'bg_local_session'

function readUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as LocalUser[]) : []
  } catch {
    return []
  }
}

function writeUsers(users: LocalUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getUsers(): LocalUser[] {
  return readUsers()
}

export function registerUser(
  name: string,
  phone: string,
  password: string,
): { ok: boolean; error?: string; user?: LocalUser } {
  const trimmedName = name.trim()
  const trimmedPhone = phone.trim()
  if (!trimmedName) return { ok: false, error: 'Name is required' }
  if (!/^[0-9+()\-\s]{7,16}$/.test(trimmedPhone))
    return { ok: false, error: 'Enter a valid phone number (7–16 digits)' }
  if (password.length < 4)
    return { ok: false, error: 'Password must be at least 4 characters' }
  const users = readUsers()
  if (users.some((u) => u.phone === trimmedPhone))
    return { ok: false, error: 'An account with this phone already exists' }
  const user: LocalUser = {
    id: 'U' + Date.now().toString(36),
    name: trimmedName,
    phone: trimmedPhone,
    password,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  writeUsers(users)
  return { ok: true, user }
}

export function loginUser(
  phone: string,
  password: string,
): { ok: boolean; error?: string; user?: LocalUser } {
  const users = readUsers()
  const user = users.find((u) => u.phone === phone.trim())
  if (!user) return { ok: false, error: 'No account found with this phone number' }
  if (user.password !== password) return { ok: false, error: 'Incorrect password' }
  return { ok: true, user }
}

export function setSession(userId: string): void {
  localStorage.setItem(SESSION_KEY, userId)
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function getSessionUser(): LocalUser | null {
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  return readUsers().find((u) => u.id === id) ?? null
}

/** Seed one demo account on first load so the app is usable immediately. */
export function ensureSeedUser(): void {
  const users = readUsers()
  if (users.length === 0) {
    const demo: LocalUser = {
      id: 'U_demo',
      name: 'Demo User',
      phone: '1234567890',
      password: 'demo123',
      createdAt: new Date().toISOString(),
    }
    writeUsers([demo])
  }
}
