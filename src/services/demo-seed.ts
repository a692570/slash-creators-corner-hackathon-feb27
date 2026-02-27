// ===========================================
// DEMO SEED DATA - Pre-populated Bills for Hackathon Demo
// ===========================================
// This seeds the in-memory storage with realistic demo data
// so the dashboard shows pre-populated bills and some completed negotiations.

import {
  createBill,
  createUser,
  updateBill,
  createNegotiation,
  updateNegotiation,
  getUserByEmail,
} from './storage.js';
import {
  isGraphConnected,
  storeCompetitorRates,
  storeRetentionOffer,
  storeNegotiationResult,
} from './graph.js';
import { ProviderId, BillCategory, NegotiationTactic } from '../types/index.js';

// Demo user email
const DEMO_USER_EMAIL = 'demo@slash.ai';

// Demo bills data
const DEMO_BILLS = [
  {
    id: 'demo-comcast',
    provider: 'comcast' as ProviderId,
    category: 'internet' as BillCategory,
    monthlyRate: 129.99,
    planName: 'Xfinity Performance Pro+',
    accountNumber: 'DEMO-8847291',
    status: 'active', // ready to negotiate
  },
  {
    id: 'demo-att',
    provider: 'att_wireless' as ProviderId,
    category: 'cell_phone' as BillCategory,
    monthlyRate: 185.00,
    planName: 'AT&T Unlimited Premium (2 lines)',
    accountNumber: 'DEMO-3391047',
    status: 'active', // ready to negotiate
  },
  {
    id: 'demo-statefarm',
    provider: 'state_farm' as ProviderId,
    category: 'insurance' as BillCategory,
    monthlyRate: 247.00,
    planName: 'Auto + Renters Bundle',
    accountNumber: 'DEMO-SF-92841',
    status: 'active', // Will be marked as "negotiated" after seeding
    savedAmount: 47.00,
    newRate: 200.00,
  },
  {
    id: 'demo-spectrum',
    provider: 'spectrum' as ProviderId,
    category: 'internet' as BillCategory,
    monthlyRate: 89.99,
    planName: 'Spectrum Internet Ultra',
    accountNumber: 'DEMO-7712934',
    status: 'active', // ready to negotiate
  },
  {
    id: 'demo-tmobile',
    provider: 'tmobile' as ProviderId,
    category: 'cell_phone' as BillCategory,
    monthlyRate: 140.00,
    planName: 'T-Mobile Go5G Plus (3 lines)',
    accountNumber: 'DEMO-TM-55821',
    status: 'active', // Will be marked as "negotiated" after seeding
    savedAmount: 30.00,
    newRate: 110.00,
  },
];

let demoSeeded = false;

/**
 * Seed demo bills into storage
 * Creates a demo user if not exists, then adds demo bills
 */
export function seedDemoBills(): { userId: string; billsCreated: number } {
  if (demoSeeded) {
    console.log('Demo data already seeded');
    return { userId: '', billsCreated: 0 };
  }

  // Create or get demo user
  let user = getUserByEmail(DEMO_USER_EMAIL);
  if (!user) {
    user = createUser({
      email: DEMO_USER_EMAIL,
      password: 'demo123',
      phone: '+15551234567',
    });
    console.log(`Created demo user: ${user.id}`);
  }

  // Clear any existing initializeSampleData by checking for demo bills
  // We'll add our demo bills
  
  let billsCreated = 0;

  for (const demoBill of DEMO_BILLS) {
    // Create the bill
    const bill = createBill(user.id, {
      provider: demoBill.provider,
      category: demoBill.category,
      accountNumber: demoBill.accountNumber,
      currentRate: demoBill.monthlyRate,
      planName: demoBill.planName,
    });

    billsCreated++;

    // For bills with savings, create a successful negotiation
    if (demoBill.savedAmount && demoBill.newRate) {
      const negotiation = createNegotiation(bill.id, user.id, demoBill.monthlyRate);
      
      updateNegotiation(negotiation.id, {
        status: 'success',
        newRate: demoBill.newRate,
        monthlySavings: demoBill.savedAmount,
        totalSavings: demoBill.savedAmount * 12, // 12 months
        completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random recent date
      });

      // Mark bill as negotiated (update status)
      updateBill(bill.id, { status: 'negotiating' });
    }
  }

  demoSeeded = true;
  console.log(`Seeded ${billsCreated} demo bills for user ${user.id}`);

  return { userId: user.id, billsCreated };
}

/**
 * Check if demo data has been seeded
 */
export function isDemoSeeded(): boolean {
  return demoSeeded;
}

/**
 * Reset demo seeding (for testing)
 */
export function resetDemoSeed(): void {
  demoSeeded = false;
}

/**
 * Get demo user ID
 */
export function getDemoUserId(): string | undefined {
  const user = getUserByEmail(DEMO_USER_EMAIL);
  return user?.id;
}

// ===========================================
// NEO4J GRAPH SEED DATA
// ===========================================

/**
 * Seed Neo4j with competitor rates, retention offers, and past negotiation results.
 * Call AFTER initGraph() + seedProviders() succeed.
 */
export async function seedGraphData(): Promise<void> {
  if (!isGraphConnected()) {
    console.log('[Seed] Neo4j not connected, skipping graph seed');
    return;
  }

  // --- Competitor Rates ---
  const now = new Date();

  // Comcast competitors
  await storeCompetitorRates('comcast' as ProviderId, [
    { provider: 'spectrum', planName: 'Internet 300', monthlyRate: 49.99, source: 'spectrum.com', scrapedAt: now },
    { provider: 'att', planName: 'Fiber 300', monthlyRate: 55.00, source: 'att.com', scrapedAt: now },
    { provider: 'verizon', planName: 'Fios 300/300', monthlyRate: 49.99, source: 'verizon.com', scrapedAt: now },
  ]);

  // AT&T Wireless competitors
  await storeCompetitorRates('att_wireless' as ProviderId, [
    { provider: 'tmobile', planName: 'Go5G Plus (2 lines)', monthlyRate: 140.00, source: 't-mobile.com', scrapedAt: now },
    { provider: 'mint_mobile', planName: 'Unlimited (2 lines)', monthlyRate: 60.00, source: 'mintmobile.com', scrapedAt: now },
    { provider: 'cricket', planName: 'Unlimited 2-Line', monthlyRate: 100.00, source: 'cricketwireless.com', scrapedAt: now },
  ]);

  // T-Mobile competitors
  await storeCompetitorRates('tmobile' as ProviderId, [
    { provider: 'mint_mobile', planName: 'Unlimited', monthlyRate: 30.00, source: 'mintmobile.com', scrapedAt: now },
    { provider: 'cricket', planName: 'Unlimited', monthlyRate: 55.00, source: 'cricketwireless.com', scrapedAt: now },
    { provider: 'att_wireless', planName: 'Unlimited Starter', monthlyRate: 65.00, source: 'att.com', scrapedAt: now },
  ]);

  // State Farm competitors
  await storeCompetitorRates('state_farm' as ProviderId, [
    { provider: 'geico', planName: 'Auto + Renters', monthlyRate: 185.00, source: 'geico.com', scrapedAt: now },
    { provider: 'progressive', planName: 'Auto + Renters Bundle', monthlyRate: 195.00, source: 'progressive.com', scrapedAt: now },
    { provider: 'liberty_mutual', planName: 'Auto + Renters', monthlyRate: 210.00, source: 'libertymutual.com', scrapedAt: now },
  ]);

  // Spectrum competitors
  await storeCompetitorRates('spectrum' as ProviderId, [
    { provider: 'att', planName: 'Fiber 300', monthlyRate: 55.00, source: 'att.com', scrapedAt: now },
    { provider: 'verizon', planName: 'Fios 300/300', monthlyRate: 49.99, source: 'verizon.com', scrapedAt: now },
    { provider: 'comcast', planName: 'Connect More', monthlyRate: 55.00, source: 'xfinity.com', scrapedAt: now },
  ]);

  console.log('[Seed] Competitor rates seeded');

  // --- Retention Offers ---
  await storeRetentionOffer('comcast' as ProviderId, { provider: 'comcast', trigger: 'cancel_threat', typicalDiscount: 25, successRate: 0.73 });
  await storeRetentionOffer('comcast' as ProviderId, { provider: 'comcast', trigger: 'competitor_mention', typicalDiscount: 15, successRate: 0.85 });

  await storeRetentionOffer('att_wireless' as ProviderId, { provider: 'att_wireless', trigger: 'cancel_threat', typicalDiscount: 20, successRate: 0.55 });
  await storeRetentionOffer('att_wireless' as ProviderId, { provider: 'att_wireless', trigger: 'loyalty_years', typicalDiscount: 10, successRate: 0.70 });

  await storeRetentionOffer('tmobile' as ProviderId, { provider: 'tmobile', trigger: 'cancel_threat', typicalDiscount: 20, successRate: 0.60 });
  await storeRetentionOffer('tmobile' as ProviderId, { provider: 'tmobile', trigger: 'loyalty_years', typicalDiscount: 12, successRate: 0.70 });

  await storeRetentionOffer('state_farm' as ProviderId, { provider: 'state_farm', trigger: 'competitor_quote', typicalDiscount: 12, successRate: 0.65 });
  await storeRetentionOffer('state_farm' as ProviderId, { provider: 'state_farm', trigger: 'bundling', typicalDiscount: 15, successRate: 0.80 });

  await storeRetentionOffer('spectrum' as ProviderId, { provider: 'spectrum', trigger: 'cancel_threat', typicalDiscount: 30, successRate: 0.68 });
  await storeRetentionOffer('spectrum' as ProviderId, { provider: 'spectrum', trigger: 'competitor_mention', typicalDiscount: 20, successRate: 0.82 });

  console.log('[Seed] Retention offers seeded');

  // --- Past Negotiation Results (shows graph "learning") ---
  await storeNegotiationResult(
    'comcast' as ProviderId, 129.99, 89.99,
    ['competitor_conquest', 'retention_close'] as NegotiationTactic[],
    true
  );
  await storeNegotiationResult(
    'tmobile' as ProviderId, 140.00, 110.00,
    ['churn_threat'] as NegotiationTactic[],
    true
  );
  await storeNegotiationResult(
    'state_farm' as ProviderId, 247.00, 200.00,
    ['competitor_conquest'] as NegotiationTactic[],
    true
  );

  console.log('[Seed] Past negotiation results seeded');
  console.log('[Seed] ✅ Graph data fully seeded');
}
