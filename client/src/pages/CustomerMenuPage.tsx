import React, { useEffect, useState } from 'react';
import type { MenuItem, Order } from '../types';
import { MenuCard } from '../components/MenuCard';
import { CartModal } from '../components/CartModal';
import { API_BASE, getSocket } from '../services/socket';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export const CustomerMenuPage: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const {
    cart,
    cartCount,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    updateItemStock
  } = useCart();

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
        const parsed: Order = JSON.parse(savedOrder);
        // Do not show as active if it is already finished (PICKED_UP or CANCELLED)
        if (parsed.status !== 'PICKED_UP' && parsed.status !== 'CANCELLED') {
          setLastOrder(parsed);
          // Verify current status with server in case it changed while away
          fetch(`${API_BASE}/orders/${parsed.id}`)
            .then((r) => r.json())
            .then((res) => {
              if (res.success && res.data) {
                if (res.data.status === 'PICKED_UP' || res.data.status === 'CANCELLED') {
                  localStorage.removeItem('kom_last_order');
                  setLastOrder(null);
                } else {
                  setLastOrder(res.data);
                  localStorage.setItem('kom_last_order', JSON.stringify(res.data));
                }
              }
            })
            .catch(() => {});
        } else {
          localStorage.removeItem('kom_last_order');
        }
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
      updateItemStock(payload.items);
    };

    // Listen for status changes to clear active order as soon as it is PICKED_UP
    const handleOrderStatusChanged = (payload: { orderId: string; currentStatus: Order['status'] }) => {
      setLastOrder((prev) => {
        if (!prev || prev.id !== payload.orderId) return prev;
        if (payload.currentStatus === 'PICKED_UP' || payload.currentStatus === 'CANCELLED') {
          localStorage.removeItem('kom_last_order');
          return null; // Stop showing active order banner!
        }
        const updated = { ...prev, status: payload.currentStatus };
        localStorage.setItem('kom_last_order', JSON.stringify(updated));
        return updated;
      });
    };

    socket.on('STOCK_UPDATED', handleStockUpdated);
    socket.on('ORDER_STATUS_CHANGED', handleOrderStatusChanged);

    return () => {
      socket.off('STOCK_UPDATED', handleStockUpdated);
      socket.off('ORDER_STATUS_CHANGED', handleOrderStatusChanged);
    };
  }, []);

  const handleCheckout = async (customerName: string) => {
    if (cart.size === 0 || isSubmitting) return;

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
      clearCart();
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

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem 1.5rem' }}>
      {/* inMinutes "GOOD FOOD, ZERO WAIT." Hero Banner */}
      <div style={{
        textAlign: 'center',
        padding: '3rem 1rem 2rem 1rem',
        marginBottom: '2.5rem',
        position: 'relative'
      }}>
        {/* Playful Floating Doodles / Sparks */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '0.25rem'
        }}>
          <span style={{ fontSize: '1.4rem' }}>🌶️</span>
          <span style={{ color: 'var(--brand-lime)', fontSize: '1.2rem', fontWeight: 800 }}>✦</span>
          <span style={{ fontSize: '1.3rem' }}>🌮</span>
        </div>

        {/* Large Bold Typography */}
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.25rem)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          textTransform: 'uppercase',
          margin: '0 auto 0.75rem auto'
        }}>
          <span style={{ color: '#ffffff', display: 'block' }}>GOOD FOOD,</span>
          <span style={{
            color: 'var(--brand-lime)',
            textShadow: '0 0 25px var(--brand-lime-glow)',
            display: 'inline-block'
          }}>
            ZERO WAIT.
          </span>
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.15rem',
          fontWeight: 500,
          margin: '0 auto',
          maxWidth: '550px'
        }}>
          Flavor-packed bites, delivered in <strong style={{ color: 'var(--brand-lime)', fontWeight: 700 }}>minutes</strong>.
        </p>

        {lastOrder && (lastOrder.status === 'NEW' || lastOrder.status === 'COOKING' || lastOrder.status === 'READY') && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '1rem',
            padding: '8px 18px',
            borderRadius: '999px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIVE ORDER:</span>
            <span style={{ fontWeight: 800, color: 'var(--brand-lime)', fontSize: '0.85rem' }}>
              #{lastOrder.id.slice(0, 8)} ({lastOrder.status})
            </span>
            <button
              onClick={() => navigate(`/order/${lastOrder.id}`)}
              style={{
                fontSize: '0.8rem',
                color: '#fff',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Track Status &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '0.5rem 1.35rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: selectedCategory === cat ? 'var(--brand-lime)' : 'var(--bg-pill)',
              color: selectedCategory === cat ? 'var(--text-dark)' : 'var(--text-secondary)',
              border: `1px solid ${selectedCategory === cat ? 'transparent' : 'var(--border-subtle)'}`,
              boxShadow: selectedCategory === cat ? 'var(--shadow-lime)' : 'none'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: '1.75rem'
      }}>
        {filteredMenu.map((item) => (
          <MenuCard
            key={item.id}
            item={item}
            cartQuantity={cart.get(item.id)?.quantity || 0}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
          />
        ))}
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onClearCart={clearCart}
        onCheckout={handleCheckout}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
      />

      {/* Sticky Bottom Cart Floating Bar if Cart Has Items */}
      {cartCount > 0 && !isCartOpen && (
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
              padding: '0.85rem 2rem',
              borderRadius: '999px',
              background: 'var(--brand-lime)',
              color: 'var(--text-dark)',
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: 'var(--shadow-lime)'
            }}
          >
            <span>🛒 View Cart ({cartCount} items)</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}
    </div>
  );
};
