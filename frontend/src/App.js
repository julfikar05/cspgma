import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AddReconciliation from './pages/AddReconciliation';
import EditReconciliation from './pages/EditReconciliation';
import AsOfCheck from './pages/AsOfCheck';
import SearchData from './pages/SearchData';
import ProtectedRoute from './components/ProtectedRoute';
import DuplicateCheck from './pages/DuplicateCheck';

function AppWrapper() {
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    // Load persisted auth state from localStorage
    const storedAuth = localStorage.getItem('auth') === 'true';
    setAuth(storedAuth);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage setAuth={setAuth} />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute auth={auth}>
              <Dashboard setAuth={setAuth} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reconciliation/add"
          element={
            <ProtectedRoute auth={auth}>
              <AddReconciliation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reconciliation/edit"
          element={
            <ProtectedRoute auth={auth}>
              <EditReconciliation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reconciliation/check"
          element={
            <ProtectedRoute auth={auth}>
              <AsOfCheck />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reconciliation/search"
          element={
            <ProtectedRoute auth={auth}>
              <SearchData />
            </ProtectedRoute>
          }
        />

        <Route
         path="/reconciliation/duplicates"
         element={
         <ProtectedRoute auth={auth}>
           <DuplicateCheck />
         </ProtectedRoute>
    }
        />

        {/* Catch unknown routes */}
        <Route path="*" element={<Navigate to={auth ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}



export default AppWrapper;