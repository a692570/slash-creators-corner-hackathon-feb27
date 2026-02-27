// ===========================================
// CC STATEMENT SCANNER SERVICE
// Uses OpenAI GPT-4o Vision API to parse PDF statements
// ===========================================

import { pdf } from 'pdf-to-img';
import {
  DetectedBill,
  ProviderId,
  BillCategory,
  PROVIDERS,
} from '../types/index.js';

// Provider name patterns for detection
const PROVIDER_PATTERNS: Record<string, { providerId: ProviderId; category: BillCategory }> = {
  // Internet/Cable
  'comcast': { providerId: 'comcast', category: 'internet' },
  'xfinity': { providerId: 'comcast', category: 'internet' },
  'spectrum': { providerId: 'spectrum', category: 'internet' },
  'charter': { providerId: 'spectrum', category: 'internet' },
  'at&t internet': { providerId: 'att', category: 'internet' },
  'att internet': { providerId: 'att', category: 'internet' },
  'verizon fios': { providerId: 'verizon', category: 'internet' },
  'verizon internet': { providerId: 'verizon', category: 'internet' },
  'cox': { providerId: 'cox', category: 'internet' },
  'optimum': { providerId: 'optimum', category: 'internet' },
  
  // Cell Phone
  'tmobile': { providerId: 'tmobile', category: 'cell_phone' },
  't-mobile': { providerId: 'tmobile', category: 'cell_phone' },
  'verizon wireless': { providerId: 'verizon_wireless', category: 'cell_phone' },
  'at&t wireless': { providerId: 'att_wireless', category: 'cell_phone' },
  'att wireless': { providerId: 'att_wireless', category: 'cell_phone' },
  'mint mobile': { providerId: 'mint_mobile', category: 'cell_phone' },
  'cricket': { providerId: 'cricket', category: 'cell_phone' },
  
  // Insurance
  'state farm': { providerId: 'state_farm', category: 'insurance' },
  'statefarm': { providerId: 'state_farm', category: 'insurance' },
  'geico': { providerId: 'geico', category: 'insurance' },
  'progressive': { providerId: 'progressive', category: 'insurance' },
  'allstate': { providerId: 'allstate', category: 'insurance' },
  'liberty mutual': { providerId: 'liberty_mutual', category: 'insurance' },
  'usaa': { providerId: 'usaa', category: 'insurance' },
};

interface OpenAIVisionTransaction {
  provider_name: string;
  amount: number;
  date: string;
  description: string;
  category: string;
}

/**
 * Parse a credit card statement PDF using OpenAI GPT-4o Vision
 */
export async function parseCCStatement(pdfBuffer: Buffer): Promise<DetectedBill[]> {
  try {
    console.log('Converting PDF to images...');
    
    // Convert PDF pages to images using async iterator
    const document = await pdf(pdfBuffer, { scale: 2 });
    let pageNum = 0;
    const allTransactions: OpenAIVisionTransaction[] = [];
    
    // Process each page using async iterator
    for await (const page of document) {
      pageNum++;
      console.log(`Processing page ${pageNum}...`);
      
      // page is a Buffer containing PNG data
      const base64Image = page.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;
      
      // Send to OpenAI Vision API
      const transactions = await extractTransactionsFromImage(dataUrl, pageNum);
      allTransactions.push(...transactions);
    }
    
    console.log(`OpenAI extracted ${allTransactions.length} transactions`);
    
    // Match and classify transactions
    const detectedBills = matchAndClassifyTransactions(allTransactions);
    console.log(`Matched ${detectedBills.length} negotiable bills`);
    
    return detectedBills;
  } catch (error) {
    console.error('Error scanning PDF:', error);
    throw new Error(`Failed to scan PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract transactions from a single page using OpenAI Vision
 */
async function extractTransactionsFromImage(
  imageDataUrl: string,
  pageNum: number
): Promise<OpenAIVisionTransaction[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }

  const systemPrompt = `You are a financial document analyzer. Extract all recurring bill transactions from this credit card statement page.

For each transaction that appears to be a recurring bill (like internet, cell phone, insurance, medical, or other regular payments), return:
- provider_name: The name of the company/biller
- amount: The transaction amount as a number
- date: The transaction date
- description: The raw description from the statement
- category: One of "internet", "cell_phone", "insurance", "medical", or "other"

Only include transactions that look like recurring bills (typically $20-$500 range). Skip one-time purchases, dining, retail, etc.

Return ONLY a JSON array, no other text. Example format:
[
  {"provider_name": "Xfinity", "amount": 89.99, "date": "02/01/2026", "description": "COMCAST XFINITY", "category": "internet"}
]`;

  const requestBody = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: systemPrompt },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl,
              detail: 'high'
            }
          }
        ]
      }
    ],
    max_tokens: 4000,
    temperature: 0.1
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };

  const content = result.choices[0]?.message?.content || '[]';
  
  // Parse JSON response
  try {
    // Try to extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (parseError) {
    console.error(`Failed to parse OpenAI response for page ${pageNum}:`, content);
    return [];
  }
}

/**
 * Match extracted transactions against known providers and calculate confidence
 */
function matchAndClassifyTransactions(
  transactions: OpenAIVisionTransaction[]
): DetectedBill[] {
  const detectedBills: DetectedBill[] = [];
  const seenProviders = new Set<string>();

  for (const tx of transactions) {
    const lowerProvider = tx.provider_name.toLowerCase();
    let matchedProvider: ProviderId | string = tx.provider_name;
    let matchedCategory: BillCategory = 'other' as BillCategory;
    let confidence = 0.5;

    // Try to match against known providers
    for (const [pattern, info] of Object.entries(PROVIDER_PATTERNS)) {
      const lowerPattern = pattern.toLowerCase();
      
      if (lowerProvider.includes(lowerPattern) || lowerPattern.includes(lowerProvider)) {
        matchedProvider = info.providerId;
        matchedCategory = info.category;
        confidence = 0.9;
        break;
      }
    }

    // Check if the category was explicitly identified by OpenAI
    if (tx.category && tx.category !== 'other') {
      matchedCategory = tx.category as BillCategory;
      if (confidence < 0.9) {
        confidence = 0.7;
      }
    }

    // Skip if amount is out of reasonable range
    if (tx.amount < 10 || tx.amount > 1000) {
      continue;
    }

    // Avoid duplicate detections
    const key = `${matchedProvider}-${tx.amount}`;
    if (seenProviders.has(key)) continue;
    seenProviders.add(key);

    detectedBills.push({
      provider: matchedProvider,
      category: matchedCategory,
      amount: tx.amount,
      transactionDate: normalizeDate(tx.date),
      description: tx.description || tx.provider_name,
      confidence,
    });
  }

  // Sort by confidence descending
  detectedBills.sort((a, b) => b.confidence - a.confidence);

  return detectedBills;
}

/**
 * Normalize date format to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  try {
    // Handle MM/DD/YY or MM/DD/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let [month, day, year] = parts;
      
      // Handle 2-digit year
      if (year.length === 2) {
        year = `20${year}`;
      }
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Already in good format?
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // Fallback to current date
    return new Date().toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get provider display name from ID
 */
export function getProviderDisplayName(providerId: ProviderId | string): string {
  if (providerId in PROVIDERS) {
    return PROVIDERS[providerId as ProviderId].displayName;
  }
  return String(providerId);
}