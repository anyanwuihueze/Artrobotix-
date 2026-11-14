import { db } from '../../db/index.ts';
import { auditLogs } from '../../db/schema.ts';

export async function logAudit(params: {
  actorUserId?: number | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | number;
  details?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      actorUserId: params.actorUserId ?? null,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: String(params.entityId),
      details: params.details ?? {},
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
