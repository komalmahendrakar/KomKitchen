import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavbarProps {
  cartCount: number;
  isConnected: boolean;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, isConnected, onOpenCart }) => {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0.875rem 2rem'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}>
              🔥
            </div>
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                LIVE<span style={{ color: 'var(--accent-amber)' }}>KITCHEN</span>
              </span>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Real-Time Kitchen Ops</p>
            </div>
          </NavLink>

          <nav style={{ display: 'flex', gap: '1rem' }}>
            <NavLink
              to="/"
              style={({ isActive }) => ({
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)'
              })}
            >
              🍽️ Customer Menu
            </NavLink>
            <NavLink
              to="/kitchen"
              style={({ isActive }) => ({
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)'
              })}
            >
              👨‍🍳 Kitchen Board
            </NavLink>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Real-time Connection Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
            padding: '6px 12px',
            borderRadius: '999px',
            background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            color: isConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              boxShadow: isConnected ? '0 0 8px var(--accent-emerald)' : 'none'
            }} />
            <span>{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
          </div>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.5rem 1.25rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.875rem',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)'
            }}
          >
            🛒 Cart ({cartCount})
          </button>
        </div>
      </div>
    </header>
  );
};
