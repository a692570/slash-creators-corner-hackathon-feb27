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

/**
 * Search Tavily for competitor pricing
 */
async function searchTavily(query: string): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not configured');
  }

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
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json() as TavilySearchResponse;
  return data;
}

/**
 * Parse competitor rate from search result
 */
function parseCompetitorRate(result: TavilySearchResult, providerId: ProviderId): CompetitorRate {
  const content = result.content.toLowerCase();
  
  // Extract price from content (look for $XX.XX pattern)
  const priceMatch = content.match(/\$?(\d{2,3}\.?\d{0,2})/);
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
 * Research competitor rates for a given provider
 * Uses both Tavily and Yutori (if configured) in parallel
 * Merges results, preferring Yutori when both return data for same provider
 * @param provider - The current provider (e.g., 'comcast')
 * @param currentRate - The customer's current monthly rate
 * @returns Array of CompetitorRate objects
 */
export async function researchCompetitorRates(
  provider: ProviderId,
  currentRate: number
): Promise<CompetitorRate[]> {
  const providerInfo = PROVIDERS[provider as ProviderId];
  
  if (!providerInfo) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const competitors = Object.values(PROVIDERS)
    .filter(p => p.id !== provider)
    .map(p => p.displayName);

  // Build search query
  const query = `${providerInfo.displayName} internet plans ${currentRate} compare ${competitors.join(' ')} 2026`;

  // Run Tavily and Yutori in parallel using Promise.allSettled
  const [tavilyResult, yutoriResult] = await Promise.allSettled([
    searchTavily(query).then(results => ({ source: 'tavily' as const, results })),
    isYutoriConfigured() 
      ? researchCompetitorWithYutori(provider, currentRate).then(rates => ({ source: 'yutori' as const, rates }))
      : Promise.resolve({ source: 'yutori' as const, rates: [] as CompetitorRate[] })
  ]);

  // Extract Tavily results
  let tavilyRates: CompetitorRate[] = [];
  if (tavilyResult.status === 'fulfilled') {
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
          // Try to identify which provider this result is about
          const titleLower = result.title.toLowerCase();
          const contentLower = result.content.toLowerCase();
          const text = `${titleLower} ${contentLower}`;
          
          for (const [name, id] of Object.entries(allProviders)) {
            if (text.includes(name) && id !== provider) {
              return parseCompetitorRate(result, id);
            }
          }
          
          // Default to other provider if can't identify
          return null;
        })
        .filter((rate): rate is CompetitorRate => rate !== null && rate.monthlyRate > 0);
    } catch (parseError) {
      console.error('[Tavily] Failed to parse results:', parseError);
    }
  } else {
    console.error('[Tavily] Search failed:', tavilyResult.reason);
  }

  // Extract Yutori results
  let yutoriRates: CompetitorRate[] = [];
  if (yutoriResult.status === 'fulfilled') {
    yutoriRates = yutoriResult.value.rates;
    if (yutoriRates.length > 0) {
      console.log(`[Yutori] Found ${yutoriRates.length} competitor rates`);
    }
  } else {
    console.error('[Yutori] Research failed:', yutoriResult.reason);
  }

  // Merge results, preferring Yutori when both have data for same provider
  const mergedRates = mergeCompetitorRates(tavilyRates, yutoriRates);

  // Sort by rate (lowest first)
  mergedRates.sort((a, b) => a.monthlyRate - b.monthlyRate);

  // Store in Neo4j knowledge graph for leverage in future negotiations
  if (mergedRates.length > 0) {
    await storeCompetitorRates(provider, mergedRates);
  }

  return mergedRates;
}

/**
 * Merge competitor rates from multiple sources
 * Prefers Yutori results when both sources have data for the same provider
 */
function mergeCompetitorRates(
  tavilyRates: CompetitorRate[],
  yutoriRates: CompetitorRate[]
): CompetitorRate[] {
  const merged = new Map<string, CompetitorRate>();
  
  // Add Tavily results first
  for (const rate of tavilyRates) {
    merged.set(rate.provider, rate);
  }
  
  // Yutori results override Tavily for same provider (deeper research)
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
    ? Math.min(lowerRateCompetitors.length / 3, 1)  // 0-1 scale
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