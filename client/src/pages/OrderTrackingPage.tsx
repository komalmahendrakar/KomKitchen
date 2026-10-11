import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Order, OrderStatus } from '../types';
import { API_BASE, getSocket } from '../services/socket';

const STATUS_STEPS: OrderStatus[] = ['NEW', 'COOKING', 'READY', 'PICKED_UP'];

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`);
      if (!res.ok) {
        throw new Error('Order not found');
      }
      const json = await res.json();
      setOrder(json.data);
      setHistory(json.data.history || []);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchOrder();

    const socket = getSocket();
    // Join real-time room for this specific order
    socket.emit('join:order', id);

    const handleStatusChanged = (payload: { orderId: string; currentStatus: OrderStatus }) => {
      if (payload.orderId === id) {
        setOrder((prev) => (prev ? { ...prev, status: payload.currentStatus } : prev));
        // Refresh full history
        fetchOrder();
      }
    };

    socket.on('ORDER_STATUS_CHANGED', handleStatusChanged);

    return () => {
      socket.off('ORDER_STATUS_CHANGED', handleStatusChanged);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading live order status...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-rose)', marginBottom: '1rem' }}>Order Not Found</h2>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            background: 'var(--accent-amber)',
            fontWeight: 700
          }}
        >
          Return to Menu
        </button>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 1.5rem' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'transparent',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}
      >
        &larr; Back to Menu
      </button>

      <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ORDER TRACKING</span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>
              Order #{order.id.slice(0, 8)}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Customer: <strong>{order.customerName}</strong> &bull; Placed at {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className={`badge badge-${order.status.toLowerCase().replace('_', '-')}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
              {order.status}
            </span>
            <div style={{ marginTop: '8px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
              ${order.totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div style={{ margin: '3rem 0 2rem 0' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '5%',
              right: '5%',
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              transform: 'translateY(-50%)',
              zIndex: 1
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '5%',
              width: `${(Math.max(0, currentStepIndex) / (STATUS_STEPS.length - 1)) * 90}%`,
              height: '4px',
              backgroundColor: 'var(--accent-amber)',
              transform: 'translateY(-50%)',
              zIndex: 2,
              transition: 'width 0.5s ease'
            }} />

            {STATUS_STEPS.map((step, idx) => {
              const isPastOrCurrent = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div
                  key={step}
                  style={{
                    position: 'relative',
                    zIndex: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: isPastOrCurrent ? 'var(--accent-amber)' : '#1e293b',
                    color: isPastOrCurrent ? '#000' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    border: isCurrent ? '4px solid rgba(245, 158, 11, 0.3)' : 'none',
                    boxShadow: isCurrent ? '0 0 15px rgba(245, 158, 11, 0.5)' : 'none'
                  }}>
                    {idx + 1}
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isPastOrCurrent ? '#fff' : 'var(--text-muted)'
                  }}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Items Breakdown */}
        <div style={{
          marginTop: '2.5rem',
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Items Ordered</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {order.items?.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.9rem'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{item.quantity}x</span> {item.name}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  ${item.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit History Timeline */}
        {history.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              TIMELINE AUDIT LOG
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(h.changedAt).toLocaleTimeString()}</span>
                  <span>
                    Status moved from <strong>{h.fromStatus || 'INIT'}</strong> to <strong style={{ color: 'var(--accent-amber)' }}>{h.toStatus}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
