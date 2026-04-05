
import { Suspense, lazy, type ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { AdminLayout } from './components/AdminLayout'
import { StaffLayout } from './components/StaffLayout'
import PwaInstallButton from './components/PwaInstallButton'
import { AppLoadingScreen } from './components/AppLoadingScreen'

const SplashPage = lazy(() => import('./pages/SplashPage.tsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.tsx'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then(mod => ({ default: mod.Dashboard })))
const Management_Report = lazy(() => import('./pages/admin/Management_Report.tsx'))
const Zone_Report = lazy(() => import('./pages/admin/Zone_Report.tsx'))
const UserManagement = lazy(() => import('./pages/admin/UserManagement.tsx'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

type AppRole = 'admin' | 'staff'

interface ChildRouteConfig {
  path: string
  element: ReactElement
}

interface ProtectedRouteConfig {
  role: AppRole
  basePath: `/${AppRole}`
  layout: ReactElement
  indexRedirect: string
  children: ChildRouteConfig[]
}

const sharedReportRoutes: ChildRouteConfig[] = [
  { path: 'dashboard', element: <Dashboard /> },
  { path: 'zonal-reports', element: <Management_Report /> },
  { path: 'zonal-reports/:zoneSlug', element: <Zone_Report /> },
  { path: 'documents', element: <DocumentsPage /> },
]

const protectedRouteConfigs: ProtectedRouteConfig[] = [
  {
    role: 'admin',
    basePath: '/admin',
    layout: <AdminLayout />,
    indexRedirect: 'dashboard',
    children: [...sharedReportRoutes, { path: 'user-management', element: <UserManagement /> }],
  },
  {
    role: 'staff',
    basePath: '/staff',
    layout: <StaffLayout />,
    indexRedirect: 'dashboard',
    children: [
      ...sharedReportRoutes,
      { path: 'reports', element: <Navigate to='/staff/zonal-reports' replace /> },
    ],
  },
]

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<AppLoadingScreen />}>
        <Routes>
          {/* Public */}
          <Route path='/' element={<SplashPage />} />
          <Route path='/login' element={<LoginPage />} />

          {protectedRouteConfigs.map((config) => (
            <Route key={config.role} element={<ProtectedRoute allowedRoles={[config.role]} />}>
              <Route path={config.basePath} element={config.layout}>
                <Route index element={<Navigate to={config.indexRedirect} replace />} />
                {config.children.map((child) => (
                  <Route key={`${config.role}-${child.path}`} path={child.path} element={child.element} />
                ))}
              </Route>
            </Route>
          ))}

          <Route path='*' element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <PwaInstallButton />
    </AuthProvider>
  )
}

export default App




