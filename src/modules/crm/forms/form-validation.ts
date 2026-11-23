export type FieldRule = {
  name: string;
  label: string;
  required?: boolean;
};

export const formRules: Record<string, FieldRule[]> = {
  assignTask: [
    { name: 'title', label: 'Task title', required: true },
    { name: 'department', label: 'Department', required: true },
    { name: 'instructions', label: 'Instructions & expected output', required: true },
    { name: 'owner', label: 'Assign to', required: true },
    { name: 'dueDate', label: 'Due date', required: true },
    { name: 'dueTime', label: 'Due time', required: true },
  ],
  dailyReport: [
    { name: 'date', label: 'Report date', required: true },
    { name: 'department', label: 'Department', required: true },
    { name: 'completed', label: 'Tasks completed', required: true },
    { name: 'summary', label: 'Work summary', required: true },
  ],
  createQuotation: [
    { name: 'client', label: 'Client', required: true },
    { name: 'businessType', label: 'Business type', required: true },
    { name: 'owner', label: 'Owner', required: true },
    { name: 'value', label: 'Quotation value', required: true },
    { name: 'validTill', label: 'Valid till', required: true },
    { name: 'scope', label: 'Scope / line items', required: true },
  ],
  newCampaign: [
    { name: 'name', label: 'Campaign name', required: true },
    { name: 'channel', label: 'Channel', required: true },
    { name: 'owner', label: 'Owner', required: true },
    { name: 'start', label: 'Start date', required: true },
    { name: 'end', label: 'End date', required: true },
    { name: 'budget', label: 'Budget', required: true },
  ],
  logCommunication: [
    { name: 'contact', label: 'Contact name', required: true },
    { name: 'channel', label: 'Channel', required: true },
    { name: 'outcome', label: 'Outcome', required: true },
    { name: 'owner', label: 'Owner', required: true },
  ],
  addProject: [
    { name: 'name', label: 'Project name', required: true },
    { name: 'client', label: 'Client', required: true },
    { name: 'city', label: 'City', required: true },
    { name: 'type', label: 'Project type', required: true },
    { name: 'manager', label: 'Project manager', required: true },
    { name: 'start', label: 'Start date', required: true },
    { name: 'handover', label: 'Target handover', required: true },
  ],
  siteVisit: [
    { name: 'project', label: 'Project', required: true },
    { name: 'purpose', label: 'Purpose', required: true },
    { name: 'date', label: 'Date', required: true },
    { name: 'time', label: 'Time', required: true },
    { name: 'engineer', label: 'Assigned to', required: true },
  ],
  createJob: [
    { name: 'salesOrder', label: 'Sales order', required: true },
    { name: 'product', label: 'Product', required: true },
    { name: 'quantity', label: 'Quantity', required: true },
    { name: 'owner', label: 'Production owner', required: true },
    { name: 'targetDispatch', label: 'Target dispatch', required: true },
  ],
  planDispatch: [
    { name: 'job', label: 'Job', required: true },
    { name: 'site', label: 'Client / site', required: true },
    { name: 'date', label: 'Dispatch date', required: true },
    { name: 'time', label: 'Target time', required: true },
    { name: 'owner', label: 'Owner', required: true },
  ],
  raiseRequest: [
    { name: 'material', label: 'Material', required: true },
    { name: 'linked', label: 'Linked job or project', required: true },
    { name: 'quantity', label: 'Quantity', required: true },
    { name: 'requiredBy', label: 'Required by', required: true },
  ],
  addVendor: [
    { name: 'name', label: 'Vendor name', required: true },
    { name: 'category', label: 'Category', required: true },
    { name: 'contact', label: 'Contact person', required: true },
    { name: 'mobile', label: 'Mobile', required: true },
  ],
  stockMovement: [
    { name: 'type', label: 'Movement type', required: true },
    { name: 'item', label: 'Item', required: true },
    { name: 'quantity', label: 'Quantity', required: true },
    { name: 'reason', label: 'Reason', required: true },
  ],
  receiveGoods: [
    { name: 'po', label: 'Purchase order', required: true },
    { name: 'date', label: 'Received on', required: true },
    { name: 'quantity', label: 'Quantity received', required: true },
    { name: 'location', label: 'Store location', required: true },
  ],
  recordReceipt: [
    { name: 'client', label: 'Client', required: true },
    { name: 'invoice', label: 'Against invoice', required: true },
    { name: 'amount', label: 'Amount', required: true },
    { name: 'date', label: 'Received on', required: true },
    { name: 'mode', label: 'Payment mode', required: true },
  ],
  addExpense: [
    { name: 'category', label: 'Category', required: true },
    { name: 'amount', label: 'Amount', required: true },
    { name: 'date', label: 'Expense date', required: true },
    { name: 'mode', label: 'Paid via', required: true },
    { name: 'description', label: 'Description', required: true },
  ],
  raiseOfficeRequest: [
    { name: 'type', label: 'Request type', required: true },
    { name: 'due', label: 'Needed by', required: true },
    { name: 'description', label: 'Description', required: true },
  ],
  addTeamMember: [
    { name: 'name', label: 'Full name', required: true },
    { name: 'email', label: 'Work email', required: true },
    { name: 'department', label: 'Department', required: true },
    { name: 'role', label: 'Role', required: true },
    { name: 'reportsTo', label: 'Reports to', required: true },
  ],
  scheduleService: [
    { name: 'client', label: 'Client', required: true },
    { name: 'equipment', label: 'Equipment', required: true },
    { name: 'type', label: 'Service type', required: true },
    { name: 'engineer', label: 'Engineer', required: true },
    { name: 'date', label: 'Date', required: true },
    { name: 'time', label: 'Time', required: true },
  ],
  createTicket: [
    { name: 'client', label: 'Client', required: true },
    { name: 'equipment', label: 'Equipment', required: true },
    { name: 'issue', label: 'Issue', required: true },
    { name: 'priority', label: 'Priority', required: true },
  ],
  addFollowUp: [
    { name: 'contact', label: 'Contact / company', required: true },
    { name: 'type', label: 'Follow-up type', required: true },
    { name: 'date', label: 'Date', required: true },
    { name: 'time', label: 'Time', required: true },
    { name: 'owner', label: 'Owner', required: true },
  ],
  rescheduleFollowUp: [
    { name: 'date', label: 'New date', required: true },
    { name: 'time', label: 'New time', required: true },
    { name: 'reason', label: 'Reason for rescheduling', required: true },
  ],
  addEvent: [
    { name: 'title', label: 'Title', required: true },
    { name: 'kind', label: 'Type', required: true },
    { name: 'owner', label: 'Owner', required: true },
    { name: 'date', label: 'Date', required: true },
    { name: 'start', label: 'Start time', required: true },
    { name: 'end', label: 'End time', required: true },
  ],
};

export function validateFormData(formId: string, body: Record<string, any>): {
  valid: boolean;
  fieldErrors: Record<string, string>;
  message?: string;
} {
  const rules = formRules[formId];
  if (!rules) {
    return { valid: true, fieldErrors: {} };
  }

  const fieldErrors: Record<string, string> = {};
  for (const rule of rules) {
    if (rule.required) {
      const val = body[rule.name];
      if (
        val === undefined ||
        val === null ||
        (typeof val === 'string' && val.trim() === '') ||
        val === false
      ) {
        fieldErrors[rule.name] = `${rule.label} is required.`;
      }
    }
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;
  return {
    valid: !hasErrors,
    fieldErrors,
    message: hasErrors ? Object.values(fieldErrors)[0] : undefined,
  };
}
