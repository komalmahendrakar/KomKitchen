import React, { useState } from 'react';
import type { MenuItem } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Map<string, { item: MenuItem; quantity: number }>;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onClearCart: () => void;
  onCheckout: (customerName: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onClearCart,
  onCheckout,
  isSubmitting,
  errorMessage
}) => {
  const [customerName, setCustomerName] = useState('');

  if (!isOpen) return null;

  const items = Array.from(cart.values());
  const totalAmount = items.reduce(
    (sum, { item, quantity }) => sum + item.price * quantity,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || items.length === 0) return;
    await onCheckout(customerName.trim());
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '1rem'
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          border: '1px solid var(--border-accent)',
          borderRadius: '20px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛒 Your Order Cart
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '1.5rem',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {errorMessage && (
            <div style={{
              padding: '0.875rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fda4af',
              fontSize: '0.85rem'
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍽️</p>
              <p style={{ fontWeight: 600 }}>Your cart is empty</p>
              <p style={{ fontSize: '0.85rem' }}>Select delicious items from our live kitchen menu</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map(({ item, quantity }) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ${item.price.toFixed(2)} each (Live stock: {item.stock})
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontWeight: 700
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                      {quantity}
                    </span>
                    <button
                      disabled={quantity >= item.stock}
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: quantity >= item.stock ? 'rgba(255,255,255,0.05)' : 'var(--accent-amber)',
                        color: quantity >= item.stock ? 'var(--text-muted)' : '#000',
                        fontWeight: 700,
                        cursor: quantity >= item.stock ? 'not-allowed' : 'pointer'
                      }}
                    >
                      +
                    </button>
                    <span style={{
                      fontWeight: 700,
                      minWidth: '60px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-amber)'
                    }}>
                      ${(item.price * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  type="button"
                  onClick={onClearCart}
                  style={{
                    background: 'transparent',
                    color: 'var(--accent-rose)',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  Clear Cart
                </button>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Amount: </span>
                  <span style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--accent-amber)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Checkout Form */}
        {items.length > 0 && (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '1.25rem 1.5rem',
              background: 'rgba(0,0,0,0.3)',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Customer Name / Table Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Connor / Table 4"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !customerName.trim()}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '10px',
                background: isSubmitting ? 'rgba(245,158,11,0.5)' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                cursor: isSubmitting ? 'wait' : 'pointer'
              }}
            >
              {isSubmitting ? 'Reserving Stock & Placing Order...' : `Place Order ($${totalAmount.toFixed(2)})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
