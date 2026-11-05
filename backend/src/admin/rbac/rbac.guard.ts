import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_CHECK_KEY, RequiredPermission } from './require-permission.decorator';
import { FirestoreService } from '../../firebase/firestore.service';
import { SYSTEM_DEFAULT_ROLES } from './permissions';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firestore: FirestoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Must be staff or admin
    const isStaff = Boolean(
      user.is_staff ||
      user.is_superuser ||
      user.role === 'admin' ||
      user.role === 'super_admin' ||
      user.username === 'admin' ||
      user.id === 'admin'
    );
    if (!isStaff) {
      throw new ForbiddenException('Administrative staff privileges required');
    }

    // 1. Super Admin master override
    if (user.is_superuser || user.username === 'admin' || user.id === 'admin') {
      return true;
    }

    // 2. Fetch fresh user doc from admin_users (or users) to verify status & revoked sessions
    let userDoc = await this.firestore.collection('admin_users').doc(String(user.id)).get();
    if (!userDoc.exists) {
      userDoc = await this.firestore.collection('users').doc(String(user.id)).get();
    }

    let liveUserData = userDoc.exists ? userDoc.data() : user;

    // Check account status
    if (liveUserData?.status === 'deactivated') {
      throw new ForbiddenException('Your administrator account has been deactivated by the primary administrator.');
    }
    if (liveUserData?.status === 'suspended') {
      throw new ForbiddenException('Your administrator account has been suspended.');
    }

    // Check session revocation
    if (liveUserData?.session_revoked_at && user.iat) {
      const revokedTime = new Date(liveUserData.session_revoked_at).getTime();
      const tokenIssuedTime = Number(user.iat) * 1000;
      if (tokenIssuedTime < revokedTime) {
        throw new UnauthorizedException('Your session has been terminated by an administrator. Please log in again.');
      }
    }

    // If superuser on live document
    if (liveUserData?.is_superuser) {
      return true;
    }

    // If no granular permission is required for this route, allow any active admin staff
    if (!requiredPermission) {
      return true;
    }

    const { module: targetModule, action: targetAction } = requiredPermission;

    // 3. Resolve permissions from user's assigned roles
    const assignedRoleIds: string[] = Array.isArray(liveUserData?.role_ids)
      ? liveUserData.role_ids
      : (Array.isArray(liveUserData?.roles) ? liveUserData.roles : (liveUserData?.role ? [liveUserData.role] : []));

    if (assignedRoleIds.includes('super_admin') || assignedRoleIds.includes('admin')) {
      return true;
    }

    // Fetch custom roles from Firestore
    const rolesSnap = await this.firestore.collection('admin_roles').get();
    const firestoreRoles = rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    // Combine system defaults with custom roles
    const roleMap = new Map<string, any>();
    for (const r of SYSTEM_DEFAULT_ROLES) {
      roleMap.set(r.id, r);
    }
    for (const r of firestoreRoles) {
      roleMap.set(r.id, r);
      if (r.slug) roleMap.set(r.slug, r);
    }

    // Verify whether any of the user's roles grant the required action
    for (const roleId of assignedRoleIds) {
      const role = roleMap.get(roleId);
      if (!role || !role.permissions) continue;

      const modulePerms = role.permissions[targetModule];
      if (Array.isArray(modulePerms)) {
        if (modulePerms.includes('manage') || modulePerms.includes(targetAction) || modulePerms.includes('*')) {
          return true;
        }
      }
    }

    throw new ForbiddenException(
      `Access denied: You do not have permission to ${targetAction} in the ${targetModule} module.`,
    );
  }
}

