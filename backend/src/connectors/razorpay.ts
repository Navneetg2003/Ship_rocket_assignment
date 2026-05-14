import axios from 'axios';
import { IConnector, UniversalRow, SyncResult, FetchParams } from '../types';
import { generateRazorpayPayments } from './mock/razorpay.data';
import { upsertRows } from '../db/queries';

class RazorpayConnector implements IConnector {
  name: 'razorpay' = 'razorpay';
  private mockData: any[] | null = null;

  async fetch(params: FetchParams): Promise<any[]> {
    try {
      if (!process.env.RAZORPAY_API_KEY || process.env.RAZORPAY_API_KEY.includes('xxx')) {
        return this.useMockData(params);
      }

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

      return response.data.items || [];
    } catch (error) {
      console.log('⚠ Razorpay API failed, falling back to mock data');
      return this.useMockData(params);
    }
  }

  private useMockData(params: FetchParams): any[] {
    if (!this.mockData) {
      this.mockData = generateRazorpayPayments(params.merchant_id);
    }
    const limit = params.limit || this.mockData.length;
    const offset = params.offset || 0;
    return this.mockData.slice(offset, offset + limit);
  }

  transform(rawData: any[]): UniversalRow[] {
    return rawData.map(payment => ({
      source: 'razorpay',
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
  }

  async sync(params: FetchParams): Promise<SyncResult> {
    try {
      const rawData = await this.fetch(params);
      const rows = this.transform(rawData.map(r => ({ ...r, merchant_id: params.merchant_id })));
      const result = upsertRows(rows);

      return {
        source: 'razorpay',
        rowsInserted: result.inserted,
        rowsUpdated: result.updated,
        totalRows: rows.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        source: 'razorpay',
        rowsInserted: 0,
        rowsUpdated: 0,
        totalRows: 0,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      };
    }
  }
}

export const razorpayConnector = new RazorpayConnector();
