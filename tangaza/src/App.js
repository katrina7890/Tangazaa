import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import Header from './components/Header';
import RequireRole from './components/RequireRole';
import CustomerLayout from './components/customer/CustomerLayout';
import PartnerLayout from './components/partner/PartnerLayout';
import { AuthProvider } from './context/AuthContext';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BillboardDetailPage from './pages/BillboardDetailPage';
import BookingProgressPage from './pages/customer/BookingProgressPage';
import CustomerCampaignsPage from './pages/customer/CustomerCampaignsPage';
import CustomerDocumentsPage from './pages/customer/CustomerDocumentsPage';
import CustomerMessagesPage from './pages/customer/CustomerMessagesPage';
import CustomerOverviewPage from './pages/customer/CustomerOverviewPage';
import CustomerPaymentsPage from './pages/customer/CustomerPaymentsPage';
import CustomerProfilePage from './pages/customer/CustomerProfilePage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import MapBrowsePage from './pages/MapBrowsePage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import SignupPage from './pages/SignupPage';
import PartnerAnalyticsPage from './pages/partner/PartnerAnalyticsPage';
import PartnerArtworkPage from './pages/partner/PartnerArtworkPage';
import PartnerAvailabilityPage from './pages/partner/PartnerAvailabilityPage';
import PartnerBookingDetailPage from './pages/partner/PartnerBookingDetailPage';
import PartnerBookingsPage from './pages/partner/PartnerBookingsPage';
import PartnerChatPage from './pages/partner/PartnerChatPage';
import PartnerCrmPage from './pages/partner/PartnerCrmPage';
import PartnerJobsPage from './pages/partner/PartnerJobsPage';
import PartnerLoginPage from './pages/partner/PartnerLoginPage';
import PartnerOverviewPage from './pages/partner/PartnerOverviewPage';
import PartnerSettingsPage from './pages/partner/PartnerSettingsPage';
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
            {/* The customer workspace — same side-menu shell as Tangazaa
                Partner, so both sides of the marketplace navigate alike. */}
            <Route
              path="/dashboard"
              element={
                <RequireRole roles={['customer']}>
                  <CustomerLayout />
                </RequireRole>
              }
            >
              <Route index element={<CustomerOverviewPage />} />
              <Route path="campaigns" element={<CustomerCampaignsPage />} />
              <Route path="messages" element={<CustomerMessagesPage />} />
              <Route path="payments" element={<CustomerPaymentsPage />} />
              <Route path="documents" element={<CustomerDocumentsPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
              <Route path="bookings/:id/progress" element={<BookingProgressPage />} />
            </Route>

            {/* Pre-sidebar URLs — kept alive because they're linked from
                already-sent emails and in-app notifications. */}
            <Route path="/messages" element={<Navigate to="/dashboard/messages" replace />} />
            <Route path="/bookings/:id/progress" element={<LegacyProgressRedirect />} />
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
              <Route path="bookings" element={<PartnerBookingsPage />} />
              <Route path="bookings/:id" element={<PartnerBookingDetailPage />} />
              <Route path="availability" element={<PartnerAvailabilityPage />} />
              <Route path="crm" element={<PartnerCrmPage />} />
              <Route path="artwork" element={<PartnerArtworkPage />} />
              <Route path="jobs" element={<PartnerJobsPage />} />
              <Route path="sync" element={<PartnerSyncPage />} />
              <Route path="analytics" element={<PartnerAnalyticsPage />} />
              <Route path="chat" element={<PartnerChatPage />} />
              <Route
                path="team"
                element={
                  <RequireRole roles={['owner', 'admin']} loginPath="/partner/login">
                    <PartnerTeamPage />
                  </RequireRole>
                }
              />
              <Route
                path="settings"
                element={
                  <RequireRole roles={['owner', 'admin']} loginPath="/partner/login">
                    <PartnerSettingsPage />
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

/** Carries the booking id across to the nested progress route. */
function LegacyProgressRedirect() {
  const { id } = useParams();
  return <Navigate to={`/dashboard/bookings/${id}/progress`} replace />;
}

export default App;
