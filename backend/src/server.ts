import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import { initDB } from './db/index';
import { migrate } from './db/migrate';
import { initializeConnectors } from './connectors';
import syncRoutes from './routes/sync';
import chatRoutes from './routes/chat';
import agentRoutes from './routes/agent';
import { addShopifyAuthRoutes } from './shopify-auth';
import { logger } from './utils/logger';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`📥 ${req.method} ${req.path}`, { 
    query: req.query,
    timestamp: new Date().toISOString()
  });
  next();
});

addShopifyAuthRoutes(app);

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Health check
app.get('/health', (req, res) => {
  logger.info('Health check request');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/sync', syncRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agent', agentRoutes);

// Global error handling middleware
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
});

// Initialize and start
async function start() {
  try {
    logger.success('🚀 Starting Shiprocket Analytics Server...\n');

    // Initialize database
    const db = initDB();
    logger.success('✓ Database connection established');

    // Run migrations
    migrate();
    logger.success('✓ Database migrations completed');

    // Initialize connectors
    initializeConnectors();
    logger.success('✓ Connectors initialized');

    // Start server
    app.listen(PORT, () => {
      logger.success(`\n✅ Server running on http://localhost:${PORT}`);
      logger.info(`\nAvailable endpoints:`);
      logger.info(`  POST /api/sync/:connector - Sync data from a connector`);
      logger.info(`  POST /api/chat - Run chat with tool use`);
      logger.info(`  POST /api/agent/run - Run RTO agent`);
      logger.info(`  GET /api/agent/runs/:merchant_id - Get agent run history`);
      logger.info(`  GET /health - Health check`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
