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
import { AppUser, StudentProfile } from '../types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  dbUser: AppUser | null;
  studentProfile: StudentProfile | null;
  unreadNotifications: number;
  loading: boolean;
  authError: string | null;
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
  const tokenRef = useRef<string | null>(null);

  const fetchMe = useCallback(async (user: FirebaseUser) => {
    try {
      const idToken = await user.getIdToken();
      tokenRef.current = idToken;
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to verify session.');
      }
      const data = await res.json();
      setDbUser(data.user);
      setStudentProfile(data.studentProfile);
      setUnreadNotifications(data.unreadNotifications ?? 0);
      setAuthError(null);
    } catch (err) {
      console.error('Session sync failed:', err);
      setAuthError(
        err instanceof Error ? err.message : 'Unable to authenticate session.'
      );
      setDbUser(null);
      setStudentProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchMe(user);
      } else {
        tokenRef.current = null;
        setDbUser(null);
        setStudentProfile(null);
        setUnreadNotifications(0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [fetchMe]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        await fetchMe(result.user);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in was cancelled.';
      setAuthError(message);
      throw err;
    }
  }, [fetchMe]);

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

      const res = await fetch(url, { ...options, headers });
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
