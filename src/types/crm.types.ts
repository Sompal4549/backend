export type StatusView = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

export type LeadSource =
  | 'Website'
  | 'LinkedIn'
  | 'Meta Ads'
  | 'Referral'
  | 'Excel Import'
  | 'WhatsApp'
  | 'Social Media';

export type LeadStage = 'New' | 'Contacted' | 'Qualified' | 'Quotation Sent' | 'Negotiation';

export type LeadListItem = {
  id: string;
  name: string;
  phone: string;
  organisation: string;
  city: string;
  interest: string;
  source: LeadSource;
  owner: { name: string; team: string } | null;
  stage: LeadStage;
  nextFollowUp: { label: string; tone: 'success' | 'danger' | 'warning' | 'neutral' | 'accent' };
};

export type TeamPerformance = {
  key: 'equipment' | 'turnkey' | 'consultancy';
  name: string;
  leads: number;
  won: number;
  target: number;
};

export type NeedsActionItem = {
  id: string;
  label: string;
  action: 'Assign' | 'Review' | 'Check' | 'Resolve';
  kind: 'unassigned' | 'overdue' | 'duplicates' | 'errors';
};

export type StaffFollowUp = { name: string; due: number; overdue: number };

export type UpcomingFollowUp = {
  id: string;
  contact: string;
  owner: string;
  team: string;
  time: string;
  purpose: string;
};

export type LeadsOverview = {
  kpis: {
    newToday: number;
    unassigned: number;
    followUpsDue: number;
    overdueFollowUps: number;
    qualified: number;
    totalLeads: number;
    openPipeline: string;
  };
  teamPerformance: TeamPerformance[];
  sourcesToday: Array<{ key: 'website' | 'social' | 'database' | 'referral'; label: string; count: number }>;
  leads: LeadListItem[];
  totalLeads: number;
  needsAction: NeedsActionItem[];
  pipelineSnapshot: Array<{ stage: string; count: number }>;
  staffFollowUps: StaffFollowUp[];
  upcomingFollowUps: UpcomingFollowUp[];
  upcomingTotal: number;
};

export type LeadDetails = {
  id: string;
  name: string;
  stage: LeadStage;
  organisation: string;
  city: string;
  phone: string;
  email: string;
  info: Array<{ label: string; value: string }>;
  nextFollowUp: { when: string; purpose: string; owner: string };
  requirement: Array<{ label: string; value: string }>;
  opportunity: { id: string; title: string; stage: string; value: string; expectedClose: string };
  latestActivity: string;
};

export type PipelineStageKey = 'requirement' | 'proposal' | 'quotation' | 'negotiation';

export type PipelineCard = {
  id: string;
  title: string;
  client: string;
  city: string;
  value: string;
  owner: string;
  businessType: string;
  closeBy: string;
  nextAction: {
    kind: 'call' | 'meeting' | 'document' | 'email' | 'pending' | 'overdue';
    label: string;
    when: string;
    tone: 'success' | 'danger' | 'warning';
  };
};

export type PipelineColumn = {
  key: PipelineStageKey;
  title: string;
  deals: number;
  value: string;
  cards: PipelineCard[];
};

export type SalesPipeline = {
  kpis: { openOpportunities: number; pipelineValue: string; closingThisMonth: number; overdueNextActions: number };
  columns: PipelineColumn[];
  teamPerformance: TeamPerformance[];
  closed: { won: number; lost: number };
  alerts: { needFollowUp: number; approvalsPending: number };
};

export type OpportunityDetails = {
  id: string;
  title: string;
  client: string;
  contact: string;
  city: string;
  value: string;
  stage: string;
  owner: string;
  salesTeam: string;
  expectedClose: string;
  businessType: string;
  linkedLead: string;
  scope: string;
  latestQuotation: { id: string; revision: string; sentOn: string; value: string; status: StatusView };
  activity: Array<{ id: string; title: string; by: string; at: string; detail: string; tone: 'success' | 'neutral' }>;
};

export type ClientListItem = {
  id: string;
  name: string;
  contact: string;
  type: string;
  owner: string;
  activeWork: string;
  outstanding: string;
  nextFollowUp: { date: string; time: string; overdue?: boolean; muted?: boolean };
};

export type ClientsOverview = {
  kpis: { total: number; active: number; outstanding: string; overdue: string };
  clients: ClientListItem[];
  total: number;
  needsAttention: Array<{ id: string; count: number; label: string }>;
  coverage: { assigned: number; unassigned: number };
  businessMix: Array<{ key: 'equipment' | 'turnkey' | 'consultancy'; label: string; count: number }>;
  upcomingActions: Array<{
    id: string;
    client: string;
    city: string;
    action: string;
    owner: string;
    due: string;
    status: StatusView;
  }>;
};

export type ClientDetails = {
  id: string;
  name: string;
  status: string;
  contact: string;
  phone: string;
  email: string;
  type: string;
  city: string;
  totals: { business: string; received: string; outstanding: string; overdue: string };
  activeWork: Array<{
    orderNo: string;
    description: string;
    value: string;
    status: StatusView;
    dispatchTarget: string;
  }>;
  salesRecords: Array<{
    id: string;
    type: string;
    typeNote?: string;
    description: string;
    value: string;
    status: StatusView;
  }>;
  activity: Array<{ id: string; date: string; time: string; activity: string; details: string; by: string }>;
  nextAction: { when: string; description: string; owner: string };
  billing: { paymentTerms: string; latestInvoice: string };
};

export type UserRole =
  | 'Super Admin'
  | 'Sales Manager'
  | 'Project Manager'
  | 'Production Manager'
  | 'Production Executive'
  | 'Purchase Manager'
  | 'Accounts Manager'
  | 'HR Manager'
  | 'Admin Executive';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
