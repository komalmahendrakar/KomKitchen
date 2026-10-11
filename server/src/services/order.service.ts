import { withTransaction, getNextSequenceNumber } from '../db';
import { OrderRepository } from '../repositories/order.repository';
import { CreateOrderRequest, Order, OrderStatus } from '../shared/types';

export interface OrderCreationResult {
  order: Order;
  isExisting: boolean; // Indicates if request was idempotent retry
  updatedStock: Array<{ id: string; stock: number }>;
  sequenceNumber: number;
}

export class OrderService {
  /**
   * Places an order inside a strict ACID transaction:
   * 1. Check idempotency key clientRequestId.
   * 2. Aggregate duplicate order lines.
   * 3. Sort item IDs deterministically to prevent deadlocks across concurrent orders.
   * 4. Deduct stock using atomic conditional UPDATE WHERE stock >= requested.
   * 5. If ANY item has insufficient stock, ROLLBACK and throw clean error.
   * 6. Insert Order, OrderItems, and OrderStatusHistory in the same transaction.
   * 7. Increment sequence_tracker monotonically.
   * 8. COMMIT and return committed order and inventory deltas.
   */
  static async placeOrder(request: CreateOrderRequest): Promise<OrderCreationResult> {
    const { clientRequestId, customerName, items } = request;

    // Aggregate line items in case client submitted duplicate menu item IDs
    const aggregatedQuantities = new Map<string, number>();
    for (const item of items) {
      const current = aggregatedQuantities.get(item.menuItemId) || 0;
      aggregatedQuantities.set(item.menuItemId, current + item.quantity);
    }

    // Sort item IDs deterministically to prevent PostgreSQL row lock deadlocks
    const sortedItemIds = Array.from(aggregatedQuantities.keys()).sort();

    return await withTransaction(async (client) => {
      // 1. Check for existing order with this clientRequestId (Idempotency)
      const existingOrder = await OrderRepository.findOrderByClientRequestId(clientRequestId, client);
      if (existingOrder) {
        // Return existing order without re-deducting stock!
        return {
          order: existingOrder,
          isExisting: true,
          updatedStock: [],
          sequenceNumber: 0
        };
      }

      // 2. Fetch prices, names, and perform conditional atomic stock decrement
      const updatedStockList: Array<{ id: string; stock: number }> = [];
      const orderItemsToInsert: Array<{
        menuItemId: string;
        name: string;
        price: number;
        quantity: number;
        subtotal: number;
      }> = [];

      let totalAmount = 0;

      for (const menuItemId of sortedItemIds) {
        const requestedQty = aggregatedQuantities.get(menuItemId)!;

        // Atomic conditional stock decrement
        const updateRes = await client.query(
          `
          UPDATE menu_items
          SET stock = stock - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND stock >= $1
          RETURNING id, name, price::float AS price, stock;
          `,
          [requestedQty, menuItemId]
        );

        if (updateRes.rows.length === 0) {
          // Query current available stock and item details for precise error response
          const itemCheck = await client.query(
            'SELECT name, stock FROM menu_items WHERE id = $1',
            [menuItemId]
          );

          if (itemCheck.rows.length === 0) {
            throw new Error(`Menu item with ID ${menuItemId} does not exist.`);
          }

          const currentStock = itemCheck.rows[0].stock;
          const itemName = itemCheck.rows[0].name;

          // Rolling back entire transaction
          const error: any = new Error(
            `Insufficient stock for "${itemName}". Requested: ${requestedQty}, Available: ${currentStock}`
          );
          error.code = 'INSUFFICIENT_STOCK';
          error.menuItemId = menuItemId;
          error.requested = requestedQty;
          error.available = currentStock;
          throw error;
        }

        const updatedItem = updateRes.rows[0];
        const subtotal = updatedItem.price * requestedQty;
        totalAmount += subtotal;

        updatedStockList.push({
          id: updatedItem.id,
          stock: updatedItem.stock
        });

        orderItemsToInsert.push({
          menuItemId: updatedItem.id,
          name: updatedItem.name,
          price: updatedItem.price,
          quantity: requestedQty,
          subtotal
        });
      }

      // Round total amount to 2 decimal places
      totalAmount = Math.round(totalAmount * 100) / 100;

      // 3. Insert order record
      const orderInsertRes = await client.query(
        `
        INSERT INTO orders (client_request_id, customer_name, status, total_amount)
        VALUES ($1, $2, 'NEW', $3)
        RETURNING id, client_request_id AS "clientRequestId", customer_name AS "customerName",
                  status, total_amount::float AS "totalAmount", created_at AS "createdAt", updated_at AS "updatedAt";
        `,
        [clientRequestId, customerName, totalAmount]
      );
      const newOrder = orderInsertRes.rows[0];

      // 4. Insert order items
      const insertedItems = [];
      for (const item of orderItemsToInsert) {
        const itemRes = await client.query(
          `
          INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, order_id AS "orderId", menu_item_id AS "menuItemId", name, price::float AS price, quantity, subtotal::float AS subtotal;
          `,
          [newOrder.id, item.menuItemId, item.name, item.price, item.quantity, item.subtotal]
        );
        insertedItems.push(itemRes.rows[0]);
      }
      newOrder.items = insertedItems;

      // 5. Insert initial status history
      await client.query(
        `
        INSERT INTO order_status_history (order_id, from_status, to_status, reason)
        VALUES ($1, NULL, 'NEW', 'Order placed by customer');
        `,
        [newOrder.id]
      );

      // 6. Monotonic sequence counter increment
      const sequenceNumber = await getNextSequenceNumber(client);

      return {
        order: newOrder,
        isExisting: false,
        updatedStock: updatedStockList,
        sequenceNumber
      };
    });
  }

  /**
   * Kitchen status transitions with optimistic concurrency check
   */
  static async updateOrderStatus(
    orderId: string,
    expectedCurrentStatus: OrderStatus,
    nextStatus: OrderStatus
  ): Promise<{ order: Order; sequenceNumber: number }> {
    return await withTransaction(async (client) => {
      // 1. Optimistic locking conditional update
      const updateRes = await client.query(
        `
        UPDATE orders
        SET status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status = $3
        RETURNING id, client_request_id AS "clientRequestId", customer_name AS "customerName",
                  status, total_amount::float AS "totalAmount", created_at AS "createdAt", updated_at AS "updatedAt";
        `,
        [nextStatus, orderId, expectedCurrentStatus]
      );

      if (updateRes.rows.length === 0) {
        // Query current status to report helpful conflict message
        const currentRes = await client.query('SELECT status FROM orders WHERE id = $1', [orderId]);
        if (currentRes.rows.length === 0) {
          const err: any = new Error(`Order with ID ${orderId} not found.`);
          err.code = 'NOT_FOUND';
          throw err;
        }

        const actualStatus = currentRes.rows[0].status;
        const err: any = new Error(
          `Conflict: Expected order status was '${expectedCurrentStatus}', but current status is '${actualStatus}'.`
        );
        err.code = 'STATUS_CONFLICT';
        err.currentStatus = actualStatus;
        throw err;
      }

      const updatedOrder = updateRes.rows[0];

      // 2. Fetch order items for complete representation
      const itemsRes = await client.query(
        `
        SELECT id, order_id AS "orderId", menu_item_id AS "menuItemId", name, price::float AS price, quantity, subtotal::float AS subtotal
        FROM order_items
        WHERE order_id = $1;
        `,
        [orderId]
      );
      updatedOrder.items = itemsRes.rows;

      // 3. Record status history audit entry
      await client.query(
        `
        INSERT INTO order_status_history (order_id, from_status, to_status, reason)
        VALUES ($1, $2, $3, 'Kitchen operator status update');
        `,
        [orderId, expectedCurrentStatus, nextStatus]
      );

      // 4. Monotonic sequence counter
      const sequenceNumber = await getNextSequenceNumber(client);

      return {
        order: updatedOrder,
        sequenceNumber
      };
    });
  }
}
