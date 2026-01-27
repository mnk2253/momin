
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
// Redirected modular imports to local wrappers in firebase.ts
import { onAuthStateChanged, signOut, type User, auth } from './firebase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccountPage from './pages/AccountPage';
import HistoryPage from './pages/HistoryPage';
import CustomerDuePage from './pages/CustomerDuePage';
import LoanManagement from './pages/LoanManagement';
import StockManagement from './pages/StockManagement';
import ExpensePage from './pages/ExpensePage';
import IncomePage from './pages/IncomePage';
import RentPage from './pages/RentPage';
import DataCollectPage from './pages/DataCollectPage';
import ReportPage from './pages/ReportPage';
import CashMemoPage from './pages/CashMemoPage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Sinthiya Telecom</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <HashRouter>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<AccountPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/customers" element={<CustomerDuePage />} />
          <Route path="/memo" element={<CashMemoPage />} />
          <Route path="/loans" element={<LoanManagement />} />
          <Route path="/stock" element={<StockManagement />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensePage />} />
          <Route path="/rent" element={<RentPage />} />
          <Route path="/data-collect" element={<DataCollectPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
