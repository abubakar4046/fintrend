import React, { useState, useEffect } from 'react';
import { stockAPI } from '../utils/api';
import '../styles/stockSelector.css';

const StockSelector = ({ onStockSelect, selectedStock }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [availableStocks, setAvailableStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Popular stocks list (fallback)
  const popularStocksFallback = [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
    { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance' },
    { symbol: 'BAC', name: 'Bank of America', sector: 'Finance' },
    { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail' },
  ];

  const getStockName = (symbol) => {
    // Map common stock symbols to company names
    const stockNames = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'GOOG': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corp.',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms',
      'NVDA': 'NVIDIA Corp.',
      'JPM': 'JPMorgan Chase',
      'BAC': 'Bank of America',
      'WMT': 'Walmart Inc.',
      'KO': 'The Coca-Cola Company',
      'AMD': 'Advanced Micro Devices',
      'TSM': 'Taiwan Semiconductor',
      'WFC': 'Wells Fargo',
      'COST': 'Costco Wholesale',
      'DIS': 'The Walt Disney Company',
      'CVX': 'Chevron Corporation',
      'GE': 'General Electric',
      'INTC': 'Intel Corporation',
      'SBUX': 'Starbucks Corporation',
      'T': 'AT&T Inc.',
      'BABA': 'Alibaba Group',
      'BRK-B': 'Berkshire Hathaway',
      'C': 'Citigroup Inc.',
      'QQQ': 'Invesco QQQ Trust',
    };
    // Avoid generic suffixes like "Corp." because it makes single-letter searches (e.g. "c")
    // match almost everything. If we don't know the name, just show the symbol.
    return stockNames[symbol] || symbol;
  };

  useEffect(() => {
    // Fetch available stocks from API
    const fetchStocks = async () => {
      try {
        const result = await stockAPI.getAvailableStocks();
        if (result && result.stocks) {
          // Convert stock symbols to objects with default names
          const stocksWithNames = result.stocks.map(symbol => ({
            symbol: symbol,
            name: getStockName(symbol),
            sector: 'General'
          }));
          setAvailableStocks(stocksWithNames);
        }
      } catch (error) {
        console.error('Error fetching stocks:', error);
        // Use fallback stocks
        setAvailableStocks(popularStocksFallback);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  const stocksToUse = availableStocks.length > 0 ? availableStocks : popularStocksFallback;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredStocks = stocksToUse
    // Requirement: ONLY show symbols starting with what user typed (no name matching).
    .filter((stock) => {
      if (!normalizedQuery) return true;
      const symbol = (stock.symbol || '').toLowerCase();
      return symbol.startsWith(normalizedQuery);
    })
    // Sort alphabetically by symbol for consistent results
    .sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));

  const handleSelectStock = (stock) => {
    onStockSelect(stock.symbol);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="stock-selector-container">
      <div className="stock-selector-header">
        <h2 className="selector-title">📈 Select Stock for Analysis</h2>
        <p className="selector-subtitle">Choose a stock to view predictions and sentiment analysis</p>
      </div>

      <div className="stock-search-wrapper">
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="stock-search-input"
            placeholder="Search by symbol or company name (e.g., AAPL, Apple)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchQuery('');
                setShowDropdown(false);
              }}
            >
              ✕
            </button>
          )}
        </div>

        {showDropdown && searchQuery && (
          <div className="stock-dropdown">
            {filteredStocks.length > 0 ? (
              filteredStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="stock-dropdown-item"
                  onClick={() => handleSelectStock(stock)}
                >
                  <div className="stock-item-left">
                    <span className="stock-symbol">{stock.symbol}</span>
                    <span className="stock-name">{stock.name}</span>
                  </div>
                  <span className="stock-sector">{stock.sector}</span>
                </div>
              ))
            ) : (
              <div className="no-results">
                <span>No stocks found</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="popular-stocks-section">
        <h3 className="popular-title">{loading ? 'Loading Stocks...' : 'Available Stocks'}</h3>
        <div className="popular-stocks-grid">
          {stocksToUse.slice(0, 12).map((stock) => (
            <button
              key={stock.symbol}
              className={`popular-stock-btn ${selectedStock === stock.symbol ? 'active' : ''}`}
              onClick={() => handleSelectStock(stock)}
            >
              <span className="btn-symbol">{stock.symbol}</span>
              <span className="btn-name">{stock.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StockSelector;