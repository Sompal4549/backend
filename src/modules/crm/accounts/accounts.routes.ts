import { Router, type Request } from 'express';
import { successResponse } from '../../../utils/api-response';
import { inPeriod, inRange, isOverdue, optionMatch, readQuery, textMatch, textMatchKey } from '../crm-filters';

export const crmAccountsRouter = Router();

crmAccountsRouter.get('/overview', (req, res) => {
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
  successResponse(res, filterAccountsOverview(accountsOverview, req), 'Accounts overview retrieved');
});

/** Applies the receivables (`q`, `status`, `due`) and transactions (`txq`, `type`, `period`) filters. */
type AccountsOverviewShape = {
  receivables: Array<{ invoice: string; client: string; dueDate: string; status: { label: string } }>;
  transactions: Array<{ date: string; type: string; voucher: string; party: string; description: string; mode: string }>;
};

function filterAccountsOverview<T extends AccountsOverviewShape>(overview: T, req: Request): T {
  const q = readQuery(req, 'q', 'status', 'due', 'txq', 'type', 'period');

  const receivables = overview.receivables.filter((row) => {
    if (!textMatch(q, row.invoice, row.client)) return false;
    if (!optionMatch(row.status.label, q.status)) return false;
    if (q.due === 'Overdue') return isOverdue(row.dueDate) && row.status.label !== 'Paid';
    if (q.due && !/^all\b/i.test(q.due)) return inPeriod(row.dueDate, q.due);
    return true;
  });

  const transactions = overview.transactions.filter(
    (row) =>
      textMatchKey(q, 'txq', row.voucher, row.party, row.description, row.type, row.mode) &&
      optionMatch(row.type, q.type) &&
      inPeriod(row.date, q.period),
  );

  return { ...overview, receivables, transactions };
}

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

crmAccountsRouter.get('/invoices/new', async (req, res) => {
  const salesOrderId = (req.query.salesOrder || req.query.orderId) as string;
  let clientName = 'Aarogya Ayurveda';
  let contactName = 'Dr. Neha';
  let cityName = 'Jaipur';
  let sourceRef = 'SO0090 / QT0130Rev2';
  let lines = [
    { id: 'i1', name: 'Steam Chamber', spec: 'Standard model', hsn: '8419', qty: 2, unit: 'Nos.', rate: 65000, discount: 0, gst: 18 },
    { id: 'i2', name: 'Therapy Table', spec: 'Standard model', hsn: '9403', qty: 1, unit: 'Nos.', rate: 45000, discount: 0, gst: 18 },
  ];

  if (salesOrderId) {
    try {
      const { SalesOrderModel } = await import('../../../models/sales-order.model');
      let order: any = await SalesOrderModel.findOne({ id: salesOrderId, isDeleted: { $ne: true } }).lean();
      if (!order && salesOrderId.match(/^[0-9a-fA-F]{24}$/)) {
        order = await SalesOrderModel.findById(salesOrderId).lean();
      }
      if (order) {
        clientName = order.client || clientName;
        sourceRef = `${order.id}${order.quotationId ? ` / ${order.quotationId}` : ''}`;
        if (order.lines && order.lines.length > 0) {
          lines = order.lines.map((l: any, idx: number) => ({
            id: l.id || `i${idx + 1}`,
            name: l.name,
            spec: l.spec || 'Standard model',
            hsn: l.hsn || '8419',
            qty: l.qty || 1,
            unit: l.unit || 'Nos.',
            rate: l.rate || 0,
            discount: l.discount || 0,
            gst: l.gst || 18,
          }));
        }
      }
    } catch (_err) {
      // fallback
    }
  }

  const invoice = {
    id: `INV-2026-${String(Math.floor(Math.random() * 900 + 100))}`,
    date: new Date().toISOString().slice(0, 10),
    status: 'Draft',
    source: sourceRef,
    owner: 'Simran Kaur',
    client: clientName,
    contact: contactName,
    city: cityName,
    placeOfSupply: 'Rajasthan',
    seller: { name: 'Design House India Pvt Ltd / ENSIS', gstin: '07AAAAA0000A1Z5', address: 'Delhi NCR' },
    lines,
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

/** Statement ledger for `?client=&from=&to=` — entries outside the period are dropped. */
function buildStatement(req: Request) {
  const q = readQuery(req, 'client', 'from', 'to');
  const client = q.client || 'Aarogya Ayurveda';
  const from = q.from || '2026-10-01';
  const to = q.to || new Date().toISOString().slice(0, 10);
  const allEntries = [
    { at: '14 Oct 2026', type: 'Invoice', ref: 'INV-0142', description: 'Equipment Supply', debit: 240000, credit: 0 },
    { at: '14 Oct 2026 10:05 AM', type: 'Receipt', ref: 'RC-0093', description: 'Advance Received', debit: 0, credit: 120000 },
    { at: '17 Nov 2026 11:00 AM', type: 'Invoice', ref: 'INV-0144', description: 'Therapy Tables', debit: 224200, credit: 0 },
    { at: '17 Nov 2026 12:00 PM', type: 'Receipt', ref: 'RC-0095', description: 'Part Payment', debit: 0, credit: 112100 },
  ];
  const entries = allEntries.filter((entry) => inRange(entry.at, from, to));
  const current = entries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
  const historical = allEntries
    .filter((entry) => !inRange(entry.at, from, to))
    .reduce((sum, entry) => sum + entry.debit - entry.credit, 0);

  return {
    client,
    from,
    to,
    openingBalance: 0,
    entries,
    dueBreakdown: { historical, current },
  };
}

crmAccountsRouter.get('/statements', (req, res) => {
  successResponse(res, buildStatement(req), 'Client statement retrieved');
});

crmAccountsRouter.get('/statement', (req, res) => {
  successResponse(res, buildStatement(req), 'Client statement retrieved');
});
