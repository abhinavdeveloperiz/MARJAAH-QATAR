import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService, AdminUserDto } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from './rbac/rbac.guard';
import { RequirePermission } from './rbac/require-permission.decorator';
import { AuditService } from './audit/audit.service';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  // ─── AUTHENTICATED STAFF PROFILE & PERMISSIONS ───────────────────────────────
  @Get('me')
  async getStaffProfile(@Request() req: any) {
    return this.adminService.getCurrentStaffProfile(req.user);
  }

  // ─── DASHBOARD & ANALYTICS ──────────────────────────────────────────────────
  @Get('dashboard')
  @RequirePermission('dashboard', 'view')
  async getDashboard(@Query('period') period?: string) {
    return this.adminService.getAdvancedAnalytics(period || '30d');
  }

  @Get('analytics')
  @RequirePermission('reports_analytics', 'view')
  async getAnalytics(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAdvancedAnalytics(period || '30d', startDate, endDate);
  }

  // ─── ADMIN USERS MANAGEMENT (Requirement 2.1) ───────────────────────────────
  @Get('users')
  @RequirePermission('admin_users', 'view')
  async listUsers() {
    return this.adminService.listAdminUsers();
  }

  @Get('users/:id')
  @RequirePermission('admin_users', 'view')
  async getUser(@Param('id') id: string) {
    return this.adminService.getAdminUser(id);
  }

  @Post('users')
  @RequirePermission('admin_users', 'create')
  async createUser(@Body() body: AdminUserDto, @Request() req: any) {
    return this.adminService.createAdminUser(body, req.user);
  }

  @Put('users/:id')
  @RequirePermission('admin_users', 'edit')
  async updateUser(@Param('id') id: string, @Body() body: Partial<AdminUserDto>, @Request() req: any) {
    return this.adminService.updateAdminUser(id, body, req.user);
  }

  @Delete('users/:id')
  @RequirePermission('admin_users', 'delete')
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    return this.adminService.deleteAdminUser(id, req.user);
  }

  @Patch('users/:id/status')
  @RequirePermission('admin_users', 'edit')
  async patchUserStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @Request() req: any,
  ) {
    return this.adminService.updateAdminUser(id, { status }, req.user);
  }

  @Put('users/:id/status')
  @RequirePermission('admin_users', 'edit')
  async putUserStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @Request() req: any,
  ) {
    return this.adminService.updateAdminUser(id, { status }, req.user);
  }

  @Post('users/:id/reset-password')
  @RequirePermission('admin_users', 'edit')
  async resetPassword(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const pass = body.password || body.new_password;
    const forceChange = body.force_change ?? true;
    return this.adminService.resetAdminPassword(id, pass, forceChange, req.user);
  }

  @Post('users/:id/revoke-sessions')
  @RequirePermission('admin_users', 'manage')
  async revokeSessions(@Param('id') id: string, @Request() req: any) {
    return this.adminService.revokeAdminSessions(id, req.user);
  }

  // ─── ROLES & PERMISSIONS (Requirement 2.2 & 2.3) ────────────────────────────
  @Get('roles/modules')
  @RequirePermission('roles_permissions', 'view')
  async getModulesCatalog() {
    return this.adminService.getModulesCatalog();
  }

  @Get('roles')
  @RequirePermission('roles_permissions', 'view')
  async listRoles() {
    return this.adminService.listRoles();
  }

  @Get('roles/:id')
  @RequirePermission('roles_permissions', 'view')
  async getRole(@Param('id') id: string) {
    return this.adminService.getRole(id);
  }

  @Post('roles')
  @RequirePermission('roles_permissions', 'create')
  async createRole(@Body() body: any, @Request() req: any) {
    return this.adminService.createRole(body, req.user);
  }

  @Put('roles/:id')
  @RequirePermission('roles_permissions', 'edit')
  async updateRole(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.adminService.updateRole(id, body, req.user);
  }

  @Delete('roles/:id')
  @RequirePermission('roles_permissions', 'delete')
  async deleteRole(@Param('id') id: string, @Request() req: any) {
    return this.adminService.deleteRole(id, req.user);
  }

  // ─── APPROVAL WORKFLOWS & MANAGEMENT (Requirement 2.4 & 2.5) ───────────────
  @Get('approvals/config')
  @RequirePermission('approvals', 'view')
  async getApprovalConfigs() {
    return this.adminService.getApprovalConfigs();
  }

  @Put('approvals/config/:id')
  @RequirePermission('approvals', 'manage')
  async updateApprovalConfig(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.adminService.updateApprovalConfig(id, body, req.user);
  }

  @Get('approvals')
  @RequirePermission('approvals', 'view')
  async listApprovals(@Query() query: any) {
    return this.adminService.listApprovals(query);
  }

  @Get('approvals/:id')
  @RequirePermission('approvals', 'view')
  async getApproval(@Param('id') id: string) {
    return this.adminService.getApproval(id);
  }

  @Post('approvals/:id/approve')
  @RequirePermission('approvals', 'approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    return this.adminService.approveSubmission(id, req.user);
  }

  @Post('approvals/:id/reject')
  @RequirePermission('approvals', 'reject')
  async reject(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    return this.adminService.rejectSubmission(id, reason, req.user);
  }

  // ─── ADMIN ORDER CREATION & DELETION (Requirement 11) ───────────────────────
  @Post('orders/create')
  @RequirePermission('orders', 'create')
  async createOrder(@Body() body: any, @Request() req: any) {
    return this.adminService.createAdminOrder(body, req.user);
  }

  @Delete('orders/:id')
  @RequirePermission('orders', 'delete')
  async deleteOrder(
    @Param('id') id: string,
    @Query('restock') restock: string,
    @Request() req: any,
  ) {
    return this.adminService.deleteOrder(id, req.user, restock !== 'false');
  }

  // ─── CUSTOMER ANALYTICS & MANAGEMENT (Requirements 2.A - 2.E) ───────────────
  @Get('customers/analytics')
  @RequirePermission('customers', 'view')
  async getCustomerAnalytics() {
    return this.adminService.getCustomerAnalytics();
  }

  @Get('customers')
  @RequirePermission('customers', 'view')
  async listCustomers(@Query() query: any) {
    return this.adminService.listCustomers(query);
  }

  @Get('customers/:id')
  @RequirePermission('customers', 'view')
  async getCustomerDetails(@Param('id') id: string) {
    return this.adminService.getCustomerDetails(id);
  }

  @Put('customers/:id/status')
  @RequirePermission('customers', 'edit')
  async updateCustomerStatus(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'suspended',
    @Request() req: any,
  ) {
    return this.adminService.updateCustomerStatus(id, status, req.user);
  }

  // ─── STORE SETTINGS & CR NUMBER (Requirement 7) ─────────────────────────────
  @Get('settings')
  @RequirePermission('settings', 'view')
  async getSettings() {
    return this.adminService.getStoreSettings();
  }

  @Put('settings')
  @RequirePermission('settings', 'edit')
  async updateSettings(@Body() body: any, @Request() req: any) {
    return this.adminService.updateStoreSettings(body, req.user);
  }

  // ─── AUDIT TRAIL (Requirement 2.6) ──────────────────────────────────────────
  @Get('audit-logs')
  @RequirePermission('audit_logs', 'view')
  async getAuditLogs(@Query() query: any) {
    return this.auditService.list(query);
  }
}
