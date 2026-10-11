import React from 'react';
import type { MenuItem } from '../types';

interface MenuCardProps {
  item: MenuItem;
  cartQuantity: number;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({
  item,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart
}) => {
  const isOutOfStock = item.stock <= 0;
  const isLimitedStock = item.stock === 1;

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        opacity: isOutOfStock ? 0.65 : 1,
        position: 'relative'
      }}
    >
      {/* Food Image */}
      <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden' }}>
        <img
          src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.5s ease'
          }}
        />
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '6px'
        }}>
          {isOutOfStock ? (
            <span className="badge badge-stock-out">OUT OF STOCK</span>
          ) : isLimitedStock ? (
            <span className="badge badge-stock-low">ONLY 1 LEFT!</span>
          ) : (
            <span className="badge" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
              {item.stock} in stock
            </span>
          )}
        </div>
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(11, 15, 25, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          {item.category}
        </div>
      </div>

      {/* Item Details */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {item.name}
          </h3>
          <span style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            color: 'var(--accent-amber)',
            fontFamily: 'var(--font-mono)'
          }}>
            ${item.price.toFixed(2)}
          </span>
        </div>

        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          flex: 1
        }}>
          {item.description}
        </p>

        {/* Action Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: isOutOfStock ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
            {isOutOfStock ? 'Sold out' : `Live: ${item.stock} units`}
          </div>

          {cartQuantity > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => onRemoveFromCart(item.id)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                -
              </button>
              <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                {cartQuantity}
              </span>
              <button
                disabled={cartQuantity >= item.stock}
                onClick={() => onAddToCart(item)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: cartQuantity >= item.stock ? 'rgba(255,255,255,0.05)' : 'var(--accent-amber)',
                  color: cartQuantity >= item.stock ? 'var(--text-muted)' : '#000',
                  fontWeight: 700,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: cartQuantity >= item.stock ? 'not-allowed' : 'pointer'
                }}
              >
                +
              </button>
            </div>
          ) : (
            <button
              disabled={isOutOfStock}
              onClick={() => onAddToCart(item)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: isOutOfStock ? 'rgba(255,255,255,0.05)' : 'rgba(245, 158, 11, 0.15)',
                color: isOutOfStock ? 'var(--text-muted)' : 'var(--accent-amber)',
                border: `1px solid ${isOutOfStock ? 'transparent' : 'rgba(245, 158, 11, 0.3)'}`,
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: isOutOfStock ? 'not-allowed' : 'pointer'
              }}
            >
              {isOutOfStock ? 'Out of Stock' : '+ Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
