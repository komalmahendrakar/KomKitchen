import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavbarProps {
  cartCount: number;
  isConnected: boolean;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, isConnected, onOpenCart }) => {
  return (
    <div style={{
      position: 'sticky',
      top: '12px',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'center',
      padding: '0 1rem'
    }}>
      <header style={{
        width: '100%',
        maxWidth: '1200px',
        backgroundColor: 'var(--bg-pill)',
        borderRadius: '9999px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-pill)',
        backdropFilter: 'blur(16px)',
        padding: '0.65rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* inMinutes Style Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#ffffff'
            }}>
              in
            </span>
            <span style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--brand-lime)',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              <span style={{
                display: 'inline-block',
                transform: 'skewX(-10deg)',
                color: 'var(--brand-lime)'
              }}>
                ⚡
              </span>
              Minutes
            </span>
            <span style={{
              marginLeft: '6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: 'rgba(198, 240, 12, 0.15)',
              color: 'var(--brand-lime)',
              border: '1px solid rgba(198, 240, 12, 0.3)'
            }}>
              OPS
            </span>
          </NavLink>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <NavLink
              to="/"
              style={({ isActive }) => ({
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease'
              })}
            >
              Customer Menu
            </NavLink>
            <NavLink
              to="/kitchen"
              style={({ isActive }) => ({
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease'
              })}
            >
              Kitchen Board
            </NavLink>
          </nav>
        </div>

        {/* Right Section Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Connection Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            padding: '5px 12px',
            borderRadius: '999px',
            background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.15)',
            color: isConnected ? 'var(--status-emerald)' : 'var(--status-rose)',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isConnected ? 'var(--status-emerald)' : 'var(--status-rose)',
              boxShadow: isConnected ? '0 0 6px var(--status-emerald)' : 'none'
            }} />
            <span style={{ fontWeight: 700 }}>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          {/* Quick Reset Demo Stock (1) Button */}
          <button
            title="Reset limited Wagyu Burger stock to 1 for live demo"
            onClick={async () => {
              try {
                await fetch('http://localhost:4000/api/demo/reset', { method: 'POST' });
              } catch (e) {
                console.error(e);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.9rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>🔄</span> Reset Demo Stock (1)
          </button>

          {/* Download/Cart Action in Electric Lime */}
          <button
            onClick={onOpenCart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.55rem 1.35rem',
              borderRadius: '999px',
              backgroundColor: 'var(--brand-lime)',
              color: 'var(--text-dark)',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: 'var(--shadow-lime)',
              cursor: 'pointer'
            }}
          >
            <span>🛒</span>
            <span>Cart</span>
            <span style={{
              backgroundColor: 'var(--text-dark)',
              color: 'var(--brand-lime)',
              borderRadius: '999px',
              padding: '1px 7px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {cartCount}
            </span>
          </button>
        </div>
      </header>
    </div>
  );
};
