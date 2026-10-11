import { z } from 'zod';

// ==========================================
// Order Status State Machine Definitions
// ==========================================
export const OrderStatusEnum = z.enum(['NEW', 'COOKING', 'READY', 'PICKED_UP', 'CANCELLED']);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

// Permitted Forward Transitions
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['COOKING', 'CANCELLED'],
  COOKING: ['READY'],
  READY: ['PICKED_UP'],
  PICKED_UP: [],
  CANCELLED: []
};

export function isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ==========================================
// Menu Item Schemas & Types
// ==========================================
export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().default(''),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  category: z.string().default('general'),
  imageUrl: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

// ==========================================
// Order Item & Order Creation Schemas
// ==========================================
export const CartItemRequestSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID format'),
  quantity: z.number().int().positive('Quantity must be an integer greater than 0')
});
export type CartItemRequest = z.infer<typeof CartItemRequestSchema>;

export const CreateOrderRequestSchema = z.object({
  clientRequestId: z.string().min(1, 'clientRequestId is required for idempotency').max(128),
  customerName: z.string().trim().min(1, 'Customer name is required').max(100),
  items: z.array(CartItemRequestSchema).min(1, 'Order must contain at least one item')
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().int().positive(),
  subtotal: z.number()
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  clientRequestId: z.string(),
  customerName: z.string(),
  status: OrderStatusEnum,
  totalAmount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(OrderItemSchema).optional()
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderStatusHistorySchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  fromStatus: OrderStatusEnum.nullable(),
  toStatus: OrderStatusEnum,
  changedAt: z.string(),
  reason: z.string().nullable().optional()
});
export type OrderStatusHistory = z.infer<typeof OrderStatusHistorySchema>;

// ==========================================
// Kitchen Status Update Schemas
// ==========================================
export const UpdateOrderStatusRequestSchema = z.object({
  expectedCurrentStatus: OrderStatusEnum,
  nextStatus: OrderStatusEnum
});
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusRequestSchema>;

// ==========================================
// Real-Time & Snapshot Synchronization Schemas
// ==========================================
export interface SystemSnapshot {
  menu: MenuItem[];
  orders: Order[];
  serverTimestamp: string;
  sequenceNumber: number;
}

export type SocketEventType =
  | 'STOCK_UPDATED'
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'SNAPSHOT_SYNC';

export interface StockUpdatePayload {
  sequenceNumber: number;
  items: Array<{
    id: string;
    stock: number;
  }>;
  serverTimestamp: string;
}

export interface OrderCreatedPayload {
  sequenceNumber: number;
  order: Order;
  serverTimestamp: string;
}

export interface OrderStatusChangedPayload {
  sequenceNumber: number;
  orderId: string;
  previousStatus: OrderStatus;
  currentStatus: OrderStatus;
  updatedAt: string;
  serverTimestamp: string;
}
