import type { TenantClient } from '@atlas/db';
import { newAuditLogId, type OrganizationId, type UserId } from '@atlas/types';

import type { AuditAction } from './actions';

export interface AuditEventInput {
  readonly organizationId: OrganizationId;
  readonly actorUserId: UserId | null;
  readonly action: AuditAction;
  readonly targetType?: string | undefined;
  readonly targetId?: string | undefined;
  readonly metadata?: Record<string, string | number | boolean | null> | undefined;
  readonly ipAddress?: string | undefined;
}

/**
 * Appends an audit entry.
 *
 * Takes the caller's transaction client rather than opening its own, so the
 * event and the change it describes commit together. An audit trail written
 * outside the transaction can record things that were rolled back, and can
 * miss things that succeeded — either way it stops being evidence.
 */
export async function recordAuditEvent(tx: TenantClient, event: AuditEventInput): Promise<void> {
  await tx.auditLog.create({
    data: {
      id: newAuditLogId(),
      organizationId: event.organizationId,
      actorUserId: event.actorUserId,
      action: event.action,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      // Omitted rather than set to `undefined`: Prisma's JSON input type has
      // no `undefined` member, and an absent key means "leave NULL".
      ...(event.metadata === undefined ? {} : { metadata: event.metadata }),
      ipAddress: event.ipAddress ?? null,
    },
  });
}
