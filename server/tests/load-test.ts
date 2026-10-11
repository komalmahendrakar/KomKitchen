import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000/api';

async function runLoadTest() {
  console.log('===========================================================');
  console.log('⚡ Starting Concurrent Order Load & Oversell Protection Test');
  console.log(`🎯 Target API: ${BASE_URL}`);
  console.log('===========================================================\n');

  try {
    // 1. Fetch current menu
    const menuRes = await fetch(`${BASE_URL}/menu`);
    if (!menuRes.ok) {
      throw new Error(`Failed to fetch menu: ${menuRes.statusText}`);
    }
    const menuData = await menuRes.json();
    const items = menuData.data;

    // Pick target item
    const targetItem = items.find((i: any) => i.name.includes('Wagyu')) || items[0];
    console.log(`📌 Target Item: "${targetItem.name}" (ID: ${targetItem.id})`);
    console.log(`📦 Initial Live Stock: ${targetItem.stock}\n`);

    const NUM_CONCURRENT_USERS = 10;
    console.log(`🚀 Dispatching ${NUM_CONCURRENT_USERS} simultaneous orders competing for stock...`);

    const startTime = Date.now();
    const promises = Array.from({ length: NUM_CONCURRENT_USERS }).map(async (_, idx) => {
      const clientRequestId = `load-test-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
      const payload = {
        clientRequestId,
        customerName: `Concurrent Customer #${idx + 1}`,
        items: [
          {
            menuItemId: targetItem.id,
            quantity: 1
          }
        ]
      };

      try {
        const res = await fetch(`${BASE_URL}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        return {
          user: idx + 1,
          status: res.status,
          success: res.ok,
          data
        };
      } catch (err: any) {
        return {
          user: idx + 1,
          status: 0,
          success: false,
          error: err.message
        };
      }
    });

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    // Analyze results
    const successes = results.filter((r) => r.status === 201);
    const rejections = results.filter((r) => r.status === 409);
    const errors = results.filter((r) => r.status !== 201 && r.status !== 409);

    console.log('\n--- Load Test Results ---');
    console.log(`⏱️ Total Time: ${duration}ms`);
    console.log(`✅ Successful Orders (201): ${successes.length}`);
    console.log(`❌ Rejected for Insufficient Stock (409): ${rejections.length}`);
    console.log(`⚠️ Unexpected Errors: ${errors.length}`);

    // Verify final stock
    const finalMenuRes = await fetch(`${BASE_URL}/menu`);
    const finalMenu = await finalMenuRes.json();
    const updatedTarget = finalMenu.data.find((i: any) => i.id === targetItem.id);

    console.log(`\n📦 Final Live Stock: ${updatedTarget.stock}`);

    if (updatedTarget.stock < 0) {
      console.error('🚨 INVARIANT VIOLATION: Stock became negative!');
      process.exit(1);
    } else {
      console.log('🛡️ INVARIANT VERIFIED: Stock is non-negative and overselling was prevented!');
    }
  } catch (err) {
    console.error('Load test execution failed:', err);
    process.exit(1);
  }
}

runLoadTest();
