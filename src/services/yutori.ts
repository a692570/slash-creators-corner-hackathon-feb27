// ===========================================
// YUTORI SERVICE - AI-powered web research
// ===========================================

import { CompetitorRate, ProviderId, PROVIDERS } from '../types/index.js';

// ===========================================
// TYPES
// ===========================================

export interface YutoriResearchResult {
  success: boolean;
  data?: unknown;
  error?: string;
  source: 'yutori';
}

export interface YutoriBrowseResult {
  success: boolean;
  data?: unknown;
  error?: string;
  url: string;
}

interface YutoriResearchTaskResponse {
  task_id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  structured_result?: unknown;
  error?: string;
}

interface YutoriBrowseTaskResponse {
  task_id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  structured_result?: unknown;
  error?: string;
}

// ===========================================
// CONFIGURATION
// ===========================================

const YUTORI_API_BASE = 'https://api.yutori.com/v1';
const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes
const POLL_INTERVAL_MS = 5000; // 5 seconds

/**
 * Check if Yutori is configured (API key present)
 */
export function isYutoriConfigured(): boolean {
  return Boolean(process.env.YUTORI_API_KEY);
}

/**
 * Get the API key, throwing if not configured
 */
function getApiKey(): string {
  const key = process.env.YUTORI_API_KEY;
  if (!key) {
    throw new Error('YUTORI_API_KEY not configured');
  }
  return key;
}

// ===========================================
// LOW-LEVEL API FUNCTIONS
// ===========================================

/**
 * Create a research task via Yutori Research API
 */
async function createResearchTask(query: string, outputSchema?: object): Promise<string> {
  const apiKey = getApiKey();
  
  const response = await fetch(`${YUTORI_API_BASE}/research/tasks`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      user_timezone: 'America/Los_Angeles',
      output_schema: outputSchema,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Yutori research task creation failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { task_id: string };
  console.log(`[Yutori] Created research task: ${data.task_id}`);
  return data.task_id;
}

/**
 * Get the result of a research task
 */
async function getResearchTaskResult(taskId: string): Promise<YutoriResearchTaskResponse> {
  const apiKey = getApiKey();
  
  const response = await fetch(`${YUTORI_API_BASE}/research/tasks/${taskId}`, {
    headers: {
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Yutori research task fetch failed: ${response.status}`);
  }

  return response.json() as Promise<YutoriResearchTaskResponse>;
}

/**
 * Poll until a research task completes
 */
async function pollResearchTask<T>(
  taskId: string, 
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const result = await getResearchTaskResult(taskId);
    
    if (result.status === 'succeeded') {
      console.log(`[Yutori] Research task ${taskId} succeeded`);
      return result.structured_result as T;
    }
    
    if (result.status === 'failed') {
      throw new Error(`Yutori research task failed: ${result.error || 'Unknown error'}`);
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  
  throw new Error(`Yutori research task ${taskId} timed out after ${timeoutMs}ms`);
}

/**
 * Create a browsing task via Yutori Browsing API
 */
async function createBrowseTask(
  task: string, 
  startUrl: string, 
  outputSchema?: object
): Promise<string> {
  const apiKey = getApiKey();
  
  const response = await fetch(`${YUTORI_API_BASE}/browsing/tasks`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task,
      start_url: startUrl,
      output_schema: outputSchema,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Yutori browse task creation failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { task_id: string };
  console.log(`[Yutori] Created browse task: ${data.task_id} for URL: ${startUrl}`);
  return data.task_id;
}

/**
 * Get the result of a browsing task
 */
async function getBrowseTaskResult(taskId: string): Promise<YutoriBrowseTaskResponse> {
  const apiKey = getApiKey();
  
  const response = await fetch(`${YUTORI_API_BASE}/browsing/tasks/${taskId}`, {
    headers: {
      'X-API-Key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Yutori browse task fetch failed: ${response.status}`);
  }

  return response.json() as Promise<YutoriBrowseTaskResponse>;
}

/**
 * Poll until a browsing task completes
 */
async function pollBrowseTask<T>(
  taskId: string, 
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const result = await getBrowseTaskResult(taskId);
    
    if (result.status === 'succeeded') {
      console.log(`[Yutori] Browse task ${taskId} succeeded`);
      return result.structured_result as T;
    }
    
    if (result.status === 'failed') {
      throw new Error(`Yutori browse task failed: ${result.error || 'Unknown error'}`);
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  
  throw new Error(`Yutori browse task ${taskId} timed out after ${timeoutMs}ms`);
}

// ===========================================
// HIGH-LEVEL PUBLIC FUNCTIONS
// ===========================================

/**
 * Research competitor rates using Yutori Research API
 * Returns structured competitor data
 */
export async function yutoriResearch(query: string): Promise<YutoriResearchResult> {
  if (!isYutoriConfigured()) {
    console.warn('[Yutori] YUTORI_API_KEY not set, returning empty result');
    return {
      success: false,
      error: 'YUTORI_API_KEY not configured',
      source: 'yutori',
    };
  }

  try {
    console.log(`[Yutori] Starting research query: ${query}`);
    
    // Define output schema for structured competitor data
    const outputSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          planName: { type: 'string' },
          monthlyRate: { type: 'number' },
          contractTerms: { type: 'string' },
          source: { type: 'string' },
        },
      },
    };

    const taskId = await createResearchTask(query, outputSchema);
    const result = await pollResearchTask<unknown>(taskId);

    return {
      success: true,
      data: result,
      source: 'yutori',
    };
  } catch (error) {
    console.error(`[Yutori] Research failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'yutori',
    };
  }
}

/**
 * Browse a specific URL to extract provider pricing info
 */
export async function yutoriBrowse(url: string): Promise<YutoriBrowseResult> {
  if (!isYutoriConfigured()) {
    console.warn('[Yutori] YUTORI_API_KEY not set, returning empty result');
    return {
      success: false,
      error: 'YUTORI_API_KEY not configured',
      url,
    };
  }

  try {
    console.log(`[Yutori] Browsing URL: ${url}`);
    
    const task = 'Extract pricing and plan information for internet/cable/phone services';
    const taskId = await createBrowseTask(task, url);
    const result = await pollBrowseTask<unknown>(taskId);

    return {
      success: true,
      data: result,
      url,
    };
  } catch (error) {
    console.error(`[Yutori] Browse failed for ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      url,
    };
  }
}

/**
 * Research competitor rates for a specific provider
 * Higher-level function that builds the right query and parses results
 */
export async function researchCompetitorWithYutori(
  provider: ProviderId,
  currentRate: number
): Promise<CompetitorRate[]> {
  if (!isYutoriConfigured()) {
    console.warn('[Yutori] YUTORI_API_KEY not set, returning empty results');
    return [];
  }

  const providerInfo = PROVIDERS[provider as keyof typeof PROVIDERS];
  if (!providerInfo) {
    console.warn(`[Yutori] Unknown provider: ${provider}`);
    return [];
  }

  // Get competitor list
  const competitors = Object.values(PROVIDERS)
    .filter(p => p.id !== provider)
    .map(p => p.displayName);

  // Build research query
  const query = `Compare ${providerInfo.displayName} internet and phone plans pricing at $${currentRate}/month vs competitors: ${competitors.slice(0, 5).join(', ')}. Find current promotional rates, contract terms, and monthly costs.`;

  try {
    const result = await yutoriResearch(query);
    
    if (!result.success || !result.data) {
      console.warn('[Yutori] Research returned no data');
      return [];
    }

    // Parse the result into CompetitorRate objects
    const parsedRates = parseYutoriResult(result.data, provider);
    
    console.log(`[Yutori] Found ${parsedRates.length} competitor rates`);
    return parsedRates;
  } catch (error) {
    console.error('[Yutori] Competitor research failed:', error);
    return [];
  }
}

/**
 * Parse Yutori research result into CompetitorRate objects
 */
function parseYutoriResult(data: unknown, excludeProvider: ProviderId): CompetitorRate[] {
  const rates: CompetitorRate[] = [];
  
  // Handle array results
  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        
        // Try to identify the provider from the result
        const providerName = String(record.provider || record.carrier || record.company || '').toLowerCase();
        const planName = String(record.planName || record.plan || record.name || 'Unknown Plan');
        const monthlyRate = parseRate(record.monthlyRate || record.price || record.rate);
        const contractTerms = String(record.contractTerms || record.contract || '');
        const source = String(record.source || record.url || 'yutori-research');
        
        // Map provider name to ProviderId
        const providerId = mapProviderNameToId(providerName);
        
        // Skip if it's the excluded provider or unknown
        if (!providerId || providerId === excludeProvider) {
          continue;
        }
        
        // Skip invalid rates
        if (monthlyRate <= 0) {
          continue;
        }
        
        rates.push({
          provider: providerId,
          planName,
          monthlyRate,
          contractTerms: contractTerms || undefined,
          source,
          scrapedAt: new Date(),
        });
      }
    }
  }
  
  // Handle object results (might have nested data)
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    
    // Check for results array nested in object
    if (Array.isArray(record.results)) {
      return parseYutoriResult(record.results, excludeProvider);
    }
    
    // Check for competitors/plans arrays
    if (Array.isArray(record.competitors)) {
      return parseYutoriResult(record.competitors, excludeProvider);
    }
    
    if (Array.isArray(record.plans)) {
      return parseYutoriResult(record.plans, excludeProvider);
    }
  }
  
  // Deduplicate by provider
  const seenProviders = new Set<string>();
  const dedupedRates: CompetitorRate[] = [];
  
  for (const rate of rates) {
    if (!seenProviders.has(rate.provider)) {
      seenProviders.add(rate.provider);
      dedupedRates.push(rate);
    }
  }
  
  return dedupedRates;
}

/**
 * Parse a rate value (could be number or string like "$50" or "50/month")
 */
function parseRate(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Remove currency symbols and parse
    const cleaned = value.replace(/[$,]/g, '').replace(/\/month.*/i, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * Map provider name string to ProviderId
 */
function mapProviderNameToId(name: string): ProviderId | null {
  const normalized = name.toLowerCase().trim();
  
  // Direct mappings
  const mappings: Record<string, ProviderId> = {
    'comcast': 'comcast',
    'xfinity': 'comcast',
    'spectrum': 'spectrum',
    'charter': 'spectrum',
    'at&t': 'att',
    'att': 'att',
    'at&t internet': 'att',
    'verizon': 'verizon',
    'fios': 'verizon',
    'verizon fios': 'verizon',
    'cox': 'cox',
    'optimum': 'optimum',
    'altice': 'optimum',
    't-mobile': 'tmobile',
    'tmobile': 'tmobile',
    'verizon wireless': 'verizon_wireless',
    'at&t wireless': 'att_wireless',
    'mint mobile': 'mint_mobile',
    'mint': 'mint_mobile',
    'cricket': 'cricket',
    'cricket wireless': 'cricket',
    'state farm': 'state_farm',
    'geico': 'geico',
    'progressive': 'progressive',
    'allstate': 'allstate',
    'liberty mutual': 'liberty_mutual',
    'usaa': 'usaa',
  };
  
  // Try exact match first
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Try partial match
  for (const [key, id] of Object.entries(mappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return id;
    }
  }
  
  return null;
}
