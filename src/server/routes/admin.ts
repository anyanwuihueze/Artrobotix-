import { Router } from 'express';
import crypto from 'crypto';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  admissions,
  applications,
  assessments,
  assignments,
  attendance,
  auditLogs,
  certificates,
  cohorts,
  instituteSettings,
  invoiceItems,
  invoices,
  notifications,
  paymentPlans,
  payments,
  programmes,
  receipts,
  studentLedger,
  studentProfiles,
  submissions,
  users,
} from '../../db/schema.ts';
import {
  requireAuth,
  requireRole,
} from '../middleware/auth.ts';
import type { AuthRequest, UserRole } from '../middleware/auth.ts';
import { logAudit } from '../services/audit.ts';
import { dispatchNotification } from '../services/notifications.ts';
import {
  generateReference,
  generateVerificationCode,
} from '../services/references.ts';
import {
  addDaysIso,
  computeInvoicePolicyState,
  processPaymentReminders,
  recalculatePaymentPlanStatus,
} from '../services/billing.ts';
import type { PolicyState } from '../services/billing.ts';

const router = Router();

const STAFF_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMINISTRATOR',
  'INSTRUCTOR',
  'FINANCE_OFFICER',
];
const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMINISTRATOR'];
const FINANCE_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMINISTRATOR',
  'FINANCE_OFFICER',
];
const ACADEMIC_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMINISTRATOR',
  'INSTRUCTOR',
];

router.use(requireAuth, requireRole(STAFF_ROLES));

// ============================================================
// MODULE F: BUSINESS INTELLIGENCE & ANALYTICS
// ============================================================
router.get('/analytics', async (req: AuthRequest, res) => {
  try {
    const programmeId = req.query.programmeId
      ? Number(req.query.programmeId)
      : null;
    const from = req.query.from ? String(req.query.from) : null;
    const to = req.query.to ? String(req.query.to) : null;

    const [
      allProgs,
      allApps,
      allStudents,
      allInvoices,
      allPayments,
      allAttendance,
      allCerts,
      recentLogs,
    ] = await Promise.all([
      db.select().from(programmes).orderBy(asc(programmes.sortOrder)),
      db.select().from(applications).orderBy(desc(applications.createdAt)),
      db.select().from(studentProfiles).orderBy(desc(studentProfiles.createdAt)),
      db.select().from(invoices).orderBy(desc(invoices.createdAt)),
      db.select().from(payments).orderBy(desc(payments.createdAt)),
      db.select().from(attendance),
      db.select().from(certificates),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(25),
    ]);

    const inDateRange = (dateStr: string | null | undefined) => {
      if (!dateStr) return true;
      const d = dateStr.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    };

    const filteredApps = allApps.filter(
      (a) =>
        (!programmeId || a.programmeId === programmeId) &&
        inDateRange(a.submittedDate)
    );
    const filteredStudents = allStudents.filter(
      (s) =>
        (!programmeId || s.programmeId === programmeId) &&
        inDateRange(s.commencementDate)
    );
    const filteredInvoices = allInvoices.filter(
      (i) =>
        (!programmeId || i.programmeId === programmeId) &&
        inDateRange(i.issueDate)
    );
    const filteredInvoiceIds = new Set(filteredInvoices.map((i) => i.id));
    const filteredPayments = allPayments.filter(
      (p) =>
        filteredInvoiceIds.has(p.invoiceId) && inDateRange(p.paymentDate)
    );

    const totalApplications = filteredApps.length;
    const pendingApplications = filteredApps.filter(
      (a) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW'
    ).length;
    const acceptedApplications = filteredApps.filter(
      (a) => a.status === 'ACCEPTED' || a.status === 'ENROLLED'
    ).length;
    const enrolledStudents = filteredStudents.length;
    const activeStudents = filteredStudents.filter(
      (s) => s.academicStatus === 'ACTIVE' || s.academicStatus === 'ONBOARDING'
    ).length;
    const completedStudents = filteredStudents.filter(
      (s) => s.academicStatus === 'COMPLETED'
    ).length;

    const verifiedPayments = filteredPayments.filter(
      (p) => p.verificationStatus === 'VERIFIED'
    );
    const totalRevenue = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingPayments = filteredInvoices
      .filter((i) => i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + i.balanceDue, 0);
    const partialPaymentsCount = filteredInvoices.filter(
      (i) => i.status === 'PART_PAID'
    ).length;

    const conversionRate =
      totalApplications > 0
        ? Math.round((acceptedApplications / totalApplications) * 100)
        : 0;
    const completionRate =
      enrolledStudents > 0
        ? Math.round((completedStudents / enrolledStudents) * 100)
        : 0;

    const studentIdSet = new Set(filteredStudents.map((s) => s.id));
    const relevantAttendance = allAttendance.filter((a) =>
      studentIdSet.has(a.studentProfileId)
    );
    const avgAttendance =
      relevantAttendance.length > 0
        ? Math.round(
            (relevantAttendance.filter(
              (a) => a.status === 'PRESENT' || a.status === 'LATE'
            ).length /
              relevantAttendance.length) *
              100
          )
        : 0;

    const programmeStats = allProgs.map((p) => {
      const pApps = filteredApps.filter((a) => a.programmeId === p.id).length;
      const pStudents = filteredStudents.filter(
        (s) => s.programmeId === p.id
      ).length;
      const pInvIds = new Set(
        filteredInvoices
          .filter((i) => i.programmeId === p.id)
          .map((i) => i.id)
      );
      const pRevenue = verifiedPayments
        .filter((pay) => pInvIds.has(pay.invoiceId))
        .reduce((sum, pay) => sum + pay.amount, 0);
      return {
        programmeId: p.id,
        code: p.code,
        title: p.title,
        feeAmount: p.feeAmount,
        applications: pApps,
        enrolled: pStudents,
        revenue: pRevenue,
      };
    });

    // Monthly trend aggregation (from actual records)
    const monthlyMap = new Map<
      string,
      { month: string; applications: number; enrolments: number; revenue: number }
    >();
    const ensureMonth = (m: string) => {
      if (!monthlyMap.has(m)) {
        monthlyMap.set(m, {
          month: m,
          applications: 0,
          enrolments: 0,
          revenue: 0,
        });
      }
      return monthlyMap.get(m)!;
    };

    for (const a of filteredApps) {
      const m = a.submittedDate.slice(0, 7);
      ensureMonth(m).applications += 1;
    }
    for (const s of filteredStudents) {
      const m = s.commencementDate.slice(0, 7);
      ensureMonth(m).enrolments += 1;
    }
    for (const pay of verifiedPayments) {
      const m = pay.paymentDate.slice(0, 7);
      ensureMonth(m).revenue += pay.amount;
    }

    const monthlyTrends = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    res.json({
      metrics: {
        totalApplications,
        pendingApplications,
        acceptedApplications,
        enrolledStudents,
        activeStudents,
        completedStudents,
        totalRevenue,
        outstandingPayments,
        partialPaymentsCount,
        verifiedPaymentsCount: verifiedPayments.length,
        certificatesIssued: allCerts.filter((c) => c.status === 'VALID').length,
        conversionRate,
        completionRate,
        avgAttendance,
      },
      programmeStats,
      monthlyTrends,
      recentAuditLogs: recentLogs,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Unable to compute institutional analytics.' });
  }
});

// ============================================================
// PROGRAMMES & COHORTS
// ============================================================
router.get('/programmes', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(programmes)
      .orderBy(asc(programmes.sortOrder), asc(programmes.id));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load programmes.' });
  }
});

router.post('/programmes', requireRole(ADMIN_ROLES), async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    if (!body.title || !body.description) {
      return res
        .status(400)
        .json({ error: 'Title and description are required.' });
    }
    const durationWeeks = Math.max(1, Number(body.durationWeeks ?? 3));
    const weeklyFeeAmount = Math.max(0, Number(body.weeklyFeeAmount ?? 430000));
    const feeAmount =
      body.feeAmount !== undefined
        ? Math.max(0, Number(body.feeAmount))
        : weeklyFeeAmount * durationWeeks;

    const slug =
      body.slug ||
      String(body.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const countRes = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(programmes);
    const code =
      body.code || `ARTI-PROG-${String((countRes[0]?.c ?? 0) + 1).padStart(2, '0')}`;

    const inserted = await db
      .insert(programmes)
      .values({
        code,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        title: String(body.title).trim(),
        summary: String(body.summary || body.description).slice(0, 180),
        description: String(body.description).trim(),
        learningObjectives: Array.isArray(body.learningObjectives)
          ? body.learningObjectives
          : [],
        skillsAcquired: Array.isArray(body.skillsAcquired)
          ? body.skillsAcquired
          : [],
        modules: Array.isArray(body.modules) ? body.modules : [],
        weeklyDeliverables: Array.isArray(body.weeklyDeliverables)
          ? body.weeklyDeliverables
          : [],
        graduationOutcomes: Array.isArray(body.graduationOutcomes)
          ? body.graduationOutcomes
          : [],
        sessionSchedule: String(
          body.sessionSchedule || '3 Sessions / Week · 3 Hours / Session (9 Hours Weekly)'
        ),
        durationText: String(body.durationText || `${durationWeeks} Weeks (${durationWeeks * 9} Practical Hours)`),
        durationWeeks,
        deliveryFormat: String(body.deliveryFormat || 'Hybrid'),
        weeklyFeeAmount,
        feeAmount,
        allowsInstalments: body.allowsInstalments !== false,
        isActive: body.isActive !== false,
        sortOrder: Number(body.sortOrder ?? (countRes[0]?.c ?? 0) + 1),
      })
      .returning();

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.dbUser!.role,
      action: 'PROGRAMME_CREATED',
      entityType: 'programme',
      entityId: inserted[0].code,
    });

    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create programme.' });
  }
});

router.patch(
  '/programmes/:id',
  requireRole(ADMIN_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body ?? {};
      const existing = await db
        .select()
        .from(programmes)
        .where(eq(programmes.id, id))
        .limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Programme not found.' });
      }
      const cur = existing[0];
      const nextDurationWeeks =
        body.durationWeeks !== undefined
          ? Math.max(1, Number(body.durationWeeks))
          : cur.durationWeeks;
      const nextWeeklyFee =
        body.weeklyFeeAmount !== undefined
          ? Math.max(0, Number(body.weeklyFeeAmount))
          : cur.weeklyFeeAmount;
      const nextFeeAmount =
        body.feeAmount !== undefined
          ? Math.max(0, Number(body.feeAmount))
          : body.weeklyFeeAmount !== undefined || body.durationWeeks !== undefined
            ? nextWeeklyFee * nextDurationWeeks
            : cur.feeAmount;

      const updated = await db
        .update(programmes)
        .set({
          title: body.title !== undefined ? String(body.title).trim() : cur.title,
          summary:
            body.summary !== undefined ? String(body.summary).trim() : cur.summary,
          description:
            body.description !== undefined
              ? String(body.description).trim()
              : cur.description,
          learningObjectives: Array.isArray(body.learningObjectives)
            ? body.learningObjectives
            : cur.learningObjectives,
          skillsAcquired: Array.isArray(body.skillsAcquired)
            ? body.skillsAcquired
            : cur.skillsAcquired,
          modules: Array.isArray(body.modules) ? body.modules : cur.modules,
          weeklyDeliverables: Array.isArray(body.weeklyDeliverables)
            ? body.weeklyDeliverables
            : cur.weeklyDeliverables,
          graduationOutcomes: Array.isArray(body.graduationOutcomes)
            ? body.graduationOutcomes
            : cur.graduationOutcomes,
          sessionSchedule:
            body.sessionSchedule !== undefined
              ? String(body.sessionSchedule).trim()
              : cur.sessionSchedule,
          durationText:
            body.durationText !== undefined
              ? String(body.durationText).trim()
              : cur.durationText,
          durationWeeks: nextDurationWeeks,
          deliveryFormat:
            body.deliveryFormat !== undefined
              ? String(body.deliveryFormat).trim()
              : cur.deliveryFormat,
          weeklyFeeAmount: nextWeeklyFee,
          feeAmount: nextFeeAmount,
          allowsInstalments:
            body.allowsInstalments !== undefined
              ? Boolean(body.allowsInstalments)
              : cur.allowsInstalments,
          isActive:
            body.isActive !== undefined ? Boolean(body.isActive) : cur.isActive,
          updatedAt: new Date(),
        })
        .where(eq(programmes.id, id))
        .returning();

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'PROGRAMME_UPDATED',
        entityType: 'programme',
        entityId: cur.code,
        details: {
          weeklyFeeAmount: updated[0].weeklyFeeAmount,
          feeAmount: updated[0].feeAmount,
          isActive: updated[0].isActive,
        },
      });

      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update programme.' });
    }
  }
);

router.get('/cohorts', async (_req, res) => {
  try {
    const rows = await db.select().from(cohorts).orderBy(desc(cohorts.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load cohorts.' });
  }
});

router.post(
  '/cohorts',
  requireRole(ACADEMIC_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      if (!body.programmeId || !body.name || !body.startDate) {
        return res
          .status(400)
          .json({ error: 'programmeId, name, and startDate are required.' });
      }
      const code =
        body.code ||
        `COH-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

      const inserted = await db
        .insert(cohorts)
        .values({
          programmeId: Number(body.programmeId),
          code,
          name: String(body.name).trim(),
          instructorId: body.instructorId ? Number(body.instructorId) : null,
          instructorName: String(body.instructorName || 'Prince Anyanwu'),
          deliveryFormat: String(body.deliveryFormat || 'Hybrid'),
          scheduleText: String(
            body.scheduleText || 'Mon / Wed / Fri · 6:00 PM – 9:00 PM WAT'
          ),
          startDate: String(body.startDate),
          endDate: body.endDate ? String(body.endDate) : null,
          capacity: Number(body.capacity || 25),
          status: String(body.status || 'UPCOMING'),
        })
        .returning();

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'COHORT_CREATED',
        entityType: 'cohort',
        entityId: inserted[0].code,
      });

      res.status(201).json(inserted[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create cohort.' });
    }
  }
);

router.patch(
  '/cohorts/:id',
  requireRole(ACADEMIC_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body ?? {};
      const existing = await db
        .select()
        .from(cohorts)
        .where(eq(cohorts.id, id))
        .limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Cohort not found.' });
      }
      const cur = existing[0];
      const updated = await db
        .update(cohorts)
        .set({
          name: body.name ?? cur.name,
          instructorName: body.instructorName ?? cur.instructorName,
          deliveryFormat: body.deliveryFormat ?? cur.deliveryFormat,
          scheduleText: body.scheduleText ?? cur.scheduleText,
          startDate: body.startDate ?? cur.startDate,
          endDate: body.endDate !== undefined ? body.endDate : cur.endDate,
          capacity: body.capacity !== undefined ? Number(body.capacity) : cur.capacity,
          status: body.status ?? cur.status,
        })
        .where(eq(cohorts.id, id))
        .returning();

      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update cohort.' });
    }
  }
);

// ============================================================
// MODULE A: ADMISSIONS MANAGEMENT
// ============================================================
router.get('/applications', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || '').trim();
    const programmeId = req.query.programmeId
      ? Number(req.query.programmeId)
      : null;

    const rows = await db
      .select()
      .from(applications)
      .orderBy(desc(applications.createdAt));

    const filtered = rows.filter((a) => {
      if (status && a.status !== status) return false;
      if (programmeId && a.programmeId !== programmeId) return false;
      if (search) {
        const hay =
          `${a.referenceNumber} ${a.fullName} ${a.email} ${a.phone} ${a.programmeName}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
});

router.patch(
  '/applications/:id',
  requireRole(ADMIN_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body ?? {};
      const existing = await db
        .select()
        .from(applications)
        .where(eq(applications.id, id))
        .limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Application not found.' });
      }
      const cur = existing[0];

      let nextProgrammeName = cur.programmeName;
      let nextProgrammeId = cur.programmeId;
      if (body.programmeId && Number(body.programmeId) !== cur.programmeId) {
        const prog = await db
          .select()
          .from(programmes)
          .where(eq(programmes.id, Number(body.programmeId)))
          .limit(1);
        if (prog.length > 0) {
          nextProgrammeId = prog[0].id;
          nextProgrammeName = prog[0].title;
        }
      }

      const nextStatus = body.status ? String(body.status) : cur.status;
      const updated = await db
        .update(applications)
        .set({
          status: nextStatus,
          programmeId: nextProgrammeId,
          programmeName: nextProgrammeName,
          internalNotes:
            body.internalNotes !== undefined
              ? String(body.internalNotes)
              : cur.internalNotes,
          infoRequestMessage:
            body.infoRequestMessage !== undefined
              ? String(body.infoRequestMessage)
              : cur.infoRequestMessage,
          reviewedByUserId: req.dbUser!.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(applications.id, id))
        .returning();

      if (nextStatus !== cur.status) {
        if (nextStatus === 'ACCEPTED') {
          await dispatchNotification({
            recipientUserId: cur.userId,
            recipientEmail: cur.email,
            eventType: 'APPLICATION_ACCEPTED',
            title: `Admission Offer — ${cur.referenceNumber}`,
            message: `Congratulations ${cur.fullName}, your application for ${nextProgrammeName} at Artdrobotix Institute has been accepted. Your Proforma Invoice and onboarding details will follow.`,
          });
        } else if (nextStatus === 'REJECTED') {
          await dispatchNotification({
            recipientUserId: cur.userId,
            recipientEmail: cur.email,
            eventType: 'APPLICATION_REJECTED',
            title: `Application Update — ${cur.referenceNumber}`,
            message: `Dear ${cur.fullName}, thank you for applying to Artdrobotix Institute. We are unable to offer admission for the current cohort at this time.`,
          });
        }
      }

      if (
        body.infoRequestMessage &&
        body.infoRequestMessage !== cur.infoRequestMessage
      ) {
        await dispatchNotification({
          recipientUserId: cur.userId,
          recipientEmail: cur.email,
          eventType: 'APPLICATION_INFO_REQUESTED',
          title: `Additional Information Requested — ${cur.referenceNumber}`,
          message: `Dear ${cur.fullName}, our admissions team has requested additional details: ${body.infoRequestMessage}`,
        });
      }

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'APPLICATION_REVIEWED',
        entityType: 'application',
        entityId: cur.referenceNumber,
        details: { previousStatus: cur.status, newStatus: nextStatus },
      });

      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update application.' });
    }
  }
);

router.post(
  '/applications/:id/offer',
  requireRole(ADMIN_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { cohortId, notes } = req.body ?? {};
      const appRows = await db
        .select()
        .from(applications)
        .where(eq(applications.id, id))
        .limit(1);
      if (appRows.length === 0) {
        return res.status(404).json({ error: 'Application not found.' });
      }
      const app = appRows[0];
      if (!app.programmeId) {
        return res
          .status(400)
          .json({ error: 'Assign a programme before generating an admission offer.' });
      }

      await db
        .update(applications)
        .set({
          status: 'ACCEPTED',
          reviewedByUserId: req.dbUser!.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(applications.id, id));

      const offer = await db
        .insert(admissions)
        .values({
          applicationId: id,
          programmeId: app.programmeId,
          cohortId: cohortId ? Number(cohortId) : null,
          offerStatus: 'OFFERED',
          admissionLetterIssuedAt: new Date(),
          issuedByUserId: req.dbUser!.id,
          notes: notes ? String(notes) : null,
        })
        .returning();

      await dispatchNotification({
        recipientUserId: app.userId,
        recipientEmail: app.email,
        eventType: 'APPLICATION_ACCEPTED',
        title: `Official Admission Offer — ${app.referenceNumber}`,
        message: `Dear ${app.fullName}, your formal admission offer for ${app.programmeName} has been issued. Proceed with financial onboarding as outlined in your Proforma Invoice.`,
      });

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'ADMISSION_OFFER_ISSUED',
        entityType: 'admission',
        entityId: offer[0].id,
        details: { applicationRef: app.referenceNumber },
      });

      res.status(201).json(offer[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to issue admission offer.' });
    }
  }
);

// ============================================================
// MODULE C: STUDENTS & ONBOARDING
// ============================================================
router.get('/students', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(studentProfiles)
      .orderBy(desc(studentProfiles.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load students.' });
  }
});

router.post(
  '/students/enrol',
  requireRole(ADMIN_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      const applicationId = body.applicationId ? Number(body.applicationId) : null;
      const cohortId = body.cohortId ? Number(body.cohortId) : null;
      const commencementDate =
        body.commencementDate || new Date().toISOString().slice(0, 10);

      let fullName = String(body.fullName || '').trim();
      let email = String(body.email || '').trim().toLowerCase();
      let phone = String(body.phone || '').trim();
      let location = body.location ? String(body.location).trim() : null;
      let programmeId = body.programmeId ? Number(body.programmeId) : null;
      let preferredSetup = body.preferredSetup
        ? String(body.preferredSetup).trim()
        : null;
      let preferredPaymentPlan =
        body.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
          ? 'WEEKLY_INSTALMENTS'
          : 'FULL_PAYMENT';
      let userId: number | null = null;

      if (applicationId) {
        const appRows = await db
          .select()
          .from(applications)
          .where(eq(applications.id, applicationId))
          .limit(1);
        if (appRows.length === 0) {
          return res.status(404).json({ error: 'Application not found.' });
        }
        const app = appRows[0];
        const existingStudent = await db
          .select()
          .from(studentProfiles)
          .where(eq(studentProfiles.applicationId, applicationId))
          .limit(1);
        if (existingStudent.length > 0) {
          return res.status(409).json({
            error: `Applicant is already enrolled as ${existingStudent[0].admissionNumber}.`,
          });
        }
        fullName = fullName || app.fullName;
        email = email || app.email.toLowerCase();
        phone = phone || app.phone;
        location = location || app.stateCity;
        programmeId = programmeId || app.programmeId;
        preferredSetup = preferredSetup || app.preferredSetup;
        preferredPaymentPlan = body.preferredPaymentPlan || app.preferredPaymentPlan;
        userId = app.userId;
      }

      if (!fullName || !email || !phone || !programmeId) {
        return res.status(400).json({
          error: 'fullName, email, phone, and programmeId are required to enrol a student.',
        });
      }

      // Link user account if matching email exists
      if (!userId) {
        const matchingUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (matchingUsers.length > 0) {
          userId = matchingUsers[0].id;
        }
      }

      const admissionNumber = await generateReference('STU');

      const inserted = await db
        .insert(studentProfiles)
        .values({
          admissionNumber,
          userId,
          applicationId,
          fullName,
          email,
          phone,
          location,
          programmeId,
          cohortId,
          commencementDate,
          academicStatus: 'ACTIVE',
          preferredSetup,
          preferredPaymentPlan,
        })
        .returning();

      const student = inserted[0];

      if (applicationId) {
        await db
          .update(applications)
          .set({ status: 'ENROLLED', updatedAt: new Date() })
          .where(eq(applications.id, applicationId));

        // Link pre-enrolment payment plans, invoices, payments, and ledger entries to new studentProfileId
        await Promise.all([
          db
            .update(paymentPlans)
            .set({ studentProfileId: student.id })
            .where(eq(paymentPlans.applicationId, applicationId)),
          db
            .update(invoices)
            .set({ studentProfileId: student.id })
            .where(eq(invoices.applicationId, applicationId)),
          db
            .update(payments)
            .set({ studentProfileId: student.id })
            .where(eq(payments.applicationId, applicationId)),
          db
            .update(studentLedger)
            .set({ studentProfileId: student.id })
            .where(eq(studentLedger.applicationId, applicationId)),
        ]);

        const existingAdmissions = await db
          .select()
          .from(admissions)
          .where(eq(admissions.applicationId, applicationId))
          .limit(1);

        if (existingAdmissions.length > 0) {
          await db
            .update(admissions)
            .set({
              studentProfileId: student.id,
              cohortId,
              offerStatus: 'CONFIRMED',
              admissionLetterIssuedAt:
                existingAdmissions[0].admissionLetterIssuedAt ?? new Date(),
              onboardingSentAt: new Date(),
            })
            .where(eq(admissions.id, existingAdmissions[0].id));
        } else {
          await db.insert(admissions).values({
            applicationId,
            studentProfileId: student.id,
            programmeId,
            cohortId,
            offerStatus: 'CONFIRMED',
            admissionLetterIssuedAt: new Date(),
            onboardingSentAt: new Date(),
            issuedByUserId: req.dbUser!.id,
          });
        }
      }

      await dispatchNotification({
        recipientUserId: userId,
        recipientEmail: email,
        eventType: 'ADMISSION_CONFIRMED',
        title: `Enrolment Confirmed — ${admissionNumber}`,
        message: `Welcome to Artdrobotix Institute, ${fullName}. Your Student Admission Number is ${admissionNumber}. Sign in to the Student Portal with ${email} to access your schedule, software requirements, and learning resources.`,
      });

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'STUDENT_ENROLLED',
        entityType: 'student_profile',
        entityId: admissionNumber,
        details: { programmeId, cohortId, applicationId },
      });

      res.status(201).json(student);
    } catch (err) {
      console.error('Student enrolment error:', err);
      res.status(500).json({ error: 'Failed to enrol student.' });
    }
  }
);

router.patch(
  '/students/:id',
  requireRole(ADMIN_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const body = req.body ?? {};
      const existing = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, id))
        .limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Student not found.' });
      }
      const cur = existing[0];
      const updated = await db
        .update(studentProfiles)
        .set({
          cohortId:
            body.cohortId !== undefined
              ? body.cohortId
                ? Number(body.cohortId)
                : null
              : cur.cohortId,
          academicStatus: body.academicStatus ?? cur.academicStatus,
          commencementDate: body.commencementDate ?? cur.commencementDate,
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.id, id))
        .returning();

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'STUDENT_UPDATED',
        entityType: 'student_profile',
        entityId: cur.admissionNumber,
        details: { academicStatus: updated[0].academicStatus },
      });

      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update student.' });
    }
  }
);

router.get('/students/:id/detail', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const profiles = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, id))
      .limit(1);
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    const student = profiles[0];
    const [
      attRows,
      subRows,
      assessRows,
      invRows,
      payRows,
      recRows,
      ledgerRows,
      certRows,
    ] = await Promise.all([
      db
        .select()
        .from(attendance)
        .where(eq(attendance.studentProfileId, id))
        .orderBy(desc(attendance.sessionDate)),
      db
        .select()
        .from(submissions)
        .where(eq(submissions.studentProfileId, id)),
      db
        .select()
        .from(assessments)
        .where(eq(assessments.studentProfileId, id)),
      db
        .select()
        .from(invoices)
        .where(eq(invoices.studentProfileId, id))
        .orderBy(desc(invoices.createdAt)),
      db
        .select()
        .from(payments)
        .where(eq(payments.studentProfileId, id))
        .orderBy(desc(payments.createdAt)),
      db
        .select()
        .from(receipts)
        .where(eq(receipts.studentProfileId, id))
        .orderBy(desc(receipts.issuedAt)),
      db
        .select()
        .from(studentLedger)
        .where(eq(studentLedger.studentProfileId, id))
        .orderBy(desc(studentLedger.createdAt)),
      db
        .select()
        .from(certificates)
        .where(eq(certificates.studentProfileId, id)),
    ]);

    res.json({
      student,
      attendance: attRows,
      submissions: subRows,
      assessments: assessRows,
      invoices: invRows,
      payments: payRows,
      receipts: recRows,
      ledger: ledgerRows,
      certificates: certRows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load student detail.' });
  }
});

// ============================================================
// MODULE B: FINANCIAL MANAGEMENT
// ============================================================
router.get('/invoices', requireRole(FINANCE_ROLES), async (_req, res) => {
  try {
    await processPaymentReminders().catch((e) =>
      console.error('Background payment reminder check failed:', e)
    );
    const [invRows, itemRows, settingsRows] = await Promise.all([
      db.select().from(invoices).orderBy(desc(invoices.createdAt)),
      db.select().from(invoiceItems),
      db
        .select()
        .from(instituteSettings)
        .where(eq(instituteSettings.key, 'default'))
        .limit(1),
    ]);
    const graceHours = settingsRows[0]?.gracePeriodHours ?? 48;
    const reminderHours = settingsRows[0]?.reminderHoursBeforeDue ?? 48;

    const itemsByInv = new Map<number, typeof itemRows>();
    for (const it of itemRows) {
      const arr = itemsByInv.get(it.invoiceId) || [];
      arr.push(it);
      itemsByInv.set(it.invoiceId, arr);
    }
    res.json(
      invRows.map((inv) => ({
        ...inv,
        items: itemsByInv.get(inv.id) || [],
        policyState: computeInvoicePolicyState(inv, graceHours, reminderHours),
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
});

router.get('/payment-plans', requireRole(FINANCE_ROLES), async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(paymentPlans)
      .orderBy(desc(paymentPlans.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payment plans.' });
  }
});

router.get('/financial-summaries', requireRole(FINANCE_ROLES), async (_req, res) => {
  try {
    const [invRows, planRows, stuRows, settingsRows] = await Promise.all([
      db.select().from(invoices).orderBy(asc(invoices.dueDate)),
      db.select().from(paymentPlans),
      db.select().from(studentProfiles),
      db
        .select()
        .from(instituteSettings)
        .where(eq(instituteSettings.key, 'default'))
        .limit(1),
    ]);

    const graceHours = settingsRows[0]?.gracePeriodHours ?? 48;
    const reminderHours = settingsRows[0]?.reminderHoursBeforeDue ?? 48;

    const studentById = new Map(stuRows.map((s) => [s.id, s]));
    const planById = new Map(planRows.map((p) => [p.id, p]));

    const groups = new Map<
      string,
      {
        accountKey: string;
        studentProfileId: number | null;
        applicationId: number | null;
        admissionNumber: string | null;
        recipientName: string;
        recipientEmail: string;
        programmeTitle: string;
        planType: 'FULL_PAYMENT' | 'WEEKLY_INSTALMENTS' | 'CUSTOM';
        invoices: (typeof invoices.$inferSelect & { policyState: PolicyState })[];
      }
    >();

    for (const inv of invRows) {
      if (inv.status === 'CANCELLED') continue;
      const key = inv.studentProfileId
        ? `stu-${inv.studentProfileId}`
        : inv.applicationId
          ? `app-${inv.applicationId}`
          : `email-${inv.recipientEmail.toLowerCase()}`;

      const linkedPlan = inv.paymentPlanId ? planById.get(inv.paymentPlanId) : null;
      const linkedStu = inv.studentProfileId
        ? studentById.get(inv.studentProfileId)
        : null;

      if (!groups.has(key)) {
        groups.set(key, {
          accountKey: key,
          studentProfileId: inv.studentProfileId,
          applicationId: inv.applicationId,
          admissionNumber: linkedStu?.admissionNumber ?? null,
          recipientName: inv.recipientName,
          recipientEmail: inv.recipientEmail,
          programmeTitle: inv.programmeTitle,
          planType:
            linkedPlan?.planType === 'WEEKLY_INSTALMENTS'
              ? 'WEEKLY_INSTALMENTS'
              : linkedPlan?.planType === 'FULL_PAYMENT'
                ? 'FULL_PAYMENT'
                : inv.invoiceType === 'WEEKLY_INSTALMENT'
                  ? 'WEEKLY_INSTALMENTS'
                  : 'FULL_PAYMENT',
          invoices: [],
        });
      }
      groups.get(key)!.invoices.push({
        ...inv,
        policyState: computeInvoicePolicyState(inv, graceHours, reminderHours),
      });
    }

    const summaries = Array.from(groups.values()).map((g) => {
      const totalProgrammeFee = g.invoices.reduce((s, i) => s + i.totalPayable, 0);
      const amountPaid = g.invoices.reduce((s, i) => s + i.amountPaid, 0);
      const outstandingBalance = g.invoices.reduce((s, i) => s + i.balanceDue, 0);
      const unpaid = g.invoices
        .filter((i) => i.balanceDue > 0)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const nextInv = unpaid[0] ?? null;

      let overallStatus: PolicyState = 'PENDING';
      if (g.invoices.length > 0 && outstandingBalance === 0) {
        overallStatus = 'PAID';
      } else if (g.invoices.some((i) => i.policyState === 'OVERDUE')) {
        overallStatus = 'OVERDUE';
      } else if (g.invoices.some((i) => i.policyState === 'GRACE_PERIOD')) {
        overallStatus = 'GRACE_PERIOD';
      } else if (g.invoices.some((i) => i.policyState === 'DUE_SOON')) {
        overallStatus = 'DUE_SOON';
      } else if (amountPaid > 0) {
        overallStatus = 'PART_PAID';
      }

      return {
        accountKey: g.accountKey,
        studentProfileId: g.studentProfileId,
        applicationId: g.applicationId,
        admissionNumber: g.admissionNumber,
        recipientName: g.recipientName,
        recipientEmail: g.recipientEmail,
        programmeTitle: g.programmeTitle,
        planType: g.planType,
        totalProgrammeFee,
        amountPaid,
        outstandingBalance,
        nextDueDate: nextInv?.dueDate ?? null,
        nextDueInvoiceNumber: nextInv?.invoiceNumber ?? null,
        graceDeadline: nextInv?.graceDeadline ?? null,
        overallStatus,
        invoiceCount: g.invoices.length,
        paidInvoiceCount: g.invoices.filter((i) => i.balanceDue === 0).length,
      };
    });

    res.json(summaries);
  } catch (err) {
    console.error('Financial summary error:', err);
    res.status(500).json({ error: 'Failed to compute student financial summaries.' });
  }
});

// Create a structured Payment Plan (Full Payment = 1 invoice; Weekly Instalments = 3 weekly invoices)
router.post('/payment-plans', requireRole(FINANCE_ROLES), async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    if (!body.recipientName || !body.recipientEmail || !body.programmeTitle) {
      return res.status(400).json({
        error: 'recipientName, recipientEmail, and programmeTitle are required.',
      });
    }

    const planType =
      body.planType === 'WEEKLY_INSTALMENTS' ? 'WEEKLY_INSTALMENTS' : 'FULL_PAYMENT';
    const totalWeeks = Math.max(1, Number(body.totalWeeks ?? 3));
    const weeklyFeeAmount = Math.max(0, Number(body.weeklyFeeAmount ?? 430000));
    const totalFee =
      body.totalFee !== undefined
        ? Math.max(0, Number(body.totalFee))
        : weeklyFeeAmount * totalWeeks;
    const discount = Math.max(0, Number(body.discount ?? 0));
    const additionalCharges = Math.max(0, Number(body.additionalCharges ?? 0));
    const netTotalPayable = Math.max(0, totalFee - discount + additionalCharges);
    const commencementDate =
      String(body.commencementDate || '').trim() ||
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const issueDate = String(body.issueDate || '').trim() || new Date().toISOString().slice(0, 10);

    const settingsRows = await db
      .select()
      .from(instituteSettings)
      .where(eq(instituteSettings.key, 'default'))
      .limit(1);
    const settings = settingsRows[0];
    const graceHours = settings?.gracePeriodHours ?? 48;
    const graceDays = Math.max(1, Math.round(graceHours / 24));
    const defaultInstructions =
      settings?.paymentInstructions ||
      'Transfer to official Artdrobotix Institute account referencing your invoice number.';

    const planCode = await generateReference('PLN');
    const customDueDates: string[] = Array.isArray(body.dueDates) ? body.dueDates : [];
    const instalmentCount = planType === 'WEEKLY_INSTALMENTS' ? totalWeeks : 1;

    // Pre-generate sequential invoice numbers cleanly before transaction
    const invoiceNumbers: string[] = [];
    for (let i = 0; i < instalmentCount; i++) {
      invoiceNumbers.push(await generateReference('INV', i));
    }

    // Compute per-invoice amounts so sum(invoices.totalPayable) === netTotalPayable exactly
    const invoiceAmounts: number[] = [];
    if (planType === 'FULL_PAYMENT') {
      invoiceAmounts.push(netTotalPayable);
    } else {
      const baseAmount = Math.floor(netTotalPayable / totalWeeks);
      const remainder = netTotalPayable - baseAmount * totalWeeks;
      for (let i = 0; i < totalWeeks; i++) {
        invoiceAmounts.push(baseAmount + (i === 0 ? remainder : 0));
      }
    }

    const result = await db.transaction(async (tx) => {
      const planRows = await tx
        .insert(paymentPlans)
        .values({
          planCode,
          studentProfileId: body.studentProfileId ? Number(body.studentProfileId) : null,
          applicationId: body.applicationId ? Number(body.applicationId) : null,
          recipientName: String(body.recipientName).trim(),
          recipientEmail: String(body.recipientEmail).trim().toLowerCase(),
          recipientPhone: body.recipientPhone ? String(body.recipientPhone) : null,
          programmeId: body.programmeId ? Number(body.programmeId) : null,
          programmeTitle: String(body.programmeTitle).trim(),
          planType,
          weeklyFeeAmount,
          totalWeeks,
          totalFee,
          discount,
          additionalCharges,
          netTotalPayable,
          commencementDate,
          status: netTotalPayable === 0 ? 'PAID' : 'UNPAID',
          createdByUserId: req.dbUser!.id,
        })
        .returning();
      const plan = planRows[0];

      const prevLedger = plan.studentProfileId
        ? await tx
            .select()
            .from(studentLedger)
            .where(eq(studentLedger.studentProfileId, plan.studentProfileId))
            .orderBy(desc(studentLedger.id))
            .limit(1)
        : plan.applicationId
          ? await tx
              .select()
              .from(studentLedger)
              .where(eq(studentLedger.applicationId, plan.applicationId))
              .orderBy(desc(studentLedger.id))
              .limit(1)
          : [];
      let runningBal = prevLedger[0]?.runningBalance ?? 0;

      const createdInvoices = [];
      for (let idx = 0; idx < instalmentCount; idx++) {
        const weekNum = idx + 1;
        const dueDate =
          customDueDates[idx] ||
          (planType === 'WEEKLY_INSTALMENTS'
            ? addDaysIso(commencementDate, idx * 7)
            : commencementDate);
        const graceDeadline = addDaysIso(dueDate, graceDays);
        const invSubtotal =
          planType === 'FULL_PAYMENT' ? totalFee : Math.round(totalFee / totalWeeks);
        const invPayable = invoiceAmounts[idx];
        const invDiscount =
          planType === 'FULL_PAYMENT'
            ? discount
            : idx === 0
              ? Math.max(0, invSubtotal - invPayable)
              : 0;
        const invCharges =
          planType === 'FULL_PAYMENT'
            ? additionalCharges
            : idx === 0
              ? Math.max(0, invPayable - invSubtotal)
              : 0;

        const invRows = await tx
          .insert(invoices)
          .values({
            invoiceNumber: invoiceNumbers[idx],
            paymentPlanId: plan.id,
            studentProfileId: plan.studentProfileId,
            applicationId: plan.applicationId,
            recipientName: plan.recipientName,
            recipientEmail: plan.recipientEmail,
            recipientPhone: plan.recipientPhone,
            programmeId: plan.programmeId,
            programmeTitle: plan.programmeTitle,
            trainingDuration: String(
              body.trainingDuration || `${totalWeeks} Weeks (${totalWeeks * 9} Practical Hours)`
            ),
            trainingFormat: String(body.trainingFormat || 'Hybrid'),
            invoiceType: planType === 'WEEKLY_INSTALMENTS' ? 'WEEKLY_INSTALMENT' : 'FULL',
            instalmentNumber: weekNum,
            totalInstalments: instalmentCount,
            subtotal: invSubtotal,
            discount: invDiscount,
            additionalCharges: invCharges,
            totalPayable: invPayable,
            amountPaid: 0,
            balanceDue: invPayable,
            issueDate,
            dueDate,
            graceDeadline,
            paymentArrangement:
              planType === 'WEEKLY_INSTALMENTS'
                ? `Option B — Weekly Instalments (Week ${weekNum} of ${totalWeeks})`
                : 'Option A — Full Payment',
            paymentInstructions: String(body.paymentInstructions || defaultInstructions),
            status: invPayable === 0 ? 'PAID' : 'UNPAID',
            createdByUserId: req.dbUser!.id,
          })
          .returning();
        const inv = invRows[0];

        const lineItems =
          planType === 'FULL_PAYMENT'
            ? Array.from({ length: totalWeeks }, (_, w) => ({
                invoiceId: inv.id,
                description: `${plan.programmeTitle} — Week ${w + 1} Training Tuition`,
                quantity: 1,
                unitPrice: weeklyFeeAmount,
                lineTotal: weeklyFeeAmount,
              }))
            : [
                {
                  invoiceId: inv.id,
                  description: `${plan.programmeTitle} — Week ${weekNum} of ${totalWeeks} Instalment`,
                  quantity: 1,
                  unitPrice: invSubtotal,
                  lineTotal: invSubtotal,
                },
              ];

        const insertedItems = await tx
          .insert(invoiceItems)
          .values(lineItems)
          .returning();

        runningBal += invPayable;
        await tx.insert(studentLedger).values({
          studentProfileId: plan.studentProfileId,
          applicationId: plan.applicationId,
          entryType: 'DEBIT_INVOICE',
          referenceNumber: inv.invoiceNumber,
          description:
            planType === 'WEEKLY_INSTALMENTS'
              ? `Week ${weekNum}/${totalWeeks} Instalment Invoice for ${plan.programmeTitle} (Due ${dueDate})`
              : `Full Programme Invoice for ${plan.programmeTitle} (Due ${dueDate})`,
          debitAmount: invPayable,
          creditAmount: 0,
          runningBalance: runningBal,
        });

        createdInvoices.push({
          ...inv,
          items: insertedItems,
          policyState: computeInvoicePolicyState(inv, graceHours),
        });
      }

      return { paymentPlan: plan, invoices: createdInvoices };
    });

    await dispatchNotification({
      recipientEmail: result.paymentPlan.recipientEmail,
      eventType: 'INVOICE_GENERATED',
      title:
        planType === 'WEEKLY_INSTALMENTS'
          ? `3-Week Instalment Schedule Issued (${planCode})`
          : `Full Programme Proforma Invoice Issued (${invoiceNumbers[0]})`,
      message:
        planType === 'WEEKLY_INSTALMENTS'
          ? `Your Weekly Instalment Plan (${planCode}) for ${result.paymentPlan.programmeTitle} has been generated: ${totalWeeks} weekly invoices totalling ${netTotalPayable.toLocaleString()}. Week 1 (${invoiceNumbers[0]}) is due ${result.invoices[0].dueDate}.`
          : `Your Full Programme Invoice (${invoiceNumbers[0]}) for ${result.paymentPlan.programmeTitle} totalling ${netTotalPayable.toLocaleString()} is due ${result.invoices[0].dueDate}.`,
    });

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.dbUser!.role,
      action: 'PAYMENT_PLAN_CREATED',
      entityType: 'payment_plan',
      entityId: planCode,
      details: { planType, invoiceCount: instalmentCount, netTotalPayable },
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Payment plan creation error:', err);
    res.status(500).json({ error: 'Failed to generate billing plan & invoices.' });
  }
});

router.post('/invoices', requireRole(FINANCE_ROLES), async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    if (
      !body.recipientName ||
      !body.recipientEmail ||
      !body.programmeTitle ||
      !body.dueDate
    ) {
      return res.status(400).json({
        error:
          'recipientName, recipientEmail, programmeTitle, and dueDate are required.',
      });
    }

    const itemsInput: { description: string; quantity: number; unitPrice: number }[] =
      Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [
            {
              description: `${body.programmeTitle} — Training Fee`,
              quantity: 1,
              unitPrice: Number(body.programmeFee ?? body.subtotal ?? 0),
            },
          ];

    const subtotal = itemsInput.reduce(
      (sum, item) => sum + Number(item.quantity || 1) * Number(item.unitPrice || 0),
      0
    );
    const discount = Math.max(0, Number(body.discount ?? 0));
    const additionalCharges = Math.max(0, Number(body.additionalCharges ?? 0));
    const totalPayable = Math.max(0, subtotal - discount + additionalCharges);

    const invoiceNumber = await generateReference('INV');
    const issueDate = body.issueDate || new Date().toISOString().slice(0, 10);

    const settingsRows = await db
      .select()
      .from(instituteSettings)
      .where(eq(instituteSettings.key, 'default'))
      .limit(1);
    const settings = settingsRows[0];
    const graceHours = settings?.gracePeriodHours ?? 48;
    const graceDays = Math.max(1, Math.round(graceHours / 24));
    const graceDeadline = body.graceDeadline
      ? String(body.graceDeadline)
      : addDaysIso(String(body.dueDate), graceDays);

    const defaultInstructions =
      settings?.paymentInstructions ||
      'Transfer to official Artdrobotix Institute account referencing your invoice number.';

    const createdInvoice = await db.transaction(async (tx) => {
      const invRows = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          paymentPlanId: body.paymentPlanId ? Number(body.paymentPlanId) : null,
          studentProfileId: body.studentProfileId
            ? Number(body.studentProfileId)
            : null,
          applicationId: body.applicationId ? Number(body.applicationId) : null,
          recipientName: String(body.recipientName).trim(),
          recipientEmail: String(body.recipientEmail).trim().toLowerCase(),
          recipientPhone: body.recipientPhone ? String(body.recipientPhone) : null,
          programmeId: body.programmeId ? Number(body.programmeId) : null,
          programmeTitle: String(body.programmeTitle).trim(),
          trainingDuration: String(
            body.trainingDuration || '3 Weeks (27 Practical Hours)'
          ),
          trainingFormat: String(body.trainingFormat || 'Hybrid'),
          invoiceType:
            body.invoiceType === 'WEEKLY_INSTALMENT' ? 'WEEKLY_INSTALMENT' : 'FULL',
          instalmentNumber: Number(body.instalmentNumber || 1),
          totalInstalments: Number(body.totalInstalments || 1),
          subtotal,
          discount,
          additionalCharges,
          totalPayable,
          amountPaid: 0,
          balanceDue: totalPayable,
          issueDate,
          dueDate: String(body.dueDate),
          graceDeadline,
          paymentArrangement: String(body.paymentArrangement || 'Full payment'),
          paymentInstructions: String(
            body.paymentInstructions || defaultInstructions
          ),
          status: totalPayable === 0 ? 'PAID' : 'UNPAID',
          createdByUserId: req.dbUser!.id,
        })
        .returning();

      const inv = invRows[0];

      const insertedItems = await tx
        .insert(invoiceItems)
        .values(
          itemsInput.map((it) => ({
            invoiceId: inv.id,
            description: String(it.description),
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.unitPrice || 0),
            lineTotal: Number(it.quantity || 1) * Number(it.unitPrice || 0),
          }))
        )
        .returning();

      // Calculate previous running balance for student or application
      const prevLedger = inv.studentProfileId
        ? await tx
            .select()
            .from(studentLedger)
            .where(eq(studentLedger.studentProfileId, inv.studentProfileId))
            .orderBy(desc(studentLedger.id))
            .limit(1)
        : inv.applicationId
          ? await tx
              .select()
              .from(studentLedger)
              .where(eq(studentLedger.applicationId, inv.applicationId))
              .orderBy(desc(studentLedger.id))
              .limit(1)
          : [];

      const prevBal = prevLedger[0]?.runningBalance ?? 0;

      await tx.insert(studentLedger).values({
        studentProfileId: inv.studentProfileId,
        applicationId: inv.applicationId,
        entryType: 'DEBIT_INVOICE',
        referenceNumber: invoiceNumber,
        description: `Proforma Invoice for ${inv.programmeTitle}${
          discount > 0 ? ` (Discount applied: ₦${discount.toLocaleString()})` : ''
        }`,
        debitAmount: totalPayable,
        creditAmount: 0,
        runningBalance: prevBal + totalPayable,
      });

      return { ...inv, items: insertedItems };
    });

    await dispatchNotification({
      recipientEmail: createdInvoice.recipientEmail,
      eventType: 'INVOICE_GENERATED',
      title: `Proforma Invoice ${invoiceNumber}`,
      message: `A Proforma Invoice (${invoiceNumber}) for ${createdInvoice.programmeTitle} totalling ${totalPayable.toLocaleString()} has been generated. Due date: ${createdInvoice.dueDate}.`,
    });

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.dbUser!.role,
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
      entityId: invoiceNumber,
      details: { totalPayable },
    });

    res.status(201).json(createdInvoice);
  } catch (err) {
    console.error('Invoice creation error:', err);
    res.status(500).json({ error: 'Failed to create proforma invoice.' });
  }
});

router.get('/payments', requireRole(FINANCE_ROLES), async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payments.' });
  }
});

// Records payment in PENDING_VERIFICATION state (NEVER auto-issues receipt)
router.post('/payments', requireRole(FINANCE_ROLES), async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    const invoiceId = Number(body.invoiceId);
    const amount = Number(body.amount);
    const paymentMethod = String(body.paymentMethod || 'Bank Transfer');
    const transactionReference = String(body.transactionReference || '').trim();
    const paymentDate =
      String(body.paymentDate || '') || new Date().toISOString().slice(0, 10);

    if (!invoiceId || !amount || amount <= 0 || !transactionReference) {
      return res.status(400).json({
        error:
          'invoiceId, positive amount, and unique transactionReference are required.',
      });
    }

    const invRows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    if (invRows.length === 0) {
      return res.status(404).json({ error: 'Related invoice not found.' });
    }
    const inv = invRows[0];

    const duplicate = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionReference, transactionReference))
      .limit(1);
    if (duplicate.length > 0) {
      return res.status(409).json({
        error: 'Duplicate transaction reference detected. Payment already logged.',
      });
    }

    const inserted = await db
      .insert(payments)
      .values({
        invoiceId,
        studentProfileId: inv.studentProfileId,
        applicationId: inv.applicationId,
        amount,
        paymentMethod,
        transactionReference,
        paymentDate,
        verificationStatus: 'PENDING_VERIFICATION',
        submittedByRole: 'ADMIN',
        payerName: body.payerName ? String(body.payerName) : inv.recipientName,
        proofNotes: body.proofNotes ? String(body.proofNotes) : null,
        notes: body.notes ? String(body.notes) : null,
      })
      .returning();

    await dispatchNotification({
      recipientEmail: inv.recipientEmail,
      eventType: 'PAYMENT_RECORDED',
      title: `Payment Logged for Verification (${transactionReference})`,
      message: `A payment of ${amount.toLocaleString()} against ${inv.invoiceNumber} has been logged and is awaiting finance officer verification before receipt issuance.`,
    });

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.dbUser!.role,
      action: 'PAYMENT_RECORDED_PENDING',
      entityType: 'payment',
      entityId: transactionReference,
      details: { invoiceNumber: inv.invoiceNumber, amount },
    });

    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error('Record payment error:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

// Explicit Finance Verification -> Atomically updates invoice, ledger, and issues Official Receipt
router.post(
  '/payments/:id/verify',
  requireRole(FINANCE_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const paymentId = Number(req.params.id);
      const decision = String(req.body?.decision || 'VERIFIED').toUpperCase();
      if (decision !== 'VERIFIED' && decision !== 'REJECTED') {
        return res
          .status(400)
          .json({ error: 'Decision must be VERIFIED or REJECTED.' });
      }

      const payRows = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);
      if (payRows.length === 0) {
        return res.status(404).json({ error: 'Payment record not found.' });
      }
      const pay = payRows[0];

      if (pay.verificationStatus === 'VERIFIED') {
        return res
          .status(409)
          .json({ error: 'This payment has already been verified and receipted.' });
      }

      if (decision === 'REJECTED') {
        const rejected = await db
          .update(payments)
          .set({
            verificationStatus: 'REJECTED',
            verifiedByUserId: req.dbUser!.id,
            verifiedAt: new Date(),
            notes: req.body?.notes
              ? `${pay.notes ? pay.notes + ' | ' : ''}Rejected: ${req.body.notes}`
              : pay.notes,
          })
          .where(eq(payments.id, paymentId))
          .returning();

        await logAudit({
          actorUserId: req.dbUser!.id,
          actorEmail: req.dbUser!.email,
          actorRole: req.dbUser!.role,
          action: 'PAYMENT_REJECTED',
          entityType: 'payment',
          entityId: pay.transactionReference,
        });

        return res.json({ payment: rejected[0], receipt: null });
      }

      const receiptNumber = await generateReference('RCT');

      const result = await db.transaction(async (tx) => {
        const updatedPayRows = await tx
          .update(payments)
          .set({
            verificationStatus: 'VERIFIED',
            verifiedByUserId: req.dbUser!.id,
            verifiedAt: new Date(),
          })
          .where(eq(payments.id, paymentId))
          .returning();

        const invRows = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, pay.invoiceId))
          .limit(1);
        const inv = invRows[0];

        const verifiedPayments = await tx
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.invoiceId, inv.id),
              eq(payments.verificationStatus, 'VERIFIED')
            )
          );
        const totalPaid = verifiedPayments.reduce((s, p) => s + p.amount, 0);
        const balanceDue = Math.max(0, inv.totalPayable - totalPaid);
        const invStatus =
          balanceDue === 0 ? 'PAID' : totalPaid > 0 ? 'PART_PAID' : 'UNPAID';

        await tx
          .update(invoices)
          .set({
            amountPaid: totalPaid,
            balanceDue,
            status: invStatus,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, inv.id));

        await recalculatePaymentPlanStatus(inv.paymentPlanId, tx);

        const prevLedger = inv.studentProfileId
          ? await tx
              .select()
              .from(studentLedger)
              .where(eq(studentLedger.studentProfileId, inv.studentProfileId))
              .orderBy(desc(studentLedger.id))
              .limit(1)
          : inv.applicationId
            ? await tx
                .select()
                .from(studentLedger)
                .where(eq(studentLedger.applicationId, inv.applicationId))
                .orderBy(desc(studentLedger.id))
                .limit(1)
            : [];
        const prevBal = prevLedger[0]?.runningBalance ?? inv.totalPayable;

        await tx.insert(studentLedger).values({
          studentProfileId: inv.studentProfileId,
          applicationId: inv.applicationId,
          entryType: 'CREDIT_PAYMENT',
          referenceNumber: receiptNumber,
          description: `Verified ${pay.paymentMethod} payment against ${inv.invoiceNumber} (Ref: ${pay.transactionReference})`,
          debitAmount: 0,
          creditAmount: pay.amount,
          runningBalance: Math.max(0, prevBal - pay.amount),
        });

        const insertedReceipts = await tx
          .insert(receipts)
          .values({
            receiptNumber,
            paymentId: pay.id,
            invoiceId: inv.id,
            studentProfileId: inv.studentProfileId,
            studentName: inv.recipientName,
            amountReceived: pay.amount,
            paymentDate: pay.paymentDate,
            paymentMethod: pay.paymentMethod,
            transactionReference: pay.transactionReference,
            outstandingBalance: balanceDue,
            issuedByUserId: req.dbUser!.id,
          })
          .returning();

        return {
          payment: updatedPayRows[0],
          receipt: insertedReceipts[0],
          invoice: inv,
          balanceDue,
        };
      });

      await dispatchNotification({
        recipientEmail: result.invoice.recipientEmail,
        eventType: 'PAYMENT_VERIFIED',
        title: `Official Receipt Issued (${receiptNumber})`,
        message: `Your payment of ${pay.amount.toLocaleString()} for ${result.invoice.invoiceNumber} has been verified. Receipt Number: ${receiptNumber}. Outstanding balance: ${result.balanceDue.toLocaleString()}.`,
      });

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'PAYMENT_VERIFIED_RECEIPT_ISSUED',
        entityType: 'receipt',
        entityId: receiptNumber,
        details: {
          paymentId,
          invoiceNumber: result.invoice.invoiceNumber,
          amount: pay.amount,
        },
      });

      res.json({ payment: result.payment, receipt: result.receipt });
    } catch (err) {
      console.error('Payment verification error:', err);
      res.status(500).json({ error: 'Failed to verify payment.' });
    }
  }
);

// Paystack Initiation Endpoint (real API call when configured; honest 503 otherwise)
router.post(
  '/payments/paystack/initialize',
  requireRole(FINANCE_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        return res.status(503).json({
          code: 'PAYSTACK_NOT_CONFIGURED',
          error:
            'Paystack credentials (PAYSTACK_SECRET_KEY) are not configured. Use the administrator manual payment verification workflow until live credentials are added.',
        });
      }

      const { invoiceId, amount } = req.body ?? {};
      const invRows = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, Number(invoiceId)))
        .limit(1);
      if (invRows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found.' });
      }
      const inv = invRows[0];
      const chargeAmount = Number(amount || inv.balanceDue);
      if (chargeAmount <= 0) {
        return res.status(400).json({ error: 'Charge amount must be positive.' });
      }

      const reference = `ARTI-PSK-${inv.invoiceNumber}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

      const paystackRes = await fetch(
        'https://api.paystack.co/transaction/initialize',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: inv.recipientEmail,
            amount: Math.round(chargeAmount * 100), // kobo
            reference,
            metadata: {
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
            },
          }),
        }
      );

      const data = (await paystackRes.json()) as {
        status?: boolean;
        message?: string;
        data?: { authorization_url: string; reference: string };
      };

      if (!paystackRes.ok || !data.status || !data.data) {
        return res.status(502).json({
          error: data.message || 'Paystack initialization failed.',
        });
      }

      res.json({
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
      });
    } catch (err) {
      console.error('Paystack initialize error:', err);
      res.status(500).json({ error: 'Failed to initialize Paystack transaction.' });
    }
  }
);

router.get('/receipts', requireRole(FINANCE_ROLES), async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(receipts)
      .orderBy(desc(receipts.issuedAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch receipts.' });
  }
});

router.get('/ledger', requireRole(FINANCE_ROLES), async (req, res) => {
  try {
    const studentProfileId = req.query.studentProfileId
      ? Number(req.query.studentProfileId)
      : null;
    const rows = studentProfileId
      ? await db
          .select()
          .from(studentLedger)
          .where(eq(studentLedger.studentProfileId, studentProfileId))
          .orderBy(desc(studentLedger.createdAt))
      : await db
          .select()
          .from(studentLedger)
          .orderBy(desc(studentLedger.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch financial ledger.' });
  }
});

router.post(
  '/reminders/run',
  requireRole(FINANCE_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const summary = await processPaymentReminders({
        userId: req.dbUser!.id,
        email: req.dbUser!.email,
        role: req.dbUser!.role,
      });
      res.json(summary);
    } catch (err) {
      console.error('Payment reminders error:', err);
      res.status(500).json({ error: 'Failed to process payment reminders.' });
    }
  }
);

// ============================================================
// MODULE D: ACADEMIC MANAGEMENT
// ============================================================
router.get('/attendance', async (req, res) => {
  try {
    const programmeId = req.query.programmeId
      ? Number(req.query.programmeId)
      : null;
    const rows = programmeId
      ? await db
          .select()
          .from(attendance)
          .where(eq(attendance.programmeId, programmeId))
          .orderBy(desc(attendance.sessionDate))
      : await db
          .select()
          .from(attendance)
          .orderBy(desc(attendance.sessionDate));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
});

router.post(
  '/attendance',
  requireRole(ACADEMIC_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      const entries: {
        studentProfileId: number;
        programmeId: number;
        cohortId?: number | null;
        sessionDate: string;
        sessionTopic?: string;
        status: string;
        instructorNotes?: string;
      }[] = Array.isArray(body.entries) ? body.entries : [body];

      if (entries.length === 0 || !entries[0].studentProfileId || !entries[0].status) {
        return res
          .status(400)
          .json({ error: 'At least one valid attendance entry is required.' });
      }

      const inserted = await db
        .insert(attendance)
        .values(
          entries.map((e) => ({
            studentProfileId: Number(e.studentProfileId),
            programmeId: Number(e.programmeId),
            cohortId: e.cohortId ? Number(e.cohortId) : null,
            sessionDate:
              e.sessionDate || new Date().toISOString().slice(0, 10),
            sessionTopic: e.sessionTopic ? String(e.sessionTopic) : null,
            status: String(e.status).toUpperCase(),
            instructorNotes: e.instructorNotes ? String(e.instructorNotes) : null,
            recordedByUserId: req.dbUser!.id,
          }))
        )
        .returning();

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'ATTENDANCE_RECORDED',
        entityType: 'attendance',
        entityId: inserted.map((r) => r.id).join(','),
        details: { count: inserted.length },
      });

      res.status(201).json(inserted);
    } catch (err) {
      console.error('Attendance error:', err);
      res.status(500).json({ error: 'Failed to record attendance.' });
    }
  }
);

router.get('/assignments', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(assignments)
      .orderBy(desc(assignments.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assignments.' });
  }
});

router.post(
  '/assignments',
  requireRole(ACADEMIC_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      if (!body.programmeId || !body.title || !body.description || !body.deadline) {
        return res.status(400).json({
          error: 'programmeId, title, description, and deadline are required.',
        });
      }
      const inserted = await db
        .insert(assignments)
        .values({
          programmeId: Number(body.programmeId),
          cohortId: body.cohortId ? Number(body.cohortId) : null,
          title: String(body.title).trim(),
          description: String(body.description).trim(),
          submissionRequirements: String(
            body.submissionRequirements || 'Submit live URL or GitHub repository link.'
          ),
          resourceUrl: body.resourceUrl ? String(body.resourceUrl).trim() : null,
          resourceLabel: body.resourceLabel
            ? String(body.resourceLabel).trim()
            : null,
          deadline: String(body.deadline),
          maxScore: Number(body.maxScore || 100),
          createdByUserId: req.dbUser!.id,
        })
        .returning();

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'ASSIGNMENT_CREATED',
        entityType: 'assignment',
        entityId: inserted[0].id,
      });

      res.status(201).json(inserted[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create assignment.' });
    }
  }
);

router.get('/submissions', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.submittedAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load submissions.' });
  }
});

router.patch(
  '/submissions/:id/grade',
  requireRole(ACADEMIC_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { score, feedback, status } = req.body ?? {};
      const existing = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, id))
        .limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Submission not found.' });
      }
      const updated = await db
        .update(submissions)
        .set({
          score: score !== undefined ? Number(score) : existing[0].score,
          feedback:
            feedback !== undefined ? String(feedback) : existing[0].feedback,
          status: status ? String(status) : 'REVIEWED',
          gradedByUserId: req.dbUser!.id,
          gradedAt: new Date(),
        })
        .where(eq(submissions.id, id))
        .returning();

      const stuRows = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, existing[0].studentProfileId))
        .limit(1);
      if (stuRows.length > 0) {
        await dispatchNotification({
          recipientUserId: stuRows[0].userId,
          recipientEmail: stuRows[0].email,
          eventType: 'ASSIGNMENT_FEEDBACK',
          title: 'Assignment Feedback Available',
          message: `Your assignment submission has been reviewed${
            score !== undefined ? ` with a score of ${score}` : ''
          }. Log in to your Student Portal to read instructor feedback.`,
        });
      }

      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to grade submission.' });
    }
  }
);

router.get('/assessments', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(assessments)
      .orderBy(desc(assessments.evaluatedAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load assessments.' });
  }
});

router.post(
  '/assessments',
  requireRole(ACADEMIC_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      if (
        !body.studentProfileId ||
        !body.programmeId ||
        !body.title ||
        body.score === undefined
      ) {
        return res.status(400).json({
          error:
            'studentProfileId, programmeId, title, and score are required.',
        });
      }
      const inserted = await db
        .insert(assessments)
        .values({
          studentProfileId: Number(body.studentProfileId),
          programmeId: Number(body.programmeId),
          assessmentType: String(body.assessmentType || 'Practical Assessment'),
          title: String(body.title).trim(),
          score: Number(body.score),
          maxScore: Number(body.maxScore || 100),
          evaluationNotes: body.evaluationNotes
            ? String(body.evaluationNotes).trim()
            : null,
          evaluatedByUserId: req.dbUser!.id,
        })
        .returning();

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'ASSESSMENT_RECORDED',
        entityType: 'assessment',
        entityId: inserted[0].id,
      });

      res.status(201).json(inserted[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to record assessment.' });
    }
  }
);

// ============================================================
// MODULE E: CERTIFICATES & VERIFICATION
// ============================================================
router.get('/certificates', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(certificates)
      .orderBy(desc(certificates.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load certificates.' });
  }
});

router.post(
  '/certificates',
  requireRole(ADMIN_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const { studentProfileId, completionDate, overrideChecks } = req.body ?? {};
      if (!studentProfileId) {
        return res.status(400).json({ error: 'studentProfileId is required.' });
      }

      const stuRows = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, Number(studentProfileId)))
        .limit(1);
      if (stuRows.length === 0) {
        return res.status(404).json({ error: 'Student not found.' });
      }
      const student = stuRows[0];

      const progRows = await db
        .select()
        .from(programmes)
        .where(eq(programmes.id, student.programmeId))
        .limit(1);
      const prog = progRows[0];
      if (!prog) {
        return res.status(404).json({ error: 'Programme not found.' });
      }

      // Check attendance and assessments
      const [attRows, assessRows, invRows] = await Promise.all([
        db
          .select()
          .from(attendance)
          .where(eq(attendance.studentProfileId, student.id)),
        db
          .select()
          .from(assessments)
          .where(eq(assessments.studentProfileId, student.id)),
        db
          .select()
          .from(invoices)
          .where(eq(invoices.studentProfileId, student.id)),
      ]);

      const totalAtt = attRows.length;
      const presentAtt = attRows.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      const attPct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;
      const unpaidBalance = invRows
        .filter((i) => i.status !== 'CANCELLED')
        .reduce((s, i) => s + i.balanceDue, 0);

      if (!overrideChecks) {
        const issues: string[] = [];
        if (totalAtt > 0 && attPct < 75) {
          issues.push(`Attendance rate is ${attPct}% (minimum 75% recommended)`);
        }
        if (assessRows.length === 0) {
          issues.push('No evaluated assessments recorded yet');
        }
        if (unpaidBalance > 0) {
          issues.push(
            `Student has an outstanding invoice balance of ${unpaidBalance.toLocaleString()}`
          );
        }
        if (issues.length > 0) {
          return res.status(422).json({
            code: 'CERTIFICATION_REQUIREMENTS_UNMET',
            error: `Certification check flagged: ${issues.join('; ')}. Confirm administrative override if approved.`,
            issues,
          });
        }
      }

      const certificateNumber = await generateReference('CERT');
      const verificationCode = generateVerificationCode();
      const today = new Date().toISOString().slice(0, 10);

      const inserted = await db
        .insert(certificates)
        .values({
          certificateNumber,
          studentProfileId: student.id,
          programmeId: prog.id,
          studentFullName: student.fullName,
          programmeTitle: prog.title,
          completionDate: completionDate ? String(completionDate) : today,
          issuedDate: today,
          verificationCode,
          status: 'VALID',
          approvedByUserId: req.dbUser!.id,
        })
        .returning();

      await db
        .update(studentProfiles)
        .set({ academicStatus: 'COMPLETED', updatedAt: new Date() })
        .where(eq(studentProfiles.id, student.id));

      await dispatchNotification({
        recipientUserId: student.userId,
        recipientEmail: student.email,
        eventType: 'CERTIFICATE_ISSUED',
        title: `Official Certificate Issued (${certificateNumber})`,
        message: `Congratulations ${student.fullName}! Your official certificate (${certificateNumber}) for ${prog.title} has been approved and is ready for download in your Student Portal.`,
      });

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'CERTIFICATE_ISSUED',
        entityType: 'certificate',
        entityId: certificateNumber,
        details: { studentAdmissionNumber: student.admissionNumber },
      });

      res.status(201).json(inserted[0]);
    } catch (err) {
      console.error('Certificate issue error:', err);
      res.status(500).json({ error: 'Failed to issue certificate.' });
    }
  }
);

router.patch(
  '/certificates/:id/revoke',
  requireRole(ADMIN_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const nextStatus = req.body?.status === 'VALID' ? 'VALID' : 'REVOKED';
      const updated = await db
        .update(certificates)
        .set({ status: nextStatus })
        .where(eq(certificates.id, id))
        .returning();
      if (updated.length === 0) {
        return res.status(404).json({ error: 'Certificate not found.' });
      }
      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: `CERTIFICATE_${nextStatus}`,
        entityType: 'certificate',
        entityId: updated[0].certificateNumber,
      });
      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update certificate status.' });
    }
  }
);

// ============================================================
// NOTIFICATIONS, SETTINGS, AUDIT LOGS & USERS
// ============================================================
router.get('/notifications', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notification logs.' });
  }
});

router.post(
  '/notifications/send',
  requireRole(ADMIN_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const { recipientEmail, eventType, title, message } = req.body ?? {};
      if (!recipientEmail || !title || !message) {
        return res
          .status(400)
          .json({ error: 'recipientEmail, title, and message are required.' });
      }

      const result = await dispatchNotification({
        recipientEmail: String(recipientEmail).trim().toLowerCase(),
        eventType: String(eventType || 'TRAINING_REMINDER'),
        title: String(title).trim(),
        message: String(message).trim(),
        sendEmail: true,
      });

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'NOTIFICATION_DISPATCHED',
        entityType: 'notification',
        entityId: recipientEmail,
        details: result,
      });

      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send notification.' });
    }
  }
);

router.get('/audit-logs', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

router.get('/settings', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(instituteSettings)
      .where(eq(instituteSettings.key, 'default'))
      .limit(1);
    res.json({
      settings: rows[0] ?? null,
      integrations: {
        paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
        resendConfigured: Boolean(process.env.RESEND_API_KEY),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch institute settings.' });
  }
});

router.patch(
  '/settings',
  requireRole(ADMIN_ROLES),
  async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      const existing = await db
        .select()
        .from(instituteSettings)
        .where(eq(instituteSettings.key, 'default'))
        .limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Settings record missing.' });
      }
      const cur = existing[0];
      const updated = await db
        .update(instituteSettings)
        .set({
          instituteName: body.instituteName ?? cur.instituteName,
          descriptor: body.descriptor ?? cur.descriptor,
          tagline: body.tagline ?? cur.tagline,
          supportEmail: body.supportEmail ?? cur.supportEmail,
          whatsappNumbers: body.whatsappNumbers ?? cur.whatsappNumbers,
          address: body.address ?? cur.address,
          currency: body.currency ?? cur.currency,
          bankName: body.bankName ?? cur.bankName,
          accountName: body.accountName ?? cur.accountName,
          accountNumber: body.accountNumber ?? cur.accountNumber,
          paymentInstructions:
            body.paymentInstructions ?? cur.paymentInstructions,
          reminderHoursBeforeDue:
            body.reminderHoursBeforeDue !== undefined
              ? Math.max(1, Number(body.reminderHoursBeforeDue))
              : cur.reminderHoursBeforeDue,
          gracePeriodHours:
            body.gracePeriodHours !== undefined
              ? Math.max(0, Number(body.gracePeriodHours))
              : cur.gracePeriodHours,
          paymentPolicySummary:
            body.paymentPolicySummary !== undefined
              ? String(body.paymentPolicySummary).trim()
              : cur.paymentPolicySummary,
          instructorName: body.instructorName ?? cur.instructorName,
          instructorTitle: body.instructorTitle ?? cur.instructorTitle,
          instructorBio: body.instructorBio ?? cur.instructorBio,
          instructorPortfolioUrl:
            body.instructorPortfolioUrl ?? cur.instructorPortfolioUrl,
          instructorGithubUrl:
            body.instructorGithubUrl !== undefined
              ? body.instructorGithubUrl
              : cur.instructorGithubUrl,
          instructorLinkedinUrl:
            body.instructorLinkedinUrl !== undefined
              ? body.instructorLinkedinUrl
              : cur.instructorLinkedinUrl,
          onboardingTemplate:
            body.onboardingTemplate ?? cur.onboardingTemplate,
          notificationTemplates:
            body.notificationTemplates ?? cur.notificationTemplates,
          updatedAt: new Date(),
        })
        .where(eq(instituteSettings.key, 'default'))
        .returning();

      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'SETTINGS_UPDATED',
        entityType: 'institute_settings',
        entityId: 'default',
      });

      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update settings.' });
    }
  }
);

router.get('/users', requireRole(ADMIN_ROLES), async (_req, res) => {
  try {
    const rows = await db.select().from(users).orderBy(asc(users.id));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

router.patch(
  '/users/:id/role',
  requireRole(['SUPER_ADMIN']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const role = String(req.body?.role || '') as UserRole;
      const validRoles: UserRole[] = [
        'SUPER_ADMIN',
        'ADMINISTRATOR',
        'INSTRUCTOR',
        'FINANCE_OFFICER',
        'STUDENT',
      ];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified.' });
      }
      const updated = await db
        .update(users)
        .set({
          role,
          isActive:
            req.body?.isActive !== undefined
              ? Boolean(req.body.isActive)
              : undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      if (updated.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }
      await logAudit({
        actorUserId: req.dbUser!.id,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'USER_ROLE_UPDATED',
        entityType: 'user',
        entityId: updated[0].email,
        details: { role },
      });
      res.json(updated[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update user role.' });
    }
  }
);

export default router;
