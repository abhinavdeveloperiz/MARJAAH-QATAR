import { Controller, Post, Get, Patch, Body, Query, Headers, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('admin-login')
  async adminLogin(@Body() body: any) {
    return this.authService.adminLogin(body);
  }

  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('firebase-login')
  async firebaseLogin(@Body('idToken') idToken: string) {
    return this.authService.firebaseLogin(idToken);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('verify')
  async verifyPost(
    @Body('token') bodyToken: string,
    @Headers('authorization') authHeader: string,
    @Query('token') queryToken: string,
  ) {
    const token = bodyToken || (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '') || queryToken;
    return this.authService.verifyToken(token);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('verify-token')
  async verifyTokenPost(
    @Body('token') bodyToken: string,
    @Headers('authorization') authHeader: string,
    @Query('token') queryToken: string,
  ) {
    const token = bodyToken || (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '') || queryToken;
    return this.authService.verifyToken(token);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('verify')
  async verifyGet(
    @Headers('authorization') authHeader: string,
    @Query('token') queryToken: string,
  ) {
    const token = (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '') || queryToken;
    return this.authService.verifyToken(token);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('verify-token')
  async verifyTokenGet(
    @Headers('authorization') authHeader: string,
    @Query('token') queryToken: string,
  ) {
    const token = (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '') || queryToken;
    return this.authService.verifyToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    try {
      const targetId = String(req.user?.id || req.user?.sub || '').trim();
      if (targetId) {
        this.authService.updatePresence(targetId).catch(() => {});
      }
      const profile = await this.authService.getProfile(targetId);
      const combined = {
        ...req.user,
        ...profile,
        id: String(req.user?.id || profile?.id || targetId),
      };
      const { password, raw_password, ...safe } = combined;
      return safe;
    } catch (e) {
      const { password, raw_password, ...safe } = req.user || {};
      return safe;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  async heartbeat(@Request() req: any) {
    const userId = String(req.user?.id || req.user?.sub || '').trim();
    if (userId) {
      await this.authService.updatePresence(userId);
    }
    return { success: true, timestamp: new Date().toISOString() };
  }

  @UseGuards(JwtAuthGuard)
  @Post('presence')
  async presence(@Request() req: any) {
    const userId = String(req.user?.id || req.user?.sub || '').trim();
    if (userId) {
      await this.authService.updatePresence(userId);
    }
    return { success: true, timestamp: new Date().toISOString() };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Request() req: any, @Body() body: any) {
    const userId = String(req.user?.id || req.user?.sub || '').trim();
    return this.authService.updateProfile(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async updateProfilePost(@Request() req: any, @Body() body: any) {
    const userId = String(req.user?.id || req.user?.sub || '').trim();
    return this.authService.updateProfile(userId, body);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; token: string; new_password: string }) {
    return this.authService.resetPassword(body);
  }

  @Get('verify-reset-token')
  async verifyResetToken(@Query('email') email: string, @Query('token') token: string) {
    return this.authService.verifyResetToken(email, token);
  }
}
