import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { FirestoreService } from '../firebase/firestore.service';
import { AuditService } from './audit/audit.service';
import { SYSTEM_DEFAULT_ROLES, ADMIN_MODULES } from './rbac/permissions';
import { CartService } from '../cart/cart.service';

export interface AdminUserDto {
  username: string;
  password?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role_ids: string[];
  status?: 'active' | 'deactivated' | 'suspended';
}

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly auditService: AuditService,
    private readonly cartService: CartService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultRolesAndAdmin();
    await this.seedDefaultApprovalConfigs();
    await this.seedStoreSettings();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEEDING
  // ═══════════════════════════════════════════════════════════════════════════
  async seedDefaultRolesAndAdmin() {
    try {
      // 1. Seed system default roles into 'admin_roles'
      for (const role of SYSTEM_DEFAULT_ROLES) {
        const docRef = this.firestore.collection('admin_roles').doc(role.id);
        const doc = await docRef.get();
        if (!doc.exists) {
          await docRef.set({
            ...role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          this.logger.log(`Seeded system role: ${role.name}`);
        }
      }

      // 2. Ensure primary super administrator in 'admin_users'
      const adminDoc = this.firestore.collection('admin_users').doc('admin');
      const snap = await adminDoc.get();
      if (!snap.exists) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        await adminDoc.set({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@marjaah.qa',
          first_name: 'Primary',
          last_name: 'Administrator',
          phone: '+974 7799 1013',
          role_ids: ['super_admin'],
          roles: ['Super Administrator'],
          status: 'active',
          is_superuser: true,
          is_staff: true,
          force_password_change: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        this.logger.log('Primary super administrator seeded in "admin_users"');
      }
    } catch (e: any) {
      this.logger.warn(`Could not seed default roles and admin: ${e.message}`);
    }
  }

  async seedDefaultApprovalConfigs() {
    try {
      const snap = await this.firestore.collection('approval_configs').limit(1).get();
      if (snap.empty) {
        const defaultConfigs = [
          { id: 'products_create', module: 'products', operation: 'create', label: 'Product Creation', requires_approval: false, approver_roles: ['super_admin', 'product_manager'] },
          { id: 'products_edit', module: 'products', operation: 'edit', label: 'Product Price/Stock/Details Modification', requires_approval: false, approver_roles: ['super_admin', 'product_manager'] },
          { id: 'products_delete', module: 'products', operation: 'delete', label: 'Product Deletion', requires_approval: true, approver_roles: ['super_admin'] },
          { id: 'banners_create', module: 'banners', operation: 'create', label: 'Hero Banner Creation', requires_approval: false, approver_roles: ['super_admin', 'content_manager'] },
          { id: 'banners_edit', module: 'banners', operation: 'edit', label: 'Hero Banner Content Updates', requires_approval: false, approver_roles: ['super_admin', 'content_manager'] },
          { id: 'website_content_create', module: 'website_content', operation: 'create', label: 'Promotional Section Creation', requires_approval: false, approver_roles: ['super_admin', 'content_manager'] },
          { id: 'website_content_edit', module: 'website_content', operation: 'edit', label: 'Promotional Section Modification', requires_approval: false, approver_roles: ['super_admin', 'content_manager'] },
          { id: 'categories_create', module: 'categories', operation: 'create', label: 'Category Creation', requires_approval: false, approver_roles: ['super_admin'] },
          { id: 'categories_delete', module: 'categories', operation: 'delete', label: 'Category Deletion', requires_approval: true, approver_roles: ['super_admin'] },
          { id: 'orders_edit', module: 'orders', operation: 'edit', label: 'Order Status & Cancellation Overrides', requires_approval: false, approver_roles: ['super_admin', 'order_manager'] },
        ];

        for (const cfg of defaultConfigs) {
          await this.firestore.collection('approval_configs').doc(cfg.id).set({
            ...cfg,
            updated_at: new Date().toISOString(),
          });
        }
        this.logger.log('Seeded default approval workflow configurations');
      }
    } catch (e: any) {
      this.logger.warn(`Could not seed approval configs: ${e.message}`);
    }
  }

  async seedStoreSettings() {
    try {
      const docRef = this.firestore.collection('settings').doc('store_info');
      const snap = await docRef.get();
      if (!snap.exists) {
        await docRef.set({
          store_name: 'MARJAAH TRADING WLL',
          trade_name: 'M.SHOP Qatar',
          cr_number: '228717',
          country: 'Qatar',
          city: 'Doha',
          address: 'Building 42, Al Mirqab Al Jadeed St, Al Sadd, Doha, Qatar',
          phone: '+974 7799 1013',
          whatsapp: '+974 7799 1013',
          email: 'support@marjaah.qa',
          admin_email: 'admin@marjaah.qa',
          footer_cr_text: 'CR No. 228717 • Qatar',
          currency: 'QAR',
          free_shipping: true,
          store_pickup_enabled: true,
          updated_at: new Date().toISOString(),
        });
        this.logger.log('Seeded default store settings & CR number');
      }
    } catch (e: any) {
      this.logger.warn(`Could not seed store settings: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ADMIN USER MANAGEMENT (Requirement 2.1)
  // ═══════════════════════════════════════════════════════════════════════════
  async listAdminUsers() {
    const snap = await this.firestore.collection('admin_users').get();
    const users: any[] = snap.docs.map((d) => {
      const data = d.data();
      const { password, ...safeUser } = data;
      return { id: d.id, ...safeUser };
    });

    // Also include 'admin' from admin_credentials if missing
    if (!users.some((u) => u.username === 'admin')) {
      const credSnap = await this.firestore.collection('admin_credentials').doc('admin').get();
      if (credSnap.exists) {
        const d = credSnap.data() || {};
        users.unshift({
          id: 'admin',
          username: 'admin',
          email: d.email || 'admin@marjaah.qa',
          first_name: d.first_name || 'Primary',
          last_name: d.last_name || 'Administrator',
          phone: '+974 7799 1013',
          role_ids: ['super_admin'],
          roles: ['Super Administrator'],
          status: 'active',
          is_superuser: true,
        });
      }
    }

    return users;
  }

  async getAdminUser(id: string) {
    const doc = await this.firestore.collection('admin_users').doc(id).get();
    if (!doc.exists) {
      if (id === 'admin') {
        return {
          id: 'admin',
          username: 'admin',
          email: 'admin@marjaah.qa',
          first_name: 'Primary',
          last_name: 'Administrator',
          role_ids: ['super_admin'],
          roles: ['Super Administrator'],
          status: 'active',
          is_superuser: true,
        };
      }
      throw new NotFoundException(`Admin user "${id}" not found`);
    }

    const { password, ...safeUser } = doc.data() as any;

    // Fetch recent audit logs for this admin
    const auditSnap = await this.firestore.collection('audit_logs')
      .where('admin_id', '==', id)
      .limit(20)
      .get();
    const recentActivity = auditSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    recentActivity.sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    return {
      id: doc.id,
      ...safeUser,
      activity: recentActivity,
    };
  }

  async getCurrentStaffProfile(currentUser: any) {
    const adminId = String(currentUser?.id || currentUser?.sub || 'admin').trim();
    let userDoc = await this.firestore.collection('admin_users').doc(adminId).get();
    if (!userDoc.exists) {
      userDoc = await this.firestore.collection('admin_credentials').doc(adminId).get();
    }
    if (!userDoc.exists) {
      userDoc = await this.firestore.collection('users').doc(adminId).get();
    }

    let userData: any = userDoc.exists ? userDoc.data() : { ...currentUser };
    const { password, raw_password, ...safeUser } = userData;
    safeUser.id = adminId;
    safeUser.username = safeUser.username || currentUser?.username || 'admin';
    safeUser.email = safeUser.email || currentUser?.email || 'admin@marjaah.qa';
    safeUser.name = `${safeUser.first_name || ''} ${safeUser.last_name || ''}`.trim() || safeUser.username;

    if (
      safeUser.username === 'admin' ||
      currentUser?.is_superuser ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'super_admin'
    ) {
      safeUser.is_superuser = true;
      safeUser.is_staff = true;
      safeUser.status = 'active';
    }

    // Resolve role details & permissions
    let roleData: any = null;
    const roleId =
      (Array.isArray(safeUser.role_ids) && safeUser.role_ids[0]) ||
      safeUser.role_id ||
      safeUser.role ||
      'super_admin';

    if (safeUser.is_superuser || roleId === 'super_admin' || roleId === 'admin') {
      const superRole = SYSTEM_DEFAULT_ROLES.find((r) => r.id === 'super_admin');
      roleData = superRole || {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Full unconstrained system authority',
        permissions: {},
      };
    } else {
      const roleDoc = await this.firestore.collection('admin_roles').doc(roleId).get();
      if (roleDoc.exists) {
        roleData = { id: roleDoc.id, ...roleDoc.data() };
      } else {
        const sysRole = SYSTEM_DEFAULT_ROLES.find((r) => r.id === roleId);
        roleData = sysRole || { id: roleId, name: 'Staff', permissions: {} };
      }
    }

    return {
      success: true,
      user: safeUser,
      role: roleData,
    };
  }

  async createAdminUser(dto: AdminUserDto, currentAdmin: any) {
    if (!dto.username || !dto.password || !dto.email) {
      throw new BadRequestException('Username, password, and email are required');
    }

    const username = dto.username.toLowerCase().trim();
    const email = dto.email.toLowerCase().trim();

    // Check if username already exists in admin_users or admin_credentials
    const existingSnap = await this.firestore.collection('admin_users')
      .where('username', '==', username)
      .limit(1)
      .get();
    if (!existingSnap.empty || username === 'admin') {
      throw new BadRequestException(`Admin username "${username}" is already taken`);
    }

    const existingEmailSnap = await this.firestore.collection('admin_users')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (!existingEmailSnap.empty) {
      throw new BadRequestException(`Email "${email}" is already in use by another admin user`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const now = new Date().toISOString();

    // Resolve role names
    const roleIds = Array.isArray(dto.role_ids) && dto.role_ids.length > 0 ? dto.role_ids : ['customer_support'];
    const rolesSnap = await this.firestore.collection('admin_roles').get();
    const allRoles = rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    const roleNames = roleIds.map((rid) => {
      const found = allRoles.find((r) => r.id === rid || r.slug === rid) || SYSTEM_DEFAULT_ROLES.find((r) => r.id === rid);
      return found ? found.name : rid;
    });

    const payload = {
      username,
      email,
      password: hashedPassword,
      first_name: dto.first_name || '',
      last_name: dto.last_name || '',
      phone: dto.phone || '',
      role_ids: roleIds,
      roles: roleNames,
      status: dto.status || 'active',
      is_staff: true,
      is_superuser: roleIds.includes('super_admin'),
      force_password_change: false,
      created_by: currentAdmin?.username || 'admin',
      created_at: now,
      updated_at: now,
      last_login_at: null,
      last_login_ip: null,
      session_revoked_at: null,
    };

    const docRef = await this.firestore.collection('admin_users').add(payload);

    // Also mirror to admin_credentials for backward compatibility
    await this.firestore.collection('admin_credentials').doc(username).set({
      username,
      email,
      password: hashedPassword,
      first_name: dto.first_name || '',
      last_name: dto.last_name || '',
      role: 'admin',
      is_staff: true,
      is_superuser: payload.is_superuser,
      created_at: now,
      updated_at: now,
    });

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'create',
      module: 'admin_users',
      target_id: docRef.id,
      target_title: `${username} (${email})`,
      details: { role_ids: roleIds, roles: roleNames, status: payload.status },
    });

    const { password, ...safeUser } = payload;
    return { id: docRef.id, ...safeUser };
  }

  async updateAdminUser(id: string, dto: Partial<AdminUserDto>, currentAdmin: any) {
    // Protect primary admin from demotion or deactivation
    if (id === 'admin') {
      if (dto.status && dto.status !== 'active') {
        throw new ForbiddenException('The primary administrator account cannot be deactivated or suspended.');
      }
      if (dto.role_ids && !dto.role_ids.includes('super_admin')) {
        throw new ForbiddenException('The primary administrator must retain the Super Administrator role.');
      }
    }

    const docRef = this.firestore.collection('admin_users').doc(id);
    const existing = await docRef.get();
    if (!existing.exists && id !== 'admin') {
      throw new NotFoundException(`Admin user "${id}" not found`);
    }

    const existingData = existing.exists ? existing.data() : { username: 'admin', email: 'admin@marjaah.qa' };

    // Prevent non-superadmins from modifying their own roles or privileges
    if (String(currentAdmin.id) === id && !currentAdmin.is_superuser && dto.role_ids) {
      throw new ForbiddenException('You cannot modify your own administrative roles or permissions.');
    }

    const now = new Date().toISOString();
    const updateData: any = {
      updated_at: now,
    };

    if (dto.email) updateData.email = dto.email.toLowerCase().trim();
    if (dto.first_name !== undefined) updateData.first_name = dto.first_name;
    if (dto.last_name !== undefined) updateData.last_name = dto.last_name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.status) updateData.status = dto.status;

    if (dto.role_ids) {
      updateData.role_ids = dto.role_ids;
      updateData.is_superuser = dto.role_ids.includes('super_admin');

      const rolesSnap = await this.firestore.collection('admin_roles').get();
      const allRoles = rolesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      updateData.roles = dto.role_ids.map((rid) => {
        const found = allRoles.find((r) => r.id === rid || r.slug === rid) || SYSTEM_DEFAULT_ROLES.find((r) => r.id === rid);
        return found ? found.name : rid;
      });
    }

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    await docRef.set(updateData, { merge: true });

    // Update admin_credentials mirror if exists
    if (existingData?.username) {
      await this.firestore.collection('admin_credentials').doc(existingData.username).set({
        ...updateData,
        role: 'admin',
        is_staff: true,
      }, { merge: true });
    }

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'edit',
      module: 'admin_users',
      target_id: id,
      target_title: existingData?.username || id,
      details: { before: existingData, after: updateData },
    });

    const { password, ...safeUser } = { ...existingData, ...updateData };
    return { id, ...safeUser };
  }

  async deleteAdminUser(id: string, currentAdmin: any) {
    if (id === 'admin') {
      throw new ForbiddenException('The primary administrator account cannot be deleted.');
    }

    const docRef = this.firestore.collection('admin_users').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Admin user "${id}" not found`);
    }

    const data = existing.data() as any;
    if (data?.is_superuser && String(currentAdmin.id) !== 'admin') {
      throw new ForbiddenException('Only the primary super administrator can delete a superuser account.');
    }

    await docRef.delete();
    if (data?.username) {
      await this.firestore.collection('admin_credentials').doc(data.username).delete().catch(() => {});
    }

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'delete',
      module: 'admin_users',
      target_id: id,
      target_title: data?.username || id,
    });

    return { success: true, message: `Admin account "${data?.username || id}" deleted permanently.` };
  }

  async resetAdminPassword(id: string, newPassword: string, forceChange = false, currentAdmin: any) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const docRef = this.firestore.collection('admin_users').doc(id);
    const existing = await docRef.get();
    if (!existing.exists && id !== 'admin') {
      throw new NotFoundException(`Admin user "${id}" not found`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    const updatePayload: any = {
      password: hashedPassword,
      force_password_change: Boolean(forceChange),
      updated_at: now,
      session_revoked_at: now, // immediately invalidate old tokens
    };

    await docRef.set(updatePayload, { merge: true });

    const username = existing.exists ? existing.data()?.username : 'admin';
    if (username) {
      await this.firestore.collection('admin_credentials').doc(username).set({
        password: hashedPassword,
        raw_password: newPassword,
        updated_at: now,
      }, { merge: true });
    }

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'reset_password',
      module: 'admin_users',
      target_id: id,
      target_title: username,
      details: { force_password_change: forceChange },
    });

    return { success: true, message: `Password reset successfully for ${username}. Active sessions revoked.` };
  }

  async revokeAdminSessions(id: string, currentAdmin: any) {
    const docRef = this.firestore.collection('admin_users').doc(id);
    const existing = await docRef.get();
    if (!existing.exists && id !== 'admin') {
      throw new NotFoundException(`Admin user "${id}" not found`);
    }

    const now = new Date().toISOString();
    await docRef.set({ session_revoked_at: now, updated_at: now }, { merge: true });

    const username = existing.exists ? existing.data()?.username : 'admin';

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'revoke_sessions',
      module: 'admin_users',
      target_id: id,
      target_title: username,
    });

    return { success: true, message: `All active sessions revoked for ${username}.` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CUSTOM ROLE CREATION & PERMISSION MATRIX (Requirement 2.2 & 2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  async getModulesCatalog() {
    return ADMIN_MODULES;
  }

  async listRoles() {
    const snap = await this.firestore.collection('admin_roles').get();
    const customRoles = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    // Combine with system defaults if any missing
    const roleMap = new Map<string, any>();
    for (const r of SYSTEM_DEFAULT_ROLES) {
      roleMap.set(r.id, r);
    }
    for (const r of customRoles) {
      roleMap.set(r.id, r);
    }

    return Array.from(roleMap.values());
  }

  async getRole(id: string) {
    const doc = await this.firestore.collection('admin_roles').doc(id).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    const system = SYSTEM_DEFAULT_ROLES.find((r) => r.id === id);
    if (system) {
      return system;
    }
    throw new NotFoundException(`Role "${id}" not found`);
  }

  async createRole(dto: { name: string; description?: string; permissions: Record<string, string[]> }, currentAdmin: any) {
    if (!dto.name) {
      throw new BadRequestException('Role name is required');
    }

    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const snap = await this.firestore.collection('admin_roles').doc(slug).get();
    if (snap.exists || SYSTEM_DEFAULT_ROLES.some((r) => r.id === slug)) {
      throw new BadRequestException(`Role with slug "${slug}" already exists`);
    }

    const now = new Date().toISOString();
    const payload = {
      name: dto.name,
      slug,
      description: dto.description || '',
      permissions: dto.permissions || {},
      is_system: false,
      created_by: currentAdmin.username || 'admin',
      created_at: now,
      updated_at: now,
    };

    await this.firestore.collection('admin_roles').doc(slug).set(payload);

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'create',
      module: 'roles_permissions',
      target_id: slug,
      target_title: dto.name,
      details: payload,
    });

    return { id: slug, ...payload };
  }

  async updateRole(id: string, dto: { name?: string; description?: string; permissions?: Record<string, string[]> }, currentAdmin: any) {
    if (id === 'super_admin') {
      throw new ForbiddenException('Super Administrator master role permissions are permanent and cannot be modified.');
    }

    const docRef = this.firestore.collection('admin_roles').doc(id);
    const existing = await docRef.get();

    const now = new Date().toISOString();
    const updateData: any = {
      ...dto,
      updated_at: now,
    };

    await docRef.set(updateData, { merge: true });

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'edit',
      module: 'roles_permissions',
      target_id: id,
      target_title: dto.name || id,
      details: { before: existing.data(), after: updateData },
    });

    return { id, ...(existing.data() || {}), ...updateData };
  }

  async deleteRole(id: string, currentAdmin: any) {
    if (id === 'super_admin' || SYSTEM_DEFAULT_ROLES.some((r) => r.id === id && r.is_system)) {
      throw new ForbiddenException('Built-in system roles cannot be deleted.');
    }

    const docRef = this.firestore.collection('admin_roles').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new NotFoundException(`Role "${id}" not found`);
    }

    const name = existing.data()?.name || id;
    await docRef.delete();

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'delete',
      module: 'roles_permissions',
      target_id: id,
      target_title: name,
    });

    return { success: true, message: `Role "${name}" deleted successfully.` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. INDEPENDENT APPROVAL REQUIREMENTS & MANAGEMENT (Requirement 2.4 & 2.5)
  // ═══════════════════════════════════════════════════════════════════════════
  async getApprovalConfigs() {
    const snap = await this.firestore.collection('approval_configs').get();
    const configs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    return configs;
  }

  async isApprovalRequired(module: string, operation: string): Promise<boolean> {
    try {
      const configDoc = await this.firestore.collection('approval_configs').doc(`${module}_${operation}`).get();
      if (configDoc.exists) {
        return Boolean(configDoc.data()?.requires_approval);
      }
      return false;
    } catch {
      return false;
    }
  }

  async updateApprovalConfig(id: string, dto: { requires_approval: boolean; approver_roles?: string[] }, currentAdmin: any) {
    const docRef = this.firestore.collection('approval_configs').doc(id);
    const existing = await docRef.get();

    const now = new Date().toISOString();
    const updateData = {
      requires_approval: Boolean(dto.requires_approval),
      ...(dto.approver_roles ? { approver_roles: dto.approver_roles } : {}),
      updated_at: now,
      updated_by: currentAdmin.username || 'admin',
    };

    await docRef.set(updateData, { merge: true });

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'edit',
      module: 'approvals',
      target_id: id,
      target_title: `Workflow: ${id}`,
      details: { requires_approval: dto.requires_approval, approver_roles: dto.approver_roles },
    });

    return { id, ...(existing.data() || {}), ...updateData };
  }

  async createApprovalSubmission(submission: {
    module: string;
    operation: 'create' | 'edit' | 'delete';
    target_id: string;
    target_title: string;
    payload: any;
    original_data?: any;
    submitted_by: { id: string; username: string; email?: string };
  }) {
    const now = new Date().toISOString();
    const entry = {
      module: submission.module,
      operation: submission.operation,
      target_id: submission.target_id,
      target_title: submission.target_title,
      payload: submission.payload,
      original_data: submission.original_data || null,
      status: 'pending',
      submitted_by: submission.submitted_by,
      submitted_at: now,
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      history: [
        {
          action: 'submitted',
          by: submission.submitted_by.username,
          at: now,
          note: `Submitted ${submission.operation} request for ${submission.module} item "${submission.target_title}"`,
        },
      ],
      created_at: now,
      updated_at: now,
    };

    const docRef = await this.firestore.collection('approvals').add(entry);

    await this.auditService.log({
      admin_id: submission.submitted_by.id,
      admin_username: submission.submitted_by.username,
      action: 'submit_approval',
      module: submission.module,
      target_id: submission.target_id,
      target_title: submission.target_title,
      details: { approval_id: docRef.id, operation: submission.operation },
    });

    return { id: docRef.id, ...entry };
  }

  async listApprovals(query: { status?: string; module?: string; page?: number; limit?: number } = {}) {
    const snap = await this.firestore.collection('approvals').get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    if (query.status && query.status !== 'all') {
      items = items.filter((i) => i.status === query.status);
    }
    if (query.module && query.module !== 'all') {
      items = items.filter((i) => i.module === query.module);
    }

    items.sort((a, b) => new Date(b.submitted_at || b.created_at || 0).getTime() - new Date(a.submitted_at || a.created_at || 0).getTime());

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const total = items.length;
    const offset = (page - 1) * limit;

    return {
      items: items.slice(offset, offset + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      counts: {
        pending: items.filter((i) => i.status === 'pending').length,
        approved: items.filter((i) => i.status === 'approved').length,
        rejected: items.filter((i) => i.status === 'rejected').length,
        total,
      },
    };
  }

  async getApproval(id: string) {
    const doc = await this.firestore.collection('approvals').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Approval submission "${id}" not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async approveSubmission(id: string, currentAdmin: any) {
    const docRef = this.firestore.collection('approvals').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Approval submission "${id}" not found`);
    }

    const data = doc.data() as any;
    if (data.status !== 'pending') {
      throw new BadRequestException(`Submission is already in status "${data.status}"`);
    }

    const now = new Date().toISOString();
    const reviewer = {
      id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      username: currentAdmin.username || 'admin',
      email: currentAdmin.email || 'admin@marjaah.qa',
    };

    // 1. Apply approved changes to the underlying target collection!
    const targetColl = data.module === 'website_content' ? 'promotional_sections' : data.module;
    const targetDocRef = this.firestore.collection(targetColl).doc(data.target_id);

    if (data.operation === 'create') {
      await targetDocRef.set({
        ...data.payload,
        status: 'active',
        is_active: data.payload.is_active !== undefined ? data.payload.is_active : true,
        approved_at: now,
        approved_by: reviewer.username,
        updated_at: now,
      }, { merge: true });
    } else if (data.operation === 'edit') {
      await targetDocRef.set({
        ...data.payload,
        approved_at: now,
        approved_by: reviewer.username,
        updated_at: now,
      }, { merge: true });
    } else if (data.operation === 'delete') {
      if (data.module === 'orders' && data.payload?.restock !== false && data.original_data?.status !== 'cancelled' && Array.isArray(data.original_data?.items)) {
        for (const item of data.original_data.items) {
          try {
            const pid = item.id || item.product_id;
            if (pid) {
              const prodRef = this.firestore.collection('products').doc(pid);
              const prodDoc = await prodRef.get();
              if (prodDoc.exists) {
                const currentStock = Number(prodDoc.data()?.stock_count) || 0;
                const qty = Number(item.quantity) || 1;
                await prodRef.update({
                  stock_count: currentStock + qty,
                  in_stock: true,
                  updated_at: now,
                });
              }
            }
          } catch (e) {}
        }
      }
      await targetDocRef.delete();
    }

    // 2. Update approval record
    const history = Array.isArray(data.history) ? data.history : [];
    history.push({
      action: 'approved',
      by: reviewer.username,
      at: now,
      note: 'Changes verified and published to production store.',
    });

    const updatePayload = {
      status: 'approved',
      reviewed_by: reviewer,
      reviewed_at: now,
      history,
      updated_at: now,
    };

    await docRef.update(updatePayload);

    await this.auditService.log({
      admin_id: reviewer.id,
      admin_username: reviewer.username,
      action: 'approve',
      module: 'approvals',
      target_id: id,
      target_title: data.target_title,
      details: { module: data.module, operation: data.operation, target_id: data.target_id },
    });

    return { id, ...data, ...updatePayload };
  }

  async rejectSubmission(id: string, reason: string, currentAdmin: any) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A clear rejection reason must be provided');
    }

    const docRef = this.firestore.collection('approvals').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Approval submission "${id}" not found`);
    }

    const data = doc.data() as any;
    if (data.status !== 'pending') {
      throw new BadRequestException(`Submission is already in status "${data.status}"`);
    }

    const now = new Date().toISOString();
    const reviewer = {
      id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      username: currentAdmin.username || 'admin',
      email: currentAdmin.email || 'admin@marjaah.qa',
    };

    // If it was a pending product creation, mark target product status as 'rejected'
    if (data.operation === 'create') {
      const targetColl = data.module === 'website_content' ? 'promotional_sections' : data.module;
      const targetDocRef = this.firestore.collection(targetColl).doc(data.target_id);
      await targetDocRef.set({
        status: 'rejected',
        is_active: false,
        rejection_reason: reason.trim(),
        rejected_at: now,
        rejected_by: reviewer.username,
        updated_at: now,
      }, { merge: true }).catch(() => {});
    }

    const history = Array.isArray(data.history) ? data.history : [];
    history.push({
      action: 'rejected',
      by: reviewer.username,
      at: now,
      reason: reason.trim(),
    });

    const updatePayload = {
      status: 'rejected',
      rejection_reason: reason.trim(),
      reviewed_by: reviewer,
      reviewed_at: now,
      history,
      updated_at: now,
    };

    await docRef.update(updatePayload);

    await this.auditService.log({
      admin_id: reviewer.id,
      admin_username: reviewer.username,
      action: 'reject',
      module: 'approvals',
      target_id: id,
      target_title: data.target_title,
      details: { reason: reason.trim(), module: data.module, operation: data.operation },
    });

    return { id, ...data, ...updatePayload };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ADVANCED ADMIN DASHBOARD & ANALYTICS (Requirement 10)
  // ═══════════════════════════════════════════════════════════════════════════
  private cachedDashboardAnalytics: Record<string, any> = {};
  private dashboardCacheExpiresAt = 0;
  private readonly DASHBOARD_CACHE_TTL_MS = 25 * 1000; // 25s fast in-memory cache

  public invalidateDashboardCache() {
    this.cachedDashboardAnalytics = {};
    this.dashboardCacheExpiresAt = 0;
  }

  async getDashboardStats() {
    return this.getAdvancedAnalytics('30d');
  }

  async getAdvancedAnalytics(period = '30d', customStart?: string, customEnd?: string) {
    const now = Date.now();
    const cacheKey = `${period}_${customStart || ''}_${customEnd || ''}`;
    if (this.cachedDashboardAnalytics[cacheKey] && now < this.dashboardCacheExpiresAt) {
      return this.cachedDashboardAnalytics[cacheKey];
    }

    // 1. Hydrate products from local disk cache (< 5ms) to avoid downloading 1,385 docs
    let allProducts: any[] = [];
    try {
      const prodCache = path.resolve(process.cwd(), '.products-cache.json');
      if (fs.existsSync(prodCache)) {
        allProducts = JSON.parse(fs.readFileSync(prodCache, 'utf-8'));
      }
    } catch (_) {}

    const promises: Promise<any>[] = [
      this.firestore.collection('orders').get(),
      this.firestore.collection('users').get(),
      this.firestore.collection('categories').get(),
      this.firestore.collection('brands').get(),
      this.firestore.collection('contact_messages').get(),
    ];
    if (allProducts.length === 0) {
      promises.push(this.firestore.collection('products').get());
    }

    const snaps = await Promise.all(promises);
    const ordersSnap = snaps[0];
    const usersSnap = snaps[1];
    const categoriesSnap = snaps[2];
    const brandsSnap = snaps[3];
    const messagesSnap = snaps[4];
    if (snaps[5]) {
      allProducts = snaps[5].docs.map((d: any) => ({ id: d.id, ...d.data() }));
    }

    const allOrders = ordersSnap.docs.map((d: any) => {
      const data = d.data() || {};
      const createdAtRaw = data.created_at || data.createdAt;
      let createdAtIso = new Date().toISOString();
      if (createdAtRaw) {
        if (typeof createdAtRaw === 'string') createdAtIso = createdAtRaw;
        else if (createdAtRaw._seconds) createdAtIso = new Date(createdAtRaw._seconds * 1000).toISOString();
      }
      return {
        id: d.id,
        ...data,
        created_at: createdAtIso,
        total: Number(data.total || data.subtotal || 0),
      } as any;
    });
    const allUsers = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));

    // Sort orders newest first
    allOrders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    // 2. Filter orders by date range
    let daysCount = 30;
    if (period === '7d') daysCount = 7;
    else if (period === 'today') daysCount = 1;
    else if (period === '90d') daysCount = 90;
    else if (period === 'year') daysCount = 365;

    const periodStart = customStart ? new Date(customStart).getTime() : now - daysCount * 24 * 60 * 60 * 1000;
    const periodEnd = customEnd ? new Date(customEnd).getTime() : now;

    // Previous comparison period
    const periodDuration = periodEnd - periodStart;
    const prevStart = periodStart - periodDuration;
    const prevEnd = periodStart;

    const periodOrders = allOrders.filter((o) => {
      const t = new Date(o.created_at || 0).getTime();
      return t >= periodStart && t <= periodEnd;
    });

    const prevOrders = allOrders.filter((o) => {
      const t = new Date(o.created_at || 0).getTime();
      return t >= prevStart && t < prevEnd;
    });

    // 3. Financial metrics
    const validOrders = allOrders.filter((o) => ['placed', 'processing', 'shipped', 'delivered', 'completed'].includes(o.status));
    const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const periodValidOrders = periodOrders.filter((o) => ['placed', 'processing', 'shipped', 'delivered', 'completed'].includes(o.status));
    const periodRevenue = periodValidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const prevValidOrders = prevOrders.filter((o) => ['placed', 'processing', 'shipped', 'delivered', 'completed'].includes(o.status));
    const prevRevenue = prevValidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const aov = periodValidOrders.length > 0 ? Math.round((periodRevenue / periodValidOrders.length) * 100) / 100 : 0;
    const prevAov = prevValidOrders.length > 0 ? Math.round((prevRevenue / prevValidOrders.length) * 100) / 100 : 0;

    // Revenue growth percentage
    const revenueGrowth = prevRevenue > 0 ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100) : (periodRevenue > 0 ? 100 : 0);

    // 4. Order statuses breakdown
    const orderStatuses = {
      total: allOrders.length,
      pending: allOrders.filter((o) => o.status === 'placed' || o.status === 'pending').length,
      processing: allOrders.filter((o) => o.status === 'processing').length,
      shipped: allOrders.filter((o) => o.status === 'shipped').length,
      delivered: allOrders.filter((o) => o.status === 'delivered' || o.status === 'completed').length,
      cancelled: allOrders.filter((o) => o.status === 'cancelled').length,
      store_pickup: allOrders.filter((o) => o.fulfillment_type === 'store_pickup' || o.delivery_method === 'pickup').length,
    };

    // 5. Products metrics
    const lowStock = allProducts.filter((p) => {
      const count = Number(p.stock_count);
      return (p.in_stock !== false) && !isNaN(count) && count <= 5;
    });

    const activeProducts = allProducts.filter((p) => p.status !== 'hidden' && p.status !== 'pending_approval');
    const inactiveProducts = allProducts.filter((p) => p.status === 'hidden' || p.status === 'pending_approval' || p.is_active === false);
    const outOfStockProducts = allProducts.filter((p) => p.in_stock === false || Number(p.stock_count) === 0);

    // 6. Customers metrics
    const totalCustomers = allUsers.length;
    const periodNewCustomers = allUsers.filter((u) => {
      const t = new Date(u.created_at || 0).getTime();
      return t >= periodStart && t <= periodEnd;
    }).length;

    // Active customers (placed at least 1 order)
    const customerOrderCounts = new Map<string, number>();
    for (const o of allOrders) {
      const uid = o.user_id || o.userId || o.customer_email || 'guest';
      customerOrderCounts.set(uid, (customerOrderCounts.get(uid) || 0) + 1);
    }
    const activeCustomersCount = customerOrderCounts.size;

    // 7. Time-series Sales & Revenue chart (daily or bucketed)
    const salesTimelineMap = new Map<string, { date: string; revenue: number; orders: number }>();
    const bucketDays = Math.min(daysCount, 60);
    for (let i = bucketDays - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      salesTimelineMap.set(dateKey, { date: dateKey, revenue: 0, orders: 0 });
    }

    for (const o of periodOrders) {
      const dateKey = (o.created_at || '').split('T')[0];
      if (salesTimelineMap.has(dateKey)) {
        const item = salesTimelineMap.get(dateKey)!;
        item.orders += 1;
        if (['placed', 'processing', 'shipped', 'delivered', 'completed'].includes(o.status)) {
          item.revenue += Number(o.total) || 0;
        }
      }
    }

    const salesTimeline = Array.from(salesTimelineMap.values()).map((s) => ({
      ...s,
      revenue: Math.round(s.revenue * 100) / 100,
    }));

    // 8. Best-Selling Products Performance
    const productSalesMap = new Map<string, { id: string; name: string; brand: string; quantity: number; revenue: number; image?: string }>();
    for (const o of allOrders) {
      if (Array.isArray(o.items)) {
        for (const it of o.items) {
          const pid = it.id || it.slug || it.name;
          const curr = productSalesMap.get(pid) || {
            id: pid,
            name: it.name || 'Product',
            brand: it.brand || '',
            quantity: 0,
            revenue: 0,
            image: it.image || '',
          };
          curr.quantity += Number(it.quantity) || 1;
          curr.revenue += (Number(it.price) || 0) * (Number(it.quantity) || 1);
          productSalesMap.set(pid, curr);
        }
      }
    }

    const bestSellers = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 7)
      .map((b) => ({ ...b, revenue: Math.round(b.revenue * 100) / 100 }));

    // 9. Category Distribution
    const catSalesMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const p of allProducts) {
      const c = p.category_name || p.category || 'General';
      const existing = catSalesMap.get(c) || { name: c, count: 0, revenue: 0 };
      existing.count += 1;
      catSalesMap.set(c, existing);
    }
    const categoryDistribution = Array.from(catSalesMap.values()).sort((a, b) => b.count - a.count).slice(0, 8);

    // 10. Traffic Stats from daily analytics
    let trafficSummary: any = { totalViews: 0, totalVisitors: 0, timeline: [] };
    try {
      const dailySnap = await this.firestore.collection('site_analytics_daily').get();
      const dailyDocs = dailySnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      dailyDocs.sort((a, b) => a.date.localeCompare(b.date));
      const recentTraffic = dailyDocs.slice(-daysCount);
      const views = recentTraffic.reduce((sum, d) => sum + (Number(d.total_views) || 0), 0);
      const visitors = recentTraffic.reduce((sum, d) => sum + (Number(d.unique_count) || Math.round((d.total_views || 0) * 0.7)), 0);
      trafficSummary = {
        totalViews: views,
        totalVisitors: visitors,
        timeline: recentTraffic.map((d) => ({ date: d.date, views: d.total_views || 0, visitors: d.unique_count || 0 })),
      };
    } catch {}

    const result = {
      period,
      kpis: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        periodRevenue: Math.round(periodRevenue * 100) / 100,
        revenueGrowth,
        averageOrderValue: aov,
        prevAverageOrderValue: prevAov,
        totalOrders: allOrders.length,
        periodOrdersCount: periodOrders.length,
        totalCustomers,
        newCustomers: periodNewCustomers,
        activeCustomers: activeCustomersCount,
        totalProducts: allProducts.length,
        activeProducts: activeProducts.length,
        inactiveProducts: inactiveProducts.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStockProducts.length,
        totalCategories: categoriesSnap.size,
        totalBrands: brandsSnap.size,
        pendingApprovals: 0,
        pendingPayments: allOrders.filter((o) => o.payment_status === 'pending').reduce((s, o) => s + (Number(o.total) || 0), 0),
      },
      orderStatuses,
      salesTimeline,
      bestSellers,
      categoryDistribution,
      lowStockProducts: lowStock.slice(0, 10),
      recentOrders: allOrders.slice(0, 15),
      traffic: trafficSummary,
      customerMetrics: await this.getCustomerAnalytics(),
    };

    this.cachedDashboardAnalytics[cacheKey] = result;
    this.dashboardCacheExpiresAt = now + this.DASHBOARD_CACHE_TTL_MS;

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CREATE ORDERS DIRECTLY FROM ADMIN PANEL (Requirement 11)
  // ═══════════════════════════════════════════════════════════════════════════
  async createAdminOrder(body: any, currentAdmin: any) {
    const {
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      items,
      fulfillment_type, // 'delivery' | 'store_pickup'
      delivery_address,
      pickup_location_id,
      payment_method,
      payment_status,
      discount_amount,
      notes,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Order must contain at least one product item');
    }

    if (!customer_name || !customer_phone) {
      throw new BadRequestException('Customer name and contact phone number are required');
    }

    // Validate fulfillment details
    let pickupDetails: any = null;
    if (fulfillment_type === 'store_pickup') {
      if (!pickup_location_id) {
        throw new BadRequestException('Store pickup location is required when Store Pickup fulfillment is selected');
      }
      const locDoc = await this.firestore.doc('store_locations', pickup_location_id).get();
      if (!locDoc.exists) {
        throw new BadRequestException('Selected store pickup location does not exist');
      }
      const locData = locDoc.data() || {};
      pickupDetails = {
        location_id: locDoc.id,
        name: locData.name,
        address: locData.address,
        phone: locData.phone,
        opening_hours: locData.opening_hours,
        pickup_instructions: locData.pickup_instructions,
      };
    } else {
      if (!delivery_address || !delivery_address.zone || !delivery_address.city) {
        throw new BadRequestException('Delivery address with Zone and City is required for doorstep delivery');
      }
    }

    // Validate cart items & live stock
    const cartItemsDto = items.map((i: any) => ({
      id: i.id || i.product_id,
      quantity: Math.max(1, Number(i.quantity) || 1),
    }));

    const validatedCart = await this.cartService.validateAndComputeCart(cartItemsDto);
    if (validatedCart.items.length === 0) {
      throw new BadRequestException('None of the selected products could be validated from catalog');
    }

    // Verify stock availability
    for (const item of validatedCart.items) {
      if (item.stock_count !== undefined && item.stock_count !== null && Number(item.stock_count) < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${item.name}". Available: ${item.stock_count}, Requested: ${item.quantity}`);
      }
    }

    // Calculate totals
    const subtotal = validatedCart.subtotal;
    const discount = Math.max(0, Number(discount_amount) || 0);
    const shipping = 0; // Free delivery or 0 for store pickup
    const grandTotal = Math.max(0, subtotal - discount + shipping);

    // Generate unique order number
    const countSnap = await this.firestore.collection('orders').get();
    const orderIndex = countSnap.size + 1;
    const orderNumber = `MTQ-${String(orderIndex).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const orderRecord = {
      order_number: orderNumber,
      user_id: customer_id ? String(customer_id) : null,
      userId: customer_id ? String(customer_id) : null,
      customer_name: customer_name.trim(),
      customer_email: (customer_email || '').toLowerCase().trim(),
      customer_phone: customer_phone.trim(),
      items: validatedCart.items,
      item_count: validatedCart.count,
      subtotal,
      discount,
      shipping,
      total: grandTotal,
      fulfillment_type: fulfillment_type || 'delivery',
      delivery_method: fulfillment_type === 'store_pickup' ? 'pickup' : 'doorstep',
      delivery_address: fulfillment_type === 'delivery' ? delivery_address : null,
      pickup_location: pickupDetails,
      payment_method: payment_method || (fulfillment_type === 'store_pickup' ? 'pay_at_store' : 'cash'),
      payment_status: payment_status || (payment_method === 'cash' ? 'cod' : 'pending'),
      status: 'placed',
      notes: notes || '',
      created_by_admin: {
        id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
        username: currentAdmin.username || 'admin',
        email: currentAdmin.email || 'admin@marjaah.qa',
      },
      timeline: [
        {
          status: 'placed',
          title: 'Order Created by Admin',
          note: `Created on behalf of customer by staff member ${currentAdmin.username || 'admin'}.`,
          timestamp: now,
        },
      ],
      created_at: now,
      updated_at: now,
    };

    // Save order in Firestore
    const orderRef = await this.firestore.collection('orders').add(orderRecord);

    // Deduct stock in Firestore
    for (const item of validatedCart.items) {
      try {
        const prodRef = this.firestore.doc('products', item.id);
        const prodDoc = await prodRef.get();
        if (prodDoc.exists) {
          const currentCount = prodDoc.data()?.stock_count;
          if (currentCount !== undefined && currentCount !== null) {
            const newCount = Math.max(0, Number(currentCount) - item.quantity);
            await prodRef.update({
              stock_count: newCount,
              in_stock: newCount > 0,
              updated_at: now,
            });
          }
        }
      } catch (e) {}
    }

    // Record audit log
    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'create_order',
      module: 'orders',
      target_id: orderRef.id,
      target_title: `${orderNumber} — QAR ${grandTotal} (${customer_name})`,
      details: { order_number: orderNumber, total: grandTotal, fulfillment_type },
    });

    return {
      success: true,
      id: orderRef.id,
      order_number: orderNumber,
      order: { id: orderRef.id, ...orderRecord },
    };
  }

  async deleteOrder(id: string, currentAdmin: any, restock = true) {
    let docRef = this.firestore.collection('orders').doc(id);
    let doc = await docRef.get();
    if (!doc.exists) {
      const q = await this.firestore.collection('orders').where('order_number', '==', id).limit(1).get();
      if (!q.empty) {
        doc = q.docs[0];
        docRef = doc.ref;
      } else {
        throw new NotFoundException(`Order "${id}" not found`);
      }
    }

    const orderData = doc.data() as any;
    const orderNumber = orderData.order_number || doc.id;

    // Check if order deletion requires approval
    const isSuperuser = Boolean(currentAdmin?.is_superuser || currentAdmin?.role_ids?.includes('super_admin'));
    const requiresApproval = !isSuperuser && (await this.isApprovalRequired('orders', 'delete'));

    if (requiresApproval) {
      const submission = await this.createApprovalSubmission({
        module: 'orders',
        operation: 'delete',
        target_id: doc.id,
        target_title: `Order #${orderNumber}`,
        payload: { id: doc.id, order_number: orderNumber, restock },
        original_data: orderData,
        submitted_by: {
          id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
          username: currentAdmin.username || 'admin',
          email: currentAdmin.email || '',
        },
      });

      return {
        success: true,
        pending_approval: true,
        message: `Deletion request for Order #${orderNumber} submitted for administrator approval.`,
        approval_id: submission.id,
      };
    }

    // 1. Restock products if requested and order was not already cancelled
    if (restock && orderData.status !== 'cancelled' && Array.isArray(orderData.items)) {
      for (const item of orderData.items) {
        try {
          const pid = item.id || item.product_id;
          if (pid) {
            const prodRef = this.firestore.collection('products').doc(pid);
            const prodDoc = await prodRef.get();
            if (prodDoc.exists) {
              const currentStock = Number(prodDoc.data()?.stock_count) || 0;
              const qty = Number(item.quantity) || 1;
              await prodRef.update({
                stock_count: currentStock + qty,
                in_stock: true,
                updated_at: new Date().toISOString(),
              });
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to restock product during order deletion: ${e}`);
        }
      }
    }

    // 2. Delete the order document from Firestore
    await docRef.delete();

    // 3. Log to immutable audit trail
    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'delete',
      module: 'orders',
      target_id: doc.id,
      target_title: `Order #${orderNumber}`,
      details: {
        order_number: orderNumber,
        customer_name: orderData.customer_name || orderData.full_name,
        total: orderData.total,
        restocked: restock && orderData.status !== 'cancelled',
      },
    });

    return {
      success: true,
      message: `Order #${orderNumber} has been permanently deleted.`,
      id: doc.id,
      order_number: orderNumber,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CUSTOMER ANALYTICS & MANAGEMENT (Requirements 2.A - 2.E)
  // ═══════════════════════════════════════════════════════════════════════════

  private cachedCustomerUsers: any[] | null = null;
  private cachedCustomerOrders: any[] | null = null;
  private customerCacheExpiresAt = 0;
  private readonly CUSTOMER_CACHE_TTL_MS = 25 * 1000; // 25 seconds fast cache

  private async getCachedUsersAndOrders(): Promise<[any[], any[]]> {
    const now = Date.now();
    if (
      this.cachedCustomerUsers &&
      this.cachedCustomerOrders &&
      now < this.customerCacheExpiresAt
    ) {
      return [this.cachedCustomerUsers, this.cachedCustomerOrders];
    }

    const [usersSnap, ordersSnap] = await Promise.all([
      this.firestore.collection('users').get(),
      this.firestore.collection('orders').get(),
    ]);

    this.cachedCustomerUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    this.cachedCustomerOrders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    this.customerCacheExpiresAt = now + this.CUSTOMER_CACHE_TTL_MS;

    return [this.cachedCustomerUsers, this.cachedCustomerOrders];
  }

  public invalidateCustomerCache() {
    this.cachedCustomerUsers = null;
    this.cachedCustomerOrders = null;
    this.customerCacheExpiresAt = 0;
    this.invalidateDashboardCache();
  }

  async getCustomerAnalytics() {
    const [allUsers, allOrders] = await this.getCachedUsersAndOrders();

    // Exclude purely administrative superuser from customer counts
    const customers = allUsers.filter(u => u.username !== 'admin' && !u.is_superuser);

    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    // Map order counts and spent by user
    const userOrderCounts = new Map<string, number>();
    const userRevenue = new Map<string, number>();
    for (const o of allOrders) {
      const uid = String(o.user_id || o.userId || o.customer_email || '').toLowerCase().trim();
      if (!uid) continue;
      userOrderCounts.set(uid, (userOrderCounts.get(uid) || 0) + 1);
      userRevenue.set(uid, (userRevenue.get(uid) || 0) + (Number(o.total) || 0));
    }

    let onlineCount = 0;
    let activeCount = 0;
    let newCount = 0;
    let returningCount = 0;
    let recentlyActiveCount = 0;
    let totalCustomerRevenue = 0;

    for (const c of customers) {
      const idKey = String(c.id).toLowerCase();
      const emailKey = (c.email || '').toLowerCase();
      const orderCount = userOrderCounts.get(idKey) || userOrderCounts.get(emailKey) || 0;
      const spent = userRevenue.get(idKey) || userRevenue.get(emailKey) || 0;
      totalCustomerRevenue += spent;

      // Presence check (actual heartbeat/session within 15 minutes)
      const lastSeenStr = c.last_seen || c.last_activity || c.last_login || null;
      const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
      const isOnline = lastSeenTime > 0 && (now - lastSeenTime <= FIFTEEN_MINUTES);
      if (isOnline) onlineCount++;

      // Active Customers (active status and either placed an order or was active within 30 days)
      const isStatusActive = (c.status || 'active') === 'active';
      const createdTime = c.created_at ? new Date(c.created_at).getTime() : 0;
      const isActive = isStatusActive && (orderCount > 0 || (lastSeenTime > 0 && (now - lastSeenTime <= THIRTY_DAYS)));
      if (isActive) activeCount++;

      // New Customers (registered within 30 days)
      if (createdTime > 0 && (now - createdTime <= THIRTY_DAYS)) {
        newCount++;
      }

      // Returning Customers (2 or more orders)
      if (orderCount >= 2) {
        returningCount++;
      }

      // Recently Active Customers (activity or login within 24 hours)
      if (lastSeenTime > 0 && (now - lastSeenTime <= ONE_DAY)) {
        recentlyActiveCount++;
      }
    }

    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    
    // Frequency categories
    let prospectiveCount = 0; // 0 orders
    let singleOrderCount = 0; // 1 order
    let repeatBuyerCount = 0; // 2-4 orders
    let vipBuyerCount = 0;    // 5+ orders

    // Presence categories
    let activeTodayCount = 0; // past 24 hours (excluding online)
    let activeWeekCount = 0;  // past 7 days (excluding today)
    let idleCount = 0;        // > 7 days or no activity

    for (const c of customers) {
      const idKey = String(c.id).toLowerCase();
      const emailKey = (c.email || '').toLowerCase();
      const orderCount = userOrderCounts.get(idKey) || userOrderCounts.get(emailKey) || 0;
      
      if (orderCount === 0) prospectiveCount++;
      else if (orderCount === 1) singleOrderCount++;
      else if (orderCount >= 2 && orderCount <= 4) repeatBuyerCount++;
      else vipBuyerCount++;

      const lastSeenStr = c.last_seen || c.last_activity || c.last_login || null;
      const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
      const diff = lastSeenTime > 0 ? (now - lastSeenTime) : Infinity;

      if (diff <= FIFTEEN_MINUTES) {
        // online
      } else if (diff <= ONE_DAY) {
        activeTodayCount++;
      } else if (diff <= ONE_WEEK) {
        activeWeekCount++;
      } else {
        idleCount++;
      }
    }

    // 7-day daily activity timeline
    const dailyActivity: { date: string; label: string; active_count: number; new_count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      let activeOnDay = 0;
      let newOnDay = 0;

      for (const c of customers) {
        const lastSeenTime = c.last_seen || c.last_activity || c.last_login;
        if (lastSeenTime) {
          const t = new Date(lastSeenTime).getTime();
          if (t >= dayStart && t < dayEnd) activeOnDay++;
        }
        if (c.created_at) {
          const t = new Date(c.created_at).getTime();
          if (t >= dayStart && t < dayEnd) newOnDay++;
        }
      }

      dailyActivity.push({
        date: dateStr,
        label: dayLabel,
        active_count: activeOnDay,
        new_count: newOnDay,
      });
    }

    const totalCustomers = customers.length;
    const offlineCount = Math.max(0, totalCustomers - onlineCount);
    const retentionRate = totalCustomers > 0 ? Math.round((returningCount / totalCustomers) * 100) : 0;
    const totalOrdersCount = Array.from(userOrderCounts.values()).reduce((a, b) => a + b, 0);
    const averageOrderValue = totalOrdersCount > 0 ? Math.round((totalCustomerRevenue / totalOrdersCount) * 100) / 100 : 0;

    return {
      total_customers: totalCustomers,
      active_customers: activeCount,
      online_customers: onlineCount,
      offline_customers: offlineCount,
      new_customers: newCount,
      returning_customers: returningCount,
      recently_active: recentlyActiveCount,
      retention_rate: retentionRate,
      total_revenue: Math.round(totalCustomerRevenue * 100) / 100,
      average_order_value: averageOrderValue,
      presence_timeout_minutes: 15,
      calculated_at: new Date().toISOString(),
      presence_breakdown: {
        online: onlineCount,
        active_today: activeTodayCount,
        active_week: activeWeekCount,
        idle: idleCount,
      },
      frequency_breakdown: {
        prospective: prospectiveCount,
        single_order: singleOrderCount,
        repeat_buyer: repeatBuyerCount,
        vip_buyer: vipBuyerCount,
      },
      daily_activity: dailyActivity,
    };
  }

  async listCustomers(query: {
    search?: string;
    status?: string;
    presence?: string;
    date_range?: string;
    sort_by?: string;
    sort_dir?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const [allUsers, allOrders] = await this.getCachedUsersAndOrders();

    // Exclude pure admin user from customer table
    const nonAdminUsers = allUsers.filter(u => u.username !== 'admin' && !u.is_superuser);

    // Aggregate user order statistics
    const statsByUser = new Map<string, { totalOrders: number; totalSpent: number; lastOrderDate: string | null }>();
    for (const o of allOrders) {
      const uid = String(o.user_id || o.userId || o.customer_email || '').toLowerCase().trim();
      if (!uid) continue;
      const s = statsByUser.get(uid) || { totalOrders: 0, totalSpent: 0, lastOrderDate: null };
      s.totalOrders += 1;
      s.totalSpent += Number(o.total) || 0;
      if (!s.lastOrderDate || new Date(o.created_at || 0) > new Date(s.lastOrderDate)) {
        s.lastOrderDate = o.created_at || null;
      }
      statsByUser.set(uid, s);
    }

    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;

    let customers = nonAdminUsers.map((u) => {
      const idKey = String(u.id).toLowerCase();
      const emailKey = (u.email || '').toLowerCase();
      const stats = statsByUser.get(idKey) || statsByUser.get(emailKey) || { totalOrders: 0, totalSpent: 0, lastOrderDate: null };
      const { password, raw_password, ...safeUser } = u;

      const lastSeenStr = u.last_seen || u.last_activity || u.last_login || u.updated_at || null;
      const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
      const isOnline = lastSeenTime > 0 && (now - lastSeenTime <= FIFTEEN_MINUTES);

      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || u.username || 'Customer';

      return {
        ...safeUser,
        name: fullName,
        first_name: u.first_name || fullName,
        last_name: u.last_name || '',
        avatar: u.avatar || u.photo_url || u.photoURL || u.image || null,
        phone: u.phone || u.phone_number || '',
        email: u.email || '',
        created_at: u.created_at || u.createdAt || null,
        last_login: u.last_login || null,
        last_seen: lastSeenStr,
        is_online: isOnline,
        status: u.status || 'active',
        total_orders: stats.totalOrders,
        total_spent: Math.round(stats.totalSpent * 100) / 100,
        last_order_at: stats.lastOrderDate,
      };
    });

    // 1. Search filter
    if (query.search) {
      const s = query.search.toLowerCase().trim();
      customers = customers.filter((c) =>
        (c.name || '').toLowerCase().includes(s) ||
        (c.username || '').toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s) ||
        (c.phone || '').includes(s),
      );
    }

    // 2. Status filter
    if (query.status && query.status !== 'all') {
      customers = customers.filter((c) => c.status === query.status);
    }

    // 3. Presence filter (online / offline)
    if (query.presence && query.presence !== 'all') {
      if (query.presence === 'online') {
        customers = customers.filter((c) => c.is_online);
      } else if (query.presence === 'offline') {
        customers = customers.filter((c) => !c.is_online);
      }
    }

    // 4. Date range filter
    if (query.date_range && query.date_range !== 'all') {
      const dayMs = 24 * 60 * 60 * 1000;
      let windowMs = 30 * dayMs;
      if (query.date_range === 'today') windowMs = dayMs;
      if (query.date_range === '7d') windowMs = 7 * dayMs;
      if (query.date_range === '30d') windowMs = 30 * dayMs;
      if (query.date_range === '90d') windowMs = 90 * dayMs;

      customers = customers.filter((c) => {
        const t = c.created_at ? new Date(c.created_at).getTime() : 0;
        return t > 0 && (now - t <= windowMs);
      });
    }

    // 5. Sorting
    const sortBy = query.sort_by || 'created_at';
    const sortDir = (query.sort_dir || 'desc').toLowerCase();
    const factor = sortDir === 'asc' ? 1 : -1;

    customers.sort((a, b) => {
      if (sortBy === 'last_seen') {
        const ta = a.last_seen ? new Date(a.last_seen).getTime() : 0;
        const tb = b.last_seen ? new Date(b.last_seen).getTime() : 0;
        return (ta - tb) * factor;
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '') * factor;
      }
      if (sortBy === 'orders') {
        return (a.total_orders - b.total_orders) * factor;
      }
      if (sortBy === 'spent') {
        return (a.total_spent - b.total_spent) * factor;
      }
      // default: created_at
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return (ta - tb) * factor;
    });

    // 6. Pagination
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const total = customers.length;
    const offset = (page - 1) * limit;

    return {
      items: customers.slice(offset, offset + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getCustomerDetails(id: string) {
    const userDoc = await this.firestore.collection('users').doc(id).get();
    if (!userDoc.exists) {
      throw new NotFoundException(`Customer "${id}" not found`);
    }

    const userData = userDoc.data() as any;
    const { password, raw_password, ...safeUser } = userData;

    // Fetch customer's orders
    const ordersSnap = await this.firestore.collection('orders').get();
    const customerOrders = ordersSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as any))
      .filter((o) => {
        const oUid = String(o.user_id || o.userId || '').trim();
        const oEmail = (o.customer_email || '').toLowerCase().trim();
        return oUid === id || (userData.email && oEmail === userData.email.toLowerCase());
      });

    customerOrders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const totalSpent = customerOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const avgOrderValue = customerOrders.length > 0 ? Math.round((totalSpent / customerOrders.length) * 100) / 100 : 0;

    const now = Date.now();
    const lastSeenStr = userData.last_seen || userData.last_activity || userData.last_login || userData.updated_at || null;
    const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
    const isOnline = lastSeenTime > 0 && (now - lastSeenTime <= 15 * 60 * 1000);

    const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.name || userData.username || 'Customer';

    // Fetch recent audit logs for this customer if any
    let activityHistory: any[] = [];
    try {
      const auditSnap = await this.firestore.collection('audit_logs')
        .where('target_id', '==', id)
        .limit(10)
        .get();
      activityHistory = auditSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {}

    return {
      id: userDoc.id,
      ...safeUser,
      name: fullName,
      first_name: userData.first_name || fullName,
      last_name: userData.last_name || '',
      phone: userData.phone || userData.phone_number || '',
      email: userData.email || '',
      avatar: userData.avatar || userData.photo_url || userData.photoURL || null,
      status: userData.status || 'active',
      is_online: isOnline,
      last_seen: lastSeenStr,
      last_login: userData.last_login || null,
      created_at: userData.created_at || userData.createdAt || null,
      total_orders: customerOrders.length,
      total_spent: Math.round(totalSpent * 100) / 100,
      average_order_value: avgOrderValue,
      orders: customerOrders,
      activity: activityHistory,
    };
  }

  async updateCustomerStatus(id: string, status: 'active' | 'suspended', currentAdmin: any) {
    const userDoc = this.firestore.collection('users').doc(id);
    const existing = await userDoc.get();
    if (!existing.exists) {
      throw new NotFoundException(`Customer "${id}" not found`);
    }

    await userDoc.update({
      status,
      updated_at: new Date().toISOString(),
    });

    this.invalidateCustomerCache();

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'edit',
      module: 'customers',
      target_id: id,
      target_title: existing.data()?.username || existing.data()?.email,
      details: { status },
    });

    return { success: true, message: `Customer status updated to ${status}` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. STORE SETTINGS & CR NUMBER MANAGEMENT (Requirement 7)
  // ═══════════════════════════════════════════════════════════════════════════
  async getStoreSettings() {
    const doc = await this.firestore.collection('settings').doc('store_info').get();
    if (doc.exists) {
      return doc.data();
    }
    return {
      store_name: 'MARJAAH TRADING WLL',
      trade_name: 'M.SHOP Qatar',
      cr_number: '228717',
      footer_cr_text: 'CR No. 228717 • Qatar',
      phone: '+974 7799 1013',
      email: 'support@marjaah.qa',
    };
  }

  async updateStoreSettings(dto: any, currentAdmin: any) {
    const docRef = this.firestore.collection('settings').doc('store_info');
    const existing = await docRef.get();

    const now = new Date().toISOString();
    const updateData = {
      ...dto,
      footer_cr_text: dto.footer_cr_text || (dto.cr_number ? `CR No. ${dto.cr_number} • Qatar` : 'CR No. 228717 • Qatar'),
      updated_at: now,
      updated_by: currentAdmin.username || 'admin',
    };

    await docRef.set(updateData, { merge: true });

    await this.auditService.log({
      admin_id: String(currentAdmin.id || currentAdmin.sub || 'admin'),
      admin_username: currentAdmin.username || 'admin',
      action: 'edit',
      module: 'settings',
      target_id: 'store_info',
      target_title: 'Store Settings & CR Number',
      details: updateData,
    });

    return { ...(existing.data() || {}), ...updateData };
  }
}
