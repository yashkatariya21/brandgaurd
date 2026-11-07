import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type ThemeMode = 'authority' | 'serene'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggleTheme: () => void
  isAuthority: boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const STORAGE_KEY = 'bg_theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    return saved === 'serene' || saved === 'authority' ? saved : 'authority'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'serene') {
      root.classList.add('theme-serene')
    } else {
      root.classList.remove('theme-serene')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = (t: ThemeMode) => setThemeState(t)
  const toggleTheme = () => setThemeState((p) => (p === 'authority' ? 'serene' : 'authority'))

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, isAuthority: theme === 'authority' }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
