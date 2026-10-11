import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migrate';
import { seedMenu } from '../src/db/seed';
import { pool } from '../src/db';
import { MenuRepository } from '../src/repositories/menu.repository';

const app = createApp();

describe('Kitchen Operations API & Inventory Concurrency Integration Tests', () => {
  beforeAll(async () => {
    // Run database migrations and seed menu
    await runMigrations();
    await seedMenu();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('GET /api/menu returns seeded items including item with stock=1', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(8);

    const limitedItem = res.body.data.find((item: any) => item.stock === 1);
    expect(limitedItem).toBeDefined();
    expect(limitedItem.stock).toBe(1);
  });

  it('POST /api/orders enforces idempotency via clientRequestId', async () => {
    const menu = await MenuRepository.getAllMenuItems();
    const itemWithStock = menu.find((item) => item.stock > 5)!;

    const clientRequestId = `test-idempotency-${Date.now()}`;
    const payload = {
      clientRequestId,
      customerName: 'Alice Idempotent',
      items: [{ menuItemId: itemWithStock.id, quantity: 1 }]
    };

    // First request
    const res1 = await request(app).post('/api/orders').send(payload);
    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.isExisting).toBe(false);
    const orderId = res1.body.data.id;

    // Retry request with same clientRequestId
    const res2 = await request(app).post('/api/orders').send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.isExisting).toBe(true);
    expect(res2.body.data.id).toBe(orderId);
  });

  it('Rejects order and rolls back if requested quantity exceeds stock', async () => {
    const menu = await MenuRepository.getAllMenuItems();
    const targetItem = menu[0];

    const payload = {
      clientRequestId: `test-insufficient-${Date.now()}`,
      customerName: 'Greedy Buyer',
      items: [{ menuItemId: targetItem.id, quantity: 999999 }]
    };

    const res = await request(app).post('/api/orders').send(payload);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
  });

  it('Strictly prevents overselling in concurrent requests for the item with stock=1', async () => {
    // 1. Find or reset the 1-stock item
    const menu = await MenuRepository.getAllMenuItems();
    const wagyu = menu.find((item) => item.name.includes('Wagyu')) || menu[0];

    // Reset stock to exactly 1 for this test
    await pool.query('UPDATE menu_items SET stock = 1 WHERE id = $1', [wagyu.id]);

    // 2. Fire 5 simultaneous concurrent order requests for that single item
    const concurrentRequests = Array.from({ length: 5 }).map((_, i) =>
      request(app)
        .post('/api/orders')
        .send({
          clientRequestId: `concurrent-race-${Date.now()}-${i}`,
          customerName: `Customer #${i + 1}`,
          items: [{ menuItemId: wagyu.id, quantity: 1 }]
        })
    );

    const responses = await Promise.all(concurrentRequests);

    // 3. Exactly 1 order must succeed (201 Created), and 4 must be rejected with 409 Conflict
    const successes = responses.filter((r) => r.status === 201);
    const conflicts = responses.filter((r) => r.status === 409);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(4);

    // 4. Assert final stock is exactly 0, never negative
    const verifyStockRes = await pool.query('SELECT stock FROM menu_items WHERE id = $1', [wagyu.id]);
    expect(verifyStockRes.rows[0].stock).toBe(0);
  });

  it('Handles Kitchen Status Transitions correctly (NEW -> COOKING -> READY -> PICKED_UP)', async () => {
    const menu = await MenuRepository.getAllMenuItems();
    const item = menu.find((i) => i.stock >= 2)!;

    // Place an order first
    const orderRes = await request(app).post('/api/orders').send({
      clientRequestId: `status-flow-${Date.now()}`,
      customerName: 'Kitchen Tester',
      items: [{ menuItemId: item.id, quantity: 1 }]
    });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.id;

    // 1. Valid: NEW -> COOKING
    const step1 = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .send({ expectedCurrentStatus: 'NEW', nextStatus: 'COOKING' });
    expect(step1.status).toBe(200);
    expect(step1.body.data.status).toBe('COOKING');

    // 2. Conflict: Trying NEW -> COOKING again (stale transition)
    const stepConflict = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .send({ expectedCurrentStatus: 'NEW', nextStatus: 'COOKING' });
    expect(stepConflict.status).toBe(409);
    expect(stepConflict.body.code).toBe('STATUS_CONFLICT');
    expect(stepConflict.body.currentStatus).toBe('COOKING');

    // 3. Invalid: Illegal transition COOKING -> PICKED_UP (skipping READY)
    const illegalStep = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .send({ expectedCurrentStatus: 'COOKING', nextStatus: 'PICKED_UP' });
    expect(illegalStep.status).toBe(400);

    // 4. Valid: COOKING -> READY
    const step2 = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .send({ expectedCurrentStatus: 'COOKING', nextStatus: 'READY' });
    expect(step2.status).toBe(200);
    expect(step2.body.data.status).toBe('READY');

    // 5. Valid: READY -> PICKED_UP
    const step3 = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .send({ expectedCurrentStatus: 'READY', nextStatus: 'PICKED_UP' });
    expect(step3.status).toBe(200);
    expect(step3.body.data.status).toBe('PICKED_UP');
  });
});
