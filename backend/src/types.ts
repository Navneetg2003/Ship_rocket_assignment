export type DataSource = 'shopify' | 'shiprocket' | 'razorpay';
export type EntityType = 'order' | 'shipment' | 'payment';

/**
 * Universal Row schema that normalizes data from all three sources.
 * Every piece of data from Shopify, Shiprocket, or Razorpay is converted
 * to this single interface for consistent querying.
 *
 * Provenance: Each row tracks which source it came from and the original entity ID.
 */
export interface UniversalRow {
  id?: number;
  // === Provenance ===
  source: DataSource;
  entity_id: string;
  entity_type: EntityType;

  // === Merchant/Business Context ===
  merchant_id: string;
  reference_id?: string; // Links rows across sources: shipment links to order, payment links to order
  reference_type?: string; // e.g., 'order', 'shipment'

  // === Core Fields ===
  status: string;
  created_at: string; // ISO timestamp
  updated_at: string;

  // === Financial ===
  amount?: number; // In INR
  currency?: string;

  // === Order-specific ===
  order_id?: string;
  customer_email?: string;
  customer_name?: string;

  // === Shipment-specific ===
  shipment_id?: string;
  package_id?: string;
  tracking_url?: string;
  ndr_count?: number;
  is_ndr?: boolean;

  // === Payment-specific ===
  payment_id?: string;
  payment_method?: string;

  // === Catchall for source-specific data ===
  raw: Record<string, any>;
}

export interface SyncResult {
  source: DataSource;
  rowsInserted: number;
  rowsUpdated: number;
  totalRows: number;
  timestamp: string;
  error?: string;
}

export interface FetchParams {
  merchant_id: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface IConnector {
  name: DataSource;
  /**
   * Fetch raw data from the source (either real API or mock fallback)
   */
  fetch(params: FetchParams): Promise<any[]>;

  /**
   * Transform raw source data into UniversalRows
   */
  transform(rawData: any[]): UniversalRow[];

  /**
   * Fetch + transform + upsert into DB
   */
  sync(params: FetchParams): Promise<SyncResult>;
}

export interface AgentDecision {
  shipment_id: string;
  order_id: string;
  action: 'CANCEL' | 'RETRY' | 'HOLD';
  reason: string;
  estimated_saving?: number;
  ndr_count: number;
}

export interface AgentRunLog {
  id?: number;
  merchant_id: string;
  run_at: string;
  decisions: AgentDecision[];
  total_estimated_saving: number;
  run_summary: string;
}
