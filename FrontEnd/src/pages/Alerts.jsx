import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import authService from '../utils/authService';
import { stockAPI, predictionAPI, newsAPI } from '../utils/api';
import '../styles/alerts.css';

const Alerts = ({ setIsAuthenticated }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return window.innerWidth > 1024;
    } catch {
      return true;
    }
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = authService.getCurrentUser();
    if (!userData) {
      setIsAuthenticated(false);
      navigate('/signin');
    } else {
      setCurrentUser(userData.user);
      loadAlerts();
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

  const toRelativeTime = (d) => {
    const now = Date.now();
    const diff = Math.max(0, now - d.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const severityFromPct = (pctAbs) => {
    if (pctAbs >= 2) return 'high';
    if (pctAbs >= 1) return 'medium';
    return 'low';
  };

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      // Respect notification settings saved in Settings page
      let ns = {
        emailAlerts: true,
        priceAlerts: true,
        sentimentAlerts: true,
        predictionAlerts: true,
        newsAlerts: false,
        weeklyReport: true
      };
      try {
        const raw = localStorage.getItem('notificationSettings');
        if (raw) ns = { ...ns, ...JSON.parse(raw) };
      } catch {}

      // Use watchlist symbols (localStorage).
      let symbols = [];
      try {
        const savedWatchlist = localStorage.getItem('watchlist');
        if (savedWatchlist) {
          const wl = JSON.parse(savedWatchlist);
          symbols = Array.isArray(wl) ? wl.map(s => String(s.symbol || '').toUpperCase()).filter(Boolean) : [];
        }
      } catch {
        symbols = [];
      }

      if (symbols.length === 0) {
        symbols = ['AAPL', 'GOOGL', 'MSFT'];
      }

      // Limit to avoid too many parallel requests
      symbols = symbols.slice(0, 8);

      const now = new Date();
      let nextId = Date.now();
      const built = [];

      // PRICE alerts (real)
      if (ns.priceAlerts) await Promise.all(symbols.map(async (sym) => {
        try {
          const hist = await stockAPI.getStockData(sym, 2);
          const rows = hist?.data || [];
          const latest = rows[rows.length - 1];
          const prev = rows.length > 1 ? rows[rows.length - 2] : null;

          const latestClose = Number(latest?.Close ?? latest?.['Adj close'] ?? 0);
          const prevClose = Number(prev?.Close ?? prev?.['Adj close'] ?? latestClose);
          const pct = prevClose > 0 ? ((latestClose - prevClose) / prevClose) * 100 : 0;
          const pctAbs = Math.abs(pct);

          built.push({
            id: nextId++,
            type: 'price',
            severity: severityFromPct(pctAbs),
            stock: sym,
            title: `Price update: ${sym}`,
            message: `${sym} is ${pct >= 0 ? 'up' : 'down'} ${pctAbs.toFixed(2)}% (Close: $${latestClose.toFixed(2)})`,
            timestamp: toRelativeTime(now),
            read: false,
            icon: '💰'
          });
        } catch (e) {
          // Skip if symbol not available
          console.warn('Price alert skipped:', sym, e?.message);
        }
      }));

      // SENTIMENT alerts (real, if news API is configured)
      if (ns.sentimentAlerts || ns.newsAlerts) await Promise.all(symbols.slice(0, 6).map(async (sym) => {
        try {
          const news = await newsAPI.getLatestNews(sym, 7, 10);
          const score = Number(news?.sentimentScore ?? 0.5);
          const overall = String(news?.overallSentiment ?? 'Neutral');

          // Only alert when it is meaningfully positive/negative to reduce noise.
          if (score >= 0.62 || score <= 0.38) {
            built.push({
              id: nextId++,
              type: 'sentiment',
              severity: score <= 0.38 ? 'high' : 'medium',
              stock: sym,
              title: `${overall} sentiment detected`,
              message: `${sym} news sentiment is ${overall} (${Math.round(score * 100)}%) based on latest headlines`,
              timestamp: toRelativeTime(now),
              read: false,
              icon: score <= 0.38 ? '😟' : '😊'
            });
          }
        } catch (e) {
          // If FINNHUB_API_KEY isn't set, backend will return 503; just skip sentiment alerts.
          console.warn('Sentiment alert skipped:', sym, e?.message);
        }
      }));

      // PREDICTION alerts (real, limited)
      if (ns.predictionAlerts) await Promise.all(symbols.slice(0, 3).map(async (sym) => {
        try {
          const pred = await predictionAPI.predict({
            symbol: sym,
            model_type: 'LSTM',
            sentiment_type: 'nonsentiment',
            num_csvs: 50,
            prediction_length: 1
          });

          const current = Number(pred?.current_price ?? 0);
          const p1 = Array.isArray(pred?.predictions) ? Number(pred.predictions[0]) : current;
          const pct = current > 0 ? ((p1 - current) / current) * 100 : 0;
          const dir = pct >= 0 ? 'Bullish' : 'Bearish';
          const pctAbs = Math.abs(pct);

          built.push({
            id: nextId++,
            type: 'prediction',
            severity: severityFromPct(pctAbs),
            stock: sym,
            title: `${dir} prediction (${sym})`,
            message: `${sym} predicted ${pct >= 0 ? 'up' : 'down'} ${pctAbs.toFixed(2)}% (1-step forecast)`,
            timestamp: toRelativeTime(now),
            read: false,
            icon: pct >= 0 ? '📈' : '📉'
          });
        } catch (e) {
          console.warn('Prediction alert skipped:', sym, e?.message);
        }
      }));

      // Sort: unread first, then severity, then newest
      const sevRank = { high: 0, medium: 1, low: 2 };
      built.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9) || b.id - a.id;
      });

      setAlerts(built);
    } catch (e) {
      console.error('Failed to load alerts:', e);
      setError(e?.message || 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Refresh alerts immediately when settings are saved
    const onSettingsChanged = () => loadAlerts();
    window.addEventListener('settings:changed', onSettingsChanged);
    return () => window.removeEventListener('settings:changed', onSettingsChanged);
  }, []);

  const handleLogout = () => {
    authService.signOut();
    setIsAuthenticated(false);
    navigate('/signin');
  };

  const markAsRead = (id) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, read: true } : alert
    ));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(alert => ({ ...alert, read: true })));
  };

  const deleteAlert = (id) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.read;
    return alert.type === filter;
  });

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        activePage="alerts"
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
              <h1>🔔 Alerts & Notifications</h1>
              <p>Stay updated with real-time market movements and sentiment shifts</p>
            </div>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button className="mark-all-btn" onClick={markAllAsRead}>
                  ✓ Mark All as Read
                </button>
              )}
              <button className="clear-all-btn" onClick={clearAllAlerts}>
                🗑️ Clear All
              </button>
            </div>
          </div>

          <div className="alerts-stats">
            <div className="stat-card">
              <div className="stat-icon">📬</div>
              <div className="stat-content">
                <label>Total Alerts</label>
                <h3>{alerts.length}</h3>
              </div>
            </div>
            <div className="stat-card unread">
              <div className="stat-icon">🔔</div>
              <div className="stat-content">
                <label>Unread</label>
                <h3>{unreadCount}</h3>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🚨</div>
              <div className="stat-content">
                <label>High Priority</label>
                <h3>{alerts.filter(a => a.severity === 'high').length}</h3>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏰</div>
              <div className="stat-content">
                <label>Today</label>
                <h3>{alerts.filter(a => {
                  const t = String(a.timestamp || '').toLowerCase();
                  return t === 'just now' || t.includes('minutes') || t.includes('hour');
                }).length}</h3>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <label>Filter Alerts:</label>
            <div className="filter-buttons">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
                All ({alerts.length})
              </button>
              <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>
                Unread ({unreadCount})
              </button>
              <button className={filter === 'sentiment' ? 'active' : ''} onClick={() => setFilter('sentiment')}>
                😊 Sentiment
              </button>
              <button className={filter === 'prediction' ? 'active' : ''} onClick={() => setFilter('prediction')}>
                📈 Prediction
              </button>
              <button className={filter === 'price' ? 'active' : ''} onClick={() => setFilter('price')}>
                💰 Price
              </button>
            </div>
          </div>

          <div className="alerts-list">
            {loading && (
              <div className="loading-container" style={{ marginBottom: '16px' }}>
                <div className="spinner"></div>
                <p>Loading real alerts from stock/news/prediction data...</p>
              </div>
            )}

            {error && !loading && (
              <div className="empty-state" style={{ borderLeft: '4px solid #ef4444' }}>
                <div className="empty-icon">❌</div>
                <h3>Alerts failed to load</h3>
                <p>{error}</p>
              </div>
            )}

            {filteredAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={`alert-card ${alert.read ? 'read' : 'unread'} severity-${alert.severity}`}
              >
                <div className="alert-icon">{alert.icon}</div>
                <div className="alert-content">
                  <div className="alert-header">
                    <div>
                      <h3>{alert.title}</h3>
                      <span className="alert-stock">{alert.stock}</span>
                    </div>
                    <span className={`severity-badge ${alert.severity}`}>
                      {alert.severity === 'high' && '🚨 High'}
                      {alert.severity === 'medium' && '⚠️ Medium'}
                      {alert.severity === 'low' && 'ℹ️ Low'}
                    </span>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                  <div className="alert-footer">
                    <span className="alert-time">🕐 {alert.timestamp}</span>
                    <div className="alert-actions">
                      {!alert.read && (
                        <button className="mark-read-btn" onClick={() => markAsRead(alert.id)}>
                          ✓ Mark as Read
                        </button>
                      )}
                      <button
                        className="view-stock-btn"
                        onClick={() => navigate(`/dashboard?symbol=${encodeURIComponent(alert.stock)}`)}
                      >
                        👁️ View Stock
                      </button>
                      <button className="delete-btn" onClick={() => deleteAlert(alert.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAlerts.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <h3>No Alerts</h3>
              <p>You're all caught up! No {filter !== 'all' ? filter : ''} alerts at the moment.</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Alerts;
