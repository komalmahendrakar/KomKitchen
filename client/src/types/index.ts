// Export all shared types directly for client use
export type OrderStatus = 'NEW' | 'COOKING' | 'READY' | 'PICKED_UP' | 'CANCELLED';

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

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItemRequest {
  menuItemId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  clientRequestId: string;
  customerName: string;
  items: CartItemRequest[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  clientRequestId: string;
  customerName: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface UpdateOrderStatusRequest {
  expectedCurrentStatus: OrderStatus;
  nextStatus: OrderStatus;
}

export interface SystemSnapshot {
  menu: MenuItem[];
  orders: Order[];
  serverTimestamp: string;
  sequenceNumber: number;
}

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
