/**
 * Mock Shopify orders data
 * 60 orders with varied statuses, amounts ₹300-₹8000
 */

const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const orderSources = ['web', 'mobile', 'social'];

function randomAmount(): number {
  return Math.floor(Math.random() * 7700) + 300; // 300-8000
}

function randomStatus(): string {
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function randomEmail(): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
  const names = ['customer', 'user', 'buyer', 'client', 'john', 'jane', 'alice', 'bob'];
  return `${names[Math.floor(Math.random() * names.length)]}${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

function randomName(): string {
  const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

export function generateShopifyOrders(merchantId: string) {
  const orders = [];
  const baseTime = new Date('2024-01-01').getTime();

  for (let i = 1; i <= 60; i++) {
    const orderId = `shop_order_${i.toString().padStart(5, '0')}`;
    const createdAt = new Date(baseTime + Math.random() * 90 * 24 * 60 * 60 * 1000);

    orders.push({
      id: orderId,
      name: `#${i}`,
      email: randomEmail(),
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
      order_status_url: `https://example.myshopify.com/orders/${orderId}`,
      fulfillment_status: randomStatus(),
      financial_status: Math.random() > 0.1 ? 'paid' : 'pending',
      total_price: randomAmount().toString(),
      currency: 'INR',
      customer: {
        email: randomEmail(),
        first_name: randomName().split(' ')[0],
        last_name: randomName().split(' ')[1],
      },
      line_items: [
        {
          title: `Product ${i}`,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: randomAmount().toString(),
        },
      ],
      source: orderSources[Math.floor(Math.random() * orderSources.length)],
    });
  }

  return orders;
}
