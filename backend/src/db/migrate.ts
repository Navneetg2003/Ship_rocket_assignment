import { getDB } from './index';

export function migrate(): void {
  const db = getDB();

  // Create universal_rows table
  db.exec(`
    CREATE TABLE IF NOT EXISTS universal_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      reference_id TEXT,
      reference_type TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      amount REAL,
      currency TEXT,
      order_id TEXT,
      customer_email TEXT,
      customer_name TEXT,
      shipment_id TEXT,
      package_id TEXT,
      tracking_url TEXT,
      ndr_count INTEGER,
      is_ndr INTEGER,
      payment_id TEXT,
      payment_method TEXT,
      raw TEXT NOT NULL,
      UNIQUE(source, entity_id, merchant_id)
    );
  `);

  // Create index for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_merchant ON universal_rows(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_source ON universal_rows(source, merchant_id);
    CREATE INDEX IF NOT EXISTS idx_entity_type ON universal_rows(entity_type, merchant_id);
    CREATE INDEX IF NOT EXISTS idx_created_at ON universal_rows(created_at, merchant_id);
    CREATE INDEX IF NOT EXISTS idx_reference ON universal_rows(reference_id, merchant_id);
  `);

  // Create agent_runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id TEXT NOT NULL,
      run_at TEXT NOT NULL,
      decisions TEXT NOT NULL,
      total_estimated_saving REAL NOT NULL,
      run_summary TEXT NOT NULL
    );
  `);

  // Create index for agent runs
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_merchant ON agent_runs(merchant_id, run_at DESC);
  `);

  console.log('✓ Database tables created');
}
