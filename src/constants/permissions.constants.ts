import { ROLE } from './roles.constants';
import { AppError } from '../utils/app-error';

/**
 * Static permission catalog shown on the admin "Users & Roles" page.
 * It mirrors the admin sidebar modules (ensis-admin/components/layout/navigation.ts).
 * NOTE: permissions are informational only — routes are still protected by
 * adminMiddleware / superAdminMiddleware, not by these keys.
 */
export interface PermissionDef {
  _id: string;
  module: string;
  action: string;
  key: string;
  label: string;
}

const PERMISSION_MODULES: [moduleKey: string, moduleLabel: string][] = [
  ['dashboard', 'Dashboard'],
  ['general_enquiries', 'General Enquiries'],
  ['contact_us', 'Contact Us Messages'],
  ['communication', 'Communication / Follow-ups'],
  ['orders', 'Orders'],
  ['invoices', 'Invoices'],
  ['categories', 'Product Categories'],
  ['product_reviews', 'Product Reviews'],
  ['leads', 'Leads CRM'],
  ['reports', 'Business Reports'],
  ['chatbot', 'AI Chatbot'],
  ['website_feedback', 'Website Feedback'],
  ['newsletter', 'Newsletter Subscribers'],
  ['pages', 'Pages & CMS'],
  ['services', 'Services Management'],
  ['products', 'Products'],
  ['solutions', 'Solutions'],
  ['product_city_pages', 'Product City Pages'],
  ['blogs', 'Blog & Insights'],
  ['media', 'Media Library'],
  ['video_highlights', 'Video Highlights'],
  ['feedback_reviews', 'Feedback & Reviews'],
  ['testimonials', 'Testimonials'],
  ['faqs', 'FAQs'],
  ['navigation_menus', 'Navigation Menus'],
  ['careers', 'Careers'],
  ['seo', 'SEO & Performance'],
  ['redirects', 'Redirects Manager'],
  ['google_reviews', 'Google Reviews'],
  ['roles', 'Users & Roles'],
  ['staff', 'Staff Management'],
  ['security', 'Security Center'],
  ['infrastructure', 'Servers & Domains'],
  ['audit_logs', 'Audit Logs'],
  ['settings', 'Settings'],
  ['activity_log', 'Activity Log'],
  ['dropdowns', 'Dropdown Manager'],
];

const PERMISSION_ACTIONS: [action: string, actionLabel: string][] = [
  ['view', 'View'],
  ['manage', 'Manage'],
];

export const PERMISSION_CATALOG: PermissionDef[] = PERMISSION_MODULES.flatMap(([moduleKey, moduleLabel]) =>
  PERMISSION_ACTIONS.map(([action, actionLabel]) => {
    const key = `${moduleKey}.${action}`;
    return { _id: key, module: moduleLabel, action, key, label: `${actionLabel} ${moduleLabel}` };
  })
);

export const PERMISSION_KEYS = new Set(PERMISSION_CATALOG.map((p) => p.key));

// Wildcard used by system roles: full access to every module
export const ALL_PERMISSIONS = '*';

/**
 * System roles map 1:1 to the user `role` enum, so their _id/slug equals the enum value.
 * This lets the staff page send `role._id` as `roleId` and the user record stays valid.
 */
export const SYSTEM_ROLES = [
  {
    _id: ROLE.ADMIN,
    slug: ROLE.ADMIN,
    name: 'Admin',
    description: 'Full access to the admin panel (built-in role).',
  },
  {
    _id: ROLE.SUPERADMIN,
    slug: ROLE.SUPERADMIN,
    name: 'Super Admin',
    description: 'Full access including staff, roles and user management (built-in role).',
  },
] as const;

export const SYSTEM_ROLE_IDS: string[] = SYSTEM_ROLES.map((r) => r._id);

// Roles that can actually be stored on a staff user (custom roles are not enforced yet)
export const STAFF_ASSIGNABLE_ROLES: string[] = [ROLE.ADMIN, ROLE.SUPERADMIN];

/**
 * Guard for the staff invite/update endpoints: only built-in roles can be assigned.
 * Throws a 400 instead of letting a custom role id reach the user `role` enum.
 */
export const assertStaffAssignableRole = (roleId: unknown): void => {
  if (typeof roleId !== 'string' || !STAFF_ASSIGNABLE_ROLES.includes(roleId)) {
    throw new AppError(
      400,
      'Only the built-in Admin or Super Admin role can be assigned to staff. Custom roles are not supported for staff accounts yet.'
    );
  }
};
