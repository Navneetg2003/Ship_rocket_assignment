import axios from 'axios';
import { IConnector, UniversalRow, SyncResult, FetchParams } from '../types';
import { generateShiprocketShipments } from './mock/shiprocket.data';
import { upsertRows } from '../db/queries';

class ShiprocketConnector implements IConnector {
  name: 'shiprocket' = 'shiprocket';
  private mockData: any[] | null = null;
  private authToken: string | null = null;

  async authenticate(): Promise<string> {
    if (this.authToken) return this.authToken;

    try {
      const response = await axios.post(
        'https://apiv2.shiprocket.in/v1/external/auth/login',
        {
          email: process.env.SHIPROCKET_EMAIL,
          password: process.env.SHIPROCKET_PASSWORD,
        },
        { timeout: 5000 }
      );

      this.authToken = response.data.token;
      return this.authToken;
    } catch (error) {
      console.log('⚠ Shiprocket auth failed, falling back to mock data');
      return '';
    }
  }

  async fetch(params: FetchParams): Promise<any[]> {
    try {
      if (!process.env.SHIPROCKET_EMAIL || process.env.SHIPROCKET_EMAIL.includes('xxx')) {
        return this.useMockData(params);
      }

      const token = await this.authenticate();
      if (!token) return this.useMockData(params);

      const response = await axios.get(
        'https://apiv2.shiprocket.in/v1/external/shipments',
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.log('⚠ Shiprocket API failed, falling back to mock data');
      return this.useMockData(params);
    }
  }

  private useMockData(params: FetchParams): any[] {
    if (!this.mockData) {
      this.mockData = generateShiprocketShipments(params.merchant_id);
    }
    const limit = params.limit || this.mockData.length;
    const offset = params.offset || 0;
    return this.mockData.slice(offset, offset + limit);
  }

  transform(rawData: any[]): UniversalRow[] {
    return rawData.map(shipment => ({
      source: 'shiprocket',
      entity_id: shipment.id,
      entity_type: 'shipment' as const,
      merchant_id: shipment.merchant_id || 'default',
      reference_id: shipment.order_id,
      reference_type: 'order',
      status: shipment.status,
      created_at: shipment.created_at,
      updated_at: shipment.updated_at,
      shipment_id: shipment.shipment_id,
      package_id: shipment.awb || shipment.id,
      tracking_url: shipment.tracking_url,
      ndr_count: shipment.ndr_count || 0,
      is_ndr: shipment.is_ndr || shipment.status === 'ndr',
      raw: {
        courier: shipment.courier,
        awb: shipment.awb,
        ndr_reason: shipment.ndr_reason,
        delivery_status: shipment.delivery_status,
        pickup_location: shipment.pickup_location,
      },
    }));
  }

  async sync(params: FetchParams): Promise<SyncResult> {
    try {
      const rawData = await this.fetch(params);
      const rows = this.transform(rawData.map(r => ({ ...r, merchant_id: params.merchant_id })));
      const result = upsertRows(rows);

      return {
        source: 'shiprocket',
        rowsInserted: result.inserted,
        rowsUpdated: result.updated,
        totalRows: rows.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        source: 'shiprocket',
        rowsInserted: 0,
        rowsUpdated: 0,
        totalRows: 0,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      };
    }
  }
}

export const shiprocketConnector = new ShiprocketConnector();
