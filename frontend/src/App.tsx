import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { AdminLayout } from './layout/AdminLayout'
import { LoginPage } from './pages/admin/LoginPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { ScannerPage } from './pages/admin/ScannerPage'
import { MembersPage } from './pages/admin/MembersPage'
import { ApprovalsPage } from './pages/admin/ApprovalsPage'
import { RenewalsPage } from './pages/admin/RenewalsPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { GenericEntityPage } from './pages/generic/GenericEntityPage'
import { PublicCardPage } from './pages/kiosk/PublicCardPage'
import { TvKioskPage } from './pages/kiosk/TvKioskPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/card" element={<PublicCardPage />} />
      <Route path="/kiosk/:branch" element={<TvKioskPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/renewals" element={<RenewalsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/membership-types" element={<GenericEntityPage entityKey="membership-types" />} />
          <Route path="/branches" element={<GenericEntityPage entityKey="branches" />} />
          <Route path="/walkins" element={<GenericEntityPage entityKey="walkins" />} />
          <Route path="/promotions" element={<GenericEntityPage entityKey="promotions" />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
