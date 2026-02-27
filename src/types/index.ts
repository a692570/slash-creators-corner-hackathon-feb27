// ===========================================
// CORE TYPE DEFINITIONS - SLASH
// ===========================================

// -------------------------------------------
// USER TYPES
// -------------------------------------------

export interface User {
  id: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  email: string;
  password: string;
  phone: string;
}

export interface UserResponse {
  id: string;
  email: string;
  phone: string;
  createdAt: string;
}

// -------------------------------------------
// BILL CATEGORY TYPES
// -------------------------------------------

export type BillCategory = 'internet' | 'cell_phone' | 'insurance' | 'medical';

// -------------------------------------------
// PROVIDER TYPES
// -------------------------------------------

// Internet/Cable providers
export type InternetProviderId = 
  | 'comcast'
  | 'spectrum'
  | 'att'
  | 'verizon'
  | 'cox'
  | 'optimum';

// Cell phone providers
export type CellPhoneProviderId = 
  | 'tmobile'
  | 'verizon_wireless'
  | 'att_wireless'
  | 'mint_mobile'
  | 'cricket';

// Insurance providers
export type InsuranceProviderId = 
  | 'state_farm'
  | 'geico'
  | 'progressive'
  | 'allstate'
  | 'liberty_mutual'
  | 'usaa';

// Medical providers are user-entered (no fixed list)

export type ProviderId = InternetProviderId | CellPhoneProviderId | InsuranceProviderId | string;

export interface Provider {
  id: ProviderId;
  name: string;
  displayName: string;
  category: BillCategory;
  logoUrl: string;
  retentionDepartmentPhone?: string;
  customerServicePhone?: string;
}

// -------------------------------------------
// BILL TYPES
// -------------------------------------------

export type BillStatus = 'active' | 'negotiating' | 'pending' | 'cancelled' | 'negotiated';

export interface Bill {
  id: string;
  userId: string;
  provider: ProviderId;
  category: BillCategory;
  providerName?: string; // For medical bills - user-entered provider name
  accountNumber: string;
  currentRate: number;
  planName?: string;
  billDate?: string;
  status: BillStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillCreateInput {
  provider: ProviderId;
  category: BillCategory;
  providerName?: string; // For medical bills
  accountNumber: string;
  currentRate: number;
  planName?: string;
  billDate?: string;
}

export interface BillUpdateInput {
  accountNumber?: string;
  currentRate?: number;
  planName?: string;
  billDate?: string;
  status?: BillStatus;
}

export interface BillResponse {
  id: string;
  provider: ProviderId;
  category: BillCategory;
  providerName?: string;
  accountNumber: string;
  currentRate: number;
  planName?: string;
  billDate?: string;
  status: BillStatus;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------
// CC STATEMENT SCANNER TYPES
// -------------------------------------------

export interface DetectedBill {
  provider: ProviderId | string;
  category: BillCategory;
  amount: number;
  transactionDate: string;
  description: string;
  confidence: number; // 0-1, how confident we are this is a negotiable bill
}

// -------------------------------------------
// NEGOTIATION TYPES
// -------------------------------------------

export type NegotiationStatus = 
  | 'pending'
  | 'researching'
  | 'calling'
  | 'negotiating'
  | 'success'
  | 'failed'
  | 'cancelled';

export type NegotiationTactic = 
  | 'competitor_conquest'
  | 'loyalty_play'
  | 'churn_threat'
  | 'retention_close'
  | 'supervisor_request'
  | 'cash_pay_discount'      // Medical specific
  | 'payment_plan'           // Medical specific
  | 'itemized_bill_review';  // Medical specific

export interface NegotiationAttempt {
  tactic: NegotiationTactic;
  timestamp: Date;
  outcome: 'success' | 'failed' | 'escalated';
  notes?: string;
}

export interface Negotiation {
  id: string;
  billId: string;
  userId: string;
  status: NegotiationStatus;
  customerName?: string; // Customer name for the AI to use when asked
  
  // Research data
  competitorRates?: CompetitorRate[];
  
  // Strategy
  selectedTactics?: NegotiationTactic[];
  currentTacticIndex?: number;
  
  // Call details
  telnyxCallId?: string;
  startedAt?: Date;
  completedAt?: Date;
  
  // Results
  originalRate: number;
  newRate?: number;
  monthlySavings?: number;
  totalSavings?: number;
  
  // History
  attempts: NegotiationAttempt[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface NegotiationResponse {
  id: string;
  billId: string;
  status: NegotiationStatus;
  originalRate: number;
  newRate?: number;
  monthlySavings?: number;
  attempts: NegotiationAttempt[];
  createdAt: string;
}

// -------------------------------------------
// COMPETITOR RESEARCH TYPES
// -------------------------------------------

export interface CompetitorRate {
  provider: ProviderId;
  planName: string;
  monthlyRate: number;
  contractTerms?: string;
  source: string;
  scrapedAt: Date;
}

// -------------------------------------------
// KNOWLEDGE GRAPH TYPES (Neo4j)
// -------------------------------------------

export interface RetentionOffer {
  provider: ProviderId;
  trigger: string;
  typicalDiscount: number;
  successRate: number;
}

export interface ProviderLeverage {
  provider: ProviderId;
  competitorOffers: CompetitorRate[];
  retentionOffers: RetentionOffer[];
  historicalNegotiations: number;
  averageSavings: number;
}

// -------------------------------------------
// API RESPONSE TYPES
// -------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// -------------------------------------------
// WEBHOOK TYPES (Telnyx)
// -------------------------------------------

export interface TelnyxWebhookPayload {
  event_type: string;
  payload: {
    call_id: string;
    call_control_id: string;
    state: string;
    duration?: number;
    result?: {
      outcome?: string;
      recording_url?: string;
    };
  };
}

// -------------------------------------------
// DASHBOARD TYPES
// -------------------------------------------

export interface UserStats {
  totalBills: number;
  activeNegotiations: number;
  completedNegotiations: number;
  successfulNegotiations: number;
  totalMonthlySavings: number;
  totalLifetimeSavings: number;
  successRate: number;
}

export interface DashboardData {
  user: UserResponse;
  stats: UserStats;
  recentNegotiations: NegotiationResponse[];
  activeBills: BillResponse[];
}

// -------------------------------------------
// CONSTANTS
// -------------------------------------------

// Category display names
export const CATEGORY_NAMES: Record<BillCategory, string> = {
  internet: 'Internet/Cable',
  cell_phone: 'Cell Phone',
  insurance: 'Insurance (Auto/Home)',
  medical: 'Medical Bills',
};

// Internet/Cable providers
const INTERNET_PROVIDERS: Record<InternetProviderId, Provider> = {
  comcast: {
    id: 'comcast',
    name: 'comcast',
    displayName: 'Xfinity',
    category: 'internet',
    logoUrl: '/logos/comcast.svg',
    retentionDepartmentPhone: '1-800-934-6489',
  },
  spectrum: {
    id: 'spectrum',
    name: 'spectrum',
    displayName: 'Spectrum',
    category: 'internet',
    logoUrl: '/logos/spectrum.svg',
    retentionDepartmentPhone: '1-866-564-2255',
  },
  att: {
    id: 'att',
    name: 'att',
    displayName: 'AT&T Internet',
    category: 'internet',
    logoUrl: '/logos/att.svg',
    retentionDepartmentPhone: '1-800-331-0500',
  },
  verizon: {
    id: 'verizon',
    name: 'verizon',
    displayName: 'Verizon Fios',
    category: 'internet',
    logoUrl: '/logos/verizon.svg',
    retentionDepartmentPhone: '1-888-294-4357',
  },
  cox: {
    id: 'cox',
    name: 'cox',
    displayName: 'Cox Communications',
    category: 'internet',
    logoUrl: '/logos/cox.svg',
    retentionDepartmentPhone: '1-800-234-3993',
  },
  optimum: {
    id: 'optimum',
    name: 'optimum',
    displayName: 'Optimum',
    category: 'internet',
    logoUrl: '/logos/optimum.svg',
    retentionDepartmentPhone: '1-866-218-3130',
  },
};

// Cell phone providers
const CELL_PHONE_PROVIDERS: Record<CellPhoneProviderId, Provider> = {
  tmobile: {
    id: 'tmobile',
    name: 'tmobile',
    displayName: 'T-Mobile',
    category: 'cell_phone',
    logoUrl: '/logos/tmobile.svg',
    retentionDepartmentPhone: '1-877-746-0909',
    customerServicePhone: '1-800-937-8997',
  },
  verizon_wireless: {
    id: 'verizon_wireless',
    name: 'verizon_wireless',
    displayName: 'Verizon Wireless',
    category: 'cell_phone',
    logoUrl: '/logos/verizon.svg',
    retentionDepartmentPhone: '1-888-294-4357',
    customerServicePhone: '1-800-922-0204',
  },
  att_wireless: {
    id: 'att_wireless',
    name: 'att_wireless',
    displayName: 'AT&T Wireless',
    category: 'cell_phone',
    logoUrl: '/logos/att.svg',
    retentionDepartmentPhone: '1-800-331-0500',
    customerServicePhone: '1-800-331-0500',
  },
  mint_mobile: {
    id: 'mint_mobile',
    name: 'mint_mobile',
    displayName: 'Mint Mobile',
    category: 'cell_phone',
    logoUrl: '/logos/mint.svg',
    customerServicePhone: '1-800-683-7017',
  },
  cricket: {
    id: 'cricket',
    name: 'cricket',
    displayName: 'Cricket Wireless',
    category: 'cell_phone',
    logoUrl: '/logos/cricket.svg',
    customerServicePhone: '1-800-274-2538',
  },
};

// Insurance providers
const INSURANCE_PROVIDERS: Record<InsuranceProviderId, Provider> = {
  state_farm: {
    id: 'state_farm',
    name: 'state_farm',
    displayName: 'State Farm',
    category: 'insurance',
    logoUrl: '/logos/statefarm.svg',
    customerServicePhone: '1-800-782-8332',
  },
  geico: {
    id: 'geico',
    name: 'geico',
    displayName: 'Geico',
    category: 'insurance',
    logoUrl: '/logos/geico.svg',
    customerServicePhone: '1-800-207-7847',
  },
  progressive: {
    id: 'progressive',
    name: 'progressive',
    displayName: 'Progressive',
    category: 'insurance',
    logoUrl: '/logos/progressive.svg',
    customerServicePhone: '1-800-776-4737',
  },
  allstate: {
    id: 'allstate',
    name: 'allstate',
    displayName: 'Allstate',
    category: 'insurance',
    logoUrl: '/logos/allstate.svg',
    customerServicePhone: '1-800-255-7828',
  },
  liberty_mutual: {
    id: 'liberty_mutual',
    name: 'liberty_mutual',
    displayName: 'Liberty Mutual',
    category: 'insurance',
    logoUrl: '/logos/libertymutual.svg',
    customerServicePhone: '1-800-290-8711',
  },
  usaa: {
    id: 'usaa',
    name: 'usaa',
    displayName: 'USAA',
    category: 'insurance',
    logoUrl: '/logos/usaa.svg',
    customerServicePhone: '1-800-531-8722',
  },
};

// All providers combined
export const PROVIDERS: Record<ProviderId, Provider> = {
  ...INTERNET_PROVIDERS,
  ...CELL_PHONE_PROVIDERS,
  ...INSURANCE_PROVIDERS,
};

// Providers by category
export const PROVIDERS_BY_CATEGORY: Record<BillCategory, Provider[]> = {
  internet: Object.values(INTERNET_PROVIDERS),
  cell_phone: Object.values(CELL_PHONE_PROVIDERS),
  insurance: Object.values(INSURANCE_PROVIDERS),
  medical: [], // No fixed providers - user enters manually
};

export const DEFAULT_FEE_PERCENTAGE = 0.10; // 10% of savings

export const NEGOTIATION_TACTICS: Record<NegotiationTactic, {
  name: string;
  description: string;
  priority: number;
  categories: BillCategory[]; // Which categories this tactic applies to
}> = {
  competitor_conquest: {
    name: 'Competitor Conquest',
    description: 'Use competitor pricing as leverage',
    priority: 1,
    categories: ['internet', 'cell_phone', 'insurance'],
  },
  loyalty_play: {
    name: 'Loyalty Play',
    description: 'Emphasize customer tenure and loyalty',
    priority: 2,
    categories: ['internet', 'cell_phone', 'insurance'],
  },
  churn_threat: {
    name: 'Churn Threat',
    description: 'Express intent to cancel or switch',
    priority: 3,
    categories: ['internet', 'cell_phone', 'insurance'],
  },
  retention_close: {
    name: 'Retention Close',
    description: 'Close when rep offers discount',
    priority: 4,
    categories: ['internet', 'cell_phone', 'insurance'],
  },
  supervisor_request: {
    name: 'Supervisor Request',
    description: 'Escalate to supervisor for better offers',
    priority: 5,
    categories: ['internet', 'cell_phone', 'insurance'],
  },
  cash_pay_discount: {
    name: 'Cash Pay Discount',
    description: 'Ask for discount if paying cash instead of insurance',
    priority: 1,
    categories: ['medical'],
  },
  payment_plan: {
    name: 'Payment Plan',
    description: 'Set up interest-free payment plan for large bills',
    priority: 2,
    categories: ['medical'],
  },
  itemized_bill_review: {
    name: 'Itemized Bill Review',
    description: 'Request itemized bill to check for errors or overcharges',
    priority: 3,
    categories: ['medical'],
  },
};
