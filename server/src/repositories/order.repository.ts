import pg from 'pg';
import { pool } from '../db';
import { Order, OrderItem, OrderStatusHistory } from '../shared/types';

export class OrderRepository {
  static async findOrderByClientRequestId(
    clientRequestId: string,
    client?: pg.PoolClient
  ): Promise<Order | null> {
    const executor = client || pool;
    const orderRes = await executor.query(
      `
      SELECT 
        id, 
        client_request_id AS "clientRequestId", 
        customer_name AS "customerName", 
        status, 
        total_amount::float AS "totalAmount", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM orders
      WHERE client_request_id = $1;
      `,
      [clientRequestId]
    );

    if (orderRes.rows.length === 0) return null;
    const order: Order = orderRes.rows[0];

    const itemsRes = await executor.query(
      `
      SELECT 
        id, 
        order_id AS "orderId", 
        menu_item_id AS "menuItemId", 
        name, 
        price::float AS price, 
        quantity, 
        subtotal::float AS subtotal
      FROM order_items
      WHERE order_id = $1;
      `,
      [order.id]
    );
    order.items = itemsRes.rows;
    return order;
  }

  static async findOrderById(
    orderId: string,
    client?: pg.PoolClient
  ): Promise<Order | null> {
    const executor = client || pool;
    const orderRes = await executor.query(
      `
      SELECT 
        id, 
        client_request_id AS "clientRequestId", 
        customer_name AS "customerName", 
        status, 
        total_amount::float AS "totalAmount", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM orders
      WHERE id = $1;
      `,
      [orderId]
    );

    if (orderRes.rows.length === 0) return null;
    const order: Order = orderRes.rows[0];

    const itemsRes = await executor.query(
      `
      SELECT 
        id, 
        order_id AS "orderId", 
        menu_item_id AS "menuItemId", 
        name, 
        price::float AS price, 
        quantity, 
        subtotal::float AS subtotal
      FROM order_items
      WHERE order_id = $1;
      `,
      [order.id]
    );
    order.items = itemsRes.rows;
    return order;
  }

  static async getAllOrders(client?: pg.PoolClient): Promise<Order[]> {
    const executor = client || pool;
    const ordersRes = await executor.query(`
      SELECT 
        id, 
        client_request_id AS "clientRequestId", 
        customer_name AS "customerName", 
        status, 
        total_amount::float AS "totalAmount", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM orders
      ORDER BY created_at DESC;
    `);

    if (ordersRes.rows.length === 0) return [];

    const itemsRes = await executor.query(`
      SELECT 
        id, 
        order_id AS "orderId", 
        menu_item_id AS "menuItemId", 
        name, 
        price::float AS price, 
        quantity, 
        subtotal::float AS subtotal
      FROM order_items;
    `);

    const itemsByOrderId = new Map<string, OrderItem[]>();
    for (const item of itemsRes.rows) {
      const list = itemsByOrderId.get(item.orderId) || [];
      list.push(item);
      itemsByOrderId.set(item.orderId, list);
    }

    return ordersRes.rows.map((order: any) => ({
      ...order,
      items: itemsByOrderId.get(order.id) || []
    }));
  }

  static async getOrderHistory(orderId: string): Promise<OrderStatusHistory[]> {
    const res = await pool.query(
      `
      SELECT 
        id, 
        order_id AS "orderId", 
        from_status AS "fromStatus", 
        to_status AS "toStatus", 
        reason, 
        changed_at AS "changedAt"
      FROM order_status_history
      WHERE order_id = $1
      ORDER BY changed_at ASC;
      `,
      [orderId]
    );
    return res.rows;
  }
}
