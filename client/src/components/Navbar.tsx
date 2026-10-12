import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavbarProps {
  cartCount: number;
  isConnected: boolean;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount, isConnected, onOpenCart }) => {
  return (
    <div className="navbar-wrapper">
      <header className="navbar-pill">

        {/* ── Left: Brand + Nav ── */}
        <div className="navbar-left">
          <NavLink to="/" className="navbar-brand">
            <span className="brand-in">in</span>
            <span className="brand-minutes">
              <span className="brand-bolt">⚡</span>
              <span className="brand-text">Minutes</span>
            </span>
            <span className="brand-ops">OPS</span>
          </NavLink>

          <nav className="navbar-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
            >
              Customer Menu
            </NavLink>
            <NavLink
              to="/kitchen"
              className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
            >
              Kitchen Board
            </NavLink>
          </nav>
        </div>

        {/* ── Right: Status + Actions ── */}
        <div className="navbar-right">
          {/* Live / Offline pill */}
          <div className={`status-pill${isConnected ? ' status-pill--live' : ' status-pill--offline'}`}>
            <span className="status-dot" />
            <span className="status-label">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          {/* Reset demo stock – icon only on small screens */}
          <button
            className="reset-btn"
            title="Reset limited Wagyu Burger stock to 1 for live demo"
            onClick={async () => {
              try {
                await fetch('http://localhost:4000/api/demo/reset', { method: 'POST' });
              } catch (e) {
                console.error(e);
              }
            }}
          >
            <span className="reset-btn__icon">🔄</span>
            <span className="reset-btn__label">Reset Demo Stock</span>
            <span className="reset-btn__badge">1</span>
          </button>

          {/* Cart */}
          <button className="cart-btn" onClick={onOpenCart}>
            <span>🛒</span>
            <span className="cart-btn__label">Cart</span>
            <span className="cart-btn__count">{cartCount}</span>
          </button>
        </div>

      </header>
    </div>
  );
};
