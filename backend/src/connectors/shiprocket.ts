import axios from 'axios';
import { IConnector, UniversalRow, SyncResult, FetchParams } from '../types';
import { generateShiprocketShipments } from './mock/shiprocket.data';
import { upsertRows } from '../db/queries';
import { logger } from '../utils/logger';

class ShiprocketConnector implements IConnector {
  name: 'shiprocket' = 'shiprocket';
  private mockData: any[] | null = null;
  private authToken: string | null = null;

  async authenticate(): Promise<string | null> {
    if (this.authToken) {
      logger.debug('Using cached Shiprocket auth token');
      return this.authToken;
    }

    logger.info('🔐 Authenticating with Shiprocket API');
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
      logger.success('✓ Shiprocket authentication successful');
      return this.authToken;
    } catch (error) {
      logger.error('Shiprocket authentication failed', {
        error: error instanceof Error ? error.message : String(error),
        hasEmail: !!process.env.SHIPROCKET_EMAIL
      });
      logger.warn('Falling back to mock Shiprocket data');
      return null;
    }
  }

  async fetch(params: FetchParams): Promise<any[]> {
    logger.info('📦 Shiprocket fetch started', { merchant_id: params.merchant_id, limit: params.limit });
    try {
      if (!process.env.SHIPROCKET_EMAIL || process.env.SHIPROCKET_EMAIL.includes('xxx')) {
        logger.warn('Shiprocket credentials not configured, using mock data');
        return this.useMockData(params);
      }

      const token = await this.authenticate();
      if (!token) {
        logger.warn('No auth token obtained, using mock data');
        return this.useMockData(params);
      }

      logger.debug('Fetching from Shiprocket API');
      const response = await axios.get(
        'https://apiv2.shiprocket.in/v1/external/shipments',
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );

      const shipments = response.data.data || [];
      logger.success(`Shiprocket API returned ${shipments.length} shipments`);
      return shipments;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Shiprocket API fetch failed', { error: errorMsg });
      logger.warn('Falling back to mock data');
      return this.useMockData(params);
    }
  }

  private useMockData(params: FetchParams): any[] {
    logger.debug('Generating mock Shiprocket data', { merchant_id: params.merchant_id });
    if (!this.mockData) {
      this.mockData = generateShiprocketShipments(params.merchant_id);
      logger.debug(`Generated ${this.mockData.length} mock shipments`);
    }
    const limit = params.limit || this.mockData.length;
    const offset = params.offset || 0;
    const result = this.mockData.slice(offset, offset + limit);
    logger.info(`Returned ${result.length} mock shipments`, { offset, limit });
    return result;
  }

  transform(rawData: any[]): UniversalRow[] {
    logger.debug('Transforming Shiprocket data', { rowCount: rawData.length });
    const transformed = rawData.map(shipment => ({
      source: 'shiprocket' as const,
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
    logger.success(`Transformed ${transformed.length} Shiprocket records`);
    return transformed;
  }

  async sync(params: FetchParams): Promise<SyncResult> {
    logger.info('🔄 Shiprocket sync started', { merchant_id: params.merchant_id });
    try {
      const rawData = await this.fetch(params);
      logger.debug(`Fetched ${rawData.length} raw shipments`);
      
      const rows = this.transform(rawData.map(r => ({ ...r, merchant_id: params.merchant_id })));
      logger.debug(`Transformed into ${rows.length} universal rows`);
      
      const result = upsertRows(rows);
      logger.success('Shiprocket sync completed', { 
        inserted: result.inserted,
        updated: result.updated,
        total: rows.length
      });

      return {
        source: 'shiprocket',
        rowsInserted: result.inserted,
        rowsUpdated: result.updated,
        totalRows: rows.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = (error as Error).message;
      logger.error('Shiprocket sync failed', { error: errorMsg });
      return {
        source: 'shiprocket',
        rowsInserted: 0,
        rowsUpdated: 0,
        totalRows: 0,
        timestamp: new Date().toISOString(),
        error: errorMsg,
      };
    }
  }
}

export const shiprocketConnector = new ShiprocketConnector();
