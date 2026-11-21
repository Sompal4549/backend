import { Router } from 'express';
import path from 'path';
import { successResponse } from '../../../utils/api-response';

export const crmSettingsRouter = Router();

let settingsMock: Record<string, any> = {};
try {
  const settingsPath = path.resolve(__dirname, '../../../../../ensis_crm/src/mocks/settings');
  settingsMock = require(settingsPath);
} catch (err) {
  console.warn('[CRM Settings] Warning: Could not load frontend settings mock:', (err as any)?.message);
}

crmSettingsRouter.get('/users', (_req, res) => {
  const users = settingsMock.usersOverviewMock || { kpis: { total: 46, active: 44, invited: 1, disabled: 1 }, users: [] };
  successResponse(res, users, 'Users retrieved');
});

crmSettingsRouter.get('/roles', (_req, res) => {
  const rolesData = {
    modules: settingsMock.permissionModules || [],
    roles: settingsMock.rolesMock || [],
  };
  successResponse(res, rolesData, 'Roles retrieved');
});

crmSettingsRouter.get('/approval-rules', (_req, res) => {
  const rules = settingsMock.approvalRulesMock || [];
  successResponse(res, rules, 'Approval rules retrieved');
});

crmSettingsRouter.get('/notifications', (_req, res) => {
  const notifications = settingsMock.notificationSettingsMock || {};
  successResponse(res, notifications, 'Notification settings retrieved');
});

crmSettingsRouter.get('/integrations', (_req, res) => {
  const integrations = settingsMock.integrationSettingsMock || {};
  successResponse(res, integrations, 'Integration settings retrieved');
});

crmSettingsRouter.get('/company', (_req, res) => {
  const company = settingsMock.companyProfileMock || {
    legalName: 'Design House India Pvt Ltd / ENSIS',
    brandName: 'ENSIS Wellness',
    email: 'info@ensis.in',
  };
  successResponse(res, company, 'Company profile retrieved');
});

crmSettingsRouter.get('/catalogue', (_req, res) => {
  const catalogue = settingsMock.catalogueMock || [];
  successResponse(res, catalogue, 'Catalogue retrieved');
});

crmSettingsRouter.get('/master-config', (_req, res) => {
  const config = settingsMock.masterConfigMock || {};
  successResponse(res, config, 'Master config retrieved');
});

crmSettingsRouter.get('/audit-log', (_req, res) => {
  const audit = settingsMock.auditLogMock || [];
  successResponse(res, audit, 'Audit log retrieved');
});

crmSettingsRouter.put('/:section', (req, res) => {
  successResponse(res, { id: req.params.section, section: req.params.section, ...req.body }, 'Settings updated');
});

export default crmSettingsRouter;
