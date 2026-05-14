import { registerConnector } from './base';
import { shopifyConnector } from './shopify';
import { shiprocketConnector } from './shiprocket';
import { razorpayConnector } from './razorpay';

export function initializeConnectors(): void {
  registerConnector(shopifyConnector);
  registerConnector(shiprocketConnector);
  registerConnector(razorpayConnector);
  console.log('✓ All connectors initialized');
}

export { shopifyConnector, shiprocketConnector, razorpayConnector };
export * from './base';
