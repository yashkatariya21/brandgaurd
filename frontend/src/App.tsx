import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import RepositoryPage from './pages/RepositoryPage'
import ContentPage from './pages/ContentPage'
import BlastRadiusPage from './pages/BlastRadiusPage'
import FindingsPage from './pages/FindingsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500 text-lg">Loading…</div>
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
        <Route index element={<Navigate to="/repository" replace />} />
        <Route path="repository" element={<RepositoryPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="blast-radius" element={<BlastRadiusPage />} />
        <Route path="findings" element={<FindingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
