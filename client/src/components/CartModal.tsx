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
  cartAlert?: string | null;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onClearCart,
  onCheckout,
  isSubmitting,
  errorMessage,
  cartAlert
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
    if (!customerName.trim() || items.length === 0 || isSubmitting) return;
    await onCheckout(customerName.trim());
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 5, 25, 0.75)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '1rem'
    }}>
      <div
        className="inminutes-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-lime)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-pill)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <span>🛒</span> Your Order Cart
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '1.5rem',
              lineHeight: 1,
              cursor: 'pointer'
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {cartAlert && (
            <div style={{
              padding: '0.875rem 1rem',
              marginBottom: '1rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(234, 88, 12, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.6)',
              color: 'var(--brand-lime)',
              fontSize: '0.88rem',
              fontWeight: 700,
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{cartAlert}</span>
            </div>
          )}

          {errorMessage && (
            <div style={{
              padding: '0.875rem 1rem',
              marginBottom: '1rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#fda4af',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚡</p>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem' }}>Your cart is empty</p>
              <p style={{ fontSize: '0.85rem' }}>Select items from our fresh menu to begin</p>
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
                    padding: '0.85rem 1rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '14px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ₹{item.price.toFixed(2)} each (Stock: {item.stock})
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '999px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        fontWeight: 700
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 800, minWidth: '22px', textAlign: 'center', color: '#fff' }}>
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= item.stock}
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '999px',
                        background: quantity >= item.stock ? 'rgba(255, 255, 255, 0.05)' : 'var(--brand-lime)',
                        color: quantity >= item.stock ? 'var(--text-muted)' : 'var(--text-dark)',
                        fontWeight: 800,
                        cursor: quantity >= item.stock ? 'not-allowed' : 'pointer'
                      }}
                    >
                      +
                    </button>
                    <span style={{
                      fontWeight: 800,
                      minWidth: '65px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--brand-lime)'
                    }}>
                      ₹{(item.price * quantity).toFixed(2)}
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
                    color: 'var(--status-rose)',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  Clear Cart
                </button>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total: </span>
                  <span style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    color: 'var(--brand-lime)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    ₹{totalAmount.toFixed(2)}
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
              padding: '1.25rem 1.75rem',
              background: 'var(--bg-pill)',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Customer Name / Table Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex / Table 4"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !customerName.trim()}
              style={{
                width: '100%',
                padding: '0.9rem',
                borderRadius: '999px',
                background: (isSubmitting || !customerName.trim())
                  ? 'rgba(198, 240, 12, 0.2)'
                  : 'var(--brand-lime)',
                color: (isSubmitting || !customerName.trim()) ? 'rgba(255, 255, 255, 0.5)' : 'var(--text-dark)',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: (isSubmitting || !customerName.trim()) ? 'none' : 'var(--shadow-lime)',
                cursor: (isSubmitting || !customerName.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting
                ? 'Reserving In Minutes...'
                : !customerName.trim()
                ? 'Enter Name Above to Place Order'
                : `Place Order (₹${totalAmount.toFixed(2)})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
