import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { FirestoreService } from '../firebase/firestore.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'marjaah_super_secure_jwt_secret_key_2026_qatar_tech_prod',
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException();
    }

    // 1. Check admin_users first if the payload suggests admin/staff or username/sub is admin
    const isAdminOrStaff = Boolean(
      payload.is_staff ||
      payload.is_superuser ||
      payload.role === 'admin' ||
      payload.role === 'super_admin' ||
      payload.sub === 'admin' ||
      payload.username === 'admin'
    );

    let doc = null;
    let isStaffUser = isAdminOrStaff;
    let isSuperUser = Boolean(
      payload.is_superuser ||
      payload.role === 'super_admin' ||
      payload.sub === 'admin' ||
      payload.username === 'admin'
    );

    if (isAdminOrStaff) {
      const adminDoc = await this.firestore.doc('admin_users', payload.sub).get();
      if (adminDoc.exists) {
        doc = adminDoc;
        isStaffUser = true;
      }
    }

    // 2. If not found in admin_users, check standard users collection
    if (!doc) {
      const userDoc = await this.firestore.doc('users', payload.sub).get();
      if (userDoc.exists) {
        doc = userDoc;
      }
    }

    if (!doc || !doc.exists) {
      // Return payload if document not found
      return {
        ...payload,
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        is_staff: isStaffUser,
        is_superuser: isSuperUser,
        role: payload.role || (isStaffUser ? 'admin' : 'customer'),
      };
    }

    const data = doc.data();
    return {
      ...payload,
      ...data,
      id: String(doc.id),
      sub: String(doc.id),
      is_staff: Boolean(data?.is_staff || data?.role === 'admin' || data?.role === 'super_admin' || isStaffUser),
      is_superuser: Boolean(data?.is_superuser || data?.role === 'super_admin' || isSuperUser),
      role: data?.role || payload.role || 'customer',
      role_id: data?.role_id || payload.role_id || data?.role || payload.role,
    };
  }
}
