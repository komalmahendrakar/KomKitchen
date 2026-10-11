import React, { useEffect, useState } from 'react';
import type { Order, OrderStatus } from '../types';
import { API_BASE, getSocket } from '../services/socket';

const KITCHEN_COLUMNS: Array<{ status: OrderStatus; label: string; icon: string }> = [
  { status: 'NEW', label: 'Incoming Orders', icon: '🔔' },
  { status: 'COOKING', label: 'Currently Cooking', icon: '🍳' },
  { status: 'READY', label: 'Ready for Pickup', icon: '🛎️' },
  { status: 'PICKED_UP', label: 'Completed', icon: '✅' }
];

export const KitchenBoardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(Date.now());
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Load orders
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data);
      }
    } catch (err) {
      console.error('Failed to load kitchen orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Timer ticker every second for elapsed waiting time & overdue alerts
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const socket = getSocket();
    // Join kitchen room
    socket.emit('join:kitchen');

    // Real-time events
    const handleOrderCreated = (payload: { order: Order }) => {
      setOrders((prev) => {
        // avoid duplicate if already loaded
        if (prev.some((o) => o.id === payload.order.id)) return prev;
        return [payload.order, ...prev];
      });
    };

    const handleOrderStatusChanged = (payload: { orderId: string; currentStatus: OrderStatus; updatedAt: string }) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === payload.orderId
            ? { ...o, status: payload.currentStatus, updatedAt: payload.updatedAt }
            : o
        )
      );
    };

    socket.on('ORDER_CREATED', handleOrderCreated);
    socket.on('ORDER_STATUS_CHANGED', handleOrderStatusChanged);

    return () => {
      clearInterval(interval);
      socket.off('ORDER_CREATED', handleOrderCreated);
      socket.off('ORDER_STATUS_CHANGED', handleOrderStatusChanged);
    };
  }, []);

  const handleAdvanceStatus = async (order: Order, nextStatus: OrderStatus) => {
    setUpdatingOrderId(order.id);
    setConflictError(null);

    try {
      const res = await fetch(`${API_BASE}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedCurrentStatus: order.status,
          nextStatus
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'STATUS_CONFLICT') {
          setConflictError(
            `Stale Transition Conflict! Order #${order.id.slice(0, 8)} was already updated to ${data.currentStatus} by another staff member.`
          );
          // Refresh to catch up
          fetchOrders();
        } else {
          setConflictError(data.error || 'Failed to update order status');
        }
      }
    } catch (err: any) {
      setConflictError(err.message || 'Network error updating order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Helper for waiting time
  const getElapsedMinutes = (createdAt: string) => {
    const elapsedMs = now - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  const formatElapsed = (createdAt: string) => {
    const elapsedMs = Math.max(0, now - new Date(createdAt).getTime());
    const totalSecs = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem 2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>👨‍🍳 Live Kitchen Dispatch Board</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Real-time multi-terminal synchronization. Instant state propagation with optimistic concurrency safety.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          🔄 Refresh Snapshot
        </button>
      </div>

      {conflictError && (
        <div style={{
          padding: '1rem',
          borderRadius: '10px',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fda4af',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {conflictError}</span>
          <button
            onClick={() => setConflictError(null)}
            style={{ background: 'transparent', color: '#fff', fontSize: '1.2rem', padding: '0 8px' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* 4-Column Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {KITCHEN_COLUMNS.map(({ status, label, icon }) => {
          const columnOrders = orders.filter((o) => o.status === status);

          return (
            <div
              key={status}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '75vh',
                backgroundColor: 'rgba(15, 23, 42, 0.6)'
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem' }}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
                <span style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '999px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {columnOrders.length}
                </span>
              </div>

              {/* Order Cards */}
              <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
                {columnOrders.map((order) => {
                  const elapsedMins = getElapsedMinutes(order.createdAt);
                  const isOverdue = status !== 'PICKED_UP' && elapsedMins >= 10;
                  const isBusy = updatingOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: isOverdue ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                        boxShadow: isOverdue ? '0 0 15px rgba(244, 63, 94, 0.2)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Top Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                            #{order.id.slice(0, 8)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {order.customerName}
                          </div>
                        </div>

                        {/* Elapsed Timer */}
                        <div style={{
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isOverdue ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255,255,255,0.06)',
                          color: isOverdue ? 'var(--accent-rose)' : 'var(--text-muted)',
                          fontWeight: 700
                        }}>
                          ⏱️ {formatElapsed(order.createdAt)}
                          {isOverdue && ' (OVERDUE)'}
                        </div>
                      </div>

                      {/* Line Items */}
                      <div style={{
                        padding: '0.5rem 0',
                        borderTop: '1px dashed var(--border-subtle)',
                        borderBottom: '1px dashed var(--border-subtle)',
                        fontSize: '0.85rem'
                      }}>
                        {order.items?.map((item) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span><strong>{item.quantity}x</strong> {item.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons per stage */}
                      <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                        {status === 'NEW' && (
                          <button
                            disabled={isBusy}
                            onClick={() => handleAdvanceStatus(order, 'COOKING')}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '8px',
                              background: 'var(--accent-amber)',
                              color: '#000',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}
                          >
                            {isBusy ? 'Updating...' : 'Start Cooking 🍳'}
                          </button>
                        )}

                        {status === 'COOKING' && (
                          <button
                            disabled={isBusy}
                            onClick={() => handleAdvanceStatus(order, 'READY')}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '8px',
                              background: 'var(--accent-emerald)',
                              color: '#000',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}
                          >
                            {isBusy ? 'Updating...' : 'Mark Ready 🛎️'}
                          </button>
                        )}

                        {status === 'READY' && (
                          <button
                            disabled={isBusy}
                            onClick={() => handleAdvanceStatus(order, 'PICKED_UP')}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.15)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}
                          >
                            {isBusy ? 'Updating...' : 'Complete Picked Up ✅'}
                          </button>
                        )}

                        {status === 'PICKED_UP' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            Order Delivered
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {columnOrders.length === 0 && (
                  <div style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }}>
                    No orders in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
