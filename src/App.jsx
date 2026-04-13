import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import { getCurrentUser } from './utils/auth';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import UserDashboard from './pages/user/UserDashboard';
import ReportIncident from './pages/user/ReportIncident';
import Analytics from './pages/user/Analytics';
import Inbox from './pages/user/Inbox';
import Settings from './pages/user/Settings';
import Support from './pages/user/Support';
import AdminDashboard from './pages/admin/AdminDashboard';
import MapDashboard from './pages/admin/MapDashboard';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AILearning from './pages/admin/AILearning';
import SystemConfig from './pages/admin/SystemConfig';
import AppHistory from './pages/user/History';
import PublicLog from './pages/user/PublicLog';
import InfoHub from './pages/user/InfoHub';
import TrackBill from './pages/TrackBill';
import CustomerService from './pages/CustomerService';
import Bills from './pages/user/Bills';
import Chatbot from './components/Chatbot';
import RealTimeTracking from './pages/features/RealTimeTracking';
import InstantPayments from './pages/features/InstantPayments';
import SecurePlatform from './pages/features/SecurePlatform';
import ServiceMap from './pages/user/ServiceMap';
import InstallPrompt from './components/InstallPrompt';
import GlobalTicker from './components/common/GlobalTicker';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import SupabaseAuthUrlNotice, { stashSupabaseAuthFragmentError } from './components/auth/SupabaseAuthUrlNotice';
import { NotificationProvider } from './context/NotificationContext';
import { PreferencesProvider } from './context/PreferencesContext';

// Auth State Handler Component
function AuthHandler({ setGlobalLoading, setAuthSettled }) {
  const navigate = useNavigate();

  useEffect(() => {
    // Email-confirm / magic-link failures land in the hash; strip them and surface a notice (old session may remain).
    stashSupabaseAuthFragmentError();

    // SECURITY: Auto-fix any active dev overrides
    if (localStorage.getItem('smart_csm_dev_admin_override')) {
      localStorage.clear();
      supabase.auth.signOut().then(() => {
        window.location.href = '/login';
      });
      return;
    }

    // SAFETY TIMEOUT: Resilience for slow connections (increased to 8s)
    const safetyTimer = setTimeout(() => {
      console.warn("Auth safety timeout triggered.");
      setGlobalLoading(false);
      setAuthSettled(true);
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log("Auth Event:", event);
        const isAuthPage = ['/login', '/signup', '/', ''].includes(window.location.pathname);
        const hasAuthIntent = !!localStorage.getItem('smart_csm_auth_intent');

        // LOADING LOGIC: Only show splash when there is a session to sync (never block empty /login with a full-screen overlay).
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (isAuthPage && session?.user) setGlobalLoading(true);
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          const user = session?.user;
          if (user) {
            // OPTIMISTIC SETTLE: Show routes immediately while profile syncs in background
            setAuthSettled(true);
            if (!hasAuthIntent) setGlobalLoading(false);
            clearTimeout(safetyTimer);

            // BACKGROUND SYNC: Sync profile without blocking the UI
            (async () => {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', user.id)
                  .single();

                if (!profile) {
                  // Profile Self-Healing: If a user exists in Auth but is missing a row in 'profiles',
                  // we automatically create it as 'customer' (unless it's the Boss) to prevent login loops.
                  const isBoss = user.email === 'akazayasussy@gmail.com';
                  const pendingRole = isBoss ? 'admin' : 'customer';
                  const displayName = (user.user_metadata?.full_name || user.email?.split('@')[0] || '').trim().replace(/\s+/g, ' ');
                  const metaFirst = (user.user_metadata?.first_name || '').trim();
                  const metaLast = (user.user_metadata?.last_name || '').trim();
                  let first_name = metaFirst;
                  let last_name = metaLast;
                  if (!first_name || !last_name) {
                    if (displayName) {
                      const sp = displayName.indexOf(' ');
                      if (sp === -1) {
                        first_name = first_name || displayName;
                        last_name = last_name || '';
                      } else {
                        first_name = first_name || displayName.slice(0, sp);
                        last_name = last_name || displayName.slice(sp + 1).trim();
                      }
                    }
                  }
                  const metaPhone = (user.user_metadata?.phone || '').trim();
                  const metaBarangay = (user.user_metadata?.barangay || '').trim();

                  const { error: insertError } = await supabase.from('profiles').insert([{
                    id: user.id,
                    full_name: displayName || user.email.split('@')[0],
                    first_name: first_name || null,
                    last_name: last_name || null,
                    phone: metaPhone || null,
                    barangay: metaBarangay || null,
                    role: pendingRole,
                    email: user.email
                  }]);

                  if (insertError) {
                    console.error("Profile self-healing failed:", insertError);
                  }
                } else if (profile) {
                  // Older rows may have full_name only; copy phone/barangay from Auth metadata when still empty.
                  const metaPhone = (user.user_metadata?.phone || '').trim();
                  const metaBar = (user.user_metadata?.barangay || '').trim();
                  const patch = {};
                  if (metaPhone && !(profile.phone || '').trim()) patch.phone = metaPhone;
                  if (metaBar && !(profile.barangay || '').trim()) patch.barangay = metaBar;
                  const mfn = (user.user_metadata?.first_name || '').trim();
                  const mln = (user.user_metadata?.last_name || '').trim();
                  if (!(profile.first_name || '').trim() && mfn) patch.first_name = mfn;
                  if (!(profile.last_name || '').trim() && mln) patch.last_name = mln;
                  const fn = (profile.full_name || user.user_metadata?.full_name || '').trim().replace(/\s+/g, ' ');
                  if (!(profile.first_name || '').trim() && !(profile.last_name || '').trim() && !patch.first_name && !patch.last_name && fn.includes(' ')) {
                    const sp = fn.indexOf(' ');
                    patch.first_name = fn.slice(0, sp);
                    patch.last_name = fn.slice(sp + 1).trim();
                  }
                  if (Object.keys(patch).length > 0) {
                    const { error: mergeErr } = await supabase.from('profiles').update(patch).eq('id', user.id);
                    if (mergeErr) console.warn('Profile merge from metadata:', mergeErr.message);
                  }
                }

                let userRole = profile?.role || (user.email === 'akazayasussy@gmail.com' ? 'admin' : 'customer');
                const sessionUser = {
                  id: user.id,
                  email: user.email,
                  name: user.user_metadata.full_name || profile?.full_name || user.email.split('@')[0],
                  role: userRole,
                  avatar_url: profile?.avatar_url
                };

                localStorage.setItem('smart_csm_current_user', JSON.stringify(sessionUser));

                // If explicit login, handle redirect automatically based on database role
                if (isAuthPage && hasAuthIntent) {
                  setTimeout(() => {
                    setGlobalLoading(false);
                    // Automatic Redirect: Admin -> /admin, Customer -> /dashboard
                    if (sessionUser.role === 'admin') {
                      navigate('/admin');
                    } else {
                      navigate('/dashboard');
                    }
                    localStorage.removeItem('smart_csm_auth_intent');
                    localStorage.removeItem('smart_csm_pending_role');
                  }, 600); // Optimized timing for smoother transition
                }
              } catch (bgErr) {
                console.warn("Background sync error:", bgErr);
              }
            })();
          } else {
            setGlobalLoading(false);
            setAuthSettled(true);
            clearTimeout(safetyTimer);
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('smart_csm_current_user');
          setGlobalLoading(false);
          setAuthSettled(true);
          // Only redirect if we are on a route that requires authentication. 
          // Treat all routes other than the home, login, signup, and public info pages as protected by default.
          const currentPath = window.location.pathname;
          const isPublicRoute = ['/', '/login', '/signup', '/forgot-password', '/services', '/customer-service', '/about', '/track'].includes(currentPath);

          if (!isPublicRoute) {
            navigate('/login');
          }
          clearTimeout(safetyTimer);
        } else {
          setAuthSettled(true);
          clearTimeout(safetyTimer);
        }
      } catch (error) {
        setAuthSettled(true);
        setGlobalLoading(false);
        clearTimeout(safetyTimer);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [setGlobalLoading, setAuthSettled, navigate]);

  return null;
}

/**
 * Home, dashboards, etc. stay behind auth settlement so ProtectedRoute sees a synced session.
 * Login / signup / forgot are NOT wrapped here so they never sit under the "Starting session" blocker.
 */
function MainShell({ authSettled, loading }) {
  return (
    <>
      {!authSettled && !loading && (
        <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-tight">Starting session…</p>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md animate-fade-in text-center p-6">
          <div className="w-24 h-24 mb-8 relative">
            <div className="absolute inset-0 border-4 border-blue-50 rounded-full opacity-20"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl rotate-45 animate-pulse shadow-2xl shadow-blue-500/50"></div>
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Preparing Dashboard...</h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Synchronizing Secure Session</p>
        </div>
      )}

      {authSettled && (
        <PreferencesProvider>
          <NotificationProvider>
            <RouteErrorBoundary>
              <GlobalTicker />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Home />} />
                <Route path="/track" element={<TrackBill />} />

                {/* Protected Resident Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                <Route path="/report-incident" element={<ProtectedRoute><ReportIncident /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/help" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><AppHistory /></ProtectedRoute>} />
                <Route path="/public-log" element={<ProtectedRoute><PublicLog /></ProtectedRoute>} />
                <Route path="/info-hub" element={<ProtectedRoute><InfoHub /></ProtectedRoute>} />
                <Route path="/service-map" element={<ProtectedRoute><ServiceMap /></ProtectedRoute>} />

                {/* Protected Admin Routes */}
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/map" element={<AdminRoute><MapDashboard /></AdminRoute>} />
                <Route path="/admin/audit" element={<AdminRoute><AdminAuditLog /></AdminRoute>} />
                <Route path="/admin/learning" element={<AdminRoute><AILearning /></AdminRoute>} />
                <Route path="/admin/config" element={<AdminRoute><SystemConfig /></AdminRoute>} />
                <Route path="/admin/messages" element={<AdminRoute><Inbox /></AdminRoute>} />

                {/* Public/Other Routes */}
                <Route path="/customer-service" element={<CustomerService />} />
                <Route path="/features/tracking" element={<RealTimeTracking />} />
                <Route path="/features/payments" element={<InstantPayments />} />
                <Route path="/features/security" element={<SecurePlatform />} />
              </Routes>
              <Chatbot />
              <InstallPrompt />
            </RouteErrorBoundary>
          </NotificationProvider>
        </PreferencesProvider>
      )}
    </>
  );
}

function App() {
  const [loading, setLoading] = useState(false);
  const [authSettled, setAuthSettled] = useState(false);

  return (
    <Router>
      <div className="app-container">
        <AuthHandler setGlobalLoading={setLoading} setAuthSettled={setAuthSettled} />
        <SupabaseAuthUrlNotice />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<MainShell authSettled={authSettled} loading={loading} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
