/**
 * Audit Log Service — Supabase-backed
 * Sectore 360 — Production
 */
import { auditApi } from '@/lib/api';

export type AuditEventType =
  | 'Login' | 'Logout' | 'FailedLogin'
  | 'PasswordReset' | 'PasswordChanged'
  | 'UserCreated' | 'UserEdited' | 'UserDeleted' | 'UserActivated' | 'UserDeactivated'
  | 'Create' | 'Update' | 'Delete' | 'Restore' | 'Assignment' | 'StatusChange';

export interface AuditLog {
  id: string;
  eventType: AuditEventType;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  ipAddress: string;
  resource: string;
  resourceId?: string;
  oldValue?: string;
  newValue?: string;
  description: string;
}

function rowToLog(r: Record<string, unknown>): AuditLog {
  return {
    id:          r.id as string,
    eventType:   (r.event_type ?? r.eventType) as AuditEventType,
    userId:      (r.user_id ?? r.userId) as string,
    userName:    (r.user_name ?? r.userName) as string,
    userRole:    (r.user_role ?? r.userRole) as string,
    timestamp:   r.timestamp as string,
    ipAddress:   (r.ip_address ?? r.ipAddress ?? '—') as string,
    resource:    r.resource as string,
    resourceId:  (r.resource_id ?? r.resourceId) as string | undefined,
    oldValue:    (r.old_value ?? r.oldValue) as string | undefined,
    newValue:    (r.new_value ?? r.newValue) as string | undefined,
    description: r.description as string,
  };
}

export const auditService = {
  async getAll(): Promise<AuditLog[]> {
    const rows = await auditApi.list({ limit: 1000 });
    return rows.map(rowToLog);
  },

  async getFiltered(opts: {
    fromDate?: string; toDate?: string;
    eventType?: AuditEventType | 'all'; userId?: string; search?: string;
  }): Promise<AuditLog[]> {
    const rows = await auditApi.list({
      fromDate:  opts.fromDate,
      toDate:    opts.toDate,
      eventType: opts.eventType === 'all' ? undefined : opts.eventType,
      userId:    opts.userId === 'all' ? undefined : opts.userId,
      search:    opts.search,
      limit:     1000,
    });
    return rows.map(rowToLog);
  },

  /** Fire-and-forget log — does not need to be awaited */
  log(event: Omit<AuditLog, 'id' | 'ipAddress' | 'timestamp'> & { ipAddress?: string; timestamp?: string }): AuditLog {
    // Async write to DB (fire and forget)
    auditApi.log({
      eventType:  event.eventType,
      userId:     event.userId,
      userName:   event.userName,
      userRole:   event.userRole,
      resource:   event.resource,
      resourceId: event.resourceId,
      description: event.description,
      oldValue:   event.oldValue,
      newValue:   event.newValue,
      ipAddress:  event.ipAddress,
    }).catch(console.error);

    // Return a local stub so callers that use the return value don't break
    return {
      id:          `local_${Date.now()}`,
      ipAddress:   event.ipAddress ?? '—',
      timestamp:   event.timestamp ?? new Date().toISOString(),
      ...event,
    };
  },

  async getUniqueUsers(): Promise<{ id: string; name: string }[]> {
    const rows = await auditApi.list({ limit: 2000 });
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const r of rows) {
      const uid = r.user_id as string;
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        result.push({ id: uid, name: r.user_name as string });
      }
    }
    return result;
  },
};
