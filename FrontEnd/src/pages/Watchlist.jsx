import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import authService from '../utils/authService';
import { stockAPI } from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import '../styles/watchlist.css';

const Watchlist = ({ setIsAuthenticated }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return window.innerWidth > 1024;
    } catch {
      return true;
    }
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStock, setNewStock] = useState('');
  const [availableStocks, setAvailableStocks] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [addError, setAddError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = authService.getCurrentUser();
    if (!userData) {
      setIsAuthenticated(false);
      navigate('/signin');
    } else {
      setCurrentUser(userData.user);
      loadWatchlist();
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

  const loadWatchlist = () => {
    // Load from localStorage or use default
    const savedWatchlist = localStorage.getItem('watchlist');
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist));
    } else {
      const defaultWatchlist = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 178.45,
          change: 2.34,
          changePercent: 1.33,
          sentiment: 'Positive',
          prediction: 'Bullish',
          addedDate: '2025-01-05'
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          price: 142.67,
          change: -1.23,
          changePercent: -0.85,
          sentiment: 'Neutral',
          prediction: 'Neutral',
          addedDate: '2025-01-04'
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          price: 398.12,
          change: 5.67,
          changePercent: 1.44,
          sentiment: 'Positive',
          prediction: 'Bullish',
          addedDate: '2025-01-03'
        }
      ];
      setWatchlist(defaultWatchlist);
      localStorage.setItem('watchlist', JSON.stringify(defaultWatchlist));
    }
  };

  useEffect(() => {
    // Load available symbols for modal suggestions
    (async () => {
      try {
        const res = await stockAPI.getAvailableStocks();
        if (res?.stocks && Array.isArray(res.stocks)) {
          setAvailableStocks(res.stocks.map(s => String(s).toUpperCase()));
        }
      } catch (e) {
        // Fallback list if backend is unreachable
        setAvailableStocks(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX']);
      }
    })();
  }, []);

  const filteredSuggestions = (() => {
    const q = newStock.trim().toUpperCase();
    if (!q) return [];
    return availableStocks
      .filter((s) => s.startsWith(q))
      .slice(0, 10);
  })();

  const handleLogout = () => {
    authService.signOut();
    setIsAuthenticated(false);
    navigate('/signin');
  };

  const addToWatchlist = async () => {
    const symbol = newStock.trim().toUpperCase();
    if (!symbol) return;

    setAddError(null);

    if (watchlist.some(s => s.symbol === symbol)) {
      setAddError(`${symbol} is already in your watchlist.`);
      return;
    }

    // Try to fetch latest price (real) from backend
    let price = null;
    try {
      const latest = await stockAPI.getLatestStockData(symbol);
      const close = latest?.latest ? Number(latest.latest.Close ?? latest.latest['Adj close'] ?? 0) : 0;
      if (close > 0) price = close.toFixed(2);
    } catch {
      // ignore, we'll fallback
    }
    
    const stock = {
      symbol,
      name: `${symbol} Company`,
      price: price ?? (Math.random() * 300 + 50).toFixed(2),
      change: '0.00',
      changePercent: '0.00',
      sentiment: 'Neutral',
      prediction: 'Neutral',
      addedDate: new Date().toISOString().split('T')[0]
    };
    
    const updatedWatchlist = [...watchlist, stock];
    setWatchlist(updatedWatchlist);
    // Keep localStorage as fallback cache
    localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
    setNewStock('');
    setShowSuggestions(false);
    setSuggestionIndex(-1);
    setShowAddModal(false);
  };

  const removeFromWatchlist = (symbol) => {
    const updatedWatchlist = watchlist.filter(stock => stock.symbol !== symbol);
    setWatchlist(updatedWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
  };

  const refreshPrices = () => {
    const updatedWatchlist = watchlist.map(stock => ({
      ...stock,
      price: (parseFloat(stock.price) + (Math.random() * 2 - 1)).toFixed(2),
      change: (Math.random() * 10 - 5).toFixed(2),
      changePercent: (Math.random() * 5 - 2.5).toFixed(2)
    }));
    setWatchlist(updatedWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
  };

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        activePage="watchlist"
      />
      
      <div className={`dashboard-main ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <Header 
          onLogout={handleLogout}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          currentUser={currentUser}
        />
        
        <div className="dashboard-content">
          <div className="page-header">
            <div>
              <h1>⭐ My Watchlist</h1>
              <p>Monitor your favorite stocks and track their performance</p>
            </div>
            <div className="header-actions">
              <button className="refresh-btn" onClick={refreshPrices}>
                🔄 Refresh Prices
              </button>
              <button className="add-stock-btn" onClick={() => setShowAddModal(true)}>
                ➕ Add Stock
              </button>
            </div>
          </div>

          <div className="watchlist-stats">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <label>Total Stocks</label>
                <h3>{watchlist.length}</h3>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <label>Bullish Predictions</label>
                <h3>{watchlist.filter(s => s.prediction === 'Bullish').length}</h3>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">😊</div>
              <div className="stat-content">
                <label>Positive Sentiment</label>
                <h3>{watchlist.filter(s => s.sentiment === 'Positive').length}</h3>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <label>Gainers Today</label>
                <h3>{watchlist.filter(s => parseFloat(s.changePercent) > 0).length}</h3>
              </div>
            </div>
          </div>

          <div className="watchlist-table">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company Name</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Sentiment</th>
                  <th>Prediction</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map(stock => (
                  <tr key={stock.symbol}>
                    <td className="stock-symbol">{stock.symbol}</td>
                    <td>{stock.name}</td>
                    <td className="stock-price">{formatCurrency(Number(stock.price || 0))}</td>
                    <td className={parseFloat(stock.changePercent) >= 0 ? 'positive' : 'negative'}>
                      {parseFloat(stock.changePercent) >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(Number(stock.change || 0)))} ({stock.changePercent}%)
                    </td>
                    <td>
                      <span className={`sentiment-badge ${stock.sentiment.toLowerCase()}`}>
                        {stock.sentiment === 'Positive' && '😊'}
                        {stock.sentiment === 'Negative' && '😟'}
                        {stock.sentiment === 'Neutral' && '😐'}
                        {stock.sentiment}
                      </span>
                    </td>
                    <td>
                      <span className={`prediction-badge ${stock.prediction.toLowerCase()}`}>
                        {stock.prediction === 'Bullish' && '📈'}
                        {stock.prediction === 'Bearish' && '📉'}
                        {stock.prediction === 'Neutral' && '➡️'}
                        {stock.prediction}
                      </span>
                    </td>
                    <td>{stock.addedDate}</td>
                    <td>
                      <button
                        className="view-btn"
                        title={`View ${stock.symbol} on Dashboard`}
                        onClick={() => navigate(`/dashboard?symbol=${encodeURIComponent(stock.symbol)}`)}
                      >
                        👁️
                      </button>
                      <button className="remove-btn" onClick={() => removeFromWatchlist(stock.symbol)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {watchlist.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">⭐</div>
              <h3>No Stocks in Watchlist</h3>
              <p>Add stocks to your watchlist to monitor their performance</p>
              <button className="add-stock-btn" onClick={() => setShowAddModal(true)}>
                ➕ Add Your First Stock
              </button>
            </div>
          )}
        </div>

        <Footer />
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Stock to Watchlist</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label>Stock Symbol</label>
              <input
                type="text"
                placeholder="e.g., TSLA, AMZN, NFLX"
                value={newStock}
                onChange={(e) => {
                  setNewStock(e.target.value);
                  setShowSuggestions(true);
                  setSuggestionIndex(-1);
                  setAddError(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // allow click on suggestion before closing
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                onKeyDown={(e) => {
                  if (!showSuggestions || filteredSuggestions.length === 0) {
                    if (e.key === 'Enter') addToWatchlist();
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSuggestionIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSuggestionIndex((prev) => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const pick = filteredSuggestions[Math.max(0, suggestionIndex)];
                    if (pick) {
                      setNewStock(pick);
                      setShowSuggestions(false);
                      setSuggestionIndex(-1);
                    } else {
                      addToWatchlist();
                    }
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    setSuggestionIndex(-1);
                  }
                }}
              />

              {addError && (
                <div style={{ marginTop: '10px', color: '#ef4444', fontWeight: 600 }}>
                  ❌ {addError}
                </div>
              )}

              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="watchlist-suggestions">
                  {filteredSuggestions.map((sym, idx) => (
                    <div
                      key={sym}
                      className={`watchlist-suggestion-item ${idx === suggestionIndex ? 'active' : ''}`}
                      onMouseDown={() => {
                        setNewStock(sym);
                        setShowSuggestions(false);
                        setSuggestionIndex(-1);
                      }}
                    >
                      {sym}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="confirm-btn" onClick={addToWatchlist}>Add to Watchlist</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
