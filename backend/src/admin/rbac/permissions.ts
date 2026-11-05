export type AdminModule =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'brands'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'payments'
  | 'coupons'
  | 'banners'
  | 'website_content'
  | 'store_locations'
  | 'reports_analytics'
  | 'admin_users'
  | 'roles_permissions'
  | 'settings'
  | 'approvals'
  | 'audit_logs';

export type AdminAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'manage';

export interface ModulePermissionDefinition {
  id: AdminModule;
  label: string;
  description: string;
  actions: AdminAction[];
}

export const ADMIN_MODULES: ModulePermissionDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Executive overview, KPI metrics, recent activity and quick actions',
    actions: ['view', 'manage'],
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Catalogue items, specifications, pricing, stock levels and images',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
  },
  {
    id: 'categories',
    label: 'Categories',
    description: 'Product taxonomy, parent categories and subcategories',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage'],
  },
  {
    id: 'brands',
    label: 'Brands',
    description: 'Manufacturer brands, logos, warranty info and official distributor flags',
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Stock thresholds, low-stock alerts, warehouse updates and adjustments',
    actions: ['view', 'edit', 'export', 'manage'],
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Customer and admin-created orders, fulfillment, tracking and cancellation',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Registered users, guest orders, spending metrics and account states',
    actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  },
  {
    id: 'payments',
    label: 'Payments',
    description: 'Payment transactions, COD collections, gateway logs and refunds',
    actions: ['view', 'edit', 'export', 'manage'],
  },
  {
    id: 'coupons',
    label: 'Coupons & Discounts',
    description: 'Promotional discount codes, flash sales and validity rules',
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    id: 'banners',
    label: 'Hero & Promotional Banners',
    description: 'Homepage hero banners, desktop/mobile images, scheduling and CTAs',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage'],
  },
  {
    id: 'website_content',
    label: 'Website Content',
    description: 'Promotional sections (e.g. Ultra Rigs), landing page blocks and notices',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage'],
  },
  {
    id: 'store_locations',
    label: 'Store Pickup Locations',
    description: 'Physical pickup stores, working hours, instructions and addresses',
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    id: 'reports_analytics',
    label: 'Reports & Analytics',
    description: 'Deep revenue reports, customer trends, visitor analytics and data exports',
    actions: ['view', 'export', 'manage'],
  },
  {
    id: 'admin_users',
    label: 'Admin Users',
    description: 'Staff accounts, credentials, contact info, status and active sessions',
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    id: 'roles_permissions',
    label: 'Roles & Permissions',
    description: 'Custom RBAC roles and granular section-level capability matrix',
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    id: 'settings',
    label: 'Store Settings',
    description: 'Company info, CR number, contact details, shipping rules and system params',
    actions: ['view', 'edit', 'manage'],
  },
  {
    id: 'approvals',
    label: 'Approval Management',
    description: 'Review pending changes, approve/reject workflow submissions and inspect diffs',
    actions: ['view', 'approve', 'reject', 'manage'],
  },
  {
    id: 'audit_logs',
    label: 'Audit Trail',
    description: 'Immutable historical record of administrative actions and access logs',
    actions: ['view', 'export', 'manage'],
  },
];

export interface RolePermissionMap {
  [moduleId: string]: AdminAction[];
}

export interface SystemRoleDefinition {
  id: string;
  name: string;
  description: string;
  is_system?: boolean;
  permissions: RolePermissionMap;
}

export const SYSTEM_DEFAULT_ROLES: SystemRoleDefinition[] = [
  {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Unrestricted master access to all administrative modules, security settings, and approvals.',
    is_system: true,
    permissions: Object.fromEntries(
      ADMIN_MODULES.map((m) => [m.id, ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage']])
    ),
  },
  {
    id: 'product_manager',
    name: 'Product Manager',
    description: 'Full authority over product catalog, categories, brands, inventory, coupons, and specifications.',
    permissions: {
      dashboard: ['view'],
      products: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'],
      categories: ['view', 'create', 'edit', 'delete', 'manage'],
      brands: ['view', 'create', 'edit', 'delete', 'manage'],
      inventory: ['view', 'edit', 'export', 'manage'],
      coupons: ['view', 'create', 'edit', 'delete', 'manage'],
      approvals: ['view'],
      reports_analytics: ['view'],
    },
  },
  {
    id: 'order_manager',
    name: 'Order Manager',
    description: 'End-to-end processing of orders, admin order creation, customer communication, and store pickup fulfillment.',
    permissions: {
      dashboard: ['view'],
      orders: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'],
      customers: ['view', 'create', 'edit', 'export'],
      payments: ['view', 'edit', 'export'],
      store_locations: ['view'],
      reports_analytics: ['view', 'export'],
    },
  },
  {
    id: 'inventory_manager',
    name: 'Inventory Manager',
    description: 'Management of stock levels, warehouse counts, low-stock alerts, and store pickup availability.',
    permissions: {
      dashboard: ['view'],
      inventory: ['view', 'edit', 'export', 'manage'],
      products: ['view', 'edit', 'export'],
      store_locations: ['view', 'edit'],
      reports_analytics: ['view'],
    },
  },
  {
    id: 'customer_support',
    name: 'Customer Support',
    description: 'Assisting customers, looking up orders, checking order fulfillment status, and managing store inquiries.',
    permissions: {
      dashboard: ['view'],
      orders: ['view', 'edit'],
      customers: ['view'],
      products: ['view'],
      store_locations: ['view'],
    },
  },
  {
    id: 'content_manager',
    name: 'Content Manager',
    description: 'Homepage banners, promotional showcases, promotional sections, landing content, and brand messaging.',
    permissions: {
      dashboard: ['view'],
      banners: ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
      website_content: ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
      categories: ['view', 'edit'],
      store_locations: ['view', 'edit'],
      approvals: ['view'],
    },
  },
  {
    id: 'marketing_manager',
    name: 'Marketing Manager',
    description: 'Promotional campaigns, discounts, coupons, hero banners, and customer analytics.',
    permissions: {
      dashboard: ['view'],
      banners: ['view', 'create', 'edit', 'manage'],
      website_content: ['view', 'create', 'edit', 'manage'],
      coupons: ['view', 'create', 'edit', 'delete', 'manage'],
      customers: ['view', 'export'],
      reports_analytics: ['view', 'export'],
    },
  },
  {
    id: 'finance_manager',
    name: 'Finance Manager',
    description: 'Financial accounting, payment records, revenue analytics, COD reconciliation, and transactional exports.',
    permissions: {
      dashboard: ['view'],
      payments: ['view', 'edit', 'export', 'manage'],
      orders: ['view', 'export'],
      reports_analytics: ['view', 'export', 'manage'],
    },
  },
];

