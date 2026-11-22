import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiUrl } from '../lib/api';
import { AppUser, StudentProfile } from '../types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  dbUser: AppUser | null;
  studentProfile: StudentProfile | null;
  unreadNotifications: number;
  loading: boolean;
  authError: string | null;
  authDiagnostics: string[];
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<AppUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null
  );
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authDiagnostics, setAuthDiagnostics] = useState<string[]>([]);

  const recordAuthDiagnostic = useCallback((message: string) => {
    const entry = `${new Date().toLocaleTimeString()} — ${message}`;
    console.info('[AUTH DIAGNOSTIC]', entry);
    setAuthDiagnostics((previous) => [...previous.slice(-11), entry]);
  }, []);
  const tokenRef = useRef<string | null>(null);

  const fetchMe = useCallback(async (user: FirebaseUser) => {
    try {
      recordAuthDiagnostic('Getting Firebase ID token...');
      const idToken = await user.getIdToken();
      tokenRef.current = idToken;

      recordAuthDiagnostic('Sending authenticated request to /api/auth/me...');
      const res = await fetch(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      recordAuthDiagnostic(`/api/auth/me responded with HTTP ${res.status}.`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data.error || 'Failed to verify session.';
        recordAuthDiagnostic(`BACKEND REJECTED LOGIN: ${message}`);
        throw new Error(`${message} (HTTP ${res.status})`);
      }

      if (!data.user) {
        recordAuthDiagnostic('BACKEND ERROR: Response did not contain a database user.');
        throw new Error('Authenticated, but no institutional user was returned.');
      }

      recordAuthDiagnostic(`BACKEND VERIFIED: ${data.user.email} — role ${data.user.role}.`);
      setDbUser(data.user);
      setStudentProfile(data.studentProfile);
      setUnreadNotifications(data.unreadNotifications ?? 0);
      setAuthError(null);
    } catch (err) {
      console.error('Session sync failed:', err);
      recordAuthDiagnostic(
        `SESSION VERIFICATION FAILED: ${err instanceof Error ? err.message : String(err)}`
      );
      setAuthError(
        err instanceof Error ? err.message : 'Unable to authenticate session.'
      );
      setDbUser(null);
      setStudentProfile(null);
      throw err;
    }
  }, [recordAuthDiagnostic]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      recordAuthDiagnostic(
        user ? `Firebase session detected for ${user.email || user.uid}.`
             : 'No Firebase session detected.'
      );
      if (user) {
        try {
          await fetchMe(user);
        } catch (err) {
          console.error('Initial session verification failed:', err);
        }
      } else {
        tokenRef.current = null;
        setDbUser(null);
        setStudentProfile(null);
        setUnreadNotifications(0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [fetchMe, recordAuthDiagnostic]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthDiagnostics([]);
    recordAuthDiagnostic('SIGN-IN BUTTON ACTIVATED.');
    try {
      recordAuthDiagnostic('Requesting Firebase Google sign-in popup...');
      const result = await signInWithPopup(auth, googleAuthProvider);

      if (result.user) {
        recordAuthDiagnostic(
          `FIREBASE AUTHENTICATED: ${result.user.email || result.user.uid}.`
        );
        recordAuthDiagnostic(
          'Firebase sign-in successful; waiting for authentication listener to synchronize the account.'
        );
      } else {
        recordAuthDiagnostic('Firebase popup returned without a user.');
        throw new Error('Google sign-in returned no authenticated user.');
      }
    } catch (err) {
      const error = err as Error & { code?: string };
      const message = error.message || 'Google sign-in was cancelled.';
      recordAuthDiagnostic(
        `FIREBASE SIGN-IN FAILED: ${error.code || 'unknown error'} — ${message}`
      );
      setAuthError(`${error.code || 'AUTH_ERROR'}: ${message}`);
      throw err;
    }
  }, [fetchMe, recordAuthDiagnostic]);

  const logout = useCallback(async () => {
    await signOut(auth);
    tokenRef.current = null;
    setDbUser(null);
    setStudentProfile(null);
    setUnreadNotifications(0);
  }, []);

  const refreshSession = useCallback(async () => {
    if (firebaseUser) {
      await fetchMe(firebaseUser);
    }
  }, [firebaseUser, fetchMe]);

  const apiFetch = useCallback(
    async <T = unknown>(url: string, options: RequestInit = {}): Promise<T> => {
      let token = tokenRef.current;
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
        tokenRef.current = token;
      }

      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const res = await fetch(apiUrl(url), { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || `Request failed (${res.status})`) as Error & {
          code?: string;
          issues?: string[];
        };
        err.code = data.code;
        err.issues = data.issues;
        throw err;
      }
      return data as T;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        studentProfile,
        unreadNotifications,
        loading,
        authError,
        authDiagnostics,
        signInWithGoogle,
        logout,
        refreshSession,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
