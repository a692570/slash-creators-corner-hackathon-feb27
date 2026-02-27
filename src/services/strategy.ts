// ===========================================
// STRATEGY SERVICE - Negotiation Strategy Engine
// ===========================================

import {
  Bill,
  NegotiationTactic,
  CompetitorRate,
  Negotiation,
  BillCategory,
} from '../types/index.js';
import { getLeverage } from './graph.js';

export interface NegotiationStrategy {
  tactics: NegotiationTactic[];
  primaryTactic: NegotiationTactic;
  fallbackTactic: NegotiationTactic;
  script: string;
  expectedSavings: number;
}

/**
 * Build a negotiation strategy based on bill, competitor data, and graph intelligence
 */
export async function buildStrategy(
  bill: Bill,
  competitorRates: CompetitorRate[]
): Promise<NegotiationStrategy> {
  // Get leverage data from Neo4j graph
  const leverage = await getLeverage(bill.provider);
  
  // Merge graph rates with research rates (prefer graph data - it's verified)
  let mergedRates = [...competitorRates];
  
  if (leverage && leverage.competitorOffers.length > 0) {
    // Merge, removing duplicates by provider, prefer graph data
    const existingProviders = new Set(mergedRates.map(r => r.provider));
    for (const offer of leverage.competitorOffers) {
      if (!existingProviders.has(offer.provider)) {
        mergedRates.push(offer);
      }
    }
    // Sort again
    mergedRates.sort((a, b) => a.monthlyRate - b.monthlyRate);
  }
  
  // Check if competitor has lower rate (use merged rates)
  const lowerRateCompetitors = mergedRates.filter(
    r => r.monthlyRate < bill.currentRate
  );
  const hasCompetitiveAdvantage = lowerRateCompetitors.length > 0;
  
  // Check graph for retention offer insights
  const hasRetentionData = leverage && leverage.retentionOffers.length > 0;
  const highSuccessRetention = leverage?.retentionOffers.some(o => o.successRate > 0.6) ?? false;
  
  // Determine tactics based on leverage and category
  const selectedTactics = selectTacticsForCategory(
    bill.category,
    hasCompetitiveAdvantage,
    hasRetentionData || highSuccessRetention,
    mergedRates
  );
  
  // Calculate expected savings using graph intelligence
  let expectedSavings = 0;
  if (bill.category === 'medical') {
    // Medical bills typically have 20-50% savings potential
    expectedSavings = bill.currentRate * 0.30;
  } else if (hasCompetitiveAdvantage && lowerRateCompetitors[0]) {
    // Target a rate between current and competitor's best
    expectedSavings = Math.min(
      bill.currentRate - lowerRateCompetitors[0].monthlyRate,
      bill.currentRate * 0.25  // Cap at 25% savings
    );
  } else if (leverage && leverage.averageSavings > 0) {
    // Use historical average from graph
    expectedSavings = Math.min(leverage.averageSavings, bill.currentRate * 0.25);
  } else {
    // Default to 15% savings
    expectedSavings = bill.currentRate * 0.15;
  }

  return {
    tactics: selectedTactics,
    primaryTactic: selectedTactics[0],
    fallbackTactic: selectedTactics[selectedTactics.length - 1],
    script: generateNegotiationScript(selectedTactics, bill, mergedRates),
    expectedSavings: Math.max(expectedSavings, 5), // Minimum $5 savings
  };
}

/**
 * Select tactics based on category and leverage
 */
function selectTacticsForCategory(
  category: BillCategory,
  hasCompetitiveAdvantage: boolean,
  hasRetentionData: boolean,
  competitorRates: CompetitorRate[]
): NegotiationTactic[] {
  switch (category) {
    case 'internet':
    case 'cell_phone':
      return selectTelecomTactics(hasCompetitiveAdvantage, hasRetentionData);
    
    case 'insurance':
      return selectInsuranceTactics(competitorRates);
    
    case 'medical':
      return selectMedicalTactics();
    
    default:
      return ['competitor_conquest', 'loyalty_play', 'churn_threat'];
  }
}

/**
 * Tactics for Internet/Cable and Cell Phone
 */
function selectTelecomTactics(
  hasCompetitiveAdvantage: boolean,
  hasRetentionData: boolean
): NegotiationTactic[] {
  const tactics: NegotiationTactic[] = [];
  
  if (hasCompetitiveAdvantage) {
    tactics.push('competitor_conquest');
  }
  
  tactics.push('loyalty_play');
  tactics.push('churn_threat');
  
  if (hasRetentionData) {
    tactics.push('retention_close');
  }
  
  tactics.push('supervisor_request');
  
  return tactics;
}

/**
 * Tactics for Insurance (Auto/Home)
 */
function selectInsuranceTactics(competitorRates: CompetitorRate[]): NegotiationTactic[] {
  const tactics: NegotiationTactic[] = [];
  
  // Insurance always starts with competitor quotes
  if (competitorRates.length > 0) {
    tactics.push('competitor_conquest');
  }
  
  tactics.push('loyalty_play');
  tactics.push('churn_threat');
  
  // Bundle discounts are common in insurance
  tactics.push('retention_close');
  tactics.push('supervisor_request');
  
  return tactics;
}

/**
 * Tactics for Medical Bills
 */
function selectMedicalTactics(): NegotiationTactic[] {
  // Medical bills have unique negotiation tactics
  return [
    'itemized_bill_review',  // Check for errors first
    'cash_pay_discount',      // Ask for cash pay discount
    'payment_plan',           // Set up payment plan
  ];
}

/**
 * Generate the negotiation script based on selected tactics and category
 */
export function generateNegotiationScript(
  tactics: NegotiationTactic[],
  bill: Bill,
  competitorRates: CompetitorRate[]
): string {
  const lines: string[] = [];
  
  // Opening - varies by category
  lines.push(...generateOpening(bill));
  
  // Primary tactic
  const primaryTactic = tactics[0];
  lines.push(...generateTacticScript(primaryTactic, bill, competitorRates));
  
  // Closing
  lines.push(...generateClosing(bill.category));
  
  return lines.join(' ');
}

/**
 * Generate opening based on category
 */
function generateOpening(bill: Bill): string[] {
  const lines: string[] = [];
  
  if (bill.category === 'medical') {
    lines.push(`Hello, I'm calling about my medical bill from ${bill.providerName || 'your facility'}.`);
    lines.push(`The account number is ${bill.accountNumber} and the amount is $${bill.currentRate.toFixed(2)}.`);
  } else {
    lines.push(`Hello, I'm calling about my account. My account number is ${bill.accountNumber}.`);
    lines.push(`I'm currently on the ${bill.planName || 'current plan'} at $${bill.currentRate} per month.`);
  }
  
  return lines;
}

/**
 * Generate tactic-specific script
 */
function generateTacticScript(
  tactic: NegotiationTactic,
  bill: Bill,
  competitorRates: CompetitorRate[]
): string[] {
  switch (tactic) {
    case 'competitor_conquest':
      if (competitorRates.length > 0) {
        const bestCompetitor = competitorRates[0];
        return [
          `I've been looking at other options and noticed that ${bestCompetitor.provider} is offering similar service for $${bestCompetitor.monthlyRate} per month.`,
          `I'm a loyal customer and would prefer to stay, but the price difference is significant.`,
          `Can you help me get a better rate?`,
        ];
      }
      return [`I've seen better rates from competitors. Can you help me get a better deal?`];
    
    case 'loyalty_play':
      return [
        `I've been a customer for over a year now and I've always paid on time.`,
        `I'm trying to reduce my monthly expenses and would appreciate any loyalty discount you can offer.`,
        `Can you review my account and see what's available?`,
      ];
    
    case 'churn_threat':
      return [
        `If I can't get a better rate, I may need to consider switching to another provider.`,
        `I'd prefer to stay, but I need to be mindful of my budget.`,
      ];
    
    case 'retention_close':
      const savings = bill.currentRate * 0.2;
      return [
        `Thank you for that offer. Can you do one better?`,
        `I'd like to see if we can get to $${(bill.currentRate - savings).toFixed(2)} per month.`,
      ];
    
    case 'supervisor_request':
      return [
        `I appreciate your help, but I'd like to speak with a supervisor who may have more authority to help me.`,
      ];
    
    case 'cash_pay_discount':
      return [
        `I understand that if I pay this bill out-of-pocket without going through insurance, there's often a significant discount available.`,
        `I'd like to know what the cash-pay rate would be for this bill.`,
        `I've heard discounts of 30-50% are common for self-pay patients.`,
      ];
    
    case 'payment_plan':
      return [
        `I'd like to set up a payment plan for this bill.`,
        `Can you offer a 12-month interest-free payment plan?`,
        `This would help me manage the cost while ensuring you receive full payment.`,
      ];
    
    case 'itemized_bill_review':
      return [
        `I'd like to request an itemized bill to review all the charges.`,
        `I want to make sure all the services listed are accurate and that there are no duplicate or incorrect charges.`,
        `Can you send me a detailed breakdown of all charges?`,
      ];
    
    default:
      return [`What options are available to reduce my bill?`];
  }
}

/**
 * Generate closing based on category
 */
function generateClosing(category: BillCategory): string[] {
  if (category === 'medical') {
    return [
      `Thank you for your help. I appreciate any assistance you can provide in reducing this bill.`,
    ];
  }
  return [
    `What can you do to help me save on my monthly bill?`,
  ];
}

/**
 * Get the next line in the negotiation script based on tactic
 */
export function getTacticScript(
  tactic: NegotiationTactic,
  bill: Bill,
  competitorRates: CompetitorRate[]
): string {
  switch (tactic) {
    case 'competitor_conquest':
      const best = competitorRates[0];
      return best 
        ? `I see that ${best.provider} is offering $${best.monthlyRate}/month. Can you match or beat that?`
        : `I've seen better rates elsewhere. Can you help me get a better deal?`;
    
    case 'loyalty_play':
      return `I've been a loyal customer for over a year. I'd like to stay with you but need a better rate. What can you offer?`;
    
    case 'churn_threat':
      return `I'm seriously considering switching providers. Is there anything you can do to keep my business?`;
    
    case 'retention_close':
      const savings = bill.currentRate * 0.2;
      return `Thank you for that offer. Can you do one better? I'd like to see if we can get to $${(bill.currentRate - savings).toFixed(2)}/month.`;
    
    case 'supervisor_request':
      return `I appreciate your help, but I'd like to speak with a supervisor who may have more authority to help me.`;
    
    case 'cash_pay_discount':
      return `What's the cash-pay discount you can offer? I've heard 30-50% discounts are common for self-pay patients.`;
    
    case 'payment_plan':
      return `Can you set up a 12-month interest-free payment plan? That would work much better for my budget.`;
    
    case 'itemized_bill_review':
      return `Please send me the itemized bill. I want to review all charges to ensure accuracy before we discuss payment options.`;
    
    default:
      return `What other options are available to reduce my bill?`;
  }
}

/**
 * Update negotiation with tactic results
 */
export function recordTacticAttempt(
  negotiation: Negotiation,
  tactic: NegotiationTactic,
  outcome: 'success' | 'failed' | 'escalated',
  notes?: string
): Negotiation {
  const attempt = {
    tactic,
    timestamp: new Date(),
    outcome,
    notes,
  };
  
  return {
    ...negotiation,
    attempts: [...negotiation.attempts, attempt],
    currentTacticIndex: (negotiation.currentTacticIndex || 0) + 1,
  };
}

/**
 * Determine if negotiation should continue or end
 */
export function shouldContinueNegotiation(negotiation: Negotiation): boolean {
  // Already succeeded or failed
  if (negotiation.status === 'success' || negotiation.status === 'failed') {
    return false;
  }
  
  // Check attempts - max 5 attempts
  if (negotiation.attempts.length >= 5) {
    return false;
  }
  
  // Check time - max 10 minutes
  if (negotiation.startedAt) {
    const elapsed = Date.now() - negotiation.startedAt.getTime();
    if (elapsed > 10 * 60 * 1000) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate final savings from negotiation
 */
export function calculateSavings(
  originalRate: number,
  newRate: number
): {
  monthlySavings: number;
  yearlySavings: number;
  percentageSaved: number;
} {
  const monthlySavings = Math.max(0, originalRate - newRate);
  const yearlySavings = monthlySavings * 12;
  const percentageSaved = (monthlySavings / originalRate) * 100;
  
  return {
    monthlySavings,
    yearlySavings,
    percentageSaved,
  };
}
