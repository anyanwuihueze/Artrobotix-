import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { apiUrl } from './lib/api';
import PublicWebsite from './components/PublicWebsite';
import CertificateVerify from './components/CertificateVerify';
import StudentPortal from './components/StudentPortal';
import AdminDashboard from './components/AdminDashboard';
import BrandEmblem from './components/BrandEmblem';
import { Cohort, InstituteSettings, Programme } from './types';

type AppView = 'public' | 'verify' | 'portal' | 'signin';

function CampusShell() {
  const {
    dbUser,
    loading: authLoading,
    authError,
    signInWithGoogle,
  } = useAuth();

  const [view, setView] = useState<AppView>(() =>
    window.location.pathname.startsWith('/verify') ? 'verify' : 'public'
  );
  const [settings, setSettings] = useState<InstituteSettings | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [publicLoading, setPublicLoading] = useState(true);

  useEffect(() => {
    const loadPublic = async () => {
      try {
        const res = await fetch(apiUrl('/api/public/home'));
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings);
          setProgrammes(data.programmes || []);
          setCohorts(data.cohorts || []);
        }
      } catch (err) {
        console.error('Failed to load public institute data:', err);
      } finally {
        setPublicLoading(false);
      }
    };
    loadPublic();
  }, []);

  const navigateTo = (nextView: AppView) => {
    setView(nextView);
    if (nextView === 'verify') {
      window.history.pushState({}, '', '/verify');
    } else if (window.location.pathname === '/verify') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleSignInClick = async () => {
    try {
      await signInWithGoogle();
      setView('portal');
    } catch {
      setView('signin');
    }
  };

  if (view === 'verify') {
    return <CertificateVerify onBack={() => navigateTo('public')} />;
  }

  if (view === 'signin' && !dbUser) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-neutral-200 border-t-[3px] border-t-[#F9501E] p-8 space-y-6">
          <div className="group flex items-center gap-3.5">
            <BrandEmblem size="card" tone="light" alt="Artdrobotix Institute Seal" />
            <div>
              <h1 className="font-display text-lg font-extrabold tracking-tight text-[#111111]">
                Digital Campus Sign In
              </h1>
              <p className="text-xs text-neutral-500">
                Students, Instructors &amp; Administrators
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-600 leading-relaxed">
            Sign in with your Google account to access your Artdrobotix Student
            Portal or Institutional Administration Console.
          </p>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSignInClick}
            className="w-full py-3 bg-[#F9501E] text-white text-sm font-semibold hover:bg-[#d94316] transition-colors"
          >
            Continue with Google Sign-In
          </button>

          <button
            type="button"
            onClick={() => navigateTo('public')}
            className="w-full py-2.5 border border-neutral-300 text-xs font-medium text-[#111111] hover:bg-neutral-50"
          >
            Return to Public Website
          </button>
        </div>
      </div>
    );
  }

  if (view === 'portal') {
    if (authLoading) {
      return (
        <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center text-sm text-neutral-600">
          Verifying institutional session...
        </div>
      );
    }
    if (!dbUser) {
      return (
        <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-neutral-200 p-8 space-y-5">
            <h1 className="text-lg font-bold">Authentication Required</h1>
            <p className="text-sm text-neutral-600">
              Please sign in with Google to access your portal.
            </p>
            <button
              type="button"
              onClick={handleSignInClick}
              className="w-full py-3 bg-[#F9501E] text-white text-sm font-semibold"
            >
              Sign In with Google
            </button>
            <button
              type="button"
              onClick={() => navigateTo('public')}
              className="w-full py-2.5 border border-neutral-300 text-xs font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    const isStaff = [
      'SUPER_ADMIN',
      'ADMINISTRATOR',
      'INSTRUCTOR',
      'FINANCE_OFFICER',
    ].includes(dbUser.role);

    if (isStaff) {
      return <AdminDashboard onBackToPublic={() => navigateTo('public')} />;
    }
    return <StudentPortal onBackToPublic={() => navigateTo('public')} />;
  }

  if (publicLoading && programmes.length === 0) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center text-sm text-neutral-600">
        Loading Artdrobotix Institute...
      </div>
    );
  }

  return (
    <PublicWebsite
      settings={settings}
      programmes={programmes}
      cohorts={cohorts}
      currentUser={dbUser}
      onSignIn={() => setView('signin')}
      onOpenPortal={() => setView('portal')}
      onOpenVerify={() => navigateTo('verify')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CampusShell />
    </AuthProvider>
  );
}
