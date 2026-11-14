import { db } from '../../db/index.ts';
import { notifications } from '../../db/schema.ts';

export type NotificationEventType =
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_INFO_REQUESTED'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REMINDER'
  | 'ADMISSION_CONFIRMED'
  | 'TRAINING_REMINDER'
  | 'ASSIGNMENT_DEADLINE'
  | 'ASSIGNMENT_FEEDBACK'
  | 'PROGRAMME_COMPLETED'
  | 'CERTIFICATE_ISSUED';

export async function dispatchNotification(params: {
  recipientUserId?: number | null;
  recipientEmail: string;
  eventType: NotificationEventType | string;
  title: string;
  message: string;
  sendEmail?: boolean;
}) {
  // 1. Record In-App Notification
  try {
    await db.insert(notifications).values({
      recipientUserId: params.recipientUserId ?? null,
      recipientEmail: params.recipientEmail,
      eventType: params.eventType,
      title: params.title,
      message: params.message,
      channel: 'IN_APP',
      deliveryStatus: 'LOGGED',
      isRead: false,
    });
  } catch (err) {
    console.error('Failed to log in-app notification:', err);
  }

  // 2. Attempt Resend Email ONLY if explicitly requested and configured
  if (params.sendEmail !== false && params.recipientEmail) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'admissions@artdrobotix.edu.ng';

    if (!resendApiKey) {
      try {
        await db.insert(notifications).values({
          recipientUserId: params.recipientUserId ?? null,
          recipientEmail: params.recipientEmail,
          eventType: params.eventType,
          title: params.title,
          message: params.message,
          channel: 'EMAIL',
          deliveryStatus: 'NOT_CONFIGURED',
          isRead: true,
        });
      } catch (err) {
        console.error('Failed to log unconfigured email notification:', err);
      }
      return { emailStatus: 'NOT_CONFIGURED' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Artdrobotix Institute <${fromEmail}>`,
          to: [params.recipientEmail],
          subject: params.title,
          text: params.message,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { id?: string };
        await db.insert(notifications).values({
          recipientUserId: params.recipientUserId ?? null,
          recipientEmail: params.recipientEmail,
          eventType: params.eventType,
          title: params.title,
          message: params.message,
          channel: 'EMAIL',
          deliveryStatus: 'SENT',
          providerMessageId: data.id ?? null,
          isRead: true,
        });
        return { emailStatus: 'SENT', id: data.id };
      } else {
        await db.insert(notifications).values({
          recipientUserId: params.recipientUserId ?? null,
          recipientEmail: params.recipientEmail,
          eventType: params.eventType,
          title: params.title,
          message: params.message,
          channel: 'EMAIL',
          deliveryStatus: 'FAILED',
          isRead: true,
        });
        return { emailStatus: 'FAILED' };
      }
    } catch (err) {
      console.error('Resend email dispatch error:', err);
      await db.insert(notifications).values({
        recipientUserId: params.recipientUserId ?? null,
        recipientEmail: params.recipientEmail,
        eventType: params.eventType,
        title: params.title,
        message: params.message,
        channel: 'EMAIL',
        deliveryStatus: 'FAILED',
        isRead: true,
      });
      return { emailStatus: 'FAILED' };
    }
  }

  return { emailStatus: 'SKIPPED' };
}
