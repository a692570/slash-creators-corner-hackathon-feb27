// ===========================================
// API CLIENT - Slash Frontend
// ===========================================

// Types
export interface Bill {
  id: string;
  provider: string;
  category: string;
  providerName?: string;
  currentRate: number;
  accountNumber: string;
  planName?: string;
  status?: string;
  createdAt: string;
}

export interface CompetitorRate {
  provider: string;
  planName: string;
  monthlyRate: number;
  contractTerms?: string;
  source: string;
}

export interface Negotiation {
  id: string;
  billId: string;
  status: 'pending' | 'researching' | 'calling' | 'negotiating' | 'success' | 'failed';
  originalRate?: number;
  newRate?: number;
  monthlySavings?: number;
  annualSavings?: number;
  totalSavings?: number;
  competitorRates?: CompetitorRate[];
  selectedTactics?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalSavings: number;
  activeNegotiations: number;
  successRate: number;
  billsTracked: number;
  totalBills?: number;
  totalMonthlySavings?: number;
  totalLifetimeSavings?: number;
  completedNegotiations?: number;
  successfulNegotiations?: number;
}

export interface CreateBillRequest {
  provider: string;
  category: string;
  providerName?: string;
  currentRate: number;
  accountNumber: string;
  planName?: string;
}

export interface SponsorIntegrationStatus {
  configured: boolean;
  status: string;
}

export interface DemoStatus {
  billsSeeded: boolean;
  demoUser: {
    email: string;
    userId: string | null;
  };
  sponsors?: Record<string, SponsorIntegrationStatus>;
  webhookSecurity?: {
    verificationEnabled: boolean;
    mode: string;
  };
}

// ===========================================
// DEMO USER MANAGEMENT
// ===========================================

const DEMO_USER_KEY = 'slash_demo_user_id';

export function getDemoUserId(): string | null {
  return localStorage.getItem(DEMO_USER_KEY);
}

function setDemoUserId(id: string): void {
  localStorage.setItem(DEMO_USER_KEY, id);
}

/**
 * Initialize demo user - call on app boot.
 * Hits POST /api/demo/setup to create/get demo user, stores ID.
 */
export async function initDemoUser(): Promise<string | null> {
  // Check if already initialized
  const existing = getDemoUserId();
  if (existing) return existing;

  try {
    const res = await fetch(`${API_BASE}/demo/setup`, { method: 'POST' });
    const json = await res.json();
    if (json.success && json.data?.userId) {
      setDemoUserId(json.data.userId);
      return json.data.userId;
    }
  } catch (error) {
    console.warn('[API] Demo setup failed:', error);
  }
  return null;
}

// ===========================================
// FETCH WRAPPER
// ===========================================

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const userId = getDemoUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (userId) {
    headers['x-user-id'] = userId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchForm<T>(url: string, formData: FormData, options?: RequestInit): Promise<T> {
  const userId = getDemoUserId();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (userId) {
    headers['x-user-id'] = userId;
  }

  const response = await fetch(url, {
    ...options,
    method: options?.method || 'POST',
    headers,
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `API Error: ${response.status} ${response.statusText}`);
  }

  return payload;
}

// ===========================================
// API METHODS
// ===========================================

export const api = {
  // Bills
  getBills: async (): Promise<Bill[]> => {
    const res = await fetchJSON<any>(`${API_BASE}/bills`);
    // Backend returns { success, data: [...] }
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res)) return res;
    return [];
  },

  getBill: async (id: string): Promise<Bill | null> => {
    const res = await fetchJSON<any>(`${API_BASE}/bills/${id}`);
    return res?.data || res || null;
  },
  
  createBill: async (data: CreateBillRequest): Promise<Bill> => {
    const res = await fetchJSON<any>(`${API_BASE}/bills`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data || res;
  },
  
  negotiateBill: async (billId: string): Promise<{ negotiationId: string; status: string }> => {
    const res = await fetchJSON<any>(`${API_BASE}/bills/${billId}/negotiate`, {
      method: 'POST',
    });
    // Backend returns { success, data: { negotiationId, status, ... } }
    return res?.data || res;
  },
  
  // Negotiations
  getNegotiations: async (): Promise<Negotiation[]> => {
    const res = await fetchJSON<any>(`${API_BASE}/negotiations`);
    // Backend returns { success, data: [...] }
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res)) return res;
    return [];
  },

  getNegotiation: async (id: string): Promise<Negotiation> => {
    const res = await fetchJSON<any>(`${API_BASE}/negotiations/${id}`);
    return res?.data || res;
  },
  
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      const res = await fetchJSON<any>(`${API_BASE}/dashboard`);
      // Backend returns { success, data: { user, stats, recentNegotiations, activeBills } }
      const stats = res?.data?.stats || res?.data || res;
      return {
        totalSavings: stats.totalMonthlySavings || stats.totalSavings || 0,
        activeNegotiations: stats.activeNegotiations || 0,
        successRate: stats.successRate || 0,
        billsTracked: stats.totalBills || stats.billsTracked || 0,
        ...stats,
      };
    } catch (error) {
      console.error('[API] getDashboardStats failed - check if user is authenticated:', error);
      // Return defaults to prevent crash
      return {
        totalSavings: 0,
        activeNegotiations: 0,
        successRate: 0,
        billsTracked: 0,
      };
    }
  },

  // Graph insights
  getProviderInsights: async (providerId: string) => {
    const res = await fetchJSON<any>(`${API_BASE}/graph/provider/${providerId}`);
    return res?.data || res;
  },

  // CC statement scanner
  scanStatement: async (file: File) => {
    const formData = new FormData();
    formData.append('statement', file);
    const res = await fetchForm<any>(`${API_BASE}/scan`, formData);
    return res?.data || res;
  },

  getDemoStatus: async (): Promise<DemoStatus> => {
    const res = await fetchJSON<any>(`${API_BASE}/demo/status`);
    return res?.data || res;
  },

  // SSE connection for live negotiation updates
  getNegotiationStream: (id: string): EventSource => {
    const userId = getDemoUserId();
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return new EventSource(`${API_BASE}/negotiations/${id}/stream${query}`);
  },
};
