import { Controller, Post, Get, Body, Query, Headers, UseGuards, Request } from '@nestjs/common';
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
    return this.authService.getProfile(req.user.id || req.user.sub);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }
}
