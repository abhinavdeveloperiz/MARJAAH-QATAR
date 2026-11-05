import { SetMetadata } from '@nestjs/common';
import { AdminAction, AdminModule } from './permissions';

export const PERMISSION_CHECK_KEY = 'rbac_permission_check';

export interface RequiredPermission {
  module: AdminModule;
  action: AdminAction;
}

export const RequirePermission = (module: AdminModule, action: AdminAction) =>
  SetMetadata(PERMISSION_CHECK_KEY, { module, action } as RequiredPermission);

