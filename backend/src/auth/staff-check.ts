import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwt-secret';

/** True only when the request carries a valid staff JWT. Used to gate `?includeInactive=true`. */
export function isStaffRequest(req: any): boolean {
  const header = String(req?.headers?.authorization || '');
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  try {
    const p: any = jwt.verify(token, getJwtSecret());
    return Boolean(p && (p.is_staff || p.is_superuser || p.role === 'admin' || p.role === 'super_admin'));
  } catch {
    return false;
  }
}
