import { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster, toast } from '@/components/ui/toast';
import { PageSpinner } from '@/components/ui/spinner';
import { CommandPalette } from '@/components/shared/command-palette';
import { useAuth } from '@/stores/auth';
import { setStorageErrorHandler } from '@/lib/storage';

const LandingPage = lazy(() => import('@/pages/landing'));
const LoginPage = lazy(() => import('@/pages/login'));
const SignupPage = lazy(() => import('@/pages/signup'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const EditorPage = lazy(() => import('@/features/editor/editor-page'));
const CommunityPage = lazy(() => import('@/pages/community'));
const PricingPage = lazy(() => import('@/pages/pricing'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const PrivacyPage = lazy(() => import('@/pages/privacy'));
const TermsPage = lazy(() => import('@/pages/terms'));
const NotFoundPage = lazy(() => import('@/pages/not-found'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

/** Keep already-signed-in users out of the login/signup pages. */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function App() {
  useEffect(() => {
    setStorageErrorHandler(() =>
      toast.error(
        'Storage is full',
        'Your browser ran out of space, so recent changes may not be saved. Delete a project or clear space to continue.'
      )
    );
  }, []);

  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={300}>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/login"
              element={
                <RedirectIfAuthed>
                  <LoginPage />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/signup"
              element={
                <RedirectIfAuthed>
                  <SignupPage />
                </RedirectIfAuthed>
              }
            />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/p/:projectId"
              element={
                <RequireAuth>
                  <EditorPage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <SettingsPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <CommandPalette />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  );
}
