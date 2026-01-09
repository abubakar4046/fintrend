import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ExportReport from '../components/ExportReport';
import StockSelector from '../components/StockSelector';
import HistoricalDataDisplay from '../components/HistoricalDataDisplay';
import NewsAnalysisPanel from '../components/NewsAnalysisPanel';
import StockChart from '../components/StockChart';
import NewsPanel from '../components/NewsPanel';
import PredictionPanel from '../components/PredictionPanel';
import StatsCards from '../components/StatsCards';
import authService from '../utils/authService';
import '../styles/dashboard.css';

const Dashboard = ({ setIsAuthenticated }) => {
  // Initialize from URL so the first render already has the correct symbol
  const [selectedStock, setSelectedStock] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const s = params.get('symbol');
      return (s ? String(s).toUpperCase() : 'AAPL');
    } catch {
      return 'AAPL';
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return window.innerWidth > 1024;
    } catch {
      return true;
    }
  });
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication and get user data
    const userData = authService.getCurrentUser();
    if (!userData) {
      setIsAuthenticated(false);
      navigate('/signin');
    } else {
      setCurrentUser(userData.user);
    }
  }, [setIsAuthenticated, navigate]);

  useEffect(() => {
    const onResize = () => {
      try {
        if (window.innerWidth <= 1024) setSidebarOpen(false);
      } catch {}
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    // Support navigation from Watchlist "View" button.
    // Prefer URL query param (works reliably + persists on refresh):
    //   /dashboard?symbol=MSFT
    const params = new URLSearchParams(location.search || '');
    const symbolFromQuery = params.get('symbol');
    const symbolFromState = location?.state?.selectedStock;
    const incoming = symbolFromQuery || symbolFromState;
    if (incoming) {
      const next = String(incoming).toUpperCase();
      // Only update when it actually changes to avoid unnecessary refetches
      setSelectedStock((prev) => (prev === next ? prev : next));
    }
    // We intentionally don't include selectedStock in deps to avoid loops.
  }, [location.key, location.search, location?.state?.selectedStock]);

  const handleLogout = () => {
    authService.signOut();
    setIsAuthenticated(false);
    navigate('/signin');
  };

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        activePage="dashboard"
      />
      
      <div className={`dashboard-main ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <Header 
          onLogout={handleLogout}
          selectedStock={selectedStock}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          currentUser={currentUser}
        />
        
        <div className="dashboard-content">
          {/* Step 1: Stock Selection - According to Sequence Diagram */}
          <StockSelector 
            selectedStock={selectedStock}
            onStockSelect={setSelectedStock}
          />

          {/* Statistics Cards - Real-time stock data */}
          {selectedStock && (
            <StatsCards selectedStock={selectedStock} />
          )}

          {/* Step 2: Historical Data Display - Check if data available */}
          {selectedStock && (
            <HistoricalDataDisplay selectedStock={selectedStock} />
          )}

          {/* Step 3: News Analysis - Fetch and analyze news sentiment */}
          {selectedStock && (
            <NewsAnalysisPanel selectedStock={selectedStock} />
          )}

          {/* Step 4 & 5: Prediction Results & Display trend */}
          {selectedStock && (
            <div className="prediction-results-section">
              <h2 className="section-title">📊 Prediction Results & Trend Analysis</h2>
              <div className="dashboard-grid">
                <StockChart selectedStock={selectedStock} />
                <PredictionPanel selectedStock={selectedStock} />
              </div>
            </div>
          )}

          {/* Export Report Component */}
          {selectedStock && (
            <ExportReport 
              stockData={{ symbol: selectedStock }}
              predictionData={null}
              sentimentData={null}
            />
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Dashboard;