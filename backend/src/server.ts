import 'dotenv/config';
import express, { Express } from 'express';
import { initDB } from './db/index';
import { migrate } from './db/migrate';
import { initializeConnectors } from './connectors';
import syncRoutes from './routes/sync';
import chatRoutes from './routes/chat';
import agentRoutes from './routes/agent';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/sync', syncRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agent', agentRoutes);

// Initialize and start
async function start() {
  try {
    console.log('🚀 Starting Shiprocket Analytics Server...\n');

    // Initialize database
    const db = initDB();
    console.log('✓ Database connection established');

    // Run migrations
    migrate();

    // Initialize connectors
    initializeConnectors();

    // Start server
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on http://localhost:${PORT}`);
      console.log(`\nAvailable endpoints:`);
      console.log(`  POST /api/sync/:connector - Sync data from a connector`);
      console.log(`  POST /api/chat - Run chat with tool use`);
      console.log(`  POST /api/agent/run - Run RTO agent`);
      console.log(`  GET /api/agent/runs/:merchant_id - Get agent run history`);
      console.log(`  GET /health - Health check`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
