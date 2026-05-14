/**
 * Mock Shiprocket shipments data
 * 60 shipments linked to same order IDs as Shopify, ~15 in NDR
 */

const shipmentStatuses = ['pending', 'shipped', 'in_transit', 'delivered', 'ndr', 'returned'];
const ndrReasons = ['address_issue', 'refused', 'incomplete_address', 'customer_unavailable', 'wrong_contact'];
const carriers = ['Fedex', 'DHL', 'BlueDart', 'DTDC', 'SpartanIndia', 'Ecom Express'];

function randomStatus(ndrIndex: boolean): string {
  if (ndrIndex) return 'ndr';
  const nonNdrStatuses = ['pending', 'shipped', 'in_transit', 'delivered'];
  return nonNdrStatuses[Math.floor(Math.random() * nonNdrStatuses.length)];
}

function randomNdrReason(): string {
  return ndrReasons[Math.floor(Math.random() * ndrReasons.length)];
}

function randomCarrier(): string {
  return carriers[Math.floor(Math.random() * carriers.length)];
}

export function generateShiprocketShipments(merchantId: string) {
  const shipments = [];
  const baseTime = new Date('2024-01-01').getTime();

  for (let i = 1; i <= 60; i++) {
    const shipmentId = `sr_shipment_${i.toString().padStart(5, '0')}`;
    const orderId = `shop_order_${i.toString().padStart(5, '0')}`; // Link to Shopify order
    const isNdr = i % 4 === 0; // ~15 NDRs out of 60

    const createdAt = new Date(baseTime + Math.random() * 90 * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);

    const ndrCount = isNdr ? Math.floor(Math.random() * 4) + 1 : 0;
    const ndrReason = isNdr ? randomNdrReason() : null;

    shipments.push({
      id: shipmentId,
      order_id: orderId,
      shipment_id: shipmentId,
      status: randomStatus(isNdr),
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
      tracking_url: `https://track.shiprocket.in/${shipmentId}`,
      courier: randomCarrier(),
      awb: `SR${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
      ndr_count: ndrCount,
      ndr_reason: ndrReason,
      is_ndr: isNdr,
      pickup_location: 'Warehouse A, Mumbai',
      delivery_status: isNdr ? 'pending_retry' : 'delivered',
    });
  }

  return shipments;
}
