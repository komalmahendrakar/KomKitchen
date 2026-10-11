import React, { useEffect, useState } from 'react';
import type { MenuItem, Order } from '../types';
import { MenuCard } from '../components/MenuCard';
import { CartModal } from '../components/CartModal';
import { API_BASE, getSocket } from '../services/socket';
import { useNavigate } from 'react-router-dom';

export const CustomerMenuPage: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Map<string, { item: MenuItem; quantity: number }>>(new Map());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const navigate = useNavigate();

  // Load menu items
  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_BASE}/menu`);
      if (res.ok) {
        const json = await res.json();
        setMenu(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    }
  };

  useEffect(() => {
    fetchMenu();

    // Check for saved active order in localStorage
    const savedOrder = localStorage.getItem('kom_last_order');
    if (savedOrder) {
      try {
        setLastOrder(JSON.parse(savedOrder));
      } catch (e) {
        // ignore
      }
    }

    // Listen for real-time stock updates
    const socket = getSocket();
    const handleStockUpdated = (payload: { items: Array<{ id: string; stock: number }> }) => {
      setMenu((prev) =>
        prev.map((item) => {
          const match = payload.items.find((u) => u.id === item.id);
          return match ? { ...item, stock: match.stock } : item;
        })
      );
    };

    socket.on('STOCK_UPDATED', handleStockUpdated);

    return () => {
      socket.off('STOCK_UPDATED', handleStockUpdated);
    };
  }, []);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty < item.stock) {
        next.set(item.id, { item, quantity: currentQty + 1 });
      }
      return next;
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing) {
        if (existing.quantity > 1) {
          next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
        } else {
          next.delete(itemId);
        }
      }
      return next;
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    if (delta > 0) {
      const entry = cart.get(itemId);
      if (entry) handleAddToCart(entry.item);
    } else {
      handleRemoveFromCart(itemId);
    }
  };

  const handleClearCart = () => {
    setCart(new Map());
    setErrorMessage(null);
  };

  const handleCheckout = async (customerName: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Generate unique clientRequestId for atomic idempotency
    const clientRequestId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const itemsPayload = Array.from(cart.values()).map(({ item, quantity }) => ({
      menuItemId: item.id,
      quantity
    }));

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientRequestId,
          customerName,
          items: itemsPayload
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_STOCK') {
          setErrorMessage(data.error || 'Requested item is out of stock.');
          // Refresh menu to update real counts
          fetchMenu();
        } else {
          setErrorMessage(data.error || 'Failed to place order.');
        }
        setIsSubmitting(false);
        return;
      }

      // Order Success!
      const createdOrder: Order = data.data;
      localStorage.setItem('kom_last_order', JSON.stringify(createdOrder));
      setLastOrder(createdOrder);
      setCart(new Map());
      setIsCartOpen(false);
      setIsSubmitting(false);

      navigate(`/order/${createdOrder.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while placing order.');
      setIsSubmitting(false);
    }
  };

  // Filter categories
  const categories = ['All', ...Array.from(new Set(menu.map((i) => i.category)))];
  const filteredMenu =
    selectedCategory === 'All'
      ? menu
      : menu.filter((i) => i.category === selectedCategory);

  const cartTotalItems = Array.from(cart.values()).reduce(
    (sum, i) => sum + i.quantity,
    0
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      {/* Hero Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem',
          marginBottom: '2.5rem',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(234, 88, 12, 0.08))',
          border: '1px solid var(--border-accent)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}
      >
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(245,158,11,0.2)',
            color: 'var(--accent-amber)',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '0.75rem'
          }}>
            ⚡ ACID TRANSACTIONAL ENGINE
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Freshly Prepared. Real-Time Kitchen.
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', fontSize: '1rem', lineHeight: 1.5 }}>
            Every order is reserved with strict PostgreSQL conditional updates. Zero overselling, instant kitchen dispatch, and sub-second status synchronization.
          </p>
        </div>

        {lastOrder && (
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CURRENT ACTIVE ORDER</div>
            <div style={{ fontWeight: 700, margin: '4px 0' }}>#{lastOrder.id.slice(0, 8)}</div>
            <button
              onClick={() => navigate(`/order/${lastOrder.id}`)}
              style={{
                fontSize: '0.85rem',
                color: 'var(--accent-amber)',
                background: 'transparent',
                fontWeight: 600,
                padding: 0
              }}
            >
              Track Live Status &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: selectedCategory === cat ? 'var(--accent-amber)' : 'rgba(255,255,255,0.05)',
              color: selectedCategory === cat ? '#000' : 'var(--text-secondary)',
              border: `1px solid ${selectedCategory === cat ? 'transparent' : 'var(--border-subtle)'}`
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.75rem'
      }}>
        {filteredMenu.map((item) => (
          <MenuCard
            key={item.id}
            item={item}
            cartQuantity={cart.get(item.id)?.quantity || 0}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
          />
        ))}
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
      />

      {/* Sticky Bottom Cart Floating Bar if Cart Has Items */}
      {cartTotalItems > 0 && !isCartOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 90
        }}>
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0.875rem 2rem',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 8px 30px rgba(245, 158, 11, 0.4)'
            }}
          >
            <span>🛒 View Cart ({cartTotalItems} items)</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}
    </div>
  );
};
