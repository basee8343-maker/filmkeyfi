import { lazy, Suspense } from 'react';
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
import { ThemeProvider } from '@/lib/ThemeContext';
import { Navigate } from 'react-router-dom';

const Home = lazy(() => import('@/pages/Home'));
const Browse = lazy(() => import('@/pages/Browse'));
const MovieDetail = lazy(() => import('@/pages/MovieDetail'));
const Watch = lazy(() => import('@/pages/Watch'));
const WatchParty = lazy(() => import('@/pages/WatchParty'));
const CreateRoom = lazy(() => import('@/pages/CreateRoom'));
const Profile = lazy(() => import('@/pages/Profile'));
const MyList = lazy(() => import('@/pages/MyList'));
const Search = lazy(() => import('@/pages/Search'));
const Support = lazy(() => import('@/pages/Support'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const OpenRooms = lazy(() => import('@/pages/OpenRooms'));
const Subscription = lazy(() => import('@/pages/Subscription'));
const PaymentResult = lazy(() => import('@/pages/PaymentResult'));
const PaymentHistory = lazy(() => import('@/pages/PaymentHistory'));
const MaintenanceMode = lazy(() => import('@/pages/MaintenanceMode'));
const UserProfile = lazy(() => import('@/pages/UserProfile'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const PendingApproval = lazy(() => import('@/pages/PendingApproval'));
const BannedScreen = lazy(() => import('@/pages/BannedScreen'));
const SecurityProtocol = lazy(() => import('@/pages/SecurityProtocol'));
const Friends = lazy(() => import('@/pages/Friends'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminMovies = lazy(() => import('@/pages/admin/AdminMovies'));
const AdminSupport = lazy(() => import('@/pages/admin/AdminSupport'));
const AdminPayments = lazy(() => import('@/pages/admin/AdminPayments'));
const AdminNotifications = lazy(() => import('@/pages/admin/AdminNotifications'));
const AdminTelegram = lazy(() => import('@/pages/admin/AdminTelegram'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminUserReports = lazy(() => import('@/pages/admin/AdminUserReports'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminSecurity = lazy(() => import('@/pages/admin/AdminSecurity'));
const AdminPromoVideo = lazy(() => import('@/pages/admin/AdminPromoVideo'));
const AdminSessions = lazy(() => import('@/pages/admin/AdminSessions'));
const AdminUpdates = lazy(() => import('@/pages/admin/AdminUpdates'));

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
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>}>
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
    </Suspense>
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