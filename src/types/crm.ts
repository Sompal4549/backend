export interface StatusView {
  label: string;
  tone: 'success' | 'danger' | 'warning' | 'neutral' | 'accent';
}

export type LeadSource = string;
export type LeadStage = string;

export interface TeamPerformance {
  key: string;
  name: string;
  leads: number;
  won: number;
  target: number;
}

export interface NeedsActionItem {
  id: string;
  label: string;
  action: 'Assign' | 'Review' | 'Check' | 'Resolve';
  kind: 'unassigned' | 'overdue' | 'duplicates' | 'errors';
}

export interface StaffFollowUp {
  name: string;
  due: number;
  overdue: number;
}

export interface UpcomingFollowUp {
  id: string;
  contact: string;
  owner: string;
  team: string;
  time: string;
  purpose: string;
}

export interface LeadListItem {
  id: string;
  name: string;
  phone: string;
  organisation: string;
  city: string;
  interest: string;
  source: string;
  owner: { name: string; team: string } | null;
  stage: string;
  nextFollowUp: { label: string; tone: StatusView['tone'] };
}

export interface LeadsOverview {
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
  sourcesToday: Array<{ key: string; label: string; count: number }>;
  leads: LeadListItem[];
  totalLeads: number;
  needsAction: NeedsActionItem[];
  pipelineSnapshot: Array<{ stage: string; count: number }>;
  staffFollowUps: StaffFollowUp[];
  upcomingFollowUps: UpcomingFollowUp[];
  upcomingTotal: number;
}

export interface LeadDetails {
  id: string;
  name: string;
  stage: string;
  organisation: string;
  city: string;
  phone: string;
  email: string;
  info: Array<{ label: string; value: string }>;
  nextFollowUp: { when: string; purpose: string; owner: string };
  requirement: Array<{ label: string; value: string }>;
  opportunity?: { id: string; title: string; stage: string; value: string; expectedClose: string };
  latestActivity: string;
}

export interface PipelineCard {
  id: string;
  title: string;
  client: string;
  city: string;
  value: string;
  owner: string;
  businessType: string;
  closeBy: string;
  nextAction: {
    kind: string;
    label: string;
    when: string;
    tone: string;
  };
}

export interface PipelineColumn {
  key: string;
  title: string;
  deals: number;
  value: string;
  cards: PipelineCard[];
}

export interface SalesPipeline {
  kpis: { openOpportunities: number; pipelineValue: string; closingThisMonth: number; overdueNextActions: number };
  columns: PipelineColumn[];
  teamPerformance: TeamPerformance[];
  closed: { won: number; lost: number };
  alerts: { needFollowUp: number; approvalsPending: number };
}

export interface OpportunityDetails {
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
}

export interface LeadImportPreviewRow {
  name: string;
  organisation: string;
  contact: string;
  interest: string;
  check: 'Ready' | 'Duplicate' | 'Error';
}

export interface LeadImportPreview {
  fileName: string;
  fileSize: string;
  rows: number;
  sheet: string;
  columnMapping: Array<{ source: string; target: string }>;
  summary: { ready: number; duplicates: number; errors: number; total: number };
  preview: LeadImportPreviewRow[];
}

export interface LeadImportRecord {
  id: string;
  fileName: string;
  importedBy: string;
  completedAt: string;
  assignedTo: string;
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
}

export interface ClientListItem {
  id: string;
  name: string;
  contact: string;
  type: string;
  owner: string;
  activeWork: string;
  outstanding: string;
  nextFollowUp: { date: string; time: string; overdue?: boolean; muted?: boolean };
}

export interface ClientsOverview {
  kpis: { total: number; active: number; outstanding: string; overdue: string };
  clients: ClientListItem[];
  total: number;
  needsAttention: Array<{ id: string; count: number; label: string }>;
  coverage: { assigned: number; unassigned: number };
  businessMix: Array<{ key: string; label: string; count: number }>;
  upcomingActions: Array<{
    id: string;
    client: string;
    city: string;
    action: string;
    owner: string;
    due: string;
    status: StatusView;
  }>;
}

export interface ClientDetails {
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
}
