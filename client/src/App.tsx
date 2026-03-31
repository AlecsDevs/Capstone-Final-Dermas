
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SplashPage from './pages/SplashPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import { AdminLayout } from './components/AdminLayout'
import { StaffLayout } from './components/StaffLayout'
import { Dashboard } from './pages/admin/Dashboard'
import Management_Report from './pages/admin/Management_Report.tsx'
import Zone_Report from './pages/admin/Zone_Report.tsx'
import UserManagement from './pages/admin/UserManagement.tsx'
import StaffDashboard from './pages/staff/StaffDashboard'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path='/' element={<SplashPage />} />
        <Route path='/login' element={<LoginPage />} />

        {/* Admin only */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path='/admin' element={<AdminLayout />}>
            <Route index element={<Navigate to='dashboard' replace />} />
            <Route path='dashboard'       element={<Dashboard />} />
            <Route path='zonal-reports'   element={<Management_Report />} />
            <Route path='zonal-reports/:zoneSlug' element={<Zone_Report />} />
            <Route path='user-management' element={<UserManagement />} />
            <Route path='documents'       element={<h1>Documents</h1>} />
          </Route>
        </Route>

        {/* Staff only */}
        <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
          <Route path='/staff' element={<StaffLayout />}>
            <Route index element={<Navigate to='dashboard' replace />} />
            <Route path='dashboard' element={<StaffDashboard />} />
            <Route path='reports'   element={<h1>My Reports</h1>} />
            <Route path='documents' element={<h1>Documents</h1>} />
          </Route>
        </Route>

        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App




