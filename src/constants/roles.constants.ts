export const ROLE = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export const CRM_ROLE = {
  SUPER_ADMIN: 'Super Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_EXECUTIVE: 'Sales Executive',
  PROJECT_MANAGER: 'Project Manager',
  PRODUCTION_MANAGER: 'Production Manager',
  PRODUCTION_EXECUTIVE: 'Production Executive',
  PURCHASE_MANAGER: 'Purchase Manager',
  ACCOUNTS_MANAGER: 'Accounts Manager',
  HR_MANAGER: 'HR Manager',
  ADMIN_EXECUTIVE: 'Admin Executive',
  USER: 'User',
} as const;

export const CRM_ROLE_VALUES = [
  'Super Admin',
  'Sales Manager',
  'Sales Executive',
  'Project Manager',
  'Production Manager',
  'Production Executive',
  'Purchase Manager',
  'Accounts Manager',
  'HR Manager',
  'Admin Executive',
  'User',
] as const;

export type CrmRole = (typeof CRM_ROLE_VALUES)[number];

