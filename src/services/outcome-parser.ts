// ===========================================
// OUTCOME PARSER - Extract Negotiation Results
// ===========================================

/**
 * Parsed outcome from AI assistant conversation
 */
export interface NegotiationOutcome {
  success: boolean;
  newRate?: number;
  monthlySavings?: number;
  annualSavings?: number;
  totalSavings?: number;  // annualSavings (12 months)
  tacticUsed?: string;
  summary?: string;
  confidence: number;  // 0-1, how confident in the parse
}

/**
 * Keywords indicating negotiation success
 */
const SUCCESS_KEYWORDS = [
  'agreed',
  'accepted',
  'new rate',
  'discount',
  'credit',
  'per month',
  'approved',
  'applied',
  'congratulations',
  'switch you to',
  'lower your rate',
  'reduced to',
  'saving you',
  'offer of',
  'promotion',
  'promo',
  "we can do",
  "i can offer",
  "happy to offer",
];

/**
 * Keywords indicating negotiation failure
 */
const FAILURE_KEYWORDS = [
  'unable',
  'refused',
  'no discount',
  'declined',
  "can't offer",
  'cannot offer',
  'not available',
  'unfortunately',
  'sorry',
  'no current promotions',
  'not eligible',
  "can't lower",
  'cannot lower',
  'no offers available',
];

/**
 * Positive tone keywords (for fallback detection)
 */
const POSITIVE_TONE_KEYWORDS = [
  'thank you',
  'great',
  'applied',
  'happy to help',
  'pleasure',
  'welcome',
  'appreciate',
];

/**
 * Negative tone keywords (for fallback detection)
 */
const NEGATIVE_TONE_KEYWORDS = [
  'unfortunately',
  'unable',
  'sorry',
  'regret',
  'apologize',
  'cannot help',
];

/**
 * Parse dollar amounts from text
 * Looks for patterns like "$50", "$50.00", "50 dollars", "50/month"
 */
function extractDollarAmounts(text: string): number[] {
  const amounts: number[] = [];
  
  // Match $XX.XX or $XX patterns
  const dollarPattern = /\$(\d+(?:\.\d{1,2})?)/g;
  let match;
  while ((match = dollarPattern.exec(text)) !== null) {
    amounts.push(parseFloat(match[1]));
  }
  
  // Match "XX dollars" or "XX/month" patterns
  const textPattern = /(\d+(?:\.\d{1,2})?)\s*(?:dollars?|\/month|per month)/gi;
  while ((match = textPattern.exec(text)) !== null) {
    amounts.push(parseFloat(match[1]));
  }
  
  return amounts;
}

/**
 * Count keyword occurrences in text
 */
function countKeywords(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  return keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;
}

/**
 * Detect which tactic was mentioned as successful
 */
function detectSuccessfulTactic(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  const tacticPatterns: [string, string[]][] = [
    ['competitor_conquest', ['competitor', 'other provider', 'switching to', 'comparing to', 'xfinity', 'spectrum', 'verizon', 'at&t']],
    ['loyalty_play', ['loyal customer', 'long time', 'years with', 'tenure', 'valued customer']],
    ['churn_threat', ['cancel', 'switching', 'leaving', 'other option', 'thinking of leaving']],
    ['supervisor_request', ['supervisor', 'manager', 'escalate', 'speak to someone']],
    ['retention_close', ['retention', 'special offer', 'one-time', 'loyalty discount']],
  ];
  
  for (const [tactic, patterns] of tacticPatterns) {
    if (patterns.some(p => lowerText.includes(p))) {
      return tactic;
    }
  }
  
  return undefined;
}

/**
 * Calculate confidence score based on parsing signals
 */
function calculateConfidence(
  text: string,
  hasSuccessKeywords: boolean,
  hasFailureKeywords: boolean,
  foundNewRate: boolean
): number {
  let confidence = 0.3; // Base confidence
  
  // Strong signal: explicit success/failure keywords
  if (hasSuccessKeywords && !hasFailureKeywords) {
    confidence += 0.3;
  } else if (hasFailureKeywords && !hasSuccessKeywords) {
    confidence += 0.3;
  }
  
  // Strong signal: found a dollar amount that looks like a new rate
  if (foundNewRate) {
    confidence += 0.2;
  }
  
  // Check for clear outcome language
  const lowerText = text.toLowerCase();
  if (lowerText.includes('new rate') || lowerText.includes('reduced to')) {
    confidence += 0.15;
  }
  if (lowerText.includes('monthly') || lowerText.includes('per month')) {
    confidence += 0.05;
  }
  
  return Math.min(confidence, 1.0);
}

/**
 * Parse negotiation outcome from AI assistant summary/transcript
 * 
 * @param transcript - The AI assistant's summary or transcript
 * @param originalRate - The original monthly rate before negotiation
 * @returns Parsed negotiation outcome with confidence score
 */
export function parseNegotiationOutcome(
  transcript: string,
  originalRate: number
): NegotiationOutcome {
  const text = transcript || '';
  
  // Count success/failure keyword occurrences
  const successKeywordCount = countKeywords(text, SUCCESS_KEYWORDS);
  const failureKeywordCount = countKeywords(text, FAILURE_KEYWORDS);
  const hasSuccessKeywords = successKeywordCount > 0;
  const hasFailureKeywords = failureKeywordCount > 0;
  
  // Extract all dollar amounts
  const amounts = extractDollarAmounts(text);
  
  // Find potential new rates (amounts less than original that could be the new rate)
  // A reasonable new rate should be 10-50% less than original
  const reasonableMinRate = originalRate * 0.5;
  const reasonableMaxRate = originalRate * 0.95;
  const potentialNewRates = amounts.filter(
    a => a >= reasonableMinRate && a <= reasonableMaxRate
  );
  
  // Determine success
  let success = false;
  let newRate: number | undefined;
  let confidence = 0.3;
  
  if (hasSuccessKeywords && !hasFailureKeywords) {
    // Clear success case
    success = true;
    confidence = 0.7;
    
    // Find the new rate - prefer the lowest reasonable amount found
    if (potentialNewRates.length > 0) {
      newRate = Math.min(...potentialNewRates);
      confidence += 0.2;
    }
  } else if (hasFailureKeywords && !hasSuccessKeywords) {
    // Clear failure case
    success = false;
    confidence = 0.7;
  } else if (hasSuccessKeywords && hasFailureKeywords) {
    // Mixed signals - use tone analysis as tiebreaker
    const positiveToneCount = countKeywords(text, POSITIVE_TONE_KEYWORDS);
    const negativeToneCount = countKeywords(text, NEGATIVE_TONE_KEYWORDS);
    
    if (positiveToneCount > negativeToneCount) {
      success = true;
      confidence = 0.5;
      if (potentialNewRates.length > 0) {
        newRate = Math.min(...potentialNewRates);
        confidence += 0.15;
      }
    } else {
      success = false;
      confidence = 0.5;
    }
  } else {
    // No clear keywords - use amount detection and tone
    const positiveToneCount = countKeywords(text, POSITIVE_TONE_KEYWORDS);
    const negativeToneCount = countKeywords(text, NEGATIVE_TONE_KEYWORDS);
    
    if (potentialNewRates.length > 0) {
      // Found a potential rate - assume success if tone is positive
      success = positiveToneCount >= negativeToneCount;
      newRate = Math.min(...potentialNewRates);
      confidence = 0.4;
    } else if (positiveToneCount > negativeToneCount + 1) {
      success = true;
      confidence = 0.35;
    } else if (negativeToneCount > positiveToneCount + 1) {
      success = false;
      confidence = 0.35;
    } else {
      // Truly ambiguous - default to failure but with low confidence
      success = false;
      confidence = 0.2;
    }
  }
  
  // Calculate savings if we have a new rate
  let monthlySavings: number | undefined;
  let annualSavings: number | undefined;
  let totalSavings: number | undefined;
  
  if (success && newRate) {
    monthlySavings = originalRate - newRate;
    annualSavings = monthlySavings * 12;
    totalSavings = annualSavings; // Alias for clarity
  }
  
  // Detect tactic used
  const tacticUsed = detectSuccessfulTactic(text);
  
  // Final confidence calculation
  confidence = calculateConfidence(text, hasSuccessKeywords, hasFailureKeywords, !!newRate);
  
  return {
    success,
    newRate,
    monthlySavings,
    annualSavings,
    totalSavings,
    tacticUsed,
    summary: text.slice(0, 500), // Truncate long summaries
    confidence,
  };
}
