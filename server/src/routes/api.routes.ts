import { Router, Request, Response } from 'express';
import { MenuRepository } from '../repositories/menu.repository';
import { OrderRepository } from '../repositories/order.repository';
import { OrderService } from '../services/order.service';
import {
  CreateOrderRequestSchema,
  UpdateOrderStatusRequestSchema,
  isValidStatusTransition
} from '../shared/types';
import {
  broadcastStockUpdated,
  broadcastOrderCreated,
  broadcastOrderStatusChanged,
  getSystemSnapshot
} from '../socket';

export const apiRouter = Router();

// ==========================================
// Snapshot Endpoint for Authoritative State
// ==========================================
apiRouter.get('/snapshot', async (_req: Request, res: Response) => {
  try {
    const snapshot = await getSystemSnapshot();
    res.json({
      success: true,
      data: snapshot
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate system snapshot'
    });
  }
});

// ==========================================
// Menu Endpoints
// ==========================================
apiRouter.get('/menu', async (_req: Request, res: Response) => {
  try {
    const items = await MenuRepository.getAllMenuItems();
    res.json({
      success: true,
      data: items
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch menu items'
    });
  }
});

// ==========================================
// Order Endpoints
// ==========================================
apiRouter.get('/orders', async (_req: Request, res: Response) => {
  try {
    const orders = await OrderRepository.getAllOrders();
    res.json({
      success: true,
      data: orders
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    });
  }
});

apiRouter.get('/orders/:id', async (req: Request, res: Response) => {
  const orderId = String(req.params.id);
  try {
    const order = await OrderRepository.findOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order with ID ${orderId} not found`
      });
    }

    const history = await OrderRepository.getOrderHistory(orderId);

    res.json({
      success: true,
      data: {
        ...order,
        history
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order details'
    });
  }
});

apiRouter.post('/orders', async (req: Request, res: Response) => {
  // 1. Zod Request Body Validation
  const parseResult = CreateOrderRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid order request payload',
      details: parseResult.error.errors
    });
  }

  const payload = parseResult.data;

  try {
    // 2. Perform Atomic Database Transaction
    const result = await OrderService.placeOrder(payload);

    // 3. Broadcast real-time Socket.IO events ONLY AFTER transaction has successfully committed
    if (!result.isExisting) {
      const serverTimestamp = new Date().toISOString();

      // Broadcast stock reduction to all connected clients
      broadcastStockUpdated({
        sequenceNumber: result.sequenceNumber,
        items: result.updatedStock,
        serverTimestamp
      });

      // Broadcast new order to kitchen screens
      broadcastOrderCreated({
        sequenceNumber: result.sequenceNumber,
        order: result.order,
        serverTimestamp
      });
    }

    res.status(result.isExisting ? 200 : 201).json({
      success: true,
      isExisting: result.isExisting,
      data: result.order
    });
  } catch (error: any) {
    if (error.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'INSUFFICIENT_STOCK',
        menuItemId: error.menuItemId,
        requested: error.requested,
        available: error.available
      });
    }

    console.error('[API Order Error]:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process order'
    });
  }
});

apiRouter.patch('/orders/:id/status', async (req: Request, res: Response) => {
  const orderId = String(req.params.id);

  // 1. Zod Request Validation
  const parseResult = UpdateOrderStatusRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status transition payload',
      details: parseResult.error.errors
    });
  }

  const { expectedCurrentStatus, nextStatus } = parseResult.data;

  // 2. Validate state machine transition logic
  if (!isValidStatusTransition(expectedCurrentStatus, nextStatus)) {
    return res.status(400).json({
      success: false,
      error: `Illegal state transition from '${expectedCurrentStatus}' to '${nextStatus}'.`
    });
  }

  try {
    // 3. Perform conditional optimistic lock update
    const result = await OrderService.updateOrderStatus(orderId, expectedCurrentStatus, nextStatus);

    // 4. Broadcast status change ONLY AFTER commit
    const serverTimestamp = new Date().toISOString();
    broadcastOrderStatusChanged({
      sequenceNumber: result.sequenceNumber,
      orderId,
      previousStatus: expectedCurrentStatus,
      currentStatus: nextStatus,
      updatedAt: result.order.updatedAt,
      serverTimestamp
    });

    res.json({
      success: true,
      data: result.order
    });
  } catch (error: any) {
    if (error.code === 'STATUS_CONFLICT') {
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'STATUS_CONFLICT',
        currentStatus: error.currentStatus
      });
    }
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    console.error('[API Status Transition Error]:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order status'
    });
  }
});
