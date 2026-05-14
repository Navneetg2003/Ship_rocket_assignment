import { ToolInput } from './tools';
import {
  getByDateRange,
  getByStatus,
  getByEntityTypeAndDateRange,
  getRelated,
} from '../db/queries';

export interface ToolExecutionResult {
  toolName: string;
  rows: any[];
  rowIds: string[];
  summary: string;
}

export async function executeTool(
  toolName: string,
  input: ToolInput,
  merchant_id: string
): Promise<ToolExecutionResult> {
  const { from_date, to_date, status, is_ndr, order_id } = input;

  switch (toolName) {
    case 'query_orders': {
      const rows = getByEntityTypeAndDateRange(merchant_id, 'order', from_date!, to_date!);
      let filtered = rows;
      if (status) {
        filtered = rows.filter(r => r.status === status);
      }
      const rowIds = filtered.map(r => r.entity_id);
      return {
        toolName: 'query_orders',
        rows: filtered.map(formatRow),
        rowIds,
        summary: `Found [source:row_count]${filtered.length}[/source] orders`,
      };
    }

    case 'query_shipments': {
      let rows = getByEntityTypeAndDateRange(merchant_id, 'shipment', from_date!, to_date!);
      if (status) {
        rows = rows.filter(r => r.status === status);
      }
      if (is_ndr !== undefined) {
        rows = rows.filter(r => r.is_ndr === is_ndr);
      }
      const rowIds = rows.map(r => r.entity_id);
      return {
        toolName: 'query_shipments',
        rows: rows.map(formatRow),
        rowIds,
        summary: `Found [source:row_count]${rows.length}[/source] shipments`,
      };
    }

    case 'query_payments': {
      let rows = getByEntityTypeAndDateRange(merchant_id, 'payment', from_date!, to_date!);
      if (status) {
        rows = rows.filter(r => r.status === status);
      }
      const rowIds = rows.map(r => r.entity_id);
      return {
        toolName: 'query_payments',
        rows: rows.map(formatRow),
        rowIds,
        summary: `Found [source:row_count]${rows.length}[/source] payments`,
      };
    }

    case 'get_revenue_summary': {
      const rows = getByEntityTypeAndDateRange(merchant_id, 'payment', from_date!, to_date!);
      const totalRevenue = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
      const rowIds = rows.map(r => r.entity_id);
      return {
        toolName: 'get_revenue_summary',
        rows: [{ totalRevenue, count: rows.length }],
        rowIds,
        summary: `Total revenue [source:rev]₹${totalRevenue.toFixed(2)}[/source] from [source:count]${rows.length}[/source] transactions`,
      };
    }

    case 'correlate_order': {
      if (!order_id) throw new Error('order_id is required for correlate_order');
      const rows = getRelated(order_id, merchant_id);
      const rowIds = rows.map(r => r.entity_id);
      const orderRows = rows.filter(r => r.entity_type === 'order');
      const shipmentRows = rows.filter(r => r.entity_type === 'shipment');
      const paymentRows = rows.filter(r => r.entity_type === 'payment');
      return {
        toolName: 'correlate_order',
        rows: rows.map(formatRow),
        rowIds,
        summary: `Order [source:order_id]${order_id}[/source] has [source:shipments]${shipmentRows.length}[/source] shipments and [source:payments]${paymentRows.length}[/source] payments`,
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function formatRow(row: any): any {
  return {
    merchant_id: row.merchant_id,
    source: row.source,
    entity_id: row.entity_id,
    entity_type: row.entity_type,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    created_at: row.created_at,
    reference_id: row.reference_id,
  };
}
