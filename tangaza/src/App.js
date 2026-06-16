import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import RequireRole from './components/RequireRole';
import { AuthProvider } from './context/AuthContext';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BillboardDetailPage from './pages/BillboardDetailPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import MapBrowsePage from './pages/MapBrowsePage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import SignupPage from './pages/SignupPage';

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
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
