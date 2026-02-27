// ===========================================
// API ROUTES - Express Router
// ===========================================

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as crypto from 'crypto';
import {
  createBill,
  getBill,
  getUserBills,
  updateBill,
  deleteBill,
  updateBillStatus,
  createNegotiation,
  getNegotiation,
  getUserNegotiations,
  updateNegotiation,
  updateNegotiationStatus,
  getDashboardData,
  createUser,
  getUser,
  getUserByEmail,
} from '../services/storage.js';
import { researchCompetitorRates } from '../services/research.js';
import { isYutoriConfigured } from '../services/yutori.js';
import { buildStrategy } from '../services/strategy.js';
import { getProviderInsights } from '../services/graph.js';
import { initiateCall, handleWebhook } from '../services/voice.js';
import { parseCCStatement } from '../services/scanner.js';
import { createDemoIVR, DemoIVRResult } from '../services/demo-ivr.js';
import { seedDemoBills, isDemoSeeded, getDemoUserId } from '../services/demo-seed.js';
import { subscribe, unsubscribe, emitStatusChange, emitCompletion } from '../services/events.js';
import {
  BillCreateInput,
  BillUpdateInput,
  UserCreateInput,
  NegotiationResponse,
  BillResponse,
  ProviderId,
  PROVIDERS,
} from '../types/index.js';

const router = Router();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Helper to get user ID from header
function getUserId(req: Request, allowQuery: boolean = false): string | undefined {
  const headerUserId = req.headers['x-user-id'];
  if (typeof headerUserId === 'string') return headerUserId;

  if (allowQuery) {
    const queryUserId = req.query.userId;
    return typeof queryUserId === 'string' ? queryUserId : undefined;
  }

  return undefined;
}

function getRawBody(req: Request): string {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (raw?.length) return raw.toString('utf8');
  return JSON.stringify(req.body || {});
}

function isWebhookVerificationEnabled(): boolean {
  return process.env.TELNYX_WEBHOOK_VERIFY === 'true';
}

function verifyWebhookWithSharedSecret(req: Request): boolean {
  const configuredSecret = process.env.TELNYX_WEBHOOK_SECRET;
  if (!configuredSecret) return false;

  const receivedSecret = req.headers['x-telnyx-webhook-secret'];
  if (typeof receivedSecret !== 'string') return false;

  const a = Buffer.from(configuredSecret, 'utf8');
  const b = Buffer.from(receivedSecret, 'utf8');
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

function verifyWebhookWithEd25519(req: Request): boolean {
  const publicKeyBase64 = process.env.TELNYX_WEBHOOK_PUBLIC_KEY;
  if (!publicKeyBase64) return false;

  const signature = req.headers['telnyx-signature-ed25519'];
  const timestamp = req.headers['telnyx-timestamp'];
  if (typeof signature !== 'string' || typeof timestamp !== 'string') return false;

  try {
    const publicKey = publicKeyBase64.includes('BEGIN PUBLIC KEY')
      ? crypto.createPublicKey(publicKeyBase64)
      : crypto.createPublicKey({
          key: Buffer.from(publicKeyBase64, 'base64'),
          format: 'der',
          type: 'spki',
        });
    const signatureBuffer = Buffer.from(signature, 'base64');
    const rawBody = getRawBody(req);

    // Support both common payload separators for compatibility with provider docs/SDK variations.
    const candidatePayloads = [`${timestamp}|${rawBody}`, `${timestamp}.${rawBody}`];
    return candidatePayloads.some(payload =>
      crypto.verify(null, Buffer.from(payload, 'utf8'), publicKey, signatureBuffer)
    );
  } catch (error) {
    console.error('Webhook Ed25519 verification error:', error);
    return false;
  }
}

function verifyTelnyxWebhook(req: Request): { verified: boolean; mode: string } {
  if (!isWebhookVerificationEnabled()) {
    return { verified: true, mode: 'disabled' };
  }

  if (verifyWebhookWithSharedSecret(req)) {
    return { verified: true, mode: 'shared-secret' };
  }

  if (verifyWebhookWithEd25519(req)) {
    return { verified: true, mode: 'ed25519' };
  }

  return { verified: false, mode: 'failed' };
}

// ===========================================
// AUTH ROUTES (MVP - simple, no real auth)
// ===========================================

/**
 * POST /api/auth/register - Create account
 */
router.post('/auth/register', (req: Request, res: Response): void => {
  try {
    const input: UserCreateInput = req.body;
    
    if (!input.email || !input.password || !input.phone) {
      res.status(400).json({
        success: false,
        error: 'Email, password, and phone are required',
      });
      return;
    }
    
    // Check if user exists
    const existing = getUserByEmail(input.email);
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'User already exists',
      });
      return;
    }
    
    const user = createUser(input);
    
    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/login - Login (MVP - returns user)
 */
router.post('/auth/login', (req: Request, res: Response): void => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }
    
    // For MVP, accept any password
    const user = getUserByEmail(email);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/auth/me - Get current user (MVP - uses userId header)
 */
router.get('/auth/me', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    const user = getUser(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ===========================================
// BILL ROUTES
// ===========================================

/**
 * GET /api/bills - List user's bills
 */
router.get('/bills', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    const bills = getUserBills(userId);
    const response: BillResponse[] = bills.map(bill => ({
      id: bill.id,
      provider: bill.provider,
      category: bill.category,
      accountNumber: bill.accountNumber,
      currentRate: bill.currentRate,
      planName: bill.planName,
      providerName: bill.providerName,
      billDate: bill.billDate,
      status: bill.status,
      createdAt: bill.createdAt.toISOString(),
      updatedAt: bill.updatedAt.toISOString(),
    }));
    
    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('List bills error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/bills - Add a bill
 */
router.post('/bills', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    const input: BillCreateInput = req.body;
    
    if (!input.provider || !input.accountNumber || !input.currentRate) {
      res.status(400).json({
        success: false,
        error: 'Provider, account number, and current rate are required',
      });
      return;
    }
    
    const bill = createBill(userId, input);
    
    res.status(201).json({
      success: true,
      data: {
        id: bill.id,
        provider: bill.provider,
        category: bill.category,
        accountNumber: bill.accountNumber,
        currentRate: bill.currentRate,
        planName: bill.planName,
      providerName: bill.providerName,
        billDate: bill.billDate,
        status: bill.status,
        createdAt: bill.createdAt.toISOString(),
        updatedAt: bill.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/bills/:id - Get bill details
 */
router.get('/bills/:id', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    const bill = getBill(id);
    
    if (!bill || bill.userId !== userId) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: bill.id,
        provider: bill.provider,
        category: bill.category,
        accountNumber: bill.accountNumber,
        currentRate: bill.currentRate,
        planName: bill.planName,
      providerName: bill.providerName,
        billDate: bill.billDate,
        status: bill.status,
        createdAt: bill.createdAt.toISOString(),
        updatedAt: bill.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PUT /api/bills/:id - Update bill
 */
router.put('/bills/:id', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    const input: BillUpdateInput = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    const existing = getBill(id);
    if (!existing || existing.userId !== userId) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }
    
    const updated = updateBill(id, input);
    
    if (!updated) {
      res.status(500).json({
        success: false,
        error: 'Failed to update bill',
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: updated.id,
        provider: updated.provider,
        category: updated.category,
        accountNumber: updated.accountNumber,
        currentRate: updated.currentRate,
        planName: updated.planName,
        providerName: updated.providerName,
        billDate: updated.billDate,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/bills/:id - Remove bill
 */
router.delete('/bills/:id', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    const existing = getBill(id);
    if (!existing || existing.userId !== userId) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }
    
    const deleted = deleteBill(id);
    
    if (!deleted) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete bill',
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Bill deleted',
    });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/bills/:id/negotiate - Start negotiation
 */
router.post('/bills/:id/negotiate', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    const bill = getBill(id);
    if (!bill || bill.userId !== userId) {
      res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
      return;
    }
    
    if (bill.status === 'negotiating') {
      res.status(409).json({
        success: false,
        error: 'Negotiation already in progress',
      });
      return;
    }
    
    // Update bill status to negotiating
    updateBillStatus(id, 'negotiating');
    
    // Create negotiation record with customer name
    const negotiation = createNegotiation(id, userId, bill.currentRate, 'Sarah Mitchell');
    
    // Start research phase
    updateNegotiationStatus(negotiation.id, 'researching');
    emitStatusChange(negotiation.id, 'researching');
    
    // Research competitor rates
    const competitorRates = await researchCompetitorRates(bill.provider, bill.currentRate);
    
    // Build strategy (async - uses graph for leverage data)
    const strategy = await buildStrategy(bill, competitorRates);
    
    // Update negotiation with research and strategy
    updateNegotiation(negotiation.id, {
      competitorRates,
      selectedTactics: strategy.tactics,
      status: 'calling',
    });
    emitStatusChange(negotiation.id, 'calling');
    
    // Check if DEMO_MODE is enabled for reliable hackathon demos
    const demoMode = process.env.DEMO_MODE === 'true';

    if (demoMode) {
      // DEMO MODE: Simulate negotiation without real call
      console.log('[DEMO MODE] Simulating negotiation for bill:', id);
      updateNegotiation(negotiation.id, {
        startedAt: new Date(),
        status: 'negotiating',
      });
      emitStatusChange(negotiation.id, 'negotiating');

      // Simulate negotiation completing after 8 seconds
      setTimeout(async () => {
        const targetRate = bill.currentRate * 0.80; // 20% savings
        const monthlySavings = bill.currentRate - targetRate;
        const totalSavings = monthlySavings * 12;

        // Generate mock voice intelligence for demo (Modulate integration showcase)
        const mockVoiceIntelligence = {
          emotions: { Pleasant: 0.35, Confident: 0.25, Calm: 0.20, Satisfied: 0.15, Neutral: 0.05 },
          dominantEmotion: 'Pleasant',
          speakerCount: 2,
          piiDetected: false,
          utteranceCount: 7,
          durationMs: 8000,
          emotionTimeline: [
            { time_ms: 0, emotion: 'Neutral', speaker: 1, text: 'Hello, this is customer retention' },
            { time_ms: 2500, emotion: 'Calm', speaker: 0, text: 'I was hoping to discuss my current rate' },
            { time_ms: 6000, emotion: 'Pleasant', speaker: 1, text: 'I see you have been with us for a while' },
            { time_ms: 9000, emotion: 'Confident', speaker: 0, text: `Yes, and I found ${competitorRates?.[0]?.provider || 'competitors'} offering better rates` },
            { time_ms: 13000, emotion: 'Cooperative', speaker: 1, text: 'Let me see what I can do for you' },
            { time_ms: 16000, emotion: 'Pleasant', speaker: 1, text: `I can offer you $${targetRate.toFixed(2)} per month` },
            { time_ms: 19000, emotion: 'Satisfied', speaker: 0, text: 'That sounds great, thank you' },
          ],
        };

        updateNegotiation(negotiation.id, {
          status: 'success',
          newRate: targetRate,
          monthlySavings,
          totalSavings,
          completedAt: new Date(),
          voiceIntelligence: mockVoiceIntelligence,
        });

        updateBillStatus(id, 'active');
        emitStatusChange(negotiation.id, 'success', {
          newRate: targetRate,
          monthlySavings,
          annualSavings: totalSavings,
        });
        emitCompletion(negotiation.id, {
          success: true,
          newRate: targetRate,
          monthlySavings,
          annualSavings: totalSavings,
        });

        console.log(`[DEMO MODE] Negotiation completed: $${bill.currentRate} → $${targetRate}/mo`);
      }, 8000);
    } else {
      // PRODUCTION MODE: Make real Telnyx call
      try {
        const callResult = await initiateCall({
          ...negotiation,
          competitorRates,
          selectedTactics: strategy.tactics,
          status: 'calling',
        });

        updateNegotiation(negotiation.id, {
          telnyxCallId: callResult.callId,
          startedAt: new Date(),
          status: 'negotiating',
        });
        emitStatusChange(negotiation.id, 'negotiating');
      } catch (callError) {
        console.error('Call initiation failed:', callError);
        // Continue anyway - for demo purposes
        updateNegotiation(negotiation.id, {
          startedAt: new Date(),
          status: 'negotiating',
        });
        emitStatusChange(negotiation.id, 'negotiating');
      }
    }
    
    const updatedNeg = getNegotiation(negotiation.id);
    
    res.status(202).json({
      success: true,
      data: {
        negotiationId: negotiation.id,
        status: updatedNeg?.status || 'calling',
        estimatedDuration: '5-10 minutes',
        strategy: {
          primaryTactic: strategy.primaryTactic,
          expectedSavings: strategy.expectedSavings,
        },
      },
    });
  } catch (error) {
    console.error('Negotiate error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ===========================================
// NEGOTIATION ROUTES
// ===========================================

/**
 * GET /api/negotiations - List user's negotiations
 */
router.get('/negotiations', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    const negotiations = getUserNegotiations(userId);
    const response: NegotiationResponse[] = negotiations.map(neg => ({
      id: neg.id,
      billId: neg.billId,
      status: neg.status,
      originalRate: neg.originalRate,
      newRate: neg.newRate,
      monthlySavings: neg.monthlySavings,
      annualSavings: (neg.monthlySavings || 0) * 12,
      attempts: neg.attempts,
      createdAt: neg.createdAt.toISOString(),
    }));
    
    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('List negotiations error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/negotiations/:id - Get negotiation status
 */
router.get('/negotiations/:id', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    const negotiation = getNegotiation(id);
    
    if (!negotiation || negotiation.userId !== userId) {
      res.status(404).json({
        success: false,
        error: 'Negotiation not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: negotiation.id,
        billId: negotiation.billId,
        status: negotiation.status,
        originalRate: negotiation.originalRate,
        newRate: negotiation.newRate,
        monthlySavings: negotiation.monthlySavings,
        annualSavings: (negotiation.monthlySavings || 0) * 12,
        totalSavings: negotiation.totalSavings,
        attempts: negotiation.attempts,
        startedAt: negotiation.startedAt?.toISOString(),
        completedAt: negotiation.completedAt?.toISOString(),
        createdAt: negotiation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get negotiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/negotiations/:id/voice-intelligence - Get Modulate voice intelligence analysis
 */
router.get('/negotiations/:id/voice-intelligence', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const negotiation = getNegotiation(id);

    if (!negotiation || negotiation.userId !== userId) {
      res.status(404).json({
        success: false,
        error: 'Negotiation not found',
      });
      return;
    }

    if (!negotiation.voiceIntelligence) {
      res.status(404).json({
        success: false,
        error: 'Voice intelligence not available for this negotiation',
      });
      return;
    }

    res.json({
      success: true,
      data: negotiation.voiceIntelligence,
    });
  } catch (error) {
    console.error('Get voice intelligence error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/negotiations/:id/stream - SSE endpoint for real-time updates
 */
router.get('/negotiations/:id/stream', (req: Request, res: Response): void => {
  // TODO(post-hackathon): replace query-param auth fallback with signed token/cookie auth.
  const userId = getUserId(req, true);
  const id = String(req.params.id);
  
  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }
  
  const negotiation = getNegotiation(id);
  
  if (!negotiation || negotiation.userId !== userId) {
    res.status(404).json({
      success: false,
      error: 'Negotiation not found',
    });
    return;
  }
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Send initial event with current negotiation status
  res.write(`data: ${JSON.stringify({
    type: 'status_change',
    status: negotiation.status,
    originalRate: negotiation.originalRate,
    newRate: negotiation.newRate,
    monthlySavings: negotiation.monthlySavings,
    timestamp: new Date().toISOString(),
  })}\n\n`);
  
  // Subscribe to future events
  subscribe(id, res);
  
  // Handle client disconnect
  req.on('close', () => {
    unsubscribe(id, res);
  });
});

// ===========================================
// DASHBOARD ROUTES
// ===========================================

/**
 * GET /api/dashboard - Get dashboard stats
 */
router.get('/dashboard', (req: Request, res: Response): void => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      // Return empty dashboard instead of 401 to prevent frontend crash
      res.json({
        success: true,
        data: {
          user: null,
          stats: {
            totalBills: 0,
            activeNegotiations: 0,
            completedNegotiations: 0,
            successfulNegotiations: 0,
            totalMonthlySavings: 0,
            totalLifetimeSavings: 0,
            successRate: 0,
          },
          recentNegotiations: [],
          activeBills: [],
        },
      });
      return;
    }

    const dashboard = getDashboardData(userId);

    if (!dashboard) {
      // Return empty dashboard instead of 404 to prevent frontend crash
      res.json({
        success: true,
        data: {
          user: { id: userId },
          stats: {
            totalBills: 0,
            activeNegotiations: 0,
            completedNegotiations: 0,
            successfulNegotiations: 0,
            totalMonthlySavings: 0,
            totalLifetimeSavings: 0,
            successRate: 0,
          },
          recentNegotiations: [],
          activeBills: [],
        },
      });
      return;
    }

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ===========================================
// GRAPH / KNOWLEDGE GRAPH ROUTES
// ===========================================

/**
 * GET /api/graph/provider/:id - Get provider insights from Neo4j
 */
router.get('/graph/provider/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const providerId = String(req.params.id) as ProviderId;
    
    if (!PROVIDERS[providerId]) {
      res.status(400).json({
        success: false,
        error: 'Invalid provider ID',
      });
      return;
    }
    
    const insights = await getProviderInsights(providerId);
    
    if (!insights) {
      // Graph not available - return empty data
      res.json({
        success: true,
        data: {
          provider: providerId,
          connected: false,
          message: 'Knowledge graph not available',
        },
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        provider: providerId,
        connected: true,
        ...insights,
      },
    });
  } catch (error) {
    console.error('Graph provider insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ===========================================
// WEBHOOK ROUTES
// ===========================================

/**
 * POST /api/webhooks/telnyx - Handle Telnyx call events
 */
router.post('/webhooks/telnyx', async (req: Request, res: Response): Promise<void> => {
  try {
    const verification = verifyTelnyxWebhook(req);
    if (!verification.verified) {
      res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
      return;
    }

    // Telnyx wraps webhook events in a "data" object
    const event = req.body.data || req.body;
    
    console.log(`Received Telnyx webhook (verification=${verification.mode}):`, event);
    
    const result = await handleWebhook(event);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
});

// ===========================================
// CC STATEMENT SCANNER ROUTES
// ===========================================

/**
 * POST /api/scan - Scan CC statement PDF for recurring bills
 */
router.post('/scan', upload.single('statement'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No PDF file uploaded',
      });
      return;
    }
    
    console.log(`Processing PDF upload: ${req.file.originalname}, ${req.file.size} bytes`);
    
    // Parse the PDF and detect bills
    const detectedBills = await parseCCStatement(req.file.buffer);
    
    res.json({
      success: true,
      data: detectedBills,
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process PDF',
    });
  }
});

// ===========================================
// DEMO SETUP ROUTES
// ===========================================

/**
 * POST /api/demo/setup - Setup demo environment
 * Creates the demo IVR assistant and seeds demo bills
 */
router.post('/demo/setup', async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('Setting up demo environment...');

    // 1. Create demo IVR assistant (or find existing)
    let ivrResult: DemoIVRResult;
    try {
      ivrResult = await createDemoIVR();
      console.log(`Demo IVR: ${ivrResult.status} - ${ivrResult.assistantId}`);
    } catch (ivrError) {
      console.error('Failed to create demo IVR:', ivrError);
      ivrResult = {
        assistantId: 'failed',
        name: 'Comcast Customer Retention Demo',
        status: 'created',
      };
    }

    // 2. Seed demo bills if not already seeded
    const wasSeeded = isDemoSeeded();
    const seedResult = seedDemoBills();
    
    // Always resolve the demo user ID (seedResult.userId is empty if already seeded)
    const demoUserId = seedResult.userId || getDemoUserId?.() || '';
    
    res.json({
      success: true,
      data: {
        userId: demoUserId,
        ivr: {
          assistantId: ivrResult.assistantId,
          phoneNumber: ivrResult.phoneNumber,
          status: ivrResult.status,
        },
        bills: {
          seeded: !wasSeeded,
          count: seedResult.billsCreated,
          userId: demoUserId,
        },
        yutori: {
          configured: isYutoriConfigured(),
          status: isYutoriConfigured() ? 'active' : 'not_configured',
        },
        demoUser: {
          email: 'demo@slash.ai',
          password: 'demo123',
          userId: demoUserId,
        },
        instructions: {
          login: 'Use email "demo@slash.ai" with password "demo123" to log in as the demo user.',
          ivr: ivrResult.phoneNumber 
            ? `Call ${ivrResult.phoneNumber} to reach the demo Comcast retention line.`
            : 'Ask Slash to call the demo Comcast retention line using the assistant ID.',
        },
      },
    });
  } catch (error) {
    console.error('Demo setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup demo environment',
    });
  }
});

/**
 * GET /api/demo/status - Check demo environment status
 */
router.get('/demo/status', (_req: Request, res: Response): void => {
  const webhookVerificationEnabled = isWebhookVerificationEnabled();
  const webhookMode = process.env.TELNYX_WEBHOOK_SECRET
    ? 'shared-secret'
    : process.env.TELNYX_WEBHOOK_PUBLIC_KEY
      ? 'ed25519'
      : 'not-configured';

  res.json({
    success: true,
    data: {
      billsSeeded: isDemoSeeded(),
      demoUser: {
        email: 'demo@slash.ai',
        userId: getDemoUserId?.() || null,
      },
      sponsors: {
        telnyx: {
          configured: Boolean(
            process.env.TELNYX_API_KEY &&
            process.env.TELNYX_PHONE_NUMBER &&
            process.env.TELNYX_CONNECTION_ID
          ),
          status: process.env.TELNYX_API_KEY ? 'voice-ready' : 'missing-credentials',
        },
        tavily: {
          configured: Boolean(process.env.TAVILY_API_KEY),
          status: process.env.TAVILY_API_KEY ? 'research-ready' : 'missing-credentials',
        },
        yutori: {
          configured: isYutoriConfigured(),
          status: isYutoriConfigured() ? 'research-ready' : 'missing-credentials',
        },
        neo4j: {
          configured: Boolean(process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD),
          status: process.env.NEO4J_URI ? 'graph-ready' : 'missing-credentials',
        },
        render: {
          configured: true,
          status: 'deploy-config-ready',
        },
        modulate: {
          configured: Boolean(process.env.MODULATE_API_KEY),
          status: process.env.MODULATE_API_KEY ? 'adapter-ready' : 'pending-event-key',
        },
      },
      webhookSecurity: {
        verificationEnabled: webhookVerificationEnabled,
        mode: webhookVerificationEnabled ? webhookMode : 'disabled',
      },
    },
  });
});

export default router;
