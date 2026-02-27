import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { AddBill } from './pages/AddBill';
import { Bills } from './pages/Bills';
import { BillDetail } from './pages/BillDetail';
import { NegotiationLive } from './pages/NegotiationLive';
import { ScanStatement } from './pages/ScanStatement';
import { initDemoUser } from './api/client';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDemoUser().then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#00ff88] text-lg">Loading Slash...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="bills" element={<Bills />} />
            <Route path="add-bill" element={<AddBill />} />
            <Route path="scan" element={<ScanStatement />} />
            <Route path="bills/:id" element={<BillDetail />} />
            <Route path="negotiations/:id" element={<NegotiationLive />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
