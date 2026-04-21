import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminLayout } from '@/components/AdminLayout'
import { AdminRoute } from '@/components/AdminRoute'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PublicLayout } from '@/components/PublicLayout'
import { AccountPage } from '@/pages/AccountPage'
import { AdminAdminsPage } from '@/pages/AdminAdminsPage'
import { AdminCoursesPage } from '@/pages/AdminCoursesPage'
import { AdminDashboardPage } from '@/pages/AdminDashboardPage'
import { AdminEnrollmentsPage } from '@/pages/AdminEnrollmentsPage'
import { AdminReportsPage } from '@/pages/AdminReportsPage'
import { AdminStudentsPage } from '@/pages/AdminStudentsPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { EnrollmentsPage } from '@/pages/EnrollmentsPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { Agentation } from 'agentation'

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:id" element={<CourseDetailPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="account" element={<AccountPage />} />
          <Route path="enrollments" element={<EnrollmentsPage />} />
        </Route>
      </Route>
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="courses" element={<AdminCoursesPage />} />
        <Route path="enrollments" element={<AdminEnrollmentsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="admins" element={<AdminAdminsPage />} />
      </Route>
    </Routes>
    {import.meta.env.DEV && (
      <Agentation
        endpoint="http://localhost:4747"
        onSessionCreated={(sessionId) => {
          console.debug('[Agentation] session:', sessionId)
        }}
      />
    )}
    </>
  )
}
