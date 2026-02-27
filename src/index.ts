import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import apiRouter from './routes/api.js';
import { initGraph, seedProviders } from './services/graph.js';
import { seedDemoBills, seedGraphData } from './services/demo-seed.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
  },
}));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'slash-api'
  });
});

// API info
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'Slash API',
    version: '1.0.0',
    description: 'AI Bill Negotiation Agent API',
    endpoints: {
      auth: '/api/auth',
      bills: '/api/bills',
      negotiations: '/api/negotiations',
      dashboard: '/api/dashboard',
      webhooks: '/api/webhooks/telnyx',
    },
    note: 'Include x-user-id header for authenticated routes'
  });
});

// API routes (must come before static files to take precedence)
app.use('/api', apiRouter);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA catch-all - serve index.html for all non-API routes
// This handles client-side routing (React Router)
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Slash API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  
  // Initialize Neo4j knowledge graph
  const graphConnected = await initGraph();
  if (graphConnected) {
    console.log('🧠 Knowledge Graph: Connected to Neo4j');
    await seedProviders();
    console.log('🧠 Knowledge Graph: Providers seeded');
    await seedGraphData();
  } else {
    console.log('🧠 Knowledge Graph: Not available (Neo4j not configured)');
  }

  // Seed demo bills for hackathon demo
  const seedResult = seedDemoBills();
  if (seedResult.billsCreated > 0) {
    console.log(`🎯 Demo data: Seeded ${seedResult.billsCreated} bills for demo user`);
  } else {
    console.log('🎯 Demo data: Already seeded');
  }
});

export default app;
