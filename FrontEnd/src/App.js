import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import StockPrediction from './pages/StockPrediction';
import NewsSentiment from './pages/NewsSentiment';
import Watchlist from './pages/Watchlist';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Help from './pages/Help';
import About from './pages/About';
import authService from './utils/authService';
import { fxAPI } from './utils/api';

function applyThemeFromSettings() {
  try {
    const raw = localStorage.getItem('displaySettings');
    const parsed = raw ? JSON.parse(raw) : null;
    const themePref = parsed?.theme || 'light';
    let theme = themePref;
    if (themePref === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    document.body.setAttribute('data-theme', theme);
  } catch {
    document.body.setAttribute('data-theme', 'light');
  }
}

function ensureDefaultDisplaySettings() {
  // Ensure light theme is the default when nothing is saved yet.
  // We do NOT override if the user already has saved display settings.
  try {
    const raw = localStorage.getItem('displaySettings');
    if (raw) return;
    localStorage.setItem('displaySettings', JSON.stringify({
      theme: 'light',
      chartType: 'candlestick',
      defaultTimeframe: '1D',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY'
    }));
  } catch {}
}

async function ensureFxRateForDisplayCurrency() {
  try {
    const raw = localStorage.getItem('displaySettings');
    const currency = raw ? (JSON.parse(raw)?.currency || 'USD') : 'USD';
    const base = 'USD';
    if (!currency || currency === base) return;

    // If we already have a recent cached rate, don't refetch.
    const cacheRaw = localStorage.getItem('fxRates');
    const cacheMap = cacheRaw ? JSON.parse(cacheRaw) : {};
    const cacheKey = `${base}_${currency}`;
    const cached = cacheMap?.[cacheKey];
    if (cached?.rate && cached?.ts && (Date.now() - Number(cached.ts) < 6 * 60 * 60 * 1000)) {
      return;
    }

    const res = await fxAPI.getRate(base, currency);
    const rate = Number(res?.rate || 0);
    if (!rate) return;

    cacheMap[cacheKey] = { rate, ts: Date.now(), source: res?.source, date: res?.date };
    localStorage.setItem('fxRates', JSON.stringify(cacheMap));

    // Notify UI that conversion is now available
    window.dispatchEvent(new CustomEvent('fx:updated'));
  } catch {
    // ignore
  }
}

function App() {
  // Check for existing authentication on app load
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    return authService.isAuthenticated();
  });
  const [, forceRerenderOnSettings] = React.useState(0);

  React.useEffect(() => {
    ensureDefaultDisplaySettings();
    applyThemeFromSettings();
    ensureFxRateForDisplayCurrency();

    const onFxUpdated = () => {
      // FX changed; just rerender so numbers update (don't refetch here)
      forceRerenderOnSettings((v) => v + 1);
    };

    const onSettingsChanged = () => {
      applyThemeFromSettings();
      ensureFxRateForDisplayCurrency();
      // Force a rerender so currency/chart labels update immediately across pages
      forceRerenderOnSettings((v) => v + 1);
    };
    window.addEventListener('settings:changed', onSettingsChanged);
    window.addEventListener('fx:updated', onFxUpdated);
    return () => {
      window.removeEventListener('settings:changed', onSettingsChanged);
      window.removeEventListener('fx:updated', onFxUpdated);
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/signin" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" /> :
              <SignIn setIsAuthenticated={setIsAuthenticated} />
            } 
          />
          <Route 
            path="/signup" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" /> :
              <SignUp setIsAuthenticated={setIsAuthenticated} />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? 
              <Dashboard setIsAuthenticated={setIsAuthenticated} /> : 
              <Navigate to="/signin" />
            } 
          />
          <Route 
            path="/prediction" 
            element={
              isAuthenticated ? 
              <StockPrediction setIsAuthenticated={setIsAuthenticated} /> : 
              <Navigate to="/signin" />
            } 
          />
          <Route 
            path="/news" 
            element={
              isAuthenticated ? 
              <NewsSentiment setIsAuthenticated={setIsAuthenticated} /> : 
              <Navigate to="/signin" />
            } 
          />
          <Route 
            path="/watchlist" 
            element={
              isAuthenticated ? 
              <Watchlist setIsAuthenticated={setIsAuthenticated} /> : 
              <Navigate to="/signin" />
            } 
          />
          <Route 
            path="/alerts" 
            element={
              isAuthenticated ? 
              <Alerts setIsAuthenticated={setIsAuthenticated} /> : 
              <Navigate to="/signin" />
            } 
          />
          <Route 
            path="/settings" 
            element={
              isAuthenticated ? 
              <Settings setIsAuthenticated={setIsAuthenticated} /> : 
              <Navigate to="/signin" />
            } 
          />
          <Route
            path="/profile"
            element={
              isAuthenticated ?
              <Profile setIsAuthenticated={setIsAuthenticated} /> :
              <Navigate to="/signin" />
            }
          />
          <Route 
            path="/help" 
            element={
              isAuthenticated ? 
              <Help setIsAuthenticated={setIsAuthenticated} /> : 
              <Navigate to="/signin" />
            } 
          />
          <Route 
            path="/about" 
            element={
              isAuthenticated ? 
              <About setIsAuthenticated={setIsAuthenticated} /> : 
              <Navigate to="/signin" />
            } 
          />
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
              <Navigate to="/dashboard" /> :
              <Navigate to="/signin" />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;