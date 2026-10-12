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
    socket.emit('join:order', id);

    const handleStatusChanged = (payload: { orderId: string; currentStatus: OrderStatus }) => {
      if (payload.orderId === id) {
        setOrder((prev) => (prev ? { ...prev, status: payload.currentStatus } : prev));
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
      <div style={{ maxWidth: '800px', margin: '5rem auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading live order status...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ maxWidth: '800px', margin: '5rem auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--status-rose)', marginBottom: '1rem' }}>Order Not Found</h2>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '999px',
            background: 'var(--brand-lime)',
            color: 'var(--text-dark)',
            fontWeight: 800
          }}
        >
          Return to Menu
        </button>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 1.5rem 4rem 1.5rem' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'transparent',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        &larr; Back to Menu
      </button>

      <div className="inminutes-panel" style={{ padding: '2.5rem', marginBottom: '2rem', border: '1px solid var(--border-lime)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="script-highlight" style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
              Live Tracking
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase' }}>
              Order #{order.id.slice(0, 8)}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Customer: <strong style={{ color: '#fff' }}>{order.customerName}</strong> &bull; Placed at {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className={`badge badge-${order.status.toLowerCase().replace('_', '-')}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              {order.status}
            </span>
            <div style={{ marginTop: '8px', fontSize: '1.5rem', fontWeight: 900, color: 'var(--brand-lime)', fontFamily: 'var(--font-mono)' }}>
              ${order.totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div style={{ margin: '3.5rem 0 2.5rem 0' }}>
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
              backgroundColor: 'var(--brand-lime)',
              transform: 'translateY(-50%)',
              zIndex: 2,
              transition: 'width 0.5s ease',
              boxShadow: '0 0 12px var(--brand-lime-glow)'
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
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: isPastOrCurrent ? 'var(--brand-lime)' : 'var(--bg-pill)',
                    color: isPastOrCurrent ? 'var(--text-dark)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    border: isCurrent ? '4px solid rgba(198, 240, 12, 0.35)' : 'none',
                    boxShadow: isCurrent ? '0 0 20px var(--brand-lime-glow)' : 'none'
                  }}>
                    {idx + 1}
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: isCurrent ? 800 : 600,
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
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>Items In Order</h3>
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
                  <span style={{ fontWeight: 800, color: 'var(--brand-lime)' }}>{item.quantity}x</span> {item.name}
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
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TIMELINE AUDIT LOG
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(h.changedAt).toLocaleTimeString()}</span>
                  <span>
                    Status moved from <strong style={{ color: '#fff' }}>{h.fromStatus || 'INIT'}</strong> to <strong style={{ color: 'var(--brand-lime)' }}>{h.toStatus}</strong>
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
