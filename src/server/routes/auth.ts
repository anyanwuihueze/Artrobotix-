import { Router } from 'express';
import { and, eq, sql, or } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { applications, notifications, studentProfiles } from '../../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { ensureInitialSeed } from '../seed.ts';

const router = Router();

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureInitialSeed();
    const user = req.dbUser!;

    const [profiles, myApps, unreadRes] = await Promise.all([
      db
        .select()
        .from(studentProfiles)
        .where(
          or(
            eq(studentProfiles.userId, user.id),
            eq(studentProfiles.email, user.email)
          )
        )
        .limit(1),
      db
        .select()
        .from(applications)
        .where(eq(applications.email, user.email)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientEmail, user.email),
            eq(notifications.channel, 'IN_APP'),
            eq(notifications.isRead, false)
          )
        ),
    ]);

    res.json({
      user,
      studentProfile: profiles[0] ?? null,
      applicationsCount: myApps.length,
      unreadNotifications: unreadRes[0]?.c ?? 0,
    });
  } catch (err) {
    console.error('Error fetching /api/auth/me:', err);
    res.status(500).json({ error: 'Failed to load authenticated session.' });
  }
});

export default router;
