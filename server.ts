import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, desc, eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  invoices,
  payments,
  receipts,
  studentLedger,
} from './src/db/schema.ts';
import publicRoutes from './src/server/routes/public.ts';
import authRoutes from './src/server/routes/auth.ts';
import studentRoutes from './src/server/routes/student.ts';
import adminRoutes from './src/server/routes/admin.ts';
import { generateReference } from './src/server/services/references.ts';
import { dispatchNotification } from './src/server/services/notifications.ts';
import { logAudit } from './src/server/services/audit.ts';
import { recalculatePaymentPlanStatus } from './src/server/services/billing.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Paystack webhook endpoint needs raw body signature verification
  app.post(
    '/api/webhooks/paystack',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        return res
          .status(503)
          .json({ error: 'Paystack webhook secret is not configured.' });
      }
      const signature = req.headers['x-paystack-signature'];
      const rawBody = req.body as Buffer;
      const hash = crypto
        .createHmac('sha512', secretKey)
        .update(rawBody)
        .digest('hex');

      if (!signature || hash !== signature) {
        return res.status(401).json({ error: 'Invalid Paystack signature.' });
      }

      try {
        const event = JSON.parse(rawBody.toString('utf8')) as {
          event: string;
          data?: {
            reference: string;
            amount: number;
            paid_at?: string;
            metadata?: { invoiceId?: number };
          };
        };

        if (event.event === 'charge.success' && event.data) {
          const ref = event.data.reference;
          const amountNaira = Math.round(event.data.amount / 100);
          const invoiceId = Number(event.data.metadata?.invoiceId || 0);

          // Duplicate-event protection
          const existingPay = await db
            .select()
            .from(payments)
            .where(eq(payments.transactionReference, ref))
            .limit(1);

          if (existingPay.length === 0 && invoiceId > 0) {
            const invRows = await db
              .select()
              .from(invoices)
              .where(eq(invoices.id, invoiceId))
              .limit(1);
            if (invRows.length > 0) {
              const inv = invRows[0];
              const receiptNumber = await generateReference('RCT');
              const payDate = (
                event.data.paid_at || new Date().toISOString()
              ).slice(0, 10);

              await db.transaction(async (tx) => {
                const insertedPay = await tx
                  .insert(payments)
                  .values({
                    invoiceId: inv.id,
                    studentProfileId: inv.studentProfileId,
                    applicationId: inv.applicationId,
                    amount: amountNaira,
                    paymentMethod: 'Paystack',
                    transactionReference: ref,
                    paystackReference: ref,
                    paymentDate: payDate,
                    verificationStatus: 'VERIFIED',
                    submittedByRole: 'PAYSTACK_WEBHOOK',
                    payerName: inv.recipientName,
                    verifiedAt: new Date(),
                    notes: 'Reconciled via Paystack webhook',
                  })
                  .returning();

                const verified = await tx
                  .select()
                  .from(payments)
                  .where(
                    and(
                      eq(payments.invoiceId, inv.id),
                      eq(payments.verificationStatus, 'VERIFIED')
                    )
                  );
                const totalPaid = verified.reduce((s, p) => s + p.amount, 0);
                const balanceDue = Math.max(0, inv.totalPayable - totalPaid);

                await tx
                  .update(invoices)
                  .set({
                    amountPaid: totalPaid,
                    balanceDue,
                    status: balanceDue === 0 ? 'PAID' : 'PART_PAID',
                    updatedAt: new Date(),
                  })
                  .where(eq(invoices.id, inv.id));

                await recalculatePaymentPlanStatus(inv.paymentPlanId, tx);

                const prevLedger = inv.studentProfileId
                  ? await tx
                      .select()
                      .from(studentLedger)
                      .where(
                        eq(studentLedger.studentProfileId, inv.studentProfileId)
                      )
                      .orderBy(desc(studentLedger.id))
                      .limit(1)
                  : [];
                const prevBal = prevLedger[0]?.runningBalance ?? inv.totalPayable;

                await tx.insert(studentLedger).values({
                  studentProfileId: inv.studentProfileId,
                  applicationId: inv.applicationId,
                  entryType: 'CREDIT_PAYMENT',
                  referenceNumber: receiptNumber,
                  description: `Paystack verified payment (${ref})`,
                  debitAmount: 0,
                  creditAmount: amountNaira,
                  runningBalance: Math.max(0, prevBal - amountNaira),
                });

                await tx.insert(receipts).values({
                  receiptNumber,
                  paymentId: insertedPay[0].id,
                  invoiceId: inv.id,
                  studentProfileId: inv.studentProfileId,
                  studentName: inv.recipientName,
                  amountReceived: amountNaira,
                  paymentDate: payDate,
                  paymentMethod: 'Paystack',
                  transactionReference: ref,
                  outstandingBalance: balanceDue,
                });
              });

              await dispatchNotification({
                recipientEmail: inv.recipientEmail,
                eventType: 'PAYMENT_VERIFIED',
                title: `Paystack Payment Confirmed (${receiptNumber})`,
                message: `Your online payment of ${amountNaira.toLocaleString()} for ${inv.invoiceNumber} has been reconciled.`,
              });

              await logAudit({
                actorEmail: 'paystack-webhook@system',
                actorRole: 'SYSTEM',
                action: 'PAYSTACK_WEBHOOK_RECONCILED',
                entityType: 'payment',
                entityId: ref,
              });
            }
          }
        }
        res.status(200).json({ received: true });
      } catch (err) {
        console.error('Paystack webhook processing error:', err);
        res.status(500).json({ error: 'Webhook processing error.' });
      }
    }
  );

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/public', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/admin', adminRoutes);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Artdrobotix Institute server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
