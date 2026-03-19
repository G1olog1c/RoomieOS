import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { ExpensesPage } from './pages/ExpensesPage';
import { ShoppingPage } from './pages/ShoppingPage';
import { FlatSetup } from './pages/FlatSetup';
import { useAuthStore } from './store/authStore';
import { useFlatStore } from './store/flatStore';

const App: React.FC = () => {
  const { user, isLoading: isAuthLoading, initialize } = useAuthStore();
  const { currentFlat, isLoading: isFlatLoading, fetchFlat } = useFlatStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      fetchFlat();
    }
  }, [user, fetchFlat]);

  if (isAuthLoading || (user && isFlatLoading)) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Ładowanie danych aplikacji...</p>
      </div>
    );
  }

  return (
    <Router basename="/RoomieOS">
      <Routes>
        <Route
          path="/login"
          element={!user ? <Auth /> : <Navigate to="/" replace />}
        />
        <Route
          path="/finanse"
          element={
            user ? (
              currentFlat ? <ExpensesPage /> : <FlatSetup />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/zakupy"
          element={
            user ? (
              currentFlat ? <ShoppingPage /> : <FlatSetup />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            user ? (
              currentFlat ? <Dashboard /> : <FlatSetup />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
