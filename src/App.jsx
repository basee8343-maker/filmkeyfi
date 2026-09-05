import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
// Add page imports here
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Browse from '@/pages/Browse';
import MovieDetail from '@/pages/MovieDetail';
import Watch from '@/pages/Watch';
import WatchParty from '@/pages/WatchParty';
import CreateRoom from '@/pages/CreateRoom';
import Profile from '@/pages/Profile';
import MyList from '@/pages/MyList';
import Search from '@/pages/Search';
import Support from '@/pages/Support';
import Notifications from '@/pages/Notifications';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminMovies from '@/pages/admin/AdminMovies';

import AdminSupport from '@/pages/admin/AdminSupport';
import AdminPayments from '@/pages/admin/AdminPayments';
import AdminNotifications from '@/pages/admin/AdminNotifications';
import AdminTelegram from '@/pages/admin/AdminTelegram';
import AdminCategories from '@/pages/admin/AdminCategories';
import OpenRooms from '@/pages/OpenRooms';
import AdminReports from '@/pages/admin/AdminReports';
import AdminUserReports from '@/pages/admin/AdminUserReports';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminSecurity from '@/pages/admin/AdminSecurity';
import Subscription from '@/pages/Subscription';
import PaymentResult from '@/pages/PaymentResult';
import PaymentHistory from '@/pages/PaymentHistory';
import MaintenanceMode from '@/pages/MaintenanceMode';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserProfile from '@/pages/UserProfile';
import { Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PendingApproval from '@/pages/PendingApproval';
import BannedScreen from '@/pages/BannedScreen';
import SecurityProtocol from '@/pages/SecurityProtocol';
import Friends from '@/pages/Friends';

import AdminPromoVideo from '@/pages/admin/AdminPromoVideo';
import AdminSessions from '@/pages/admin/AdminSessions';
import AdminUpdates from '@/pages/admin/AdminUpdates';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onay-bekleniyor" element={<PendingApproval />} />
      <Route path="/engellendiniz" element={<BannedScreen />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/filmler" element={<Browse type="movie" title="Filmler" />} />
          <Route path="/acik-odalar" element={<OpenRooms />} />
          <Route path="/kategoriler" element={<Browse type="movie" title="Kategoriler" />} />
          <Route path="/izle/:id" element={<MovieDetail />} />
          <Route path="/video/:id" element={<Watch />} />
          <Route path="/oda/:id" element={<WatchParty />} />
          <Route path="/oda-kur" element={<CreateRoom />} />
          <Route path="/listem" element={<MyList />} />
          <Route path="/ara" element={<Search />} />
          <Route path="/destek" element={<Support />} />
          <Route path="/arkadaslar" element={<Friends />} />
          <Route path="/bildirimler" element={<Notifications />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/kullanici/:id" element={<UserProfile />} />
          <Route path="/güvenlik-protokolü" element={<SecurityProtocol />} />
          <Route path="/abonelik" element={<Subscription />} />
          <Route path="/odeme-gecmisim" element={<PaymentHistory />} />
          <Route path="/odeme/basarili" element={<PaymentResult />} />
          <Route path="/odeme/basarisiz" element={<PaymentResult />} />
          <Route path="/bakim" element={<MaintenanceMode />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="kullanicilar" element={<AdminUsers />} />
          <Route path="filmler" element={<AdminMovies />} />
          <Route path="film-ekle" element={<AdminMovies />} />
          <Route path="kategoriler" element={<AdminCategories />} />

          <Route path="destek" element={<AdminSupport />} />
          <Route path="odeme" element={<AdminPayments />} />
          <Route path="bildirimler" element={<AdminNotifications />} />
          <Route path="telegram" element={<AdminTelegram />} />
          <Route path="guvenlik" element={<AdminSecurity />} />
          <Route path="sikayetler" element={<AdminUserReports />} />
          <Route path="ayarlar" element={<AdminSettings />} />
          <Route path="ayalar" element={<AdminSettings />} />
          <Route path="tanitim-videosu" element={<AdminPromoVideo />} />
          <Route path="oturumlar" element={<AdminSessions />} />
          <Route path="guncellemeler" element={<AdminUpdates />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App