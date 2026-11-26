import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { errorResponse } from '../utils/api-response';
import { CRM_ROLE_VALUES, ROLE } from '../constants/roles.constants';

export interface CrmActorContext {
  id: string;
  name: string;
  email: string;
  systemRole: string;
  crmRole: string;
  roleTier: 'superadmin' | 'manager' | 'user';
}

export function resolveRoleTier(roleStr: string): 'superadmin' | 'manager' | 'user' {
  const lower = (roleStr || '').trim().toLowerCase();
  if (lower === 'superadmin' || lower === 'super admin') return 'superadmin';
  if (lower.includes('manager')) return 'manager';
  return 'user';
}

/**
 * Allows any authenticated user who has access to Ensis CRM:
 * Super Admin, Admin, Managers, Sales Executives, and Staff/Users with crmAccess or CRM permissions.
 * Also honors `x-crm-role` header from Super Admin / Admin sessions when previewing role boundaries.
 */
export const crmAccessMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const user = req.user as any;
  if (!user) {
    errorResponse(res, 'Authentication required', 401);
    return;
  }

  const sysRole = String(user.role || '').toLowerCase();
  const crmRoleRaw = String(user.crmRole || '');
  const isSuperOrAdmin = sysRole === ROLE.SUPERADMIN || sysRole === ROLE.ADMIN || sysRole === 'superadmin';
  const hasPermissionFlag = Array.isArray(user.permissions) && user.permissions.includes('crm');
  const hasKnownCrmRole = (CRM_ROLE_VALUES as readonly string[]).some(
    (r) => r.toLowerCase() === crmRoleRaw.toLowerCase()
  );

  // Explicit false denies CRM access unless superadmin
  const hasCrmAccess =
    user.crmAccess !== undefined
      ? Boolean(user.crmAccess) || isSuperOrAdmin
      : isSuperOrAdmin || hasPermissionFlag || hasKnownCrmRole;

  if (!hasCrmAccess) {
    errorResponse(res, 'Ensis CRM access required', 403);
    return;
  }

  const headerRole = req.headers['x-crm-role'];
  const requestedRole = typeof headerRole === 'string' && headerRole.trim() ? headerRole.trim() : '';
  const baseCrmRole = crmRoleRaw || (sysRole === ROLE.SUPERADMIN ? 'Super Admin' : sysRole === ROLE.ADMIN ? 'Admin Executive' : 'User');

  // Allow role simulation header when authenticated as Super Admin / Admin (matches topbar switcher)
  const effectiveCrmRole = requestedRole && isSuperOrAdmin ? requestedRole : baseCrmRole;
  const headerUser = req.headers['x-crm-user'];
  const effectiveName =
    typeof headerUser === 'string' && headerUser.trim() && isSuperOrAdmin
      ? headerUser.trim()
      : String(user.name || 'CRM User');

  (req as any).crmActor = {
    id: String(user._id || user.id || ''),
    name: effectiveName,
    email: String(user.email || ''),
    systemRole: sysRole,
    crmRole: effectiveCrmRole,
    roleTier: resolveRoleTier(effectiveCrmRole),
  } satisfies CrmActorContext;

  next();
};
