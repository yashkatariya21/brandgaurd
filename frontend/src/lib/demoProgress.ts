import { useSyncExternalStore } from 'react'
import { IS_DEMO_MODE } from './demoAccounts'

const KEY = 'brandguard-demo-progress-v1'
const listeners = new Set<() => void>()
let memory = '[]'
function read(): string {
  try { return sessionStorage.getItem(KEY) ?? memory } catch { return memory }
}
function write(value: string) {
  memory = value
  try { sessionStorage.setItem(KEY, value) } catch { /* Use in-memory fallback. */ }
  listeners.forEach(listener => listener())
}
export function getProgress(): number[] {
  try {
    const parsed: unknown = JSON.parse(read())
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 6) : []
  } catch { return [] }
}
export function markStep(stepId: number) {
  if (!IS_DEMO_MODE || !Number.isInteger(stepId) || stepId < 1 || stepId > 6) return
  const progress = getProgress()
  if (!progress.includes(stepId)) write(JSON.stringify([...progress, stepId]))
}
export function resetProgress() { write('[]') }
export function useDemoProgress(): number[] {
  const snapshot = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, read, () => '[]')
  try { const value: unknown = JSON.parse(snapshot); return Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 6) : [] } catch { return [] }
}
