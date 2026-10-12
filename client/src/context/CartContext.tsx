import React, { createContext, useContext, useState, useEffect } from 'react';
import type { MenuItem } from '../types';

export interface CartEntry {
  item: MenuItem;
  quantity: number;
}

interface CartContextType {
  cart: Map<string, CartEntry>;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  updateItemStock: (items: Array<{ id: string; stock: number }>) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Map<string, CartEntry>>(() => {
    try {
      const saved = localStorage.getItem('kom_cart_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return new Map(parsed);
      }
    } catch {
      // ignore
    }
    return new Map();
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kom_cart_state', JSON.stringify(Array.from(cart.entries())));
    } catch {
      // ignore
    }
  }, [cart]);

  const addToCart = (item: MenuItem) => {
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

  const removeFromCart = (itemId: string) => {
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

  const updateQuantity = (itemId: string, delta: number) => {
    if (delta > 0) {
      const entry = cart.get(itemId);
      if (entry) addToCart(entry.item);
    } else {
      removeFromCart(itemId);
    }
  };

  const clearCart = () => {
    setCart(new Map());
  };

  const updateItemStock = (updatedStocks: Array<{ id: string; stock: number }>) => {
    setCart((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const { id, stock } of updatedStocks) {
        const entry = next.get(id);
        if (entry) {
          if (stock <= 0) {
            next.delete(id);
            changed = true;
          } else if (entry.quantity > stock) {
            next.set(id, { item: { ...entry.item, stock }, quantity: stock });
            changed = true;
          } else {
            next.set(id, { item: { ...entry.item, stock }, quantity: entry.quantity });
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  };

  const cartCount = Array.from(cart.values()).reduce((sum, entry) => sum + entry.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        updateItemStock
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
