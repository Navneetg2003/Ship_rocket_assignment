import axios from 'axios';
import { IConnector, UniversalRow, SyncResult, FetchParams } from '../types';
import { generateRazorpayPayments } from './mock/razorpay.data';
import { upsertRows } from '../db/queries';
import { logger } from '../utils/logger';

class RazorpayConnector implements IConnector {
  name: 'razorpay' = 'razorpay';
  private mockData: any[] | null = null;

  async fetch(params: FetchParams): Promise<any[]> {
    logger.info('💳 Razorpay fetch started', { merchant_id: params.merchant_id, limit: params.limit });
    try {
      if (!process.env.RAZORPAY_API_KEY || process.env.RAZORPAY_API_KEY.includes('xxx')) {
        logger.warn('Razorpay API key not configured, using mock data');
        return this.useMockData(params);
      }

      logger.debug('Preparing Razorpay API request');
      const auth = Buffer.from(
        `${process.env.RAZORPAY_API_KEY}:${process.env.RAZORPAY_API_SECRET}`
      ).toString('base64');

      const response = await axios.get(
        'https://api.razorpay.com/v1/payments',
        {
          headers: { Authorization: `Basic ${auth}` },
          params: { count: params.limit || 100 },
          timeout: 5000,
        }
      );

      const payments = response.data.items || [];
      logger.success(`Razorpay API returned ${payments.length} payments`);
      return payments;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Razorpay API fetch failed', { error: errorMsg });
      logger.warn('Falling back to mock data');
      return this.useMockData(params);
    }
  }

  private useMockData(params: FetchParams): any[] {
    logger.debug('Generating mock Razorpay data', { merchant_id: params.merchant_id });
    if (!this.mockData) {
      this.mockData = generateRazorpayPayments(params.merchant_id);
      logger.debug(`Generated ${this.mockData.length} mock payments`);
    }
    const limit = params.limit || this.mockData.length;
    const offset = params.offset || 0;
    const result = this.mockData.slice(offset, offset + limit);
    logger.info(`Returned ${result.length} mock payments`, { offset, limit });
    return result;
  }

  transform(rawData: any[]): UniversalRow[] {
    logger.debug('Transforming Razorpay data', { rowCount: rawData.length });
    const transformed = rawData.map(payment => ({
      source: 'razorpay' as const,
      entity_id: payment.id,
      entity_type: 'payment' as const,
      merchant_id: payment.merchant_id || 'default',
      reference_id: payment.order_id,
      reference_type: 'order',
      status: payment.status,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      amount: payment.amount || 0,
      currency: payment.currency || 'INR',
      payment_id: payment.id,
      payment_method: payment.method,
      order_id: payment.order_id,
      customer_email: payment.email,
      raw: {
        receipt: payment.receipt,
        refund_id: payment.refund_id,
        refund_status: payment.refund_status,
        cod_amount: payment.cod_amount,
        description: payment.description,
        international: payment.international,
        failed_reason: payment.failed_reason,
      },
    }));
    logger.success(`Transformed ${transformed.length} Razorpay records`);
    return transformed;
  }

  async sync(params: FetchParams): Promise<SyncResult> {
    logger.info('🔄 Razorpay sync started', { merchant_id: params.merchant_id });
    try {
      const rawData = await this.fetch(params);
      logger.debug(`Fetched ${rawData.length} raw payments`);
      
      const rows = this.transform(rawData.map(r => ({ ...r, merchant_id: params.merchant_id })));
      logger.debug(`Transformed into ${rows.length} universal rows`);
      
      const result = upsertRows(rows);
      logger.success('Razorpay sync completed', { 
        inserted: result.inserted,
        updated: result.updated,
        total: rows.length
      });

      return {
        source: 'razorpay',
        rowsInserted: result.inserted,
        rowsUpdated: result.updated,
        totalRows: rows.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = (error as Error).message;
      logger.error('Razorpay sync failed', { error: errorMsg });
      return {
        source: 'razorpay',
        rowsInserted: 0,
        rowsUpdated: 0,
        totalRows: 0,
        timestamp: new Date().toISOString(),
        error: errorMsg,
      };
    }
  }
}

export const razorpayConnector = new RazorpayConnector();
