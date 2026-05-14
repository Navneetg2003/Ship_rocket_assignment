import { Tool } from '@anthropic-ai/sdk/resources';

export const chatTools: Tool[] = [
  {
    name: 'query_orders',
    description: 'Query orders by date range and status',
    input_schema: {
      type: 'object' as const,
      properties: {
        from_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        to_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)',
        },
        status: {
          type: 'string',
          description: 'Filter by order status (e.g., pending, shipped, delivered)',
        },
      },
      required: ['from_date', 'to_date'],
    },
  },
  {
    name: 'query_shipments',
    description: 'Query shipments by date range, status, and NDR status',
    input_schema: {
      type: 'object' as const,
      properties: {
        from_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        to_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)',
        },
        status: {
          type: 'string',
          description: 'Filter by shipment status',
        },
        is_ndr: {
          type: 'boolean',
          description: 'Filter by NDR (Not Delivered Right) status',
        },
      },
      required: ['from_date', 'to_date'],
    },
  },
  {
    name: 'query_payments',
    description: 'Query payments by date range and status',
    input_schema: {
      type: 'object' as const,
      properties: {
        from_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        to_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)',
        },
        status: {
          type: 'string',
          description: 'Filter by payment status (e.g., captured, refunded)',
        },
      },
      required: ['from_date', 'to_date'],
    },
  },
  {
    name: 'get_revenue_summary',
    description: 'Get total revenue and transaction count for a date range',
    input_schema: {
      type: 'object' as const,
      properties: {
        from_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        to_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)',
        },
      },
      required: ['from_date', 'to_date'],
    },
  },
  {
    name: 'correlate_order',
    description: 'Get all data for a specific order across all sources (Shopify, Shiprocket, Razorpay)',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: {
          type: 'string',
          description: 'The order ID to correlate',
        },
      },
      required: ['order_id'],
    },
  },
];

export interface ToolInput {
  from_date?: string;
  to_date?: string;
  status?: string;
  is_ndr?: boolean;
  order_id?: string;
}
