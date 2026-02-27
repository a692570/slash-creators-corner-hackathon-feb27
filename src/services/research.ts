// ===========================================
// RESEARCH SERVICE - Competitor Research via Tavily + Yutori
// ===========================================

import { CompetitorRate, ProviderId, PROVIDERS } from '../types/index.js';
import { storeCompetitorRates } from './graph.js';
import { 
  isYutoriConfigured, 
  researchCompetitorWithYutori 
} from './yutori.js';

// Tavily API response types
interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

interface TavilySearchResponse {
  results: TavilySearchResult[];
}

// Mock competitor rates for fallback when APIs timeout/fail
const MOCK_COMPETITOR_RATES: Record<ProviderId, CompetitorRate[]> = {
  comcast: [
    { provider: 'verizon', planName: 'Fios 300 Mbps', monthlyRate: 49.99, source: 'mock', scrapedAt: new Date() },
    { provider: 'spectrum', planName: 'Internet Ultra', monthlyRate: 69.99, source: 'mock', scrapedAt: new Date() },
    { provider: 'att', planName: 'Fiber 300', monthlyRate: 55.00, source: 'mock', scrapedAt: new Date() },
  ],
  verizon: [
    { provider: 'comcast', planName: 'Xfinity Performance', monthlyRate: 59.99, source: 'mock', scrapedAt: new Date() },
    { provider: 'spectrum', planName: 'Internet Standard', monthlyRate: 49.99, source: 'mock', scrapedAt: new Date() },
  ],
  att: [
    { provider: 'verizon', planName: 'Fios 300 Mbps', monthlyRate: 49.99, source: 'mock', scrapedAt: new Date() },
    { provider: 'comcast', planName: 'Xfinity Performance Pro', monthlyRate: 69.99, source: 'mock', scrapedAt: new Date() },
  ],
  spectrum: [
    { provider: 'verizon', planName: 'Fios 200 Mbps', monthlyRate: 39.99, source: 'mock', scrapedAt: new Date() },
    { provider: 'comcast', planName: 'Xfinity Performance', monthlyRate: 49.99, source: 'mock', scrapedAt: new Date() },
  ],
  cox: [
    { provider: 'verizon', planName: 'Fios 300 Mbps', monthlyRate: 49.99, source: 'mock', scrapedAt: new Date() },
    { provider: 'spectrum', planName: 'Internet Standard', monthlyRate: 59.99, source: 'mock', scrapedAt: new Date() },
  ],
  optimum: [
    { provider: 'verizon', planName: 'Fios 300 Mbps', monthlyRate: 49.99, source: 'mock', scrapedAt: new Date() },
    { provider: 'comcast', planName: 'Xfinity Performance', monthlyRate: 54.99, source: 'mock', scrapedAt: new Date() },
  ],
  tmobile: [],
  verizon_wireless: [],
  att_wireless: [],
  mint_mobile: [],
  cricket: [],
  state_farm: [],
  geico: [],
  progressive: [],
  allstate: [],
  liberty_mutual: [],
  usaa: [],
  other: [],
};

/**
 * Search Tavily for competitor pricing with 5s timeout
 */
async function searchTavily(query: string): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not configured');
  }

  // 5 second timeout for demo reliability
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        max_results: 5,
        api_key: apiKey,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Tavily API error: ' + response.status);
    }

    const data = await response.json() as TavilySearchResponse;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Parse competitor rate from search result
 */
function parseCompetitorRate(result: TavilySearchResult, providerId: ProviderId): CompetitorRate {
  const content = result.content.toLowerCase();
  
  // Extract price from content (look for $XX.XX pattern)
  const priceMatch = content.match(/\$(\d{2,3}\.?\d{0,2})/);
  const monthlyRate = priceMatch ? parseFloat(priceMatch[1]) : 0;

  return {
    provider: providerId,
    planName: result.title,
    monthlyRate: Math.max(monthlyRate, 20), // Minimum $20 fallback
    contractTerms: extractContractTerms(content),
    source: result.url,
    scrapedAt: new Date(),
  };
}

/**
 * Extract contract terms from content
 */
function extractContractTerms(content: string): string | undefined {
  if (content.includes('contract') || content.includes('term')) {
    return 'Contract required';
  }
  if (content.includes('no contract') || content.includes('month-to-month')) {
    return 'Month-to-month';
  }
  return undefined;
}

/**
 * Get mock competitor rates for fallback
 */
function getMockCompetitorRates(provider: ProviderId): CompetitorRate[] {
  return MOCK_COMPETITOR_RATES[provider] || [];
}

/**
 * Research competitor rates for a given provider
 * Uses both Tavily and Yutori (if configured) in parallel with timeouts
 * Falls back to mock data if all APIs fail/timeout
 */
export async function researchCompetitorRates(
  provider: ProviderId,
  currentRate: number
): Promise<CompetitorRate[]> {
  const providerInfo = PROVIDERS[provider as ProviderId];
  
  if (!providerInfo) {
    throw new Error('Unknown provider: ' + provider);
  }

  const competitors = Object.values(PROVIDERS)
    .filter(p => p.id !== provider)
    .map(p => p.displayName);

  // Build search query
  const query = providerInfo.displayName + ' internet plans ' + currentRate + ' compare ' + competitors.join(' ') + ' 2026';

  // Run Tavily and Yutori in parallel with 5s timeout each
  const timeoutPromise = <T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> => {
    return Promise.race([
      promise,
      new Promise<null>(resolve => setTimeout(() => {
        console.log('[' + label + '] Timed out after ' + ms + 'ms');
        resolve(null);
      }, ms))
    ]);
  };

  // Run both APIs with timeouts, catching all errors
  const [tavilyResult, yutoriResult] = await Promise.allSettled([
    timeoutPromise(searchTavily(query).then(results => ({ source: 'tavily' as const, results })), 5000, 'Tavily'),
    timeoutPromise(
      isYutoriConfigured() 
        ? researchCompetitorWithYutori(provider, currentRate).then(rates => ({ source: 'yutori' as const, rates }))
        : Promise.resolve({ source: 'yutori' as const, rates: [] as CompetitorRate[] }),
      5000,
      'Yutori'
    ),
  ]);

  // Extract Tavily results
  let tavilyRates: CompetitorRate[] = [];
  if (tavilyResult.status === 'fulfilled' && tavilyResult.value) {
    try {
      const allProviders: Record<string, ProviderId> = {
        'comcast': 'comcast', 'xfinity': 'comcast',
        'spectrum': 'spectrum',
        'at&t': 'att', 'att': 'att',
        'verizon': 'verizon', 'fios': 'verizon',
        'cox': 'cox',
        'optimum': 'optimum',
      };
      
      tavilyRates = tavilyResult.value.results.results
        .map(result => {
          const titleLower = result.title.toLowerCase();
          const contentLower = result.content.toLowerCase();
          const text = titleLower + ' ' + contentLower;
          
          for (const [name, id] of Object.entries(allProviders)) {
            if (text.includes(name) && id !== provider) {
              return parseCompetitorRate(result, id);
            }
          }
          return null;
        })
        .filter((rate): rate is CompetitorRate => rate !== null && rate.monthlyRate > 0);
      
      if (tavilyRates.length > 0) {
        console.log('[Tavily] Found ' + tavilyRates.length + ' competitor rates');
      }
    } catch (parseError) {
      console.error('[Tavily] Failed to parse results:', parseError);
    }
  } else if (tavilyResult.status === 'rejected') {
    console.error('[Tavily] Search failed:', tavilyResult.reason);
  } else {
    console.log('[Tavily] No results (timed out or empty)');
  }

  // Extract Yutori results
  let yutoriRates: CompetitorRate[] = [];
  if (yutoriResult.status === 'fulfilled' && yutoriResult.value) {
    yutoriRates = yutoriResult.value.rates;
    if (yutoriRates.length > 0) {
      console.log('[Yutori] Found ' + yutoriRates.length + ' competitor rates');
    }
  } else if (yutoriResult.status === 'rejected') {
    console.error('[Yutori] Research failed:', yutoriResult.reason);
  } else {
    console.log('[Yutori] No results (timed out or empty)');
  }

  // Merge results, preferring Yutori when both have data for same provider
  let mergedRates = mergeCompetitorRates(tavilyRates, yutoriRates);

  // If no real results, use mock data for demo reliability
  if (mergedRates.length === 0) {
    console.log('[Research] All APIs failed/timed out, using mock data for demo');
    mergedRates = getMockCompetitorRates(provider);
  }

  // Sort by rate (lowest first)
  mergedRates.sort((a, b) => a.monthlyRate - b.monthlyRate);

  // Store in Neo4j knowledge graph for leverage in future negotiations (with timeout)
  if (mergedRates.length > 0) {
    try {
      await Promise.race([
        storeCompetitorRates(provider, mergedRates),
        new Promise<void>(resolve => setTimeout(() => {
          console.log('[Graph] Store rates timed out, continuing...');
          resolve();
        }, 3000))
      ]);
    } catch (graphError) {
      console.error('[Graph] Failed to store rates:', graphError);
    }
  }

  return mergedRates;
}

/**
 * Merge competitor rates from multiple sources
 */
function mergeCompetitorRates(
  tavilyRates: CompetitorRate[],
  yutoriRates: CompetitorRate[]
): CompetitorRate[] {
  const merged = new Map<string, CompetitorRate>();
  
  for (const rate of tavilyRates) {
    merged.set(rate.provider, rate);
  }
  
  for (const rate of yutoriRates) {
    merged.set(rate.provider, rate);
  }
  
  return Array.from(merged.values());
}

/**
 * Get competitive analysis for a provider
 */
export async function getCompetitiveAnalysis(
  provider: ProviderId,
  currentRate: number
): Promise<{
  competitors: CompetitorRate[];
  leverage: number;
  recommendation: string;
}> {
  const competitorRates = await researchCompetitorRates(provider, currentRate);
  
  const lowerRateCompetitors = competitorRates.filter(r => r.monthlyRate < currentRate);
  const leverage = lowerRateCompetitors.length > 0 
    ? Math.min(lowerRateCompetitors.length / 3, 1)
    : 0;

  let recommendation = '';
  if (leverage > 0.7) {
    recommendation = 'Strong leverage - lead with competitor conquest';
  } else if (leverage > 0.3) {
    recommendation = 'Moderate leverage - combine competitor + loyalty tactics';
  } else {
    recommendation = 'Limited leverage - lead with loyalty and churn threat';
  }

  return {
    competitors: competitorRates,
    leverage,
    recommendation,
  };
}
