# D2C Analytics Platform — AI Employee for Shiprocket Merchants

## 1. What I Built — Architecture Summary

Three SaaS connectors (Shopify, Shiprocket, Razorpay) each implement a shared `IConnector` interface and sync raw data into a single SQLite table called `universal_rows`. Every row carries provenance (source, entity_id, merchant_id) and a `raw` JSON field for unmapped data. A chat layer accepts natural language questions, runs DB queries via 5 tools, and enforces that every number in the response is tagged with a `[source:id]` citation. An autonomous RTO agent scans NDR shipments, applies decision rules, and writes a full run log with estimated savings — no external calls, no side effects. A React frontend provides a test panel for all endpoints.

```
Shopify / Shiprocket / Razorpay
        ↓  IConnector (fetch → transform → upsert)
   universal_rows (SQLite, WAL mode)
        ↓
   Chat loop (Groq LLM + 5 tools + citation enforcement)
   RTO Agent (rule-based, audit-logged)
        ↓
   Express REST API  ←→  React frontend
```

---

## 2. Connectors — Which 3, Why These 3

| Connector | What it provides |
|-----------|-----------------|
| **Shopify** | Orders, fulfillment status, customer, amount |
| **Shiprocket** | Shipment status, NDR count, NDR reason, carrier |
| **Razorpay** | Payment status, COD amount, refund flag |

These three together are the minimum needed to answer the NDR problem — the highest-cost ops issue for Indian D2C brands. A shipment with 3 failed delivery attempts has no actionable signal on its own. You need the Shopify order amount (to weigh retry ROI), the Shiprocket NDR count and reason (to know what happened), and the Razorpay COD amount (to calculate actual exposure). None of the three alone tells the full story.

Each connector implements:
```typescript
interface IConnector {
  name: DataSource;
  fetch(params: FetchParams): Promise<any[]>;      // real API or mock fallback
     fetch(params: FetchParams): Promise<any[]>;      // real API or demo-seed fallback
  transform(rawData: any[]): UniversalRow[];        // normalize to universal schema
  sync(params: FetchParams): Promise<SyncResult>;   // fetch + transform + upsert
}
```

A registry (`connectorRegistry: Map<DataSource, IConnector>`) makes connectors swappable — adding a WooCommerce connector means implementing the same three methods and calling `registerConnector()`.

**Real API / demo seed:** Each connector checks for credentials. If credentials are missing, connectors do not call external APIs. A local demo seed can populate sample rows for testing.

---

## 3. Schema — Why This Shape

```typescript
interface UniversalRow {
  // Provenance — on every row, no exceptions
  source: 'shopify' | 'shiprocket' | 'razorpay';
  entity_id: string;       // original ID from the source
  entity_type: 'order' | 'shipment' | 'payment';
  merchant_id: string;     // tenant isolation

  // Cross-source linkage
  reference_id?: string;   // shipment → order_id, payment → order_id

  // Universals
  status: string;
  created_at: string;
  amount?: number;         // INR

  // Source-specific fields (typed, not hidden)
  ndr_count?: number;
  is_ndr?: boolean;
  payment_method?: string;
  // ...

  raw: Record<string, any>; // catchall — no data loss
}
```

**Why denormalized instead of 3 tables:** The query pattern is almost always "give me all data for merchant X in date range Y". Joining 3 tables per request adds latency and complexity with no benefit at this scale. One table, one query.

**Why `raw`:** Every source has fields we don't need today but might tomorrow. `raw` absorbs them without schema changes.

**Why `reference_id`:** This is how cross-source correlation works — a Shiprocket shipment carries the Shopify `order_id` as its `reference_id`. The `correlate_order` tool exploits this to pull all three source rows for one order in a single query.

**Uniqueness constraint:** `UNIQUE(source, entity_id, merchant_id)` with `ON CONFLICT DO UPDATE` means re-syncing is idempotent. The upsert updates all mutable fields including `ndr_count`, `is_ndr`, `status`, `tracking_url`.

---

## 4. Chat Layer — Tools and Citation Contract

### Tool Schema

The LLM (Groq `llama-3.3-70b-versatile`) is given 5 tools. The loop runs up to 5 turns, appending tool results to conversation history until the model returns a plain text response.

| Tool | Required params | What it returns |
|------|----------------|-----------------|
| `query_orders` | `from_date`, `to_date`, `status?` | Orders in range |
| `query_shipments` | `from_date`, `to_date`, `status?`, `is_ndr?` | Shipments, optionally NDR-filtered |
| `query_payments` | `from_date`, `to_date`, `status?` | Payments in range |
| `get_revenue_summary` | `from_date`, `to_date` | Total amount + count |
| `correlate_order` | `order_id` | All rows across all 3 sources for one order |

### Citation Contract

The system prompt instructs the model:

> Every number you state must be wrapped: `[source:entity_id]42[/source]`. A bare number is rejected.

After the model responds, `validateCitations()` scans for uncited numbers by position (not by value) and replaces them with `[UNCITED]`. `formatCitations()` then converts `[source:x]value[/source]` → `value [source:x]` for display.

**Known limitation:** The citation enforcement is prompt-side, not guaranteed. A model that ignores the instruction will produce `[UNCITED]` markers, which is visible to the user but not a hard block. A stricter implementation would refuse to return any response containing `[UNCITED]`.

---

## 5. Agent — What It Does, Why This One

**The RTO (Return-To-Origin) agent** scans all NDR (Not Delivered Right) shipments for a merchant and decides whether to cancel, retry, or hold each one.

### Why NDR

NDR is the highest-leverage ops problem for Indian D2C. Every failed delivery attempt costs ₹100–300 in courier fees. Merchants typically make these decisions manually, in a spreadsheet, once a week. Automating it with clear rules and a full audit trail is the first thing a real "AI employee" should do.

### Decision Rules

```
ndr_count >= 3              → CANCEL  (est. saving: 15% of order value)
ndr_count >= 2, refused     → CANCEL  (est. saving: 10% of order value)
ndr_count >= 2, COD < ₹500 → CANCEL  (est. saving:  8% of order value)
ndr_count == 1, COD >= ₹1500 → RETRY  (high value, one more attempt)
else                        → HOLD   (manual review)
```

### Why Rule-Based, Not LLM-Based

Deliberate choice. NDR decisions are high-stakes and need to be auditable — "the model decided" is not an acceptable answer for a cancelled shipment. Rules are explainable, testable, and consistent. An LLM layer could be added on top to handle edge cases (unusual NDR reasons, high-value disputes), but the core decision logic should stay deterministic.

### Run Log

Every run is written to `agent_runs` (immutable). The output includes:
- Per-shipment: `action`, `reason`, `estimated_saving`, `ndr_count`, linked `order_id`
- Summary: total decisions, total estimated savings
- No external calls, no mutations — observe and propose only

---

## 6. Scale — 1 Merchant to 10,000

### What's Already Built for Scale

- **Merchant isolation:** `merchant_id` on every row, every query, every index. No query touches another tenant's data.
- **Idempotent sync:** Re-running sync for any connector never creates duplicates.
- **SQLite WAL mode:** Handles concurrent reads without blocking writes at low merchant count.
- **Structured logging:** Every request/response logged with merchant context for observability.

### What Breaks First (honest order)

| Component | Breaks at | Reason |
|-----------|-----------|--------|
| SQLite | ~500 concurrent merchants | Single writer lock; WAL helps but doesn't solve it |
| Sync (polling) | ~1,000 merchants | Full-fetch every sync; no webhook/delta support |
| Chat (synchronous) | ~200 concurrent users | Blocking HTTP call to LLM; no queue |
| Agent scheduler | N/A | There is no scheduler — agent is manually triggered only |
| Auth | Day 1 in production | No API key validation on any route |

### Path to 10,000

1. **SQLite → Postgres + pgBouncer** — the migration path is in `migrate.ts` comments
2. **Polling → Webhooks** — add `POST /webhooks/shopify` and `POST /webhooks/razorpay`; only sync delta, not full refetch
3. **Sync → BullMQ job queue** — replace `connector.sync()` with `queue.add()`; workers run per-connector
4. **Chat → SSE streaming** — switch to `messages.stream()` + Server-Sent Events for non-blocking responses
5. **Auth → API key middleware** — one Express middleware, one `api_keys` table
6. **Agent → Scheduled job** — `cron.schedule('0 */6 * * *', () => runRTOAgent(merchant_id))` per merchant

---

## 7. Eval — Where It Breaks

**Real issues found during development:**

1. **Demo data only.** No real Shopify/Razorpay/Shiprocket API calls tested end-to-end. The connector code for real APIs exists but has not been verified against live credentials.

2. **No tool calling on Groq.** Groq's API doesn't support Anthropic-style tool_use blocks. The current chat loop sends the question to the LLM and expects it to respond in plain text — it cannot actually invoke `query_orders` or any other tool mid-conversation. The tools are defined but not wired. This is the biggest functional gap.

3. **Citation enforcement is prompt-only.** If the model doesn't follow the citation instruction, uncited numbers appear as `[UNCITED]` rather than being blocked at source.

4. **No agent scheduler.** The README previously claimed a 30-minute scheduler exists. It doesn't. Agent runs are triggered manually via `POST /api/agent/run`.

5. **NDR savings formula is synthetic.** The 15%/10%/8% saving percentages are reasonable estimates, not data-derived. In production these would be calibrated against actual courier retry cost data.

6. **Timestamps in demo data are synthetic** (random dates in Jan 2024). Date-range queries against this data require knowing the demo date range.

7. **No rate limiting.** Any unauthenticated caller can hit `/api/chat` at full speed.

---

## 8. Time Spent

| Session | Date | Work |
|---------|------|------|
| Session 1 (~5h) | May 14 | Setup, types, DB schema, migrations, mock data, all 3 connectors |
| Session 2 (~6h) | May 14 | Chat tools, executor, agentic loop, citations, RTO agent, all routes |
| Session 3 (~4h) | May 15 | Bug fixes (upsert, citation validator, merchant_id), frontend test panel, README |
| Session 4 (~2h) | May 16 | Patches, Shopify OAuth flow, logger utility |

**Total: ~17 hours across 3 days (May 14–16).**

---

## 9. What I'd Do With Another Week

**Day 1–2: Fix the chat layer properly.**
Switch from Groq to an API that supports native tool calling (Anthropic Claude or OpenAI). Wire up the actual tool-use loop so the LLM can call `query_orders`, get real DB results, and build cited responses from actual data. This is the most important gap.

**Day 3: Real connector verification.**
Test Shopify and Razorpay connectors against live sandbox credentials. Fix the field mappings that are certainly wrong (every API is slightly different from its docs).

**Day 4: Webhook receivers.**
Add `POST /webhooks/shopify` (HMAC-verified) and `POST /webhooks/razorpay` for real-time sync instead of polling. This is the difference between a demo and a product.

**Day 5: Agent improvements.**
Add an approval workflow (`POST /api/agent/approvals/:decision_id`) so a merchant can approve/reject before any action fires. Add the actual Shiprocket API call to cancel/retry shipments (currently the agent only proposes). Add a cron scheduler per merchant.

**Day 6–7: Auth + load testing.**
API key middleware, k6 load test simulating 100 concurrent merchants, Postgres migration, BullMQ for sync jobs.

---

## Running Locally

```bash
# Backend
cd backend
npm install
npm run dev          # starts on http://localhost:3000

# Seed demo data (optional — server auto-migrates)
npm run seed

# Frontend
cd frontend
npm install
npm run dev          # starts on http://localhost:5173
```

**Required env vars** (copy `.env.example` → `.env`):
```
GROQ_API_KEY=xxxx
SHOPIFY_CLIENT_ID=xxxx
SHOPIFY_CLIENT_SECRET=xxxx
SHOPIFY_STORE_URL=xxxx
SHIPROCKET_EMAIL=xxxx
SHIPROCKET_PASSWORD=xxxx
RAZORPAY_API_KEY=xxxx
RAZORPAY_API_SECRET=xxxx
```

---

## Project Structure

```
backend/src/
├── connectors/
│   ├── base.ts          # registry + IConnector interface
│   ├── shopify.ts       # real API (demo-seed fallback)
│   ├── shiprocket.ts    # real API (demo-seed fallback)
│   ├── razorpay.ts      # real API (demo-seed fallback)
│   └── mock/            # demo seed data
├── db/
│   ├── migrate.ts       # idempotent schema creation
│   ├── queries.ts       # all DB access (upsert, get, NDR filter)
│   └── seed.ts          # one-shot demo seed loader
├── chat/
│   ├── tools.ts         # 5 tool definitions
│   ├── executor.ts      # tool → DB query → result
│   ├── citations.ts     # citation contract + validator
│   └── loop.ts          # LLM loop (up to 5 turns)
├── agent/
│   └── rto-agent.ts     # NDR decision engine + audit log
├── routes/              # sync / chat / agent endpoints
├── types.ts             # UniversalRow, IConnector, AgentRunLog
└── server.ts            # Express app, DB init, connector init
frontend/src/
└── components/          # HealthTest, SyncTest, AgentTest, ChatTest panels
```

---

## AI Tools Disclosure

**What the LLM wrote:** ~85% of TypeScript (types, DB queries, connector boilerplate, Express routes, citation regex, mock data generators, most of this README structure).

**What I wrote / decided:**
- Architecture: single-table universal schema vs 3-table join, `reference_id` linkage approach
- NDR agent decision rules and the saving percentages (business logic)
- Connector selection rationale (Shopify + Shiprocket + Razorpay = minimum viable NDR story)
- The honest evaluation section — all of it
- Switching from Anthropic SDK to Groq SDK (and back recommendation)
- Identifying the tool-calling gap as the biggest functional issue
- All bug fixes in session 3 (upsert ON CONFLICT fields, citation position-based validation, merchant_id passthrough)