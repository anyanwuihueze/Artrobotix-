import { Router } from 'express';
import crypto from 'crypto';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  applications,
  assessments,
  assignments,
  attendance,
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
} from '../../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/audit.ts';
import { dispatchNotification } from '../services/notifications.ts';
import {
  computeInvoicePolicyState,
  processPaymentReminders,
} from '../services/billing.ts';
import type { PolicyState } from '../services/billing.ts';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;
    await processPaymentReminders().catch((e) =>
      console.error('Background payment reminder check failed:', e)
    );

    const [profileRows, settingsRows, myApps] = await Promise.all([
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
        .from(instituteSettings)
        .where(eq(instituteSettings.key, 'default'))
        .limit(1),
      db
        .select()
        .from(applications)
        .where(
          or(
            eq(applications.userId, user.id),
            eq(applications.email, user.email)
          )
        )
        .orderBy(desc(applications.createdAt)),
    ]);

    const profile = profileRows[0] ?? null;
    const settings = settingsRows[0] ?? null;

    let programme = null;
    let cohort = null;
    let myAttendance: typeof attendance.$inferSelect[] = [];
    let myAssignments: typeof assignments.$inferSelect[] = [];
    let mySubmissions: typeof submissions.$inferSelect[] = [];
    let myAssessments: typeof assessments.$inferSelect[] = [];
    const gracePeriodHours = settings?.gracePeriodHours ?? 48;
    const reminderHoursBeforeDue = settings?.reminderHoursBeforeDue ?? 48;

    let myInvoices: (typeof invoices.$inferSelect & {
      items: typeof invoiceItems.$inferSelect[];
      policyState: PolicyState;
    })[] = [];
    let myPaymentPlans: (typeof paymentPlans.$inferSelect)[] = [];
    let myPayments: typeof payments.$inferSelect[] = [];
    let myReceipts: typeof receipts.$inferSelect[] = [];
    let myLedger: typeof studentLedger.$inferSelect[] = [];
    let myCertificates: typeof certificates.$inferSelect[] = [];

    const appIds = myApps.map((a) => a.id);

    if (profile) {
      const [
        progRows,
        cohortRows,
        attRows,
        assignRows,
        subRows,
        assessRows,
        certRows,
      ] = await Promise.all([
        db
          .select()
          .from(programmes)
          .where(eq(programmes.id, profile.programmeId))
          .limit(1),
        profile.cohortId
          ? db
              .select()
              .from(cohorts)
              .where(eq(cohorts.id, profile.cohortId))
              .limit(1)
          : Promise.resolve([]),
        db
          .select()
          .from(attendance)
          .where(eq(attendance.studentProfileId, profile.id))
          .orderBy(desc(attendance.sessionDate)),
        db
          .select()
          .from(assignments)
          .where(eq(assignments.programmeId, profile.programmeId))
          .orderBy(desc(assignments.deadline)),
        db
          .select()
          .from(submissions)
          .where(eq(submissions.studentProfileId, profile.id)),
        db
          .select()
          .from(assessments)
          .where(eq(assessments.studentProfileId, profile.id))
          .orderBy(desc(assessments.evaluatedAt)),
        db
          .select()
          .from(certificates)
          .where(eq(certificates.studentProfileId, profile.id))
          .orderBy(desc(certificates.createdAt)),
      ]);

      programme = progRows[0] ?? null;
      cohort = cohortRows[0] ?? null;
      myAttendance = attRows;
      myAssignments = assignRows.filter(
        (a) => !a.cohortId || !profile.cohortId || a.cohortId === profile.cohortId
      );
      mySubmissions = subRows;
      myAssessments = assessRows;
      myCertificates = certRows;
    }

    // Fetch financial records linked to profile OR user's applications
    const invoiceFilter = profile
      ? appIds.length > 0
        ? or(
            eq(invoices.studentProfileId, profile.id),
            inArray(invoices.applicationId, appIds)
          )
        : eq(invoices.studentProfileId, profile.id)
      : appIds.length > 0
        ? inArray(invoices.applicationId, appIds)
        : null;

    const planFilter = profile
      ? appIds.length > 0
        ? or(
            eq(paymentPlans.studentProfileId, profile.id),
            inArray(paymentPlans.applicationId, appIds)
          )
        : eq(paymentPlans.studentProfileId, profile.id)
      : appIds.length > 0
        ? inArray(paymentPlans.applicationId, appIds)
        : null;

    if (planFilter) {
      myPaymentPlans = await db
        .select()
        .from(paymentPlans)
        .where(planFilter)
        .orderBy(desc(paymentPlans.createdAt));
    }

    if (invoiceFilter) {
      const invRows = await db
        .select()
        .from(invoices)
        .where(invoiceFilter)
        .orderBy(asc(invoices.instalmentNumber), asc(invoices.dueDate));

      const invIds = invRows.map((i) => i.id);
      const itemsRows =
        invIds.length > 0
          ? await db
              .select()
              .from(invoiceItems)
              .where(inArray(invoiceItems.invoiceId, invIds))
          : [];

      myInvoices = invRows.map((inv) => ({
        ...inv,
        items: itemsRows.filter((it) => it.invoiceId === inv.id),
        policyState: computeInvoicePolicyState(
          inv,
          gracePeriodHours,
          reminderHoursBeforeDue
        ),
      }));

      if (invIds.length > 0) {
        myPayments = await db
          .select()
          .from(payments)
          .where(inArray(payments.invoiceId, invIds))
          .orderBy(desc(payments.createdAt));

        myReceipts = await db
          .select()
          .from(receipts)
          .where(inArray(receipts.invoiceId, invIds))
          .orderBy(desc(receipts.issuedAt));
      }
    }

    if (profile) {
      myLedger = await db
        .select()
        .from(studentLedger)
        .where(eq(studentLedger.studentProfileId, profile.id))
        .orderBy(desc(studentLedger.createdAt));
    } else if (appIds.length > 0) {
      myLedger = await db
        .select()
        .from(studentLedger)
        .where(inArray(studentLedger.applicationId, appIds))
        .orderBy(desc(studentLedger.createdAt));
    }

    const activeInvs = myInvoices.filter((i) => i.status !== 'CANCELLED');
    const totalProgrammeFee = activeInvs.reduce((s, i) => s + i.totalPayable, 0);
    const amountPaid = activeInvs.reduce((s, i) => s + i.amountPaid, 0);
    const outstandingBalance = activeInvs.reduce((s, i) => s + i.balanceDue, 0);
    const unpaidSorted = activeInvs
      .filter((i) => i.balanceDue > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const nextUnpaid = unpaidSorted[0] ?? null;

    let overallStatus: PolicyState = 'PENDING';
    if (activeInvs.length > 0 && outstandingBalance === 0) {
      overallStatus = 'PAID';
    } else if (activeInvs.some((i) => i.policyState === 'OVERDUE')) {
      overallStatus = 'OVERDUE';
    } else if (activeInvs.some((i) => i.policyState === 'GRACE_PERIOD')) {
      overallStatus = 'GRACE_PERIOD';
    } else if (activeInvs.some((i) => i.policyState === 'DUE_SOON')) {
      overallStatus = 'DUE_SOON';
    } else if (amountPaid > 0) {
      overallStatus = 'PART_PAID';
    }

    const myNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.channel, 'IN_APP'),
          or(
            eq(notifications.recipientUserId, user.id),
            eq(notifications.recipientEmail, user.email)
          )
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const totalSessions = myAttendance.length;
    const attendedSessions = myAttendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;
    const attendanceRate =
      totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

    res.json({
      user,
      profile,
      programme,
      cohort,
      applications: myApps,
      onboardingTemplate: settings?.onboardingTemplate ?? null,
      instituteContact: settings
        ? {
            instituteName: settings.instituteName,
            descriptor: settings.descriptor,
            supportEmail: settings.supportEmail,
            whatsappNumbers: settings.whatsappNumbers,
            address: settings.address,
            currency: settings.currency,
            bankName: settings.bankName,
            accountName: settings.accountName,
            accountNumber: settings.accountNumber,
            paymentInstructions: settings.paymentInstructions,
            reminderHoursBeforeDue: settings.reminderHoursBeforeDue,
            gracePeriodHours: settings.gracePeriodHours,
            paymentPolicySummary: settings.paymentPolicySummary,
          }
        : null,
      paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY),
      attendance: myAttendance,
      attendanceRate,
      assignments: myAssignments,
      submissions: mySubmissions,
      assessments: myAssessments,
      paymentPlans: myPaymentPlans,
      invoices: myInvoices,
      financialSummary: {
        totalProgrammeFee,
        amountPaid,
        outstandingBalance,
        nextDueDate: nextUnpaid?.dueDate ?? null,
        nextDueInvoiceNumber: nextUnpaid?.invoiceNumber ?? null,
        graceDeadline: nextUnpaid?.graceDeadline ?? null,
        overallStatus,
        planType:
          myPaymentPlans[0]?.planType ||
          (activeInvs.some((i) => i.invoiceType === 'WEEKLY_INSTALMENT')
            ? 'WEEKLY_INSTALMENTS'
            : 'FULL_PAYMENT'),
      },
      payments: myPayments,
      receipts: myReceipts,
      ledger: myLedger,
      certificates: myCertificates,
      notifications: myNotifications,
    });
  } catch (err) {
    console.error('Student dashboard error:', err);
    res.status(500).json({ error: 'Unable to load student portal data.' });
  }
});

// Restricted profile self-service update (cannot change admissionNumber, programme, status, or financial records)
router.patch('/profile', async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;
    const { phone, location, preferredSetup } = req.body ?? {};

    const profiles = await db
      .select()
      .from(studentProfiles)
      .where(
        or(
          eq(studentProfiles.userId, user.id),
          eq(studentProfiles.email, user.email)
        )
      )
      .limit(1);

    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Enrolled student profile not found.' });
    }

    const updated = await db
      .update(studentProfiles)
      .set({
        phone: phone ? String(phone).trim() : profiles[0].phone,
        location: location !== undefined ? String(location).trim() : profiles[0].location,
        preferredSetup:
          preferredSetup !== undefined
            ? String(preferredSetup).trim()
            : profiles[0].preferredSetup,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, profiles[0].id))
      .returning();

    await logAudit({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'STUDENT_PROFILE_SELF_UPDATED',
      entityType: 'student_profile',
      entityId: profiles[0].admissionNumber,
    });

    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating student profile:', err);
    res.status(500).json({ error: 'Unable to update profile details.' });
  }
});

router.post('/assignments/:assignmentId/submit', async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;
    const assignmentId = Number(req.params.assignmentId);
    const { submissionUrl, notes } = req.body ?? {};

    if (!submissionUrl || String(submissionUrl).trim() === '') {
      return res
        .status(400)
        .json({ error: 'A valid project link or repository URL is required.' });
    }

    const profiles = await db
      .select()
      .from(studentProfiles)
      .where(
        or(
          eq(studentProfiles.userId, user.id),
          eq(studentProfiles.email, user.email)
        )
      )
      .limit(1);

    if (profiles.length === 0) {
      return res.status(403).json({ error: 'Only enrolled students can submit assignments.' });
    }

    const profile = profiles[0];
    const assignRows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, assignmentId))
      .limit(1);

    if (assignRows.length === 0 || assignRows[0].programmeId !== profile.programmeId) {
      return res
        .status(404)
        .json({ error: 'Assignment not found for your enrolled programme.' });
    }

    const existing = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.studentProfileId, profile.id)
        )
      )
      .limit(1);

    let saved;
    if (existing.length > 0) {
      const updated = await db
        .update(submissions)
        .set({
          submissionUrl: String(submissionUrl).trim(),
          notes: notes ? String(notes).trim() : null,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        })
        .where(eq(submissions.id, existing[0].id))
        .returning();
      saved = updated[0];
    } else {
      const inserted = await db
        .insert(submissions)
        .values({
          assignmentId,
          studentProfileId: profile.id,
          submissionUrl: String(submissionUrl).trim(),
          notes: notes ? String(notes).trim() : null,
          status: 'SUBMITTED',
        })
        .returning();
      saved = inserted[0];
    }

    await logAudit({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'ASSIGNMENT_SUBMITTED',
      entityType: 'submission',
      entityId: saved.id,
      details: { assignmentId },
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error('Error submitting assignment:', err);
    res.status(500).json({ error: 'Unable to submit assignment.' });
  }
});

router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;
    const id = Number(req.params.id);

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    if (
      rows[0].recipientUserId !== user.id &&
      rows[0].recipientEmail !== user.email
    ) {
      return res.status(403).json({ error: 'Cannot modify another user notification.' });
    }

    const updated = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();

    res.json(updated[0]);
  } catch (err) {
    console.error('Notification read error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// Student submits bank transfer proof (enters PENDING_VERIFICATION only — never auto-marked paid)
router.post('/invoices/:id/transfer-proof', async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;
    const invoiceId = Number(req.params.id);
    const body = req.body ?? {};
    const amount = Number(body.amount);
    const transactionReference = String(body.transactionReference || '').trim();
    const payerName = String(body.payerName || '').trim();
    const paymentDate =
      String(body.paymentDate || '').trim() || new Date().toISOString().slice(0, 10);
    const paymentMethod = String(body.paymentMethod || 'Bank Transfer').trim();
    const proofNotes = body.proofNotes ? String(body.proofNotes).trim() : null;

    if (!amount || amount <= 0 || !transactionReference || !payerName) {
      return res.status(400).json({
        error:
          'Positive amount, payer name, and unique bank transaction reference are required.',
      });
    }

    const invRows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    if (invRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const inv = invRows[0];

    const [profileRows, appRows] = await Promise.all([
      db
        .select()
        .from(studentProfiles)
        .where(
          or(
            eq(studentProfiles.userId, user.id),
            eq(studentProfiles.email, user.email)
          )
        ),
      db
        .select()
        .from(applications)
        .where(
          or(
            eq(applications.userId, user.id),
            eq(applications.email, user.email)
          )
        ),
    ]);
    const myProfileIds = new Set(profileRows.map((p) => p.id));
    const myAppIds = new Set(appRows.map((a) => a.id));
    const ownsInvoice =
      inv.recipientEmail.toLowerCase() === user.email.toLowerCase() ||
      (inv.studentProfileId && myProfileIds.has(inv.studentProfileId)) ||
      (inv.applicationId && myAppIds.has(inv.applicationId));

    if (!ownsInvoice) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to submit payment for this invoice.' });
    }

    if (inv.balanceDue <= 0 || inv.status === 'PAID') {
      return res.status(400).json({ error: 'This invoice is already fully paid.' });
    }

    if (amount > inv.balanceDue) {
      return res.status(400).json({
        error: `Submitted amount (${amount.toLocaleString()}) cannot exceed outstanding balance (${inv.balanceDue.toLocaleString()}).`,
      });
    }

    const dup = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionReference, transactionReference))
      .limit(1);
    if (dup.length > 0) {
      return res.status(409).json({
        error: 'A payment with this transaction reference has already been submitted.',
      });
    }

    const inserted = await db
      .insert(payments)
      .values({
        invoiceId: inv.id,
        studentProfileId: inv.studentProfileId,
        applicationId: inv.applicationId,
        amount,
        paymentMethod,
        transactionReference,
        paymentDate,
        verificationStatus: 'PENDING_VERIFICATION',
        submittedByRole: 'STUDENT',
        payerName,
        proofNotes,
        notes: proofNotes
          ? `Student proof (${payerName}): ${proofNotes}`
          : `Student transfer proof submitted by ${payerName}`,
      })
      .returning();

    await dispatchNotification({
      recipientUserId: user.id,
      recipientEmail: inv.recipientEmail,
      eventType: 'PAYMENT_RECORDED',
      title: `Transfer Proof Received (${transactionReference})`,
      message: `Your bank transfer proof of ${amount.toLocaleString()} for ${inv.invoiceNumber} has been logged as PENDING VERIFICATION. Your Official Receipt will be issued once our Finance Office reconciles the transfer.`,
    });

    await logAudit({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'STUDENT_TRANSFER_PROOF_SUBMITTED',
      entityType: 'payment',
      entityId: transactionReference,
      details: { invoiceNumber: inv.invoiceNumber, amount, payerName },
    });

    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error('Transfer proof submission error:', err);
    res.status(500).json({ error: 'Failed to submit transfer proof.' });
  }
});

// Student initializes online Paystack payment against own invoice
router.post('/invoices/:id/paystack', async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;
    const invoiceId = Number(req.params.id);
    const invRows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    if (invRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const inv = invRows[0];

    const [profileRows, appRows] = await Promise.all([
      db
        .select()
        .from(studentProfiles)
        .where(
          or(
            eq(studentProfiles.userId, user.id),
            eq(studentProfiles.email, user.email)
          )
        ),
      db
        .select()
        .from(applications)
        .where(
          or(
            eq(applications.userId, user.id),
            eq(applications.email, user.email)
          )
        ),
    ]);
    const myProfileIds = new Set(profileRows.map((p) => p.id));
    const myAppIds = new Set(appRows.map((a) => a.id));
    const ownsInvoice =
      inv.recipientEmail.toLowerCase() === user.email.toLowerCase() ||
      (inv.studentProfileId && myProfileIds.has(inv.studentProfileId)) ||
      (inv.applicationId && myAppIds.has(inv.applicationId));

    if (!ownsInvoice) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to pay this invoice.' });
    }

    if (inv.balanceDue <= 0) {
      return res.status(400).json({ error: 'Invoice has no remaining balance.' });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.status(503).json({
        code: 'PAYSTACK_NOT_CONFIGURED',
        error:
          'Online Paystack checkout is awaiting live PAYSTACK_SECRET_KEY activation. Please pay via Bank Transfer and upload your transfer reference below.',
      });
    }

    const chargeAmount = Math.min(
      inv.balanceDue,
      Math.max(1, Number(req.body?.amount || inv.balanceDue))
    );
    const reference = `ARTI-PSK-${inv.invoiceNumber}-${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: inv.recipientEmail,
        amount: Math.round(chargeAmount * 100),
        reference,
        metadata: {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          paymentPlanId: inv.paymentPlanId,
        },
      }),
    });

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
    console.error('Student Paystack init error:', err);
    res.status(500).json({ error: 'Failed to start Paystack payment.' });
  }
});

export default router;
