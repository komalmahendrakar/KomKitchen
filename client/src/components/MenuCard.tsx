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
      className="inminutes-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        opacity: isOutOfStock ? 0.65 : 1,
        position: 'relative',
        border: isLimitedStock ? '1px solid var(--border-lime)' : '1px solid var(--border-subtle)'
      }}
    >
      {/* Food Image */}
      <div style={{ position: 'relative', width: '100%', height: '190px', overflow: 'hidden' }}>
        <img
          src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
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
            <span className="badge badge-stock-low">⚡ ONLY 1 LEFT!</span>
          ) : (
            <span className="badge" style={{ background: 'rgba(19, 10, 42, 0.85)', color: 'var(--brand-lime)', border: '1px solid rgba(198, 240, 12, 0.3)' }}>
              {item.stock} IN STOCK
            </span>
          )}
        </div>
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(19, 10, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {item.category}
        </div>
      </div>

      {/* Item Details */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.65rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>
            {item.name}
          </h3>
          <span style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            color: 'var(--brand-lime)',
            fontFamily: 'var(--font-mono)'
          }}>
            ${item.price.toFixed(2)}
          </span>
        </div>

        <p style={{
          fontSize: '0.84rem',
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
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: isOutOfStock ? 'var(--status-rose)' : 'var(--text-muted)' }}>
            {isOutOfStock ? 'Sold out' : `Live: ${item.stock} left`}
          </div>

          {cartQuantity > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onRemoveFromCart(item.id)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.1)',
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
              <span style={{ fontWeight: 800, minWidth: '22px', textAlign: 'center', color: '#fff' }}>
                {cartQuantity}
              </span>
              <button
                type="button"
                disabled={cartQuantity >= item.stock}
                onClick={() => onAddToCart(item)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '999px',
                  background: cartQuantity >= item.stock ? 'rgba(255, 255, 255, 0.05)' : 'var(--brand-lime)',
                  color: cartQuantity >= item.stock ? 'var(--text-muted)' : 'var(--text-dark)',
                  fontWeight: 800,
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
              type="button"
              disabled={isOutOfStock}
              onClick={() => onAddToCart(item)}
              style={{
                padding: '0.5rem 1.15rem',
                borderRadius: '999px',
                background: isOutOfStock ? 'rgba(255, 255, 255, 0.05)' : 'var(--brand-lime)',
                color: isOutOfStock ? 'var(--text-muted)' : 'var(--text-dark)',
                fontWeight: 800,
                fontSize: '0.82rem',
                boxShadow: isOutOfStock ? 'none' : '0 2px 10px var(--brand-lime-glow)',
                cursor: isOutOfStock ? 'not-allowed' : 'pointer'
              }}
            >
              {isOutOfStock ? 'Out of Stock' : '+ Add'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
