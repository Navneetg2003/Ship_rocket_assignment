import axios from 'axios';
import { IConnector, UniversalRow, SyncResult, FetchParams } from '../types';
import { generateShopifyOrders } from './mock/shopify.data';
import { upsertRows } from '../db/queries';

class ShopifyConnector implements IConnector {
  name: 'shopify' = 'shopify';
  private mockData: any[] | null = null;

  async fetch(params: FetchParams): Promise<any[]> {
    // Try real API first, fall back to mock
    try {
      if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY.includes('xxx')) {
        // Real API not configured, use mock
        return this.useMockData(params);
      }

      const headers = {
        'X-Shopify-Access-Token': process.env.SHOPIFY_API_KEY,
      };

      const response = await axios.get(
        `${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json`,
        { headers, timeout: 5000 }
      );

      return response.data.orders || [];
    } catch (error) {
      console.log('⚠ Shopify API failed, falling back to mock data');
      return this.useMockData(params);
    }
  }

  private useMockData(params: FetchParams): any[] {
    if (!this.mockData) {
      this.mockData = generateShopifyOrders(params.merchant_id);
    }
    const limit = params.limit || this.mockData.length;
    const offset = params.offset || 0;
    return this.mockData.slice(offset, offset + limit);
  }

  transform(rawData: any[], merchant_id?: string): UniversalRow[] {
    return rawData.map(order => ({
      source: 'shopify',
      entity_id: order.id,
      entity_type: 'order' as const,
      merchant_id: merchant_id || order.merchant_id || 'default',
      status: order.fulfillment_status || 'pending',
      created_at: order.created_at,
      updated_at: order.updated_at,
      amount: parseFloat(order.total_price) || 0,
      currency: order.currency || 'INR',
      order_id: order.id,
      customer_email: order.customer?.email || order.email,
      customer_name: order.customer
        ? `${order.customer.first_name} ${order.customer.last_name}`
        : 'Unknown',
      raw: {
        financial_status: order.financial_status,
        source: order.source,
        line_items: order.line_items,
      },
    }));
  }

  async sync(params: FetchParams): Promise<SyncResult> {
    try {
      const rawData = await this.fetch(params);
      const rows = this.transform(rawData, params.merchant_id);
      const result = upsertRows(rows);

      return {
        source: 'shopify',
        rowsInserted: result.inserted,
        rowsUpdated: result.updated,
        totalRows: rows.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        source: 'shopify',
        rowsInserted: 0,
        rowsUpdated: 0,
        totalRows: 0,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      };
    }
  }
}

export const shopifyConnector = new ShopifyConnector();
