import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { MenuRepository } from '../repositories/menu.repository';
import { OrderRepository } from '../repositories/order.repository';
import { pool } from '../db';
import {
  StockUpdatePayload,
  OrderCreatedPayload,
  OrderStatusChangedPayload,
  SystemSnapshot
} from '../shared/types';

let ioInstance: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer, clientUrl: string): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room for kitchen staff
    socket.on('join:kitchen', () => {
      socket.join('room:kitchen');
      console.log(`[Socket.IO] Client ${socket.id} joined room:kitchen`);
    });

    // Join room for individual order tracking
    socket.on('join:order', (orderId: string) => {
      if (orderId) {
        socket.join(`room:order:${orderId}`);
        console.log(`[Socket.IO] Client ${socket.id} joined room:order:${orderId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getSocketIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.IO is not initialized.');
  }
  return ioInstance;
}

/**
 * Fetch full authoritative snapshot of current system state
 */
export async function getSystemSnapshot(): Promise<SystemSnapshot> {
  const [menu, orders, seqRes] = await Promise.all([
    MenuRepository.getAllMenuItems(),
    OrderRepository.getAllOrders(),
    pool.query('SELECT current_val FROM sequence_tracker WHERE id = 1')
  ]);

  const sequenceNumber = seqRes.rows.length ? parseInt(seqRes.rows[0].current_val, 10) : 0;

  return {
    menu,
    orders,
    serverTimestamp: new Date().toISOString(),
    sequenceNumber
  };
}

/**
 * Broadcast committed stock updates to ALL connected clients
 */
export function broadcastStockUpdated(payload: StockUpdatePayload) {
  if (!ioInstance) return;
  ioInstance.emit('STOCK_UPDATED', payload);
}

/**
 * Broadcast newly created order to kitchen screen room
 */
export function broadcastOrderCreated(payload: OrderCreatedPayload) {
  if (!ioInstance) return;
  // Broadcast to kitchen channel
  ioInstance.to('room:kitchen').emit('ORDER_CREATED', payload);
  // Also broadcast to the customer tracking room
  ioInstance.to(`room:order:${payload.order.id}`).emit('ORDER_CREATED', payload);
}

/**
 * Broadcast order status change to kitchen and specific order channel
 */
export function broadcastOrderStatusChanged(payload: OrderStatusChangedPayload) {
  if (!ioInstance) return;
  ioInstance.to('room:kitchen').emit('ORDER_STATUS_CHANGED', payload);
  ioInstance.to(`room:order:${payload.orderId}`).emit('ORDER_STATUS_CHANGED', payload);
}
