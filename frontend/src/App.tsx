import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { ThemeProvider, useTheme } from './theme'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import RepositoryPage from './pages/RepositoryPage'
import ContentPage from './pages/ContentPage'
import BlastRadiusPage from './pages/BlastRadiusPage'
import FindingsPage from './pages/FindingsPage'
import RuleTestsPage from './pages/RuleTestsPage'
import AboutPage from './pages/AboutPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { isAuthority } = useTheme()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--primary-accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-muted text-sm">Loading BrandGuard…</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="repository" element={<RepositoryPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="blast-radius" element={<BlastRadiusPage />} />
        <Route path="findings" element={<FindingsPage />} />
        <Route path="rule-tests" element={<RuleTestsPage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
