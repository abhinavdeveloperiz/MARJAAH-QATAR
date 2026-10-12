import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || (!user.is_staff && !user.is_superuser && user.role !== 'admin')) {
      throw new ForbiddenException('Admin staff access required');
    }
    return true;
  }
}
