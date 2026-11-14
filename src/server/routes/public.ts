import { Router } from 'express';
import { asc, eq, or } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  applications,
  certificates,
  cohorts,
  instituteSettings,
  programmes,
} from '../../db/schema.ts';
import { rateLimit } from '../middleware/auth.ts';
import { ensureInitialSeed } from '../seed.ts';
import { generateReference } from '../services/references.ts';
import { dispatchNotification } from '../services/notifications.ts';
import { logAudit } from '../services/audit.ts';

const router = Router();

router.get('/home', async (_req, res) => {
  try {
    await ensureInitialSeed();
    const [settingsRows, activeProgrammes, openCohorts] = await Promise.all([
      db
        .select()
        .from(instituteSettings)
        .where(eq(instituteSettings.key, 'default'))
        .limit(1),
      db
        .select()
        .from(programmes)
        .where(eq(programmes.isActive, true))
        .orderBy(asc(programmes.sortOrder), asc(programmes.id)),
      db.select().from(cohorts).orderBy(asc(cohorts.startDate)),
    ]);

    const settings = settingsRows[0] ?? null;
    res.json({
      settings: settings
        ? {
            instituteName: settings.instituteName,
            descriptor: settings.descriptor,
            tagline: settings.tagline,
            supportEmail: settings.supportEmail,
            whatsappNumbers: settings.whatsappNumbers,
            address: settings.address,
            currency: settings.currency,
            reminderHoursBeforeDue: settings.reminderHoursBeforeDue,
            gracePeriodHours: settings.gracePeriodHours,
            paymentPolicySummary: settings.paymentPolicySummary,
            instructorName: settings.instructorName,
            instructorTitle: settings.instructorTitle,
            instructorBio: settings.instructorBio,
            instructorPortfolioUrl: settings.instructorPortfolioUrl,
            instructorGithubUrl: settings.instructorGithubUrl,
            instructorLinkedinUrl: settings.instructorLinkedinUrl,
          }
        : null,
      programmes: activeProgrammes,
      cohorts: openCohorts.filter((c) => c.status !== 'COMPLETED'),
    });
  } catch (err) {
    console.error('Error loading public home data:', err);
    res.status(500).json({ error: 'Unable to load institute information.' });
  }
});

router.post(
  '/applications',
  rateLimit(15, 15 * 60 * 1000),
  async (req, res) => {
    try {
      await ensureInitialSeed();
      const body = req.body ?? {};

      const requiredFields = [
        'fullName',
        'dateOfBirth',
        'nationality',
        'stateCity',
        'residentialAddress',
        'phone',
        'email',
        'highestQualification',
        'professionalStatus',
        'internetAccess',
        'preferredSetup',
        'programmeName',
        'preferredFormat',
        'learningObjectives',
        'expectedOutcome',
        'availability',
        'canCompleteAssignments',
        'emergencyContactName',
        'emergencyContactPhone',
        'signatureName',
      ];

      for (const field of requiredFields) {
        if (!body[field] || String(body[field]).trim() === '') {
          return res.status(400).json({
            error: `Missing required field: ${field}`,
          });
        }
      }

      if (!body.consentAccuracy || !body.consentPrivacy) {
        return res.status(400).json({
          error:
            'You must confirm information accuracy and data privacy consent before submitting.',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(body.email).trim())) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }

      let programmeId: number | null = body.programmeId
        ? Number(body.programmeId)
        : null;
      if (programmeId) {
        const prog = await db
          .select()
          .from(programmes)
          .where(eq(programmes.id, programmeId))
          .limit(1);
        if (prog.length === 0) programmeId = null;
      }

      const referenceNumber = await generateReference('APP');
      const submittedDate = new Date().toISOString().slice(0, 10);
      const cleanEmail = String(body.email).trim().toLowerCase();

      const preferredPaymentPlan =
        body.preferredPaymentPlan === 'WEEKLY_INSTALMENTS'
          ? 'WEEKLY_INSTALMENTS'
          : 'FULL_PAYMENT';

      const inserted = await db
        .insert(applications)
        .values({
          referenceNumber,
          programmeId,
          programmeName: String(body.programmeName).trim(),
          status: 'PENDING',
          fullName: String(body.fullName).trim(),
          dateOfBirth: String(body.dateOfBirth).trim(),
          nationality: String(body.nationality).trim(),
          stateCity: String(body.stateCity).trim(),
          residentialAddress: String(body.residentialAddress).trim(),
          phone: String(body.phone).trim(),
          email: cleanEmail,
          gender: body.gender ? String(body.gender).trim() : null,
          highestQualification: String(body.highestQualification).trim(),
          institutionAttended: body.institutionAttended
            ? String(body.institutionAttended).trim()
            : null,
          professionalStatus: String(body.professionalStatus).trim(),
          occupationIndustry: body.occupationIndustry
            ? String(body.occupationIndustry).trim()
            : null,
          previousExperience: Array.isArray(body.previousExperience)
            ? body.previousExperience
            : [],
          availableDevices: Array.isArray(body.availableDevices)
            ? body.availableDevices
            : [],
          internetAccess: String(body.internetAccess).trim(),
          toolFamiliarity:
            typeof body.toolFamiliarity === 'object' && body.toolFamiliarity
              ? body.toolFamiliarity
              : {},
          preferredSetup: String(body.preferredSetup).trim(),
          preferredFormat: String(body.preferredFormat).trim(),
          preferredPaymentPlan,
          learningObjectives: String(body.learningObjectives).trim(),
          projectIdea: body.projectIdea ? String(body.projectIdea).trim() : null,
          expectedOutcome: String(body.expectedOutcome).trim(),
          availability: String(body.availability).trim(),
          canCompleteAssignments: String(body.canCompleteAssignments).trim(),
          emergencyContactName: String(body.emergencyContactName).trim(),
          emergencyContactPhone: String(body.emergencyContactPhone).trim(),
          sponsorName: body.sponsorName ? String(body.sponsorName).trim() : null,
          sponsorDetails: body.sponsorDetails
            ? String(body.sponsorDetails).trim()
            : null,
          consentAccuracy: Boolean(body.consentAccuracy),
          consentPrivacy: Boolean(body.consentPrivacy),
          consentMedia: Boolean(body.consentMedia),
          signatureName: String(body.signatureName).trim(),
          guardianSignature: body.guardianSignature
            ? String(body.guardianSignature).trim()
            : null,
          submittedDate,
        })
        .returning();

      const appRecord = inserted[0];

      await dispatchNotification({
        recipientEmail: cleanEmail,
        eventType: 'APPLICATION_RECEIVED',
        title: `Application Received (${referenceNumber})`,
        message: `Dear ${appRecord.fullName}, your application for ${appRecord.programmeName} has been received with reference ${referenceNumber}. Admission is subject to administrative review.`,
      });

      await logAudit({
        actorEmail: cleanEmail,
        actorRole: 'APPLICANT',
        action: 'APPLICATION_SUBMITTED',
        entityType: 'application',
        entityId: referenceNumber,
        details: { programmeName: appRecord.programmeName },
      });

      res.status(201).json({
        referenceNumber: appRecord.referenceNumber,
        status: appRecord.status,
        programmeName: appRecord.programmeName,
        preferredPaymentPlan: appRecord.preferredPaymentPlan,
        submittedDate: appRecord.submittedDate,
      });
    } catch (err) {
      console.error('Error submitting application:', err);
      res.status(500).json({ error: 'Failed to submit application. Please try again.' });
    }
  }
);

router.get(
  '/applications/track',
  rateLimit(30, 15 * 60 * 1000),
  async (req, res) => {
    try {
      const ref = String(req.query.ref || '').trim().toUpperCase();
      const email = String(req.query.email || '').trim().toLowerCase();

      if (!ref || !email) {
        return res.status(400).json({
          error: 'Both application reference number and email address are required.',
        });
      }

      const rows = await db
        .select()
        .from(applications)
        .where(eq(applications.referenceNumber, ref))
        .limit(1);

      if (rows.length === 0 || rows[0].email.toLowerCase() !== email) {
        return res.status(404).json({
          error:
            'No matching application was found for the provided reference number and email.',
        });
      }

      const app = rows[0];
      res.json({
        referenceNumber: app.referenceNumber,
        fullName: app.fullName,
        programmeName: app.programmeName,
        preferredFormat: app.preferredFormat,
        status: app.status,
        submittedDate: app.submittedDate,
        infoRequestMessage: app.infoRequestMessage,
      });
    } catch (err) {
      console.error('Error tracking application:', err);
      res.status(500).json({ error: 'Unable to check application status.' });
    }
  }
);

router.get('/verify/:code', rateLimit(40, 15 * 60 * 1000), async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!code || code.length < 6) {
      return res.status(400).json({ error: 'Please provide a valid certificate reference.' });
    }

    const rows = await db
      .select()
      .from(certificates)
      .where(
        or(
          eq(certificates.certificateNumber, code),
          eq(certificates.verificationCode, code)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({
        valid: false,
        error: 'Certificate reference not found in Artdrobotix Institute records.',
      });
    }

    const cert = rows[0];
    res.json({
      valid: cert.status === 'VALID',
      status: cert.status,
      certificateNumber: cert.certificateNumber,
      studentFullName: cert.studentFullName,
      programmeTitle: cert.programmeTitle,
      completionDate: cert.completionDate,
      issuedDate: cert.issuedDate,
      issuingInstitution: 'Artdrobotix Institute — School of Art, Science & Technology',
    });
  } catch (err) {
    console.error('Certificate verification error:', err);
    res.status(500).json({ error: 'Unable to verify certificate at this time.' });
  }
});

export default router;
