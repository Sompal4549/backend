import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';

export const crmInventoryRouter = Router();

const lowStock = { label: 'Low stock', tone: 'accent', icon: 'alert' };
const inStock = { label: 'In stock', tone: 'success', icon: 'check' };

const inventoryOverview = {
  kpis: { activeSkus: 156, lowStock: 5, reservedValue: '₹1.8L', stockValue: '₹8.4L' },
  items: [
    { name: 'Brass fitting', sku: 'BF-12', location: 'WH-A', onHand: 40, reserved: 30, available: 10, reorderAt: 15, status: lowStock },
    { name: 'Steam controller', sku: 'SC-08', location: 'WH-A', onHand: 12, reserved: 8, available: 4, reorderAt: 5, status: lowStock },
    { name: 'Teak panel', sku: 'TP-24', location: 'WH-B', onHand: 60, reserved: 20, available: 40, reorderAt: 15, status: inStock },
    { name: 'Therapy cushion', sku: 'TC-04', location: 'WH-B', onHand: 28, reserved: 6, available: 22, reorderAt: 10, status: inStock },
    { name: 'Heating element', sku: 'HE-06', location: 'WH-A', onHand: 18, reserved: 10, available: 8, reorderAt: 10, status: lowStock },
  ],
  readiness: [
    { jobId: 'JB-0086', item: 'Steam chamber', quantity: '1 set', status: { label: '1 shortage', tone: 'danger', icon: 'warning' } },
    { jobId: 'JB-0087', item: 'Therapy tables', quantity: '2 sets', status: { label: 'Ready', tone: 'success', icon: 'check' } },
  ],
  receipts: [
    { poId: 'PO-0069', item: 'Brass fittings', expected: '15 Oct 2026', qty: 50, status: { label: 'Due soon', tone: 'accent' } },
    { poId: 'PO-0068', item: 'Teak panels', expected: '17 Oct 2026', qty: 30, status: { label: 'On schedule', tone: 'info' } },
  ],
  movements: [
    {
      date: '14 Oct 2026',
      time: '10:30 AM',
      type: { label: 'Receipt', tone: 'success' },
      reference: 'GRN-0048',
      item: 'Brass fitting',
      sku: 'BF-12',
      from: '-',
      to: 'WH-A',
      qty: '+20',
      qtyTone: 'success',
      reason: 'Purchase receipt',
      remarks: 'Against PO-0067',
      by: 'Rajesh Kumar',
    },
    {
      date: '14 Oct 2026',
      time: '11:45 AM',
      type: { label: 'Issue', tone: 'danger' },
      reference: 'MI-0082',
      item: 'Steam controller',
      sku: 'SC-08',
      from: 'WH-A',
      to: '-',
      qty: '-6',
      qtyTone: 'danger',
      reason: 'Project issue',
      remarks: 'For JB-0086',
      by: 'Sandeep Kumar',
    },
    {
      date: '14 Oct 2026',
      time: '03:20 PM',
      type: { label: 'Transfer', tone: 'info' },
      reference: 'TR-0012',
      item: 'Teak panel',
      sku: 'TP-24',
      from: 'WH-A',
      to: 'WH-B',
      qty: '8',
      qtyTone: 'success',
      reason: 'Inter-location transfer',
      remarks: 'Balance to WH-B',
      by: 'Deepak Verma',
    },
  ],
};

crmInventoryRouter.get('/overview', (_req, res) => {
  successResponse(res, inventoryOverview, 'Inventory overview retrieved');
});

crmInventoryRouter.get('/snapshot', (_req, res) => {
  const snapshot = {
    warehouse: 'WH-A Ghaziabad',
    updatedAt: new Date().toISOString(),
    totalValuation: '₹48,60,000.00',
    items: [
      { sku: 'BRS-TBL-01', name: 'Brass Casting Plate', inStock: 42, reorderLevel: 10, unit: 'pcs', rate: 1200 },
      { sku: 'TK-WOD-02', name: 'Seasoned Teak Planks', inStock: 120, reorderLevel: 25, unit: 'sqft', rate: 350 },
    ],
  };
  successResponse(res, snapshot, 'Stock snapshot retrieved');
});

export default crmInventoryRouter;
