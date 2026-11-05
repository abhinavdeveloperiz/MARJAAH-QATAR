import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService } from '../../firebase/firestore.service';

export interface AuditLogEntry {
  admin_id: string;
  admin_username: string;
  admin_email?: string;
  action: string;
  module: string;
  target_id?: string;
  target_title?: string;
  details?: any;
  ip_address?: string;
  status?: 'success' | 'failed' | 'warning';
  timestamp?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly firestore: FirestoreService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const now = new Date().toISOString();
      const payload = {
        ...entry,
        status: entry.status || 'success',
        timestamp: entry.timestamp || now,
        created_at: now,
      };
      await this.firestore.collection('audit_logs').add(payload);
    } catch (e: any) {
      this.logger.error(`Failed to record audit log: ${e.message}`);
    }
  }

  async list(query: { module?: string; action?: string; limit?: number; page?: number } = {}) {
    const limit = Math.max(1, Math.min(200, Number(query.limit) || 50));
    const page = Math.max(1, Number(query.page) || 1);

    const snap = await this.firestore.collection('audit_logs').get();
    let logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    if (query.module) {
      logs = logs.filter((l) => l.module === query.module);
    }
    if (query.action) {
      logs = logs.filter((l) => l.action === query.action);
    }

    logs.sort((a, b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime());

    const total = logs.length;
    const offset = (page - 1) * limit;
    const paginated = logs.slice(offset, offset + limit);

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

