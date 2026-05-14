import { getDB } from './index';
import { UniversalRow, AgentRunLog } from '../types';

export function upsertRows(rows: UniversalRow[]): { inserted: number; updated: number } {
  const db = getDB();
  let inserted = 0;
  let updated = 0;

  const insertStmt = db.prepare(`
    INSERT INTO universal_rows (
      source, entity_id, entity_type, merchant_id, reference_id, reference_type,
      status, created_at, updated_at, amount, currency, order_id, customer_email,
      customer_name, shipment_id, package_id, tracking_url, ndr_count, is_ndr,
      payment_id, payment_method, raw
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, entity_id, merchant_id) DO UPDATE SET
      status = excluded.status,
      updated_at = excluded.updated_at,
      amount = excluded.amount,
      currency = excluded.currency,
      reference_id = excluded.reference_id,
      reference_type = excluded.reference_type,
      raw = excluded.raw
  `);

  for (const row of rows) {
    const result = insertStmt.run(
      row.source,
      row.entity_id,
      row.entity_type,
      row.merchant_id,
      row.reference_id || null,
      row.reference_type || null,
      row.status,
      row.created_at,
      row.updated_at,
      row.amount || null,
      row.currency || null,
      row.order_id || null,
      row.customer_email || null,
      row.customer_name || null,
      row.shipment_id || null,
      row.package_id || null,
      row.tracking_url || null,
      row.ndr_count || null,
      row.is_ndr ? 1 : 0,
      row.payment_id || null,
      row.payment_method || null,
      JSON.stringify(row.raw)
    );

    if (result.changes > 0) {
      if (!row.id) inserted++;
      else updated++;
    }
  }

  return { inserted, updated };
}

export function getByMerchant(merchant_id: string): UniversalRow[] {
  const db = getDB();
  const stmt = db.prepare('SELECT * FROM universal_rows WHERE merchant_id = ? ORDER BY created_at DESC');
  const rows = stmt.all(merchant_id) as any[];
  return rows.map(deserializeRow);
}

export function getBySource(merchant_id: string, source: string): UniversalRow[] {
  const db = getDB();
  const stmt = db.prepare('SELECT * FROM universal_rows WHERE merchant_id = ? AND source = ? ORDER BY created_at DESC');
  const rows = stmt.all(merchant_id, source) as any[];
  return rows.map(deserializeRow);
}

export function getByEntityType(merchant_id: string, type: string): UniversalRow[] {
  const db = getDB();
  const stmt = db.prepare('SELECT * FROM universal_rows WHERE merchant_id = ? AND entity_type = ? ORDER BY created_at DESC');
  const rows = stmt.all(merchant_id, type) as any[];
  return rows.map(deserializeRow);
}

export function getByDateRange(merchant_id: string, from: string, to: string): UniversalRow[] {
  const db = getDB();
  const stmt = db.prepare(
    'SELECT * FROM universal_rows WHERE merchant_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC'
  );
  const rows = stmt.all(merchant_id, from, to) as any[];
  return rows.map(deserializeRow);
}

export function getRelated(reference_id: string, merchant_id: string): UniversalRow[] {
  const db = getDB();
  const stmt = db.prepare(
    'SELECT * FROM universal_rows WHERE (entity_id = ? OR reference_id = ?) AND merchant_id = ? ORDER BY created_at DESC'
  );
  const rows = stmt.all(reference_id, reference_id, merchant_id) as any[];
  return rows.map(deserializeRow);
}

export function getByStatus(merchant_id: string, status: string): UniversalRow[] {
  const db = getDB();
  const stmt = db.prepare('SELECT * FROM universal_rows WHERE merchant_id = ? AND status = ? ORDER BY created_at DESC');
  const rows = stmt.all(merchant_id, status) as any[];
  return rows.map(deserializeRow);
}

export function getByEntityTypeAndDateRange(
  merchant_id: string,
  entity_type: string,
  from: string,
  to: string
): UniversalRow[] {
  const db = getDB();
  const stmt = db.prepare(
    'SELECT * FROM universal_rows WHERE merchant_id = ? AND entity_type = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC'
  );
  const rows = stmt.all(merchant_id, entity_type, from, to) as any[];
  return rows.map(deserializeRow);
}

export function getAllNDRShipments(merchant_id: string): UniversalRow[] {
  const db = getDB();
  const stmt = db.prepare(
    'SELECT * FROM universal_rows WHERE merchant_id = ? AND entity_type = "shipment" AND is_ndr = 1 ORDER BY created_at DESC'
  );
  const rows = stmt.all(merchant_id) as any[];
  return rows.map(deserializeRow);
}

// Agent runs
export function saveAgentRun(run: AgentRunLog): number {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO agent_runs (merchant_id, run_at, decisions, total_estimated_saving, run_summary)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    run.merchant_id,
    run.run_at,
    JSON.stringify(run.decisions),
    run.total_estimated_saving,
    run.run_summary
  );

  return result.lastInsertRowid as number;
}

export function getAgentRuns(merchant_id: string, limit: number = 10): AgentRunLog[] {
  const db = getDB();
  const stmt = db.prepare(
    'SELECT * FROM agent_runs WHERE merchant_id = ? ORDER BY run_at DESC LIMIT ?'
  );
  const rows = stmt.all(merchant_id, limit) as any[];
  return rows.map(row => ({
    id: row.id,
    merchant_id: row.merchant_id,
    run_at: row.run_at,
    decisions: JSON.parse(row.decisions),
    total_estimated_saving: row.total_estimated_saving,
    run_summary: row.run_summary
  }));
}

function deserializeRow(row: any): UniversalRow {
  return {
    id: row.id,
    source: row.source,
    entity_id: row.entity_id,
    entity_type: row.entity_type,
    merchant_id: row.merchant_id,
    reference_id: row.reference_id,
    reference_type: row.reference_type,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    amount: row.amount,
    currency: row.currency,
    order_id: row.order_id,
    customer_email: row.customer_email,
    customer_name: row.customer_name,
    shipment_id: row.shipment_id,
    package_id: row.package_id,
    tracking_url: row.tracking_url,
    ndr_count: row.ndr_count,
    is_ndr: row.is_ndr === 1,
    payment_id: row.payment_id,
    payment_method: row.payment_method,
    raw: JSON.parse(row.raw)
  };
}
