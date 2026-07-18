import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import RequireRole from './components/RequireRole';
import PartnerLayout from './components/partner/PartnerLayout';
import { AuthProvider } from './context/AuthContext';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BillboardDetailPage from './pages/BillboardDetailPage';
import BookingProgressPage from './pages/BookingProgressPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import MapBrowsePage from './pages/MapBrowsePage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import SignupPage from './pages/SignupPage';
import PartnerArtworkPage from './pages/partner/PartnerArtworkPage';
import PartnerAvailabilityPage from './pages/partner/PartnerAvailabilityPage';
import PartnerCrmPage from './pages/partner/PartnerCrmPage';
import PartnerJobsPage from './pages/partner/PartnerJobsPage';
import PartnerLoginPage from './pages/partner/PartnerLoginPage';
import PartnerOverviewPage from './pages/partner/PartnerOverviewPage';
import PartnerSyncPage from './pages/partner/PartnerSyncPage';
import PartnerTeamPage from './pages/partner/PartnerTeamPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-cream">
          <Header />

          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/map" element={<MapBrowsePage />} />
            <Route path="/billboards/:id" element={<BillboardDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireRole roles={['customer']}>
                  <CustomerDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/bookings/:id/progress"
              element={
                <RequireRole roles={['customer']}>
                  <BookingProgressPage />
                </RequireRole>
              }
            />
            <Route
              path="/owner"
              element={
                <RequireRole roles={['owner', 'admin']}>
                  <OwnerDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole roles={['admin']}>
                  <AdminDashboardPage />
                </RequireRole>
              }
            />
            {/* Tangazaa Partner — the billboard company's ERP workspace.
                Staff accounts (created by their owner) share it; the Team page
                and the owner dashboard stay owner-only. */}
            <Route path="/partner/login" element={<PartnerLoginPage />} />
            <Route
              path="/partner"
              element={
                <RequireRole roles={['owner', 'admin', 'staff']} loginPath="/partner/login">
                  <PartnerLayout />
                </RequireRole>
              }
            >
              <Route index element={<PartnerOverviewPage />} />
              <Route path="availability" element={<PartnerAvailabilityPage />} />
              <Route path="crm" element={<PartnerCrmPage />} />
              <Route path="artwork" element={<PartnerArtworkPage />} />
              <Route path="jobs" element={<PartnerJobsPage />} />
              <Route path="sync" element={<PartnerSyncPage />} />
              <Route
                path="team"
                element={
                  <RequireRole roles={['owner', 'admin']} loginPath="/partner/login">
                    <PartnerTeamPage />
                  </RequireRole>
                }
              />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
