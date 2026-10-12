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
    const userDoc = await this.firestore.doc('users', payload.sub).get();
    if (!userDoc.exists) {
      // Return payload if document not found or return basic user info
      return {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        is_staff: payload.is_staff || false,
        role: payload.role || 'customer',
      };
    }
    const data = userDoc.data();
    return {
      id: userDoc.id,
      ...data,
      is_staff: data?.is_staff || data?.role === 'admin' || false,
    };
  }
}
