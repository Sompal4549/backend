import { ClientModel } from '../../../models/client.model';
import type { ClientsOverview, ClientDetails, ClientListItem } from '../../../types/crm';

const DEFAULT_CLIENTS: ClientListItem[] = [
  {
    id: 'cl-1',
    name: 'Aarogya Ayurveda Hospital & Research',
    contact: 'Dr. Vivek Sharma',
    type: 'Hospital & Clinic',
    owner: 'Simran Kaur',
    activeWork: 'Panchkarma Wing Setup · Installation · Sandeep Kumar',
    outstanding: '₹4,50,000',
    nextFollowUp: { date: 'Tomorrow', time: '11:30 AM' },
  },
  {
    id: 'cl-2',
    name: 'Serene Heritage Wellness Resort',
    contact: 'Vikramaditya Rathore',
    type: 'Resort & Spa',
    owner: 'Ritu Sharma',
    activeWork: 'Luxury Steam & Shirodhara Suite · Production · Rajesh Kumar',
    outstanding: '₹6,00,000',
    nextFollowUp: { date: 'Today', time: '03:00 PM' },
  },
  {
    id: 'cl-3',
    name: 'Sanjeevani Wellness Center',
    contact: 'Dr. Sunita Rao',
    type: 'Wellness Center',
    owner: 'Simran Kaur',
    activeWork: 'Equipment Delivery Batch 2 · Dispatch · Rajesh Kumar',
    outstanding: '₹2,80,000',
    nextFollowUp: { date: 'Friday', time: '02:00 PM' },
  },
];

export const clientsService = {
  async getOverview(): Promise<ClientsOverview> {
    const dbClients = await ClientModel.find({ isDeleted: { $ne: true } })
      .populate('owner', 'name')
      .lean()
      .catch(() => []);

    const mappedClients: ClientListItem[] = dbClients.map((c: any) => ({
      id: c._id.toString(),
      name: c.name || 'Client',
      contact: c.contact || 'Primary Contact',
      type: c.type || 'Ayurveda Clinic',
      city: c.city || 'Delhi NCR',
      owner: typeof c.owner === 'string' ? c.owner : c.owner?.name || 'Simran Kaur',
      activeWork: '',
      outstanding: c.outstanding || '₹5,00,000',
      nextFollowUp: {
        date: c.nextFollowUp?.date || 'Next Week',
        time: c.nextFollowUp?.time || '',
      },
    }));

    const allClients = mappedClients.length > 0 ? mappedClients : DEFAULT_CLIENTS;
    const total = allClients.length;

    return {
      kpis: {
        total,
        active: total,
        outstanding: '₹13.3L',
        overdue: '₹1.5L',
      },
      clients: allClients,
      total,
      needsAttention: [
        { id: 'na-cl-1', count: 1, label: 'Serene Resort payment of ₹1.5L overdue by 12 days' },
        { id: 'na-cl-2', count: 1, label: 'Aarogya Ayurveda requires handover inspection signoff' },
      ],
      coverage: { assigned: total, unassigned: 0 },
      businessMix: [
        { key: 'equipment', label: 'Equipment', count: Math.ceil(total * 0.5) },
        { key: 'turnkey', label: 'Turnkey', count: Math.ceil(total * 0.3) },
        { key: 'consultancy', label: 'Consultancy', count: Math.floor(total * 0.2) },
      ],
      upcomingActions: [
        {
          id: 'ua-1',
          client: 'Serene Heritage Resort',
          city: 'Udaipur',
          action: 'Dispatch Payment Collection Call',
          owner: 'Ritu Sharma',
          due: 'Today, 03:00 PM',
          status: { label: 'In Progress', tone: 'accent' },
        },
        {
          id: 'ua-2',
          client: 'Aarogya Ayurveda Hospital',
          city: 'Jaipur',
          action: 'Panchkarma Bed Installation Signoff',
          owner: 'Sandeep Kumar',
          due: 'Tomorrow, 11:30 AM',
          status: { label: 'Pending', tone: 'warning' },
        },
      ],
    };
  },

  async getById(id: string): Promise<ClientDetails> {
    const c: any = await ClientModel.findById(id).lean().catch(() => null);

    return {
      id,
      name: c?.name || 'Aarogya Ayurveda Hospital & Research',
      status: 'Active',
      contact: c?.contact || 'Dr. Vivek Sharma (Medical Director)',
      phone: c?.phone || '+91 98765 43210',
      email: c?.email || 'vivek@aarogyaayurveda.in',
      type: c?.type || 'Hospital & Research Center',
      city: c?.city || 'Jaipur, Rajasthan',
      totals: {
        business: '₹18,50,000',
        received: '₹14,00,000',
        outstanding: c?.outstanding || '₹4,50,000',
        overdue: '₹0',
      },
      activeWork: [
        { orderNo: 'PRJ-2026-018', description: 'Complete Panchkarma Therapy Center Setup', value: '₹18,50,000', status: { label: 'Installation', tone: 'neutral' }, dispatchTarget: 'Sandeep Kumar' },
      ],
      salesRecords: [
        { id: 'SO-2026-042', type: 'Sales Order', typeNote: 'Paid', description: '₹18,50,000', value: '₹18,50,000', status: { label: 'In Progress', tone: 'accent' } },
      ],
      activity: [
        { id: 'ACT-1', date: 'Yesterday', time: '03:15 PM', activity: 'Installation engineer reached site for pre-delivery inspection.', details: '', by: 'Sandeep Kumar' },
        { id: 'ACT-2', date: '15 Oct 2026', time: '', activity: 'Quotation revision 2 approved.', details: 'By Dr. Sharma.', by: 'Simran Kaur' },
      ],
      nextAction: { when: 'Tomorrow, 11:30 AM', description: 'Pre-handover equipment audit with technical team', owner: 'Sandeep Kumar' },
      billing: { paymentTerms: '50% Advance, 40% against dispatch, 10% after handover', latestInvoice: 'INV-2026-042 (Paid: ₹14,00,000)' },
    };
  },

  async create(data: Record<string, unknown>): Promise<{ id: string }> {
    const ownerName: string = typeof data.owner === 'string' ? data.owner : (String(data.ownerName || '') || 'Simran Kaur');
    const client = new ClientModel({
      name: data.name || data.fullName || 'New Client',
      contact: data.contact || data.primaryContact || data.name || 'Primary Contact',
      phone: data.phone || data.mobile || '9810000000',
      email: data.email || data.officialEmail || 'client@example.com',
      type: data.type || data.clientType || 'Clinic',
      city: data.city || data.city || 'Delhi NCR',
      owner: ownerName,
      outstanding: data.outstanding || '0',
      gstin: data.gstin || '',
      panNumber: data.panNumber || '',
      isGstRegistered: data.isGstRegistered ?? Boolean(data.gstin),
      billingAddress: data.billingAddress || '',
      deliverySameAsBilling: data.deliverySameAsBilling ?? true,
      consigneeName: data.consigneeName || '',
      consigneeContact: data.consigneeContact || '',
      consigneeAddress: data.consigneeAddress || '',
      consigneeGstin: data.consigneeGstin || '',
    });
    await client.save();
    return { id: client._id.toString() };
  },

  async update(id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    await ClientModel.findByIdAndUpdate(id, { $set: data }).catch(() => null);
    return { id };
  },

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await ClientModel.findByIdAndUpdate(id, {
      $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || 'system' },
    }).catch(() => null);
  },

  async restore(id: string): Promise<void> {
    await ClientModel.findByIdAndUpdate(id, {
      $set: { isDeleted: false, deletedAt: null, deletedBy: null },
    }).catch(() => null);
  },
};
