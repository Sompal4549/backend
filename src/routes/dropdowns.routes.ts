import { Router, Request, Response } from 'express';
import { successResponse } from '../utils/api-response';

export const dropdownsRouter = Router();

const DEFAULT_DROPDOWNS: Record<string, { label: string; value: string }[]> = {
  gender: [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ],
  'yes-no': [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
  ],
  'project-type': [
    { label: 'New Clinic Setup', value: 'New Clinic Setup' },
    { label: 'Resort / Spa Setup', value: 'Resort / Spa Setup' },
    { label: 'Hospital Upgrade', value: 'Hospital Upgrade' },
    { label: 'Equipment Purchase', value: 'Equipment Purchase' },
    { label: 'Custom Design', value: 'Custom Design' },
  ],
  'enquiry-source': [
    { label: 'Website Form', value: 'Website Form' },
    { label: 'Chatbot', value: 'Chatbot' },
    { label: 'Direct Call', value: 'Direct Call' },
    { label: 'WhatsApp', value: 'WhatsApp' },
    { label: 'Referral', value: 'Referral' },
  ],
};

const DROPDOWN_LISTS_INFO = [
  { key: 'gender', name: 'Gender', group: 'Shared', usedIn: ['Contact', 'User Profile'], total: 3, active: 3 },
  { key: 'yes-no', name: 'Yes / No', group: 'Shared', usedIn: ['Forms', 'Enquiries'], total: 2, active: 2 },
  { key: 'project-type', name: 'Project Type', group: 'Enquiries', usedIn: ['Enquiry Form'], total: 5, active: 5 },
  { key: 'enquiry-source', name: 'Enquiry Source', group: 'Enquiries', usedIn: ['Enquiry Management'], total: 5, active: 5 },
];

dropdownsRouter.get('/admin/lists', (_req: Request, res: Response) => {
  successResponse(res, DROPDOWN_LISTS_INFO, 'Dropdown lists retrieved');
});

dropdownsRouter.get('/admin/options', (req: Request, res: Response) => {
  const listKey = (req.query.list as string) || '';
  const options = DEFAULT_DROPDOWNS[listKey] || [];
  const formatted = options.map((opt, idx) => ({
    _id: `opt_${idx}`,
    list: listKey,
    label: opt.label,
    value: opt.value,
    parentValue: '',
    order: idx + 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  successResponse(res, formatted, 'Dropdown options retrieved');
});

dropdownsRouter.get('/:list', (req: Request, res: Response) => {
  const listKey = req.params.list;
  const options = DEFAULT_DROPDOWNS[listKey] || [];
  successResponse(res, options, 'Dropdown fetched successfully');
});

dropdownsRouter.get('/', (req: Request, res: Response) => {
  const listsParam = req.query.lists as string;
  if (!listsParam) {
    successResponse(res, DEFAULT_DROPDOWNS, 'Dropdowns fetched successfully');
    return;
  }
  const keys = listsParam.split(',').map((k) => k.trim());
  const result: Record<string, { label: string; value: string }[]> = {};
  for (const k of keys) {
    result[k] = DEFAULT_DROPDOWNS[k] || [];
  }
  successResponse(res, result, 'Dropdowns fetched successfully');
});
