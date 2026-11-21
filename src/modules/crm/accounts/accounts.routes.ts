import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';

export const crmAccountsRouter = Router();

crmAccountsRouter.get('/overview', (_req, res) => {
  const accountsOverview = {
    kpis: {
      collectionsMtd: '₹12.8L',
      collectionsChange: '+12%',
      receivables: '₹6.8L',
      receivablesOverdue: '₹1.2L',
      overdue: '₹1.2L',
      overdueShare: '18%',
      expensesMtd: '₹8.6L',
      expensesChange: '-8%',
    },
    receivables: [
      {
        invoice: 'INV-0142',
        client: 'Aarogya Ayurveda',
        value: '₹2,40,000.00',
        received: '₹1,55,000.00',
        outstanding: '₹85,000.00',
        dueDate: '18 Oct 2026',
        status: { label: 'Part paid', tone: 'warning' },
      },
      {
        invoice: 'INV-0143',
        client: 'Serene Resort',
        value: '₹3,40,000.00',
        received: '₹1,80,000.00',
        outstanding: '₹1,60,000.00',
        dueDate: '17 Oct 2026',
        status: { label: 'Part paid', tone: 'warning' },
      },
      {
        invoice: 'INV-0138',
        client: 'Veda Clinic',
        value: '₹1,20,000.00',
        received: '₹75,000.00',
        outstanding: '₹45,000.00',
        dueDate: '13 Oct 2026',
        status: { label: 'Overdue', tone: 'danger' },
      },
    ],
    approvals: [
      { key: 'expenses', title: '3 expenses pending approval', lines: ['Total value: ₹58,200.00'], count: 3 },
      { key: 'vendor', title: '1 vendor payment awaiting approval', lines: ['Supplier: Wellness Suppliers', '₹42,000.00'], count: 1 },
    ],
    balances: [
      { key: 'cash', label: 'Cash (Petty Cash)', amount: '₹40,000.00' },
      { key: 'bank', label: 'Bank (HDFC - 9876)', amount: '₹9,00,000.00' },
    ],
    totalBalance: '₹9,40,000.00',
    transactions: [
      {
        id: 'txn-1',
        date: '14 Oct 2026',
        time: '11:30 AM',
        type: 'Receipt',
        voucher: 'RC-0094',
        party: 'Aarogya Ayurveda',
        description: 'Invoice payment (INV-0142)',
        amount: '+₹35,000.00',
        mode: 'Bank (HDFC - 9876)',
        status: { label: 'Cleared', tone: 'success' },
      },
      {
        id: 'txn-2',
        date: '14 Oct 2026',
        time: '02:00 PM',
        type: 'Expense',
        voucher: 'EXP-0041',
        party: 'Travel',
        description: 'Travel expense - Site visit',
        amount: '-₹8,200.00',
        mode: 'Company Card',
        status: { label: 'Pending approval', tone: 'warning' },
      },
      {
        id: 'txn-3',
        date: '12 Oct 2026',
        time: '04:15 PM',
        type: 'Payment',
        voucher: 'PV-0041',
        party: 'Ayur Packaging',
        description: 'Vendor payment (PO-0068)',
        amount: '-₹42,000.00',
        mode: 'Bank (HDFC - 9876)',
        status: { label: 'Cleared', tone: 'success' },
      },
    ],
  };
  successResponse(res, accountsOverview, 'Accounts overview retrieved');
});

crmAccountsRouter.get('/lookups', (_req, res) => {
  const lookups = {
    clients: ['Aarogya Ayurveda', 'Serene Resort', 'Veda Clinic', 'Healing Centre'],
    openInvoices: [
      { id: 'INV-0144', client: 'Aarogya Ayurveda', total: 224200, paidBefore: 0 },
      { id: 'INV-0142', client: 'Aarogya Ayurveda', total: 240000, paidBefore: 155000 },
      { id: 'INV-0143', client: 'Serene Resort', total: 340000, paidBefore: 100000 },
      { id: 'INV-0138', client: 'Veda Clinic', total: 160000, paidBefore: 160000 },
    ],
    bankAccounts: ['HDFC (ending 9876)', 'ICICI (ending 4410)', 'Cash (Petty Cash)'],
    vendors: ['WellnessComponents', 'Raj Traders', 'Urban MEP Solutions'],
  };
  successResponse(res, lookups, 'Accounts lookups retrieved');
});

crmAccountsRouter.get('/invoices/new', (_req, res) => {
  const invoice = {
    id: `INV-2026-${String(Math.floor(Math.random() * 900 + 100))}`,
    date: new Date().toISOString().slice(0, 10),
    status: 'Draft',
    source: 'SO0090 / QT0130Rev2',
    owner: 'Simran Kaur',
    client: 'Aarogya Ayurveda',
    contact: 'Dr. Neha',
    city: 'Jaipur',
    placeOfSupply: 'Rajasthan',
    seller: { name: 'Design House India Pvt Ltd / ENSIS', gstin: '07AAAAA0000A1Z5', address: 'Delhi NCR' },
    lines: [
      { id: 'i1', name: 'Steam Chamber', spec: 'Standard model', hsn: '8419', qty: 2, unit: 'Nos.', rate: 65000, discount: 0, gst: 18 },
      { id: 'i2', name: 'Therapy Table', spec: 'Standard model', hsn: '9403', qty: 1, unit: 'Nos.', rate: 45000, discount: 0, gst: 18 },
    ],
    discount: 5000,
    advanceReceived: 50000,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    paymentInstructions: 'Bank transfer to HDFC A/c 50200012345678',
    note: '',
  };
  successResponse(res, invoice, 'Invoice draft created');
});

crmAccountsRouter.get('/receipts/new', (_req, res) => {
  const receipt = {
    id: `RC-2026-${String(Math.floor(Math.random() * 900 + 100))}`,
    dateTime: new Date().toISOString().slice(0, 16),
    client: 'Aarogya Ayurveda',
    amount: 112100,
    method: 'NEFT',
    bankAccount: 'HDFC (ending 9876)',
    reference: 'EXAMPLE-NEFT-001',
    allocations: [{ invoiceId: 'INV-0144', allocate: 112100 }],
    notes: '50% order advance SO0090.',
    proof: [],
  };
  successResponse(res, receipt, 'Receipt draft created');
});

crmAccountsRouter.get('/vendor-payments/new', (_req, res) => {
  const payment = {
    id: `PAY-2026-${String(Math.floor(Math.random() * 900 + 100))}`,
    date: new Date().toISOString().slice(0, 10),
    vendor: 'WellnessComponents',
    source: 'PO0070 / BILL0104',
    billAmount: 47200,
    paidBefore: 0,
    amount: 23600,
    mode: 'Bank Transfer',
    fromAccount: 'HDFC (ending 9876)',
    verifiedBeneficiary: true,
    purpose: '50% PO advance',
    reference: '',
    attachment: [],
    approvalRoute: 'Accounts Manager',
    threshold: 25000,
  };
  successResponse(res, payment, 'Vendor payment draft created');
});

crmAccountsRouter.get('/expenses/new', (_req, res) => {
  const expense = {
    id: `EXP-2026-${String(Math.floor(Math.random() * 900 + 100))}`,
    date: new Date().toISOString().slice(0, 10),
    type: 'Employee Reimbursement',
    category: 'Travel & Site Visit',
    description: 'Jaipur site visit',
    employee: 'Sandeep Kumar',
    department: 'Projects',
    branch: 'Ghaziabad',
    project: 'PJ0018',
    amount: 8200,
    currency: 'INR',
    taxIncluded: 'Yes',
    inputTaxCredit: 'Not claimed',
    paidBy: 'Employee',
    mode: 'UPI',
    receipt: [],
  };
  successResponse(res, expense, 'Expense draft created');
});

crmAccountsRouter.get('/statements', (req, res) => {
  const client = (req.query.client as string) || 'Aarogya Ayurveda';
  const statement = {
    client,
    from: '2026-10-01',
    to: new Date().toISOString().slice(0, 10),
    openingBalance: 0,
    entries: [
      { at: '14 Oct 2026', type: 'Invoice', ref: 'INV-0142', description: 'Equipment Supply', debit: 240000, credit: 0 },
      { at: '14 Oct 2026 10:05 AM', type: 'Receipt', ref: 'RC-0093', description: 'Advance Received', debit: 0, credit: 120000 },
      { at: '17 Nov 2026 11:00 AM', type: 'Invoice', ref: 'INV-0144', description: 'Therapy Tables', debit: 224200, credit: 0 },
      { at: '17 Nov 2026 12:00 PM', type: 'Receipt', ref: 'RC-0095', description: 'Part Payment', debit: 0, credit: 112100 },
    ],
    dueBreakdown: { historical: 85000, current: 112100 },
  };
  successResponse(res, statement, 'Client statement retrieved');
});
crmAccountsRouter.get('/statement', (req, res) => {
  const client = (req.query.client as string) || 'Aarogya Ayurveda';
  const statement = {
    client,
    from: '2026-10-01',
    to: new Date().toISOString().slice(0, 10),
    openingBalance: 0,
    entries: [
      { at: '14 Oct 2026', type: 'Invoice', ref: 'INV-0142', description: 'Equipment Supply', debit: 240000, credit: 0 },
      { at: '14 Oct 2026 10:05 AM', type: 'Receipt', ref: 'RC-0093', description: 'Advance Received', debit: 0, credit: 120000 },
      { at: '17 Nov 2026 11:00 AM', type: 'Invoice', ref: 'INV-0144', description: 'Therapy Tables', debit: 224200, credit: 0 },
      { at: '17 Nov 2026 12:00 PM', type: 'Receipt', ref: 'RC-0095', description: 'Part Payment', debit: 0, credit: 112100 },
    ],
    dueBreakdown: { historical: 85000, current: 112100 },
  };
  successResponse(res, statement, 'Client statement retrieved');
});
