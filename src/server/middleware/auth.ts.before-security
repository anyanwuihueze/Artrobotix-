import type { NextFunction, Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../../lib/firebase-admin.ts';
import { db } from '../../db/index.ts';
import { applications, studentProfiles, users } from '../../db/schema.ts';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMINISTRATOR'
  | 'INSTRUCTOR'
  | 'FINANCE_OFFICER'
  | 'STUDENT';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: DbUser;
}

const OWNER_EMAIL = 'anyanwuihueze@gmail.com';

async function syncUserRecord(decoded: DecodedIdToken): Promise<DbUser> {
  const email = (decoded.email || `${decoded.uid}@artdrobotix.local`).toLowerCase();
  const fullName = decoded.name || email.split('@')[0];

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.uid, decoded.uid))
    .limit(1);

  if (existing.length > 0) {
    const record = existing[0];
    if (!record.isActive) {
      throw new Error('ACCOUNT_DISABLED');
    }
    return {
      ...record,
      role: record.role as UserRole,
    };
  }

  // Check if a pre-created user exists with the same email (e.g. invited staff)
  const byEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (byEmail.length > 0) {
    const updated = await db
      .update(users)
      .set({
        uid: decoded.uid,
        fullName: byEmail[0].fullName || fullName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, byEmail[0].id))
      .returning();

    const row = updated[0];
    return { ...row, role: row.role as UserRole };
  }

  // Determine initial role: institute owner or very first user becomes SUPER_ADMIN
  const countRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  const totalUsers = countRes[0]?.count ?? 0;

  const initialRole: UserRole =
    email === OWNER_EMAIL || totalUsers === 0 ? 'SUPER_ADMIN' : 'STUDENT';

  const inserted = await db
    .insert(users)
    .values({
      uid: decoded.uid,
      email,
      fullName,
      role: initialRole,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        updatedAt: new Date(),
      },
    })
    .returning();

  const dbUser = inserted[0];

  // Auto-link any matching student profile or application by email
  await db
    .update(studentProfiles)
    .set({ userId: dbUser.id })
    .where(eq(studentProfiles.email, email));

  await db
    .update(applications)
    .set({ userId: dbUser.id })
    .where(eq(applications.email, email));

  return {
    ...dbUser,
    role: dbUser.role as UserRole,
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const dbUser = await syncUserRecord(decodedToken);
    req.dbUser = dbUser;
    next();
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'ACCOUNT_DISABLED') {
      return res.status(403).json({ error: 'This user account has been deactivated.' });
    }
    console.error('Auth verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.dbUser.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }
    next();
  };
};

// Lightweight in-memory sliding window rate limiter for public endpoints
const rateLimitStore = new Map<string, number[]>();

export const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const timestamps = (rateLimitStore.get(key) || []).filter(
      (ts) => now - ts < windowMs
    );
    if (timestamps.length >= maxRequests) {
      return res
        .status(429)
        .json({ error: 'Too many requests. Please wait a moment and try again.' });
    }
    timestamps.push(now);
    rateLimitStore.set(key, timestamps);
    next();
  };
};
