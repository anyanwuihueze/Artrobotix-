import crypto from 'crypto';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  applications,
  certificates,
  invoices,
  paymentPlans,
  receipts,
  studentProfiles,
} from '../../db/schema.ts';

function padSeq(num: number): string {
  return String(num).padStart(4, '0');
}

export async function generateReference(
  type: 'APP' | 'INV' | 'RCT' | 'STU' | 'CERT' | 'PLN',
  offset = 0
): Promise<string> {
  const year = new Date().getFullYear();
  let count = 0;

  if (type === 'APP') {
    const res = await db.select({ c: sql<number>`count(*)::int` }).from(applications);
    count = res[0]?.c ?? 0;
  } else if (type === 'INV') {
    const res = await db.select({ c: sql<number>`count(*)::int` }).from(invoices);
    count = res[0]?.c ?? 0;
  } else if (type === 'RCT') {
    const res = await db.select({ c: sql<number>`count(*)::int` }).from(receipts);
    count = res[0]?.c ?? 0;
  } else if (type === 'STU') {
    const res = await db.select({ c: sql<number>`count(*)::int` }).from(studentProfiles);
    count = res[0]?.c ?? 0;
  } else if (type === 'CERT') {
    const res = await db.select({ c: sql<number>`count(*)::int` }).from(certificates);
    count = res[0]?.c ?? 0;
  } else if (type === 'PLN') {
    const res = await db.select({ c: sql<number>`count(*)::int` }).from(paymentPlans);
    count = res[0]?.c ?? 0;
  }

  return `ARTI-${type}-${year}-${padSeq(count + 1 + offset)}`;
}

export function generateVerificationCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}
