# Quick Start Guide

Get the Shiprocket Analytics platform running in 5 minutes.

## Prerequisites

- Node.js 18+ (check with `node --version`)
- npm 9+ (check with `npm --version`)

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

**Expected output:**
```
added 180 packages in 15s
```

## Step 2: Seed Database with Mock Data

```bash
npm run seed
```

**Expected output:**
```
🌱 Starting database seed...
✓ Database connection established
✓ Database tables created
✓ Registered connector: shopify
✓ Registered connector: shiprocket
✓ Registered connector: razorpay
✓ All connectors initialized

📦 Syncing data for merchant: merchant_default

📊 Sync Results:
================

SHOPIFY
  Inserted: 60
  Updated: 0
  Total rows processed: 60

SHIPROCKET
  Inserted: 60
  Updated: 0
  Total rows processed: 60

RAZORPAY
  Inserted: 60
  Updated: 0
  Total rows processed: 60

✅ Seeding complete! Total rows in database: 180
```

## Step 3: Start the Server

```bash
npm run dev
```

**Expected output:**
```
🚀 Starting Shiprocket Analytics Server...

✓ Database connection established
✓ Database tables created
✓ Registered connector: shopify
✓ Registered connector: shiprocket
✓ Registered connector: razorpay
✓ All connectors initialized

✅ Server running on http://localhost:3000

Available endpoints:
  POST /api/sync/:connector - Sync data from a connector
  POST /api/chat - Run chat with tool use
  POST /api/agent/run - Run RTO agent
  GET /api/agent/runs/:merchant_id - Get agent run history
  GET /health - Health check
```

Server is now running! Leave this terminal open.

## Step 4: Test the API (Open a new terminal)

### 4a. Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### 4b. Sync Data from Shopify

```bash
curl -X POST http://localhost:3000/api/sync/shopify \
  -H "Content-Type: application/json" \
  -d '{"merchant_id": "merchant_default"}'
```

**Response:**
```json
{
  "source": "shopify",
  "rowsInserted": 0,
  "rowsUpdated": 0,
  "totalRows": 60,
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

*(Rows are not re-inserted because they were already in DB from seeding)*

### 4c. Chat Query (Requires ANTHROPIC_API_KEY in .env)

First, get your Claude API key from [Anthropic Console](https://console.anthropic.com/) and add to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Then:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_id": "merchant_default",
    "message": "How many orders did I have?",
    "history": []
  }'
```

**Response example:**
```json
{
  "response": "You had [source:order_count]60[/source] orders in total.",
  "citations": ["order_count"],
  "toolCalls": ["query_orders"],
  "turns": 1
}
```

### 4d. Run RTO Agent (Autonomous Decision Making)

```bash
curl -X POST http://localhost:3000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"merchant_id": "merchant_default"}'
```

**Response example:**
```json
{
  "id": 1,
  "merchant_id": "merchant_default",
  "run_at": "2024-01-15T10:05:00.000Z",
  "decisions": [
    {
      "shipment_id": "sr_shipment_00004",
      "order_id": "shop_order_00004",
      "action": "CANCEL",
      "reason": "ndr_count 1 >= 1, reason address_issue, pending manual review",
      "estimated_saving": 0,
      "ndr_count": 1
    },
    {
      "shipment_id": "sr_shipment_00008",
      "order_id": "shop_order_00008",
      "action": "CANCEL",
      "reason": "ndr_count 2 >= 2 AND cod < 500, cancel",
      "estimated_saving": 120.5,
      "ndr_count": 2
    }
  ],
  "total_estimated_saving": 2150.75,
  "run_summary": "RTO Run: 15 NDR shipments analyzed. 8 to cancel (est. saving ₹2150.75), 3 to retry, 4 to hold for review."
}
```

### 4e. Get Agent Runs History

```bash
curl http://localhost:3000/api/agent/runs/merchant_default
```

**Response:**
```json
[
  {
    "id": 1,
    "merchant_id": "merchant_default",
    "run_at": "2024-01-15T10:05:00.000Z",
    "decisions": [...],
    "total_estimated_saving": 2150.75,
    "run_summary": "RTO Run: 15 NDR shipments analyzed..."
  }
]
```

## Next: Understanding the System

Now that it's running, learn more:

- **Architecture**: Read [README.md](./README.md#architecture-overview)
- **Chat with Citations**: See [Chat Layer](./README.md#chat-layer-tool-use--citations)
- **RTO Agent**: See [RTO Agent](./README.md#rto-agent-autonomous-decision-making)
- **Scaling to Production**: See [Scaling](./README.md#scaling-path-to-production)

## Troubleshooting

### Port 3000 already in use?

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Database lock error?

```bash
# Remove WAL files (they can get corrupted)
rm data/app.db-wal data/app.db-shm
npm run seed
```

### Chat endpoint returns 401 or 403?

**Required**: Set `ANTHROPIC_API_KEY` in `.env`

```bash
# Get key from https://console.anthropic.com/
# Add to .env:
ANTHROPIC_API_KEY=sk-ant-xxxx
```

### Build errors?

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

---

## What Happens in the Background

1. **Seeding** loads 180 rows into SQLite (60 orders, 60 shipments, 60 payments)
2. **Connectors** transform Shopify/Shiprocket/Razorpay data to universal schema
3. **Chat** uses 5 tools to query database, enforces citations on all numbers
4. **Agent** autonomously reviews NDR shipments, applies cost-saving rules
5. **Database** isolates tenants via merchant_id, preventing cross-tenant leaks

See [README.md](./README.md) for deep dives.

---

## API Endpoint Reference

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| GET | `/health` | None | Health check |
| POST | `/api/sync/:connector` | `{merchant_id}` | Sync from connector |
| POST | `/api/chat` | `{merchant_id, message, history?}` | Chat with tools |
| POST | `/api/agent/run` | `{merchant_id}` | Run RTO agent |
| GET | `/api/agent/runs/:merchant_id` | None | Get run history |

---

## Example: Full Workflow

```bash
# 1. In terminal 1, start server
npm run dev

# 2. In terminal 2, seed database (first time only)
npm run seed

# 3. Sync latest data
curl -X POST http://localhost:3000/api/sync/shopify \
  -H "Content-Type: application/json" \
  -d '{"merchant_id": "merchant_default"}'

# 4. Ask a question
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"merchant_id":"merchant_default","message":"What was my total revenue?","history":[]}'

# 5. Run optimization agent
curl -X POST http://localhost:3000/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"merchant_id":"merchant_default"}'

# 6. Check agent decisions
curl http://localhost:3000/api/agent/runs/merchant_default
```

That's it! You now have:
- ✅ 180 rows of normalized e-commerce data
- ✅ AI-powered chat with citation enforcement
- ✅ Autonomous cost-saving agent
- ✅ Audit trail of all agent decisions

Happy analyzing! 🚀
