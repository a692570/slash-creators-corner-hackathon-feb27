// ===========================================
// GRAPH SERVICE - Neo4j Knowledge Graph
// ===========================================

import neo4j, { Driver, Session } from 'neo4j-driver';
import {
  ProviderId,
  PROVIDERS,
  CompetitorRate,
  RetentionOffer,
  ProviderLeverage,
  NegotiationTactic,
} from '../types/index.js';

// Graph client singleton
let driver: Driver | null = null;
let isConnected = false;

// Configuration
const getConfig = () => ({
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'neo4j',
});

// ===========================================
// CONNECTION MANAGEMENT
// ===========================================

/**
 * Initialize Neo4j connection and create constraints/indexes
 */
export async function initGraph(): Promise<boolean> {
  const config = getConfig();
  
  // Check if credentials are set
  if (!process.env.NEO4J_URI || !process.env.NEO4J_PASSWORD) {
    console.warn('[Graph] Neo4j not configured - graph features disabled');
    return false;
  }

  try {
    driver = neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.password));
    
    // Test connection
    await driver.verifyConnectivity();
    isConnected = true;
    console.log('[Graph] Connected to Neo4j');
    
    // Create constraints and indexes
    await createConstraints();
    
    return true;
  } catch (error) {
    console.warn('[Graph] Failed to connect to Neo4j:', error);
    isConnected = false;
    driver = null;
    return false;
  }
}

/**
 * Create database constraints and indexes
 */
async function createConstraints(): Promise<void> {
  if (!driver) return;
  
  const session = driver.session();
  try {
    // Provider node constraints
    await session.run('CREATE CONSTRAINT provider_id IF NOT EXISTS FOR (p:Provider) REQUIRE p.id IS UNIQUE');
    await session.run('CREATE INDEX provider_name IF NOT EXISTS FOR (p:Provider) ON (p.name)');
    
    // Competitor rate constraints
    await session.run('CREATE INDEX rate_provider IF NOT EXISTS FOR (r:Rate) ON (r.provider)');
    await session.run('CREATE INDEX rate_price IF NOT EXISTS FOR (r:Rate) ON (r.price)');
    
    // Retention offer constraints
    await session.run('CREATE INDEX offer_provider IF NOT EXISTS FOR (o:Offer) ON (o.provider)');
    
    // Result constraints
    await session.run('CREATE INDEX result_provider IF NOT EXISTS FOR (res:Result) ON (res.provider)');
    await session.run('CREATE INDEX result_date IF NOT EXISTS FOR (res:Result) ON (res.date)');
    
    console.log('[Graph] Constraints and indexes created');
  } catch (error) {
    console.warn('[Graph] Constraint creation warning:', error);
  } finally {
    await session.close();
  }
}

/**
 * Get a Neo4j session (caller must close)
 */
function getSession(): Session | null {
  if (!driver || !isConnected) {
    console.warn('[Graph] Not connected to Neo4j');
    return null;
  }
  return driver.session();
}

/**
 * Check if graph is available
 */
export function isGraphConnected(): boolean {
  return isConnected;
}

/**
 * Close the Neo4j connection
 */
export async function closeGraph(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    isConnected = false;
    console.log('[Graph] Disconnected from Neo4j');
  }
}

// ===========================================
// PROVIDER SEEDING
// ===========================================

/**
 * Seed the 6 ISP providers with known retention numbers
 */
export async function seedProviders(): Promise<void> {
  const session = getSession();
  if (!session) return;

  try {
    for (const provider of Object.values(PROVIDERS)) {
      await session.run(
        `MERGE (p:Provider {id: $id})
         SET p.name = $name,
             p.displayName = $displayName,
             p.retentionPhone = $retentionPhone
         RETURN p`,
        {
          id: provider.id,
          name: provider.name,
          displayName: provider.displayName,
          retentionPhone: provider.retentionDepartmentPhone || '',
        }
      );
    }
    
    // Create COMPETES_WITH relationships between all providers
    const providerIds = Object.keys(PROVIDERS);
    for (let i = 0; i < providerIds.length; i++) {
      for (let j = i + 1; j < providerIds.length; j++) {
        await session.run(
          `MATCH (a:Provider {id: $id1}), (b:Provider {id: $id2})
           MERGE (a)-[:COMPETES_WITH]->(b)
           MERGE (b)-[:COMPETES_WITH]->(a)`,
          { id1: providerIds[i], id2: providerIds[j] }
        );
      }
    }
    
    console.log('[Graph] Providers seeded');
  } catch (error) {
    console.error('[Graph] Seed error:', error);
  } finally {
    await session.close();
  }
}

// ===========================================
// COMPETITOR RATES
// ===========================================

/**
 * Store competitor rates from research
 */
export async function storeCompetitorRates(
  provider: ProviderId,
  rates: CompetitorRate[]
): Promise<void> {
  const session = getSession();
  if (!session) return;

  try {
    for (const rate of rates) {
      // Create rate node
      await session.run(
        `MERGE (r:Rate {provider: $provider, planName: $planName, source: $source})
         SET r.price = $price,
             r.contractTerms = $contractTerms,
             r.scrapedAt = $scrapedAt
         WITH r
         MATCH (p:Provider {id: $providerId})
         MERGE (p)-[:HAS_RATE]->(r)`,
        {
          provider: rate.provider,
          planName: rate.planName,
          source: rate.source,
          price: rate.monthlyRate,
          contractTerms: rate.contractTerms || null,
          scrapedAt: rate.scrapedAt.toISOString(),
          providerId: provider,
        }
      );
    }
    
    console.log(`[Graph] Stored ${rates.length} competitor rates for ${provider}`);
  } catch (error) {
    console.error('[Graph] Store competitor rates error:', error);
  } finally {
    await session.close();
  }
}

// ===========================================
// RETENTION OFFERS
// ===========================================

/**
 * Store observed retention offers
 */
export async function storeRetentionOffer(
  provider: ProviderId,
  offer: RetentionOffer
): Promise<void> {
  const session = getSession();
  if (!session) return;

  try {
    await session.run(
      `MERGE (o:Offer {provider: $provider, trigger: $trigger})
       SET o.typicalDiscount = $discount,
           o.successRate = $successRate,
           o.recordedAt = $recordedAt
       WITH o
       MATCH (p:Provider {id: $providerId})
       MERGE (p)-[:OFFERS_RETENTION]->(o)`,
      {
        provider: provider,
        trigger: offer.trigger,
        discount: offer.typicalDiscount,
        successRate: offer.successRate,
        recordedAt: new Date().toISOString(),
        providerId: provider,
      }
    );
    
    console.log(`[Graph] Stored retention offer for ${provider}: ${offer.trigger}`);
  } catch (error) {
    console.error('[Graph] Store retention offer error:', error);
  } finally {
    await session.close();
  }
}

// ===========================================
// NEGOTIATION RESULTS
// ===========================================

/**
 * Store negotiation result
 */
export async function storeNegotiationResult(
  provider: ProviderId,
  originalRate: number,
  newRate: number,
  tactics: NegotiationTactic[],
  success: boolean
): Promise<void> {
  const session = getSession();
  if (!session) return;

  const savings = originalRate - newRate;
  const savingsPercent = (savings / originalRate) * 100;
  
  // Get the tactic that led to success (or last one if failed)
  const effectiveTactic = tactics[tactics.length - 1] || 'retention_close';

  try {
    await session.run(
      `CREATE (res:Result {
         provider: $provider,
         originalRate: $originalRate,
         newRate: $newRate,
         savings: $savings,
         savingsPercent: $savingsPercent,
         tactics: $tactics,
         effectiveTactic: $effectiveTactic,
         success: $success,
         date: $date
       })
       WITH res
       MATCH (p:Provider {id: $providerId})
       MERGE (p)-[:NEGOTIATION_HISTORY]->(res)`,
      {
        provider: provider,
        originalRate,
        newRate,
        savings,
        savingsPercent,
        tactics: JSON.stringify(tactics),
        effectiveTactic,
        success,
        date: new Date().toISOString(),
        providerId: provider,
      }
    );
    
    console.log(`[Graph] Stored negotiation result for ${provider}: ${success ? 'success' : 'failed'}, $${savings} saved`);
  } catch (error) {
    console.error('[Graph] Store negotiation result error:', error);
  } finally {
    await session.close();
  }
}

// ===========================================
// LEVERAGE QUERIES
// ===========================================

/**
 * Get all leverage data for a provider
 */
export async function getLeverage(provider: ProviderId): Promise<ProviderLeverage | null> {
  const session = getSession();
  if (!session) return null;

  try {
    // Get competitor rates (lower than current)
    const ratesResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:HAS_RATE]->(rate:Rate)
       WHERE rate.price > 0
       RETURN rate.provider as provider, rate.planName as planName, 
              rate.price as price, rate.source as source,
              rate.scrapedAt as scrapedAt
       ORDER BY rate.price ASC
       LIMIT 10`,
      { providerId: provider }
    );

    const competitorOffers: CompetitorRate[] = ratesResult.records.map(record => ({
      provider: record.get('provider'),
      planName: record.get('planName'),
      monthlyRate: record.get('price'),
      source: record.get('source'),
      scrapedAt: new Date(record.get('scrapedAt')),
    }));

    // Get retention offers
    const offersResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:OFFERS_RETENTION]->(offer:Offer)
       RETURN offer.trigger as trigger, offer.typicalDiscount as typicalDiscount,
              offer.successRate as successRate`,
      { providerId: provider }
    );

    const retentionOffers: RetentionOffer[] = offersResult.records.map(record => ({
      provider,
      trigger: record.get('trigger'),
      typicalDiscount: record.get('typicalDiscount'),
      successRate: record.get('successRate'),
    }));

    // Get negotiation count
    const countResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:NEGOTIATION_HISTORY]->(res:Result)
       RETURN count(res) as total`,
      { providerId: provider }
    );
    
    const historicalNegotiations = countResult.records[0]?.get('total') || 0;

    // Get average savings
    const avgResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:NEGOTIATION_HISTORY]->(res:Result {success: true})
       RETURN avg(res.savings) as avgSavings`,
      { providerId: provider }
    );
    
    const averageSavings = avgResult.records[0]?.get('avgSavings') || 0;

    return {
      provider,
      competitorOffers,
      retentionOffers,
      historicalNegotiations,
      averageSavings,
    };
  } catch (error) {
    console.error('[Graph] Get leverage error:', error);
    return null;
  } finally {
    await session.close();
  }
}

// ===========================================
// PROVIDER INSIGHTS
// ===========================================

/**
 * Get aggregated insights for a provider
 */
export async function getProviderInsights(provider: ProviderId): Promise<{
  averageSavings: number;
  bestTactic: string;
  successRate: number;
  totalNegotiations: number;
  topCompetitorRates: CompetitorRate[];
  commonRetentionOffers: RetentionOffer[];
} | null> {
  const session = getSession();
  if (!session) return null;

  try {
    // Average savings
    const avgSavingsResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:NEGOTIATION_HISTORY]->(res:Result)
       WHERE res.success = true
       RETURN avg(res.savings) as avgSavings`,
      { providerId: provider }
    );
    const averageSavings = avgSavingsResult.records[0]?.get('avgSavings') || 0;

    // Best tactic (most successful)
    const tacticResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:NEGOTIATION_HISTORY]->(res:Result {success: true})
       RETURN res.effectiveTactic as tactic, count(*) as count
       ORDER BY count DESC
       LIMIT 1`,
      { providerId: provider }
    );
    const bestTactic = tacticResult.records[0]?.get('tactic') || 'unknown';

    // Success rate
    const successResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:NEGOTIATION_HISTORY]->(res:Result)
       RETURN count(res) as total, 
              count(CASE WHEN res.success = true THEN 1 END) as successful`,
      { providerId: provider }
    );
    
    let successRate = 0;
    if (successResult.records.length > 0) {
      const total = successResult.records[0].get('total') || 0;
      const successful = successResult.records[0].get('successful') || 0;
      successRate = total > 0 ? (successful / total) * 100 : 0;
    }

    // Total negotiations
    const totalResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:NEGOTIATION_HISTORY]->(res:Result)
       RETURN count(res) as total`,
      { providerId: provider }
    );
    const totalNegotiations = totalResult.records[0]?.get('total') || 0;

    // Top competitor rates
    const ratesResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:HAS_RATE]->(rate:Rate)
       RETURN rate.provider as provider, rate.planName as planName, 
              rate.price as price, rate.source as source,
              rate.scrapedAt as scrapedAt
       ORDER BY rate.price ASC
       LIMIT 5`,
      { providerId: provider }
    );
    
    const topCompetitorRates: CompetitorRate[] = ratesResult.records.map(record => ({
      provider: record.get('provider'),
      planName: record.get('planName'),
      monthlyRate: record.get('price'),
      source: record.get('source'),
      scrapedAt: new Date(record.get('scrapedAt')),
    }));

    // Common retention offers
    const offersResult = await session.run(
      `MATCH (p:Provider {id: $providerId})-[r:OFFERS_RETENTION]->(offer:Offer)
       RETURN offer.trigger as trigger, offer.typicalDiscount as typicalDiscount,
              offer.successRate as successRate
       ORDER BY offer.successRate DESC
       LIMIT 5`,
      { providerId: provider }
    );
    
    const commonRetentionOffers: RetentionOffer[] = offersResult.records.map(record => ({
      provider,
      trigger: record.get('trigger'),
      typicalDiscount: record.get('typicalDiscount'),
      successRate: record.get('successRate'),
    }));

    return {
      averageSavings,
      bestTactic,
      successRate,
      totalNegotiations,
      topCompetitorRates,
      commonRetentionOffers,
    };
  } catch (error) {
    console.error('[Graph] Get provider insights error:', error);
    return null;
  } finally {
    await session.close();
  }
}