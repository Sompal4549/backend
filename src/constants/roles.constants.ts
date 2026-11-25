export const ROLE = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export const CRM_ROLE = {
  SUPER_ADMIN: 'Super Admin',
  SALES_MANAGER: 'Sales Manager',
  PROJECT_MANAGER: 'Project Manager',
  PRODUCTION_MANAGER: 'Production Manager',
  PRODUCTION_EXECUTIVE: 'Production Executive',
  PURCHASE_MANAGER: 'Purchase Manager',
  ACCOUNTS_MANAGER: 'Accounts Manager',
  HR_MANAGER: 'HR Manager',
  ADMIN_EXECUTIVE: 'Admin Executive',
} as const;

export const CRM_ROLE_VALUES = [
  'Super Admin',
  'Sales Manager',
  'Project Manager',
  'Production Manager',
  'Production Executive',
  'Purchase Manager',
  'Accounts Manager',
  'HR Manager',
  'Admin Executive',
] as const;

export type CrmRole = (typeof CRM_ROLE_VALUES)[number];

