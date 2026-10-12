import React, { useEffect, useState } from 'react';
import type { Order, OrderStatus } from '../types';
import { API_BASE, getSocket } from '../services/socket';

const KITCHEN_COLUMNS: Array<{ status: OrderStatus; label: string; icon: string }> = [
  { status: 'NEW', label: 'Incoming Orders', icon: '⚡' },
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

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const socket = getSocket();
    socket.emit('join:kitchen');

    const handleOrderCreated = (payload: { order: Order }) => {
      setOrders((prev) => {
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
            `Stale Transition Conflict! Order #${order.id.slice(0, 8)} was already transitioned to ${data.currentStatus} on another screen.`
          );
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
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div className="script-highlight" style={{ fontSize: '1.6rem', marginBottom: '2px' }}>
            Live Dispatch Station
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            👨‍🍳 Kitchen Operations Board
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Synchronized in real-time across terminals. Optimistic conflict protection with instant order queues.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '999px',
            background: 'var(--bg-pill)',
            border: '1px solid var(--border-subtle)',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Snapshot
        </button>
      </div>

      {conflictError && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '14px',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
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
            style={{ background: 'transparent', color: '#fff', fontSize: '1.25rem', padding: '0 8px' }}
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
              className="inminutes-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '75vh',
                backgroundColor: 'rgba(26, 15, 54, 0.65)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-pill)',
                borderRadius: '20px 20px 0 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.95rem' }}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
                <span style={{
                  background: 'rgba(198, 240, 12, 0.15)',
                  color: 'var(--brand-lime)',
                  border: '1px solid rgba(198, 240, 12, 0.3)',
                  borderRadius: '999px',
                  padding: '2px 9px',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  {columnOrders.length}
                </span>
              </div>

              {/* Order Cards */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
                {columnOrders.map((order) => {
                  const elapsedMins = getElapsedMinutes(order.createdAt);
                  const isOverdue = status !== 'PICKED_UP' && elapsedMins >= 10;
                  const isBusy = updatingOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '16px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: isOverdue ? '1px solid var(--status-rose)' : '1px solid var(--border-subtle)',
                        boxShadow: isOverdue ? '0 0 16px rgba(244, 63, 94, 0.3)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Top Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '1rem', color: '#fff' }}>
                            #{order.id.slice(0, 8)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {order.customerName}
                          </div>
                        </div>

                        {/* Elapsed Timer */}
                        <div style={{
                          fontSize: '0.74rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: isOverdue ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          color: isOverdue ? 'var(--status-rose)' : 'var(--brand-lime)',
                          fontWeight: 700
                        }}>
                          ⏱️ {formatElapsed(order.createdAt)}
                          {isOverdue && ' (OVERDUE)'}
                        </div>
                      </div>

                      {/* Line Items */}
                      <div style={{
                        padding: '0.65rem 0',
                        borderTop: '1px dashed var(--border-subtle)',
                        borderBottom: '1px dashed var(--border-subtle)',
                        fontSize: '0.85rem'
                      }}>
                        {order.items?.map((item) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span><strong style={{ color: 'var(--brand-lime)' }}>{item.quantity}x</strong> {item.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons per stage */}
                      <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                        {status === 'NEW' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAdvanceStatus(order, 'COOKING')}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              borderRadius: '999px',
                              background: 'var(--brand-lime)',
                              color: 'var(--text-dark)',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isBusy ? 'Updating...' : 'Start Cooking 🍳'}
                          </button>
                        )}

                        {status === 'COOKING' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAdvanceStatus(order, 'READY')}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              borderRadius: '999px',
                              background: 'var(--status-emerald)',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isBusy ? 'Updating...' : 'Mark Ready 🛎️'}
                          </button>
                        )}

                        {status === 'READY' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAdvanceStatus(order, 'PICKED_UP')}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              borderRadius: '999px',
                              background: 'rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isBusy ? 'Updating...' : 'Complete Picked Up ✅'}
                          </button>
                        )}

                        {status === 'PICKED_UP' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
                            Delivered In Minutes
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {columnOrders.length === 0 && (
                  <div style={{
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }}>
                    No orders waiting
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
