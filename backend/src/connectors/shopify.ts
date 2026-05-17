import axios from 'axios';
import { IConnector, UniversalRow, SyncResult, FetchParams } from '../types';
import { generateShopifyOrders } from './mock/shopify.data';
import { upsertRows } from '../db/queries';
import { logger } from '../utils/logger';

class ShopifyConnector implements IConnector {
  name: 'shopify' = 'shopify';
  private mockData: any[] | null = null;

  async fetch(params: FetchParams): Promise<any[]> {
    logger.info('🛒 Shopify fetch started', { merchant_id: params.merchant_id, limit: params.limit });
    
    // Try real API first, fall back to mock
    try {
      if (!process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY.includes('xxx')) {
        // Real API not configured, use mock
        logger.warn('Shopify API key not configured, using mock data');
        return this.useMockData(params);
      }

      logger.debug('Attempting to fetch from Shopify API', { 
        storeUrl: process.env.SHOPIFY_STORE_URL 
      });

      const headers = {
        'X-Shopify-Access-Token': process.env.SHOPIFY_API_KEY,
      };

      const response = await axios.get(
        `${process.env.SHOPIFY_STORE_URL}/admin/api/2026-04/orders.json`,
        { headers, timeout: 5000 }
      );

      const orders = response.data.orders || [];
      logger.success(`Shopify API returned ${orders.length} orders`);
      return orders;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Shopify API fetch failed', { 
        error: errorMsg,
        storeUrl: process.env.SHOPIFY_STORE_URL,
        hasToken: !!process.env.SHOPIFY_API_KEY
      });
      logger.warn('Falling back to mock Shopify data');
      return this.useMockData(params);
    }
  }

  private useMockData(params: FetchParams): any[] {
    logger.debug('Generating mock Shopify data', { merchant_id: params.merchant_id });
    if (!this.mockData) {
      this.mockData = generateShopifyOrders(params.merchant_id);
      logger.debug(`Generated ${this.mockData.length} mock orders`);
    }
    const limit = params.limit || this.mockData.length;
    const offset = params.offset || 0;
    const result = this.mockData.slice(offset, offset + limit);
    logger.info(`Returned ${result.length} mock orders`, { offset, limit });
    return result;
  }

  transform(rawData: any[], merchant_id?: string): UniversalRow[] {
    logger.debug('Transforming Shopify data', { 
      rowCount: rawData.length, 
      merchant_id 
    });
    
    const transformed = rawData.map(order => ({
      source: 'shopify' as const,
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
    
    logger.success(`Transformed ${transformed.length} Shopify records`);
    return transformed;
  }

  async sync(params: FetchParams): Promise<SyncResult> {
    logger.info('🔄 Shopify sync started', { merchant_id: params.merchant_id });
    
    try {
      const rawData = await this.fetch(params);
      logger.debug(`Fetched ${rawData.length} raw records from Shopify`);
      
      const rows = this.transform(rawData, params.merchant_id);
      logger.debug(`Transformed into ${rows.length} universal rows`);
      
      const result = upsertRows(rows);
      logger.success('Shopify sync completed', { 
        inserted: result.inserted,
        updated: result.updated,
        total: rows.length
      });

      return {
        source: 'shopify',
        rowsInserted: result.inserted,
        rowsUpdated: result.updated,
        totalRows: rows.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = (error as Error).message;
      logger.error('Shopify sync failed', { error: errorMsg });
      return {
        source: 'shopify',
        rowsInserted: 0,
        rowsUpdated: 0,
        totalRows: 0,
        timestamp: new Date().toISOString(),
        error: errorMsg,
      };
    }
  }
}

export const shopifyConnector = new ShopifyConnector();
