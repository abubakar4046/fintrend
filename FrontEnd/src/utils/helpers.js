// Utility functions for the stock prediction app

function getDisplayCurrency() {
  try {
    const raw = localStorage.getItem('displaySettings');
    const saved = raw ? JSON.parse(raw)?.currency : null;
    return saved || 'USD';
  } catch {
    return 'USD';
  }
}

function getCachedFxRate(base, quote) {
  try {
    const raw = localStorage.getItem('fxRates');
    const map = raw ? JSON.parse(raw) : {};
    const key = `${base}_${quote}`;
    const entry = map?.[key];
    return entry?.rate ? Number(entry.rate) : null;
  } catch {
    return null;
  }
}

// Format money values stored in USD into the selected display currency.
// If FX rate isn't available yet, falls back to showing the USD amount in the selected currency (symbol-only).
export const formatCurrency = (value, currency = null) => {
  const display = currency || getDisplayCurrency();
  const base = 'USD';
  let amount = Number(value || 0);

  if (display !== base) {
    const rate = getCachedFxRate(base, display);
    if (rate) amount = amount * rate;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: display,
  }).format(amount);
};

// Format percentage values
export const formatPercentage = (value, decimals = 2) => {
  return `${value.toFixed(decimals)}%`;
};

// Format large numbers (e.g., market cap)
export const formatLargeNumber = (num) => {
  if (num >= 1e12) {
    return (num / 1e12).toFixed(2) + 'T';
  }
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  }
  return num.toString();
};

// Determine sentiment color
export const getSentimentColor = (sentiment) => {
  switch (sentiment.toLowerCase()) {
    case 'positive':
    case 'bullish':
      return '#10b981';
    case 'negative':
    case 'bearish':
      return '#f87171';
    default:
      return '#6b7280';
  }
};

// Generate random stock data (for demo purposes)
export const generateMockStockData = (symbol) => {
  const basePrice = Math.random() * 500 + 50;
  const change = (Math.random() - 0.5) * 10;
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol,
    price: basePrice.toFixed(2),
    change: change.toFixed(2),
    changePercent: changePercent.toFixed(2),
    volume: Math.floor(Math.random() * 100000000),
    marketCap: Math.floor(Math.random() * 3000000000000),
  };
};

// Debounce function for search inputs
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Local storage helpers
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error getting item from localStorage:', error);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item in localStorage:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from localStorage:', error);
    }
  }
};

// API endpoints
export const API_ENDPOINTS = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  STOCKS: '/stocks',
  NEWS: '/news',
  PREDICTIONS: '/predictions',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout'
  }
};

// Re-export API functions for convenience
export { stockAPI, predictionAPI, healthAPI } from './api';