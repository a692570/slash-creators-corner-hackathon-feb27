// ===========================================
// STORAGE SERVICE - In-Memory Storage (MVP)
// ===========================================

import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Bill,
  Negotiation,
  BillCreateInput,
  BillUpdateInput,
  UserCreateInput,
  NegotiationResponse,
  BillResponse,
  UserStats,
  ProviderId,
  BillStatus,
  NegotiationStatus,
  BillCategory,
} from '../types/index.js';

// In-memory storage
const users = new Map<string, User>();
const bills = new Map<string, Bill>();
const negotiations = new Map<string, Negotiation>();

// ===========================================
// USER OPERATIONS
// ===========================================

/**
 * Create a new user
 */
export function createUser(input: UserCreateInput): User {
  const user: User = {
    id: `user_${uuidv4()}`,
    email: input.email,
    phone: input.phone,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  users.set(user.id, user);
  return user;
}

/**
 * Get user by ID
 */
export function getUser(id: string): User | undefined {
  return users.get(id);
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): User | undefined {
  return Array.from(users.values()).find(u => u.email === email);
}

/**
 * List all users (for admin)
 */
export function listUsers(): User[] {
  return Array.from(users.values());
}

// ===========================================
// BILL OPERATIONS
// ===========================================

/**
 * Create a new bill
 */
export function createBill(userId: string, input: BillCreateInput): Bill {
  const bill: Bill = {
    id: `bill_${uuidv4()}`,
    userId,
    provider: input.provider,
    category: input.category,
    providerName: input.providerName,
    accountNumber: input.accountNumber,
    currentRate: input.currentRate,
    planName: input.planName,
    billDate: input.billDate,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  bills.set(bill.id, bill);
  return bill;
}

/**
 * Get bill by ID
 */
export function getBill(id: string): Bill | undefined {
  return bills.get(id);
}

/**
 * Get all bills for a user
 */
export function getUserBills(userId: string): Bill[] {
  return Array.from(bills.values()).filter(b => b.userId === userId);
}

/**
 * Update a bill
 */
export function updateBill(id: string, input: BillUpdateInput): Bill | undefined {
  const bill = bills.get(id);
  if (!bill) return undefined;
  
  const updated: Bill = {
    ...bill,
    ...input,
    updatedAt: new Date(),
  };
  
  bills.set(id, updated);
  return updated;
}

/**
 * Delete a bill
 */
export function deleteBill(id: string): boolean {
  return bills.delete(id);
}

/**
 * Update bill status
 */
export function updateBillStatus(id: string, status: BillStatus): Bill | undefined {
  return updateBill(id, { status });
}

// ===========================================
// NEGOTIATION OPERATIONS
// ===========================================

/**
 * Create a new negotiation
 */
export function createNegotiation(
  billId: string,
  userId: string,
  originalRate: number,
  customerName?: string
): Negotiation {
  const negotiation: Negotiation = {
    id: `neg_${uuidv4()}`,
    billId,
    userId,
    status: 'pending',
    originalRate,
    customerName,
    attempts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  negotiations.set(negotiation.id, negotiation);
  return negotiation;
}

/**
 * Get negotiation by ID
 */
export function getNegotiation(id: string): Negotiation | undefined {
  return negotiations.get(id);
}

/**
 * Get all negotiations for a user
 */
export function getUserNegotiations(userId: string): Negotiation[] {
  return Array.from(negotiations.values())
    .filter(n => n.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get all negotiations for a bill
 */
export function getBillNegotiations(billId: string): Negotiation[] {
  return Array.from(negotiations.values())
    .filter(n => n.billId === billId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Update a negotiation
 */
export function updateNegotiation(
  id: string,
  updates: Partial<Negotiation>
): Negotiation | undefined {
  const negotiation = negotiations.get(id);
  if (!negotiation) return undefined;
  
  const updated: Negotiation = {
    ...negotiation,
    ...updates,
    updatedAt: new Date(),
  };
  
  negotiations.set(id, updated);
  return updated;
}

/**
 * Update negotiation status
 */
export function updateNegotiationStatus(
  id: string,
  status: NegotiationStatus
): Negotiation | undefined {
  return updateNegotiation(id, { status });
}

// ===========================================
// DASHBOARD / STATS
// ===========================================

/**
 * Get user stats for dashboard
 */
export function getUserStats(userId: string): UserStats {
  const userBills = getUserBills(userId);
  const userNegotiations = getUserNegotiations(userId);
  
  const completedNegotiations = userNegotiations.filter(
    n => n.status === 'success' || n.status === 'failed'
  );
  
  const successfulNegotiations = userNegotiations.filter(
    n => n.status === 'success'
  );
  
  const totalMonthlySavings = successfulNegotiations.reduce(
    (sum, n) => sum + (n.monthlySavings || 0),
    0
  );
  
  const totalLifetimeSavings = successfulNegotiations.reduce(
    (sum, n) => sum + (n.totalSavings || 0),
    0
  );
  
  return {
    totalBills: userBills.length,
    activeNegotiations: userNegotiations.filter(n => 
      ['pending', 'researching', 'calling', 'negotiating'].includes(n.status)
    ).length,
    completedNegotiations: completedNegotiations.length,
    successfulNegotiations: successfulNegotiations.length,
    totalMonthlySavings,
    totalLifetimeSavings,
    successRate: completedNegotiations.length > 0
      ? (successfulNegotiations.length / completedNegotiations.length) * 100
      : 0,
  };
}

/**
 * Get all data for dashboard
 */
export function getDashboardData(userId: string) {
  const user = getUser(userId);
  if (!user) return null;
  
  const stats = getUserStats(userId);
  const recentNegotiations = getUserNegotiations(userId).slice(0, 5);
  const activeBills = getUserBills(userId).filter(b => b.status === 'active');
  
  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
    },
    stats,
    recentNegotiations: recentNegotiations.map(formatNegotiationResponse),
    activeBills: activeBills.map(formatBillResponse),
  };
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Format bill for API response
 */
function formatBillResponse(bill: Bill): BillResponse {
  return {
    id: bill.id,
    provider: bill.provider,
    category: bill.category,
    providerName: bill.providerName,
    accountNumber: bill.accountNumber,
    currentRate: bill.currentRate,
    planName: bill.planName,
    billDate: bill.billDate,
    status: bill.status,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
  };
}

/**
 * Format negotiation for API response
 */
function formatNegotiationResponse(negotiation: Negotiation): NegotiationResponse {
  return {
    id: negotiation.id,
    billId: negotiation.billId,
    status: negotiation.status,
    originalRate: negotiation.originalRate,
    newRate: negotiation.newRate,
    monthlySavings: negotiation.monthlySavings,
    attempts: negotiation.attempts,
    createdAt: negotiation.createdAt.toISOString(),
  };
}

// ===========================================
// INITIALIZATION
// ===========================================

/**
 * Initialize storage with sample data (for testing)
 */
export function initializeSampleData(): void {
  // Create a demo user
  const demoUser = createUser({
    email: 'demo@slash.ai',
    password: 'demo123',
    phone: '+15551234567',
  });
  
  // Create sample bills across all verticals
  
  // Internet/Cable bills
  const bill1 = createBill(demoUser.id, {
    provider: 'comcast' as ProviderId,
    category: 'internet' as BillCategory,
    accountNumber: '123456789',
    currentRate: 89.99,
    planName: 'Xfinity Performance',
    billDate: '2026-02-01',
  });
  
  const bill2 = createBill(demoUser.id, {
    provider: 'spectrum' as ProviderId,
    category: 'internet' as BillCategory,
    accountNumber: '987654321',
    currentRate: 69.99,
    planName: 'Spectrum Internet',
    billDate: '2026-02-15',
  });
  
  // Cell phone bill
  const bill3 = createBill(demoUser.id, {
    provider: 'tmobile' as ProviderId,
    category: 'cell_phone' as BillCategory,
    accountNumber: '5551234567',
    currentRate: 85.00,
    planName: 'Magenta MAX',
    billDate: '2026-02-10',
  });
  
  // Insurance bill
  const bill4 = createBill(demoUser.id, {
    provider: 'geico' as ProviderId,
    category: 'insurance' as BillCategory,
    accountNumber: 'GEICO123456',
    currentRate: 145.00,
    planName: 'Auto Insurance - Full Coverage',
    billDate: '2026-02-20',
  });
  
  // Medical bill
  const bill5 = createBill(demoUser.id, {
    provider: 'medical_generic' as ProviderId,
    category: 'medical' as BillCategory,
    providerName: 'Stanford Medical Center',
    accountNumber: 'SMC-789456',
    currentRate: 450.00,
    planName: 'Emergency Room Visit',
    billDate: '2026-01-28',
  });
  
  // Create a completed negotiation (internet)
  const neg1 = createNegotiation(bill1.id, demoUser.id, 89.99);
  updateNegotiation(neg1.id, {
    status: 'success',
    newRate: 69.99,
    monthlySavings: 20,
    totalSavings: 240,
  });
  
  // Create a completed negotiation (cell phone)
  const neg2 = createNegotiation(bill3.id, demoUser.id, 85.00);
  updateNegotiation(neg2.id, {
    status: 'success',
    newRate: 70.00,
    monthlySavings: 15,
    totalSavings: 180,
  });
  
  // Create an active negotiation (insurance)
  const neg3 = createNegotiation(bill4.id, demoUser.id, 145.00);
  updateNegotiation(neg3.id, {
    status: 'negotiating',
  });
  
  console.log('Sample data initialized:', {
    user: demoUser.id,
    bills: [bill1.id, bill2.id, bill3.id, bill4.id, bill5.id],
    negotiations: [neg1.id, neg2.id, neg3.id],
  });
}

// Note: Demo data is seeded via seedDemoBills() in demo-seed.ts, called from index.ts on startup.
// initializeSampleData() is kept as a utility but not auto-called to avoid duplicate data.
