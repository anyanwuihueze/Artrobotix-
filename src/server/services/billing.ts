import { and, eq, isNull, ne } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  instituteSettings,
  invoices,
  paymentPlans,
} from '../../db/schema.ts';
import { dispatchNotification } from './notifications.ts';
import { logAudit } from './audit.ts';

export function addDaysIso(dateStr: string, days: number): string {
  const parsed = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + days);
    return fallback.toISOString().slice(0, 10);
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export type PolicyState =
  | 'PAID'
  | 'PART_PAID'
  | 'DUE_SOON'
  | 'GRACE_PERIOD'
  | 'OVERDUE'
  | 'PENDING';

export function computeInvoicePolicyState(
  inv: {
    status: string;
    balanceDue: number;
    amountPaid: number;
    dueDate: string;
    graceDeadline: string | null;
  },
  gracePeriodHours = 48,
  reminderHoursBeforeDue = 48
): PolicyState {
  if (inv.balanceDue <= 0 || inv.status === 'PAID') return 'PAID';

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const dueEndMs = new Date(`${inv.dueDate.slice(0, 10)}T23:59:59Z`).getTime();
  const graceDays = Math.max(1, Math.round(gracePeriodHours / 24));
  const effectiveGraceDate =
    inv.graceDeadline || addDaysIso(inv.dueDate, graceDays);
  const graceEndMs = new Date(`${effectiveGraceDate.slice(0, 10)}T23:59:59Z`).getTime();

  if (now.getTime() > graceEndMs) {
    return 'OVERDUE';
  }
  if (inv.dueDate < todayIso) {
    return 'GRACE_PERIOD';
  }
  if (inv.amountPaid > 0 || inv.status === 'PART_PAID') {
    return 'PART_PAID';
  }
  const msUntilDue = dueEndMs - now.getTime();
  if (msUntilDue <= reminderHoursBeforeDue * 3600 * 1000 && msUntilDue >= 0) {
    return 'DUE_SOON';
  }
  return 'PENDING';
}

export async function recalculatePaymentPlanStatus(
  paymentPlanId: number | null | undefined,
  executor: Pick<typeof db, 'select' | 'update'> = db
): Promise<void> {
  if (!paymentPlanId) return;
  const planInvoices = await executor
    .select()
    .from(invoices)
    .where(eq(invoices.paymentPlanId, paymentPlanId));

  if (planInvoices.length === 0) return;

  const totalPayable = planInvoices.reduce((s, i) => s + i.totalPayable, 0);
  const totalPaid = planInvoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalDue = planInvoices.reduce((s, i) => s + i.balanceDue, 0);

  const nextStatus =
    totalDue === 0
      ? 'PAID'
      : totalPaid > 0
        ? 'PART_PAID'
        : totalPayable === 0
          ? 'PAID'
          : 'UNPAID';

  await executor
    .update(paymentPlans)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(paymentPlans.id, paymentPlanId));
}

export async function processPaymentReminders(triggeredBy?: {
  userId?: number;
  email?: string;
  role?: string;
}): Promise<{
  checkedCount: number;
  sentCount: number;
  invoiceNumbers: string[];
}> {
  const settingsRows = await db
    .select()
    .from(instituteSettings)
    .where(eq(instituteSettings.key, 'default'))
    .limit(1);
  const settings = settingsRows[0];
  const reminderHours = settings?.reminderHoursBeforeDue ?? 48;
  const graceHours = settings?.gracePeriodHours ?? 48;
  const currency = settings?.currency || 'NGN';

  const candidates = await db
    .select()
    .from(invoices)
    .where(and(ne(invoices.status, 'PAID'), isNull(invoices.reminderSentAt)));

  const nowMs = Date.now();
  const windowMs = reminderHours * 3600 * 1000;
  const sentNumbers: string[] = [];

  for (const inv of candidates) {
    if (inv.balanceDue <= 0) continue;
    const dueEndMs = new Date(`${inv.dueDate.slice(0, 10)}T23:59:59Z`).getTime();
    if (Number.isNaN(dueEndMs)) continue;

    // Trigger when due date is within reminderHoursBeforeDue (including due today or slightly past due before reminder sent)
    const graceDays = Math.max(1, Math.round(graceHours / 24));
    const graceDate = inv.graceDeadline || addDaysIso(inv.dueDate, graceDays);
    const graceEndMs = new Date(`${graceDate.slice(0, 10)}T23:59:59Z`).getTime();

    if (dueEndMs - nowMs <= windowMs && nowMs <= graceEndMs) {
      const label =
        inv.invoiceType === 'WEEKLY_INSTALMENT'
          ? `Week ${inv.instalmentNumber} of ${inv.totalInstalments} Instalment`
          : 'Full Programme Invoice';

      await dispatchNotification({
        recipientEmail: inv.recipientEmail,
        eventType: 'PAYMENT_REMINDER',
        title: `Payment Reminder: ${inv.invoiceNumber} (${label})`,
        message: `Dear ${inv.recipientName}, your ${label} (${inv.invoiceNumber}) for ${inv.programmeTitle} has an outstanding balance of ${currency} ${inv.balanceDue.toLocaleString()} due on ${inv.dueDate}. A ${graceHours}-hour grace period (until ${graceDate}) applies if communicated in advance. Please submit payment proof or pay via Paystack in your Student Portal.`,
      });

      await db
        .update(invoices)
        .set({ reminderSentAt: new Date(), updatedAt: new Date() })
        .where(eq(invoices.id, inv.id));

      sentNumbers.push(inv.invoiceNumber);
    }
  }

  if (sentNumbers.length > 0 && triggeredBy?.email) {
    await logAudit({
      actorUserId: triggeredBy.userId,
      actorEmail: triggeredBy.email,
      actorRole: triggeredBy.role || 'SYSTEM',
      action: 'PAYMENT_REMINDERS_DISPATCHED',
      entityType: 'invoice',
      entityId: sentNumbers.join(','),
      details: { sentCount: sentNumbers.length, reminderHours },
    });
  }

  return {
    checkedCount: candidates.length,
    sentCount: sentNumbers.length,
    invoiceNumbers: sentNumbers,
  };
}
