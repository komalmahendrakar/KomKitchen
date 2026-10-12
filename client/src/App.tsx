import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CustomerMenuPage } from './pages/CustomerMenuPage';
import { KitchenBoardPage } from './pages/KitchenBoardPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { getSocket } from './services/socket';
import { CartProvider, useCart } from './context/CartContext';

const MainLayout: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { cartCount, setIsCartOpen } = useCart();

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        cartCount={cartCount}
        isConnected={isConnected}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<CustomerMenuPage />} />
          <Route path="/kitchen" element={<KitchenBoardPage />} />
          <Route path="/order/:id" element={<OrderTrackingPage />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <CartProvider>
        <MainLayout />
      </CartProvider>
    </BrowserRouter>
  );
};

export default App;
