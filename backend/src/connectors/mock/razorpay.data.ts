/**
 * Mock Razorpay payments data
 * 60 payments linked to same order IDs, some refunded
 */

const paymentMethods = ['card', 'netbanking', 'wallet', 'emandate', 'upi'];

function randomPaymentMethod(): string {
  return paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
}

function randomAmount(): number {
  return Math.floor(Math.random() * 7700) + 300; // 300-8000 INR
}

export function generateRazorpayPayments(merchantId: string) {
  const payments = [];
  const refundProbability = 0.05; // 5% chance of refund
  const baseTime = new Date('2024-01-01').getTime();

  for (let i = 1; i <= 60; i++) {
    const paymentId = `pay_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
    const orderId = `shop_order_${i.toString().padStart(5, '0')}`; // Link to Shopify order
    const amount = randomAmount();
    const createdAt = new Date(baseTime + Math.random() * 90 * 24 * 60 * 60 * 1000);
    const isRefunded = Math.random() < refundProbability;
    const refundId = isRefunded ? `rfnd_${Math.random().toString(36).substring(2, 15).toUpperCase()}` : null;

    payments.push({
      id: paymentId,
      order_id: orderId,
      amount: amount,
      currency: 'INR',
      status: isRefunded ? 'refunded' : 'captured',
      method: randomPaymentMethod(),
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
      email: `customer${i}@example.com`,
      description: `Payment for order ${orderId}`,
      receipt: `rcpt_${orderId}`,
      refund_id: refundId,
      refund_status: isRefunded ? 'completed' : null,
      cod_amount: amount, // For COD scenario
      international: false,
      failed_reason: null,
    });
  }

  return payments;
}
