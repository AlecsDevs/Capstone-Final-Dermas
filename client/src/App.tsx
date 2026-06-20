import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import PwaInstallButton from './components/PwaInstallButton'
import { AppLoadingScreen } from './components/AppLoadingScreen'

const SplashPage        = lazy(() => import('./pages/SplashPage.tsx'))
const LoginPage         = lazy(() => import('./pages/LoginPage.tsx'))
const Dashboard         = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.Dashboard })))
const StaffDashboard    = lazy(() => import('./pages/staff/StaffDashboard'))
const Management_Report = lazy(() => import('./pages/admin/Management_Report.tsx'))
const Zone_Report       = lazy(() => import('./pages/admin/Zone_Report.tsx'))
const UserManagement    = lazy(() => import('./pages/admin/UserManagement.tsx'))
const DocumentsPage     = lazy(() => import('./pages/DocumentsPage'))
const TrashPage         = lazy(() => import('./pages/TrashPage'))
const AboutPage         = lazy(() => import('./pages/AboutPage'))
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'))

// Pages shared by both admin and staff
const sharedRoutes = [
  { path: 'zonal-reports',           element: <Management_Report /> },
  { path: 'zonal-reports/:zoneSlug', element: <Zone_Report /> },
  { path: 'documents',               element: <DocumentsPage /> },
  { path: 'trash',                   element: <TrashPage /> },
  { path: 'about',                   element: <AboutPage /> },
]

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<AppLoadingScreen />}>
        <Routes>
          {/* Public */}
          <Route path='/' element={<SplashPage />} />
          <Route path='/login' element={<LoginPage />} />

          {/* Admin */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path='/admin' element={<AppLayout />}>
              <Route index element={<Navigate to='dashboard' replace />} />
              <Route path='dashboard' element={<Dashboard />} />
              {sharedRoutes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
              <Route path='user-management' element={<UserManagement />} />
            </Route>
          </Route>

          {/* Staff */}
          <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
            <Route path='/staff' element={<AppLayout />}>
              <Route index element={<Navigate to='dashboard' replace />} />
              <Route path='dashboard' element={<StaffDashboard />} />
              {sharedRoutes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
              <Route path='reports' element={<Navigate to='/staff/zonal-reports' replace />} />
            </Route>
          </Route>

          <Route path='*' element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <PwaInstallButton />
    </AuthProvider>
  )
}

export default App
