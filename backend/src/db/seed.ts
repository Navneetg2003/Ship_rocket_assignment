import 'dotenv/config';
import { initDB } from './index';
import { migrate } from './migrate';
import { initializeConnectors, syncAllConnectors } from '../connectors';

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Initialize database
    const db = initDB();
    console.log('✓ Database connection established');

    // Run migrations
    migrate();

    // Initialize connectors
    initializeConnectors();

    // Sync all connectors for default merchant
    const merchant_id = 'merchant_default';
    console.log(`\n📦 Syncing data for merchant: ${merchant_id}\n`);

    const results = await syncAllConnectors(merchant_id);

    // Print results
    console.log('\n📊 Sync Results:');
    console.log('================');
    for (const result of results) {
      console.log(`\n${result.source.toUpperCase()}`);
      console.log(`  Inserted: ${result.rowsInserted}`);
      console.log(`  Updated: ${result.rowsUpdated}`);
      console.log(`  Total rows processed: ${result.totalRows}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    }

    const totalRows = results.reduce((sum, r) => sum + r.totalRows, 0);
    console.log(`\n✅ Seeding complete! Total rows in database: ${totalRows}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
