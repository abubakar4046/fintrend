import React, { useState, useEffect } from 'react';
import { stockAPI } from '../utils/api';
import '../styles/historicalData.css';

// Price Chart Component - Shows line chart with clear price labels
const PriceChart = ({ prices }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  if (!prices || prices.length === 0) return null;
  
  const priceValues = prices.map(p => parseFloat(p.price));
  const maxPrice = Math.max(...priceValues);
  const minPrice = Math.min(...priceValues);
  const range = maxPrice - minPrice || 1;
  const chartHeight = 300;
  const chartWidth = 100; // percentage
  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  
  // Calculate positions for line chart
  const points = prices.map((item, idx) => {
    const x = (idx / (prices.length - 1)) * (chartWidth - padding.left - padding.right) + padding.left;
    const y = chartHeight - padding.bottom - ((parseFloat(item.price) - minPrice) / range) * (chartHeight - padding.top - padding.bottom);
    return { x, y, ...item, index: idx };
  });
  
  // Create path for line
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Create area path (for gradient fill)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${points[0].x} ${chartHeight - padding.bottom} Z`;
  
  return (
    <div style={{
      padding: '20px',
      background: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding.bottom - (ratio * (chartHeight - padding.top - padding.bottom));
            const price = minPrice + (range * (1 - ratio));
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  ${price.toFixed(2)}
                </text>
              </g>
            );
          })}
          
          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#gradient)"
            opacity="0.2"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {points.map((point, idx) => {
            const isHovered = hoveredIndex === idx;
            const isPositive = parseFloat(point.change) >= 0;
            
            return (
              <g key={idx}>
                {/* Hover line */}
                {isHovered && (
                  <line
                    x1={point.x}
                    y1={padding.top}
                    x2={point.x}
                    y2={chartHeight - padding.bottom}
                    stroke="#6b7280"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    opacity="0.5"
                  />
                )}
                
                {/* Point circle */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? 6 : 4}
                  fill={isPositive ? "#10b981" : "#ef4444"}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                
                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={point.x - 60}
                      y={point.y - 70}
                      width="120"
                      height="60"
                      fill="#1f2937"
                      rx="6"
                      opacity="0.95"
                    />
                    <text
                      x={point.x}
                      y={point.y - 50}
                      fontSize="11"
                      fill="#ffffff"
                      textAnchor="middle"
                      fontWeight="600"
                    >
                      {point.date}
                    </text>
                    <text
                      x={point.x}
                      y={point.y - 35}
                      fontSize="13"
                      fill="#ffffff"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      ${point.price}
                    </text>
                    <text
                      x={point.x}
                      y={point.y - 20}
                      fontSize="10"
                      fill={isPositive ? "#10b981" : "#ef4444"}
                      textAnchor="middle"
                    >
                      {isPositive ? '↗' : '↘'} {isPositive ? '+' : ''}${point.change}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          
          {/* X-axis labels (dates) */}
          {points.filter((_, idx) => idx % Math.ceil(prices.length / 8) === 0 || idx === prices.length - 1).map((point, idx) => {
            const dateParts = point.date.split('/');
            const shortDate = dateParts.length >= 2 ? `${dateParts[0]}/${dateParts[1]}` : point.date;
            return (
              <text
                key={idx}
                x={point.x}
                y={chartHeight - padding.bottom + 20}
                fontSize="9"
                fill="#6b7280"
                textAnchor="middle"
                transform={`rotate(-45 ${point.x} ${chartHeight - padding.bottom + 20})`}
              >
                {shortDate}
              </text>
            );
          })}
        </svg>
      </div>
      
      {/* Summary stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '15px',
        padding: '15px',
        background: '#f9fafb',
        borderRadius: '6px',
        fontSize: '13px'
      }}>
        <div>
          <span style={{ color: '#6b7280' }}>Min: </span>
          <strong style={{ color: '#374151' }}>${minPrice.toFixed(2)}</strong>
        </div>
        <div>
          <span style={{ color: '#6b7280' }}>Max: </span>
          <strong style={{ color: '#374151' }}>${maxPrice.toFixed(2)}</strong>
        </div>
        <div>
          <span style={{ color: '#6b7280' }}>Range: </span>
          <strong style={{ color: '#374151' }}>${(maxPrice - minPrice).toFixed(2)}</strong>
        </div>
        <div>
          <span style={{ color: '#6b7280' }}>Latest: </span>
          <strong style={{ 
            color: parseFloat(prices[prices.length - 1]?.change) >= 0 ? '#10b981' : '#ef4444' 
          }}>
            ${prices[prices.length - 1]?.price}
          </strong>
        </div>
      </div>
    </div>
  );
};

const HistoricalDataDisplay = ({ selectedStock }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);

  useEffect(() => {
    if (selectedStock) {
      fetchHistoricalData();
    }
  }, [selectedStock]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch historical data from API
      const result = await stockAPI.getStockData(selectedStock, 250);
      
      if (!result || !result.data || result.data.length === 0) {
        throw new Error('Historical data not available for this stock');
      }

      const data = result.data;
      
      // Calculate statistics
      const closePrices = data.map(d => parseFloat(d.Close || d['Adj close'] || 0)).filter(p => p > 0);
      const volumes = data.map(d => parseFloat(d.Volume || 0)).filter(v => v > 0);
      
      const high52Week = Math.max(...closePrices).toFixed(2);
      const low52Week = Math.min(...closePrices).toFixed(2);
      const avgVolume = volumes.length > 0 
        ? (volumes.reduce((a, b) => a + b, 0) / volumes.length / 1000000).toFixed(1) + 'M'
        : 'N/A';
      
      // Calculate volatility (standard deviation of returns)
      const returns = [];
      for (let i = 1; i < closePrices.length; i++) {
        if (closePrices[i-1] > 0) {
          returns.push((closePrices[i] - closePrices[i-1]) / closePrices[i-1]);
        }
      }
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const volatility = (Math.sqrt(variance) * 100).toFixed(1) + '%';
      
      // Prepare price history (last 30 days)
      const recentData = data.slice(-30);
      const prices = recentData.map((item, index) => {
        const close = parseFloat(item.Close || item['Adj close'] || 0);
        const prevClose = index > 0 
          ? parseFloat(recentData[index - 1].Close || recentData[index - 1]['Adj close'] || close)
          : close;
        const change = close - prevClose;
        
        return {
          date: item.Date ? new Date(item.Date).toLocaleDateString() : 'N/A',
          price: close.toFixed(2),
          change: change.toFixed(2)
        };
      });

      const formattedData = {
        symbol: result.symbol || selectedStock,
        lastUpdated: new Date().toLocaleString(),
        dataPoints: result.count || data.length,
        dateRange: data.length > 0 && data[0].Date && data[data.length - 1].Date
          ? `${new Date(data[0].Date).toLocaleDateString()} - ${new Date(data[data.length - 1].Date).toLocaleDateString()}`
          : 'Available',
        prices: prices,
        statistics: {
          high52Week,
          low52Week,
          avgVolume,
          volatility
        }
      };

      setHistoricalData(formattedData);
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError(err.message || 'Failed to fetch historical data');
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    fetchHistoricalData();
  };

  if (loading) {
    return (
      <div className="historical-data-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Fetching historical stock data...</p>
          <p className="loading-subtext">Analyzing {selectedStock} market trends</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="historical-data-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Data Not Available</h3>
          <p className="error-message">{error}</p>
          <p className="error-hint">This stock might not have sufficient historical data or the data source is temporarily unavailable.</p>
          <button className="retry-btn" onClick={retry}>
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!historicalData) {
    return (
      <div className="historical-data-container">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p className="empty-text">Select a stock to view historical data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="historical-data-container">
      <div className="data-header">
        <div className="header-left">
          <h2 className="data-title">📈 Historical Data - {historicalData.symbol}</h2>
          <p className="data-subtitle">Last updated: {historicalData.lastUpdated}</p>
        </div>
        <div className="header-right">
          <span className="data-badge">{historicalData.dataPoints} Data Points</span>
          <span className="data-badge">{historicalData.dateRange}</span>
        </div>
      </div>

      <div className="statistics-grid">
        <div className="stat-box">
          <span className="stat-label">52-Week High</span>
          <span className="stat-value">${historicalData.statistics.high52Week}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">52-Week Low</span>
          <span className="stat-value">${historicalData.statistics.low52Week}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Avg. Volume</span>
          <span className="stat-value">{historicalData.statistics.avgVolume}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Volatility</span>
          <span className="stat-value">{historicalData.statistics.volatility}</span>
        </div>
      </div>

      <div className="recent-prices-table">
        <h3 className="table-title">Recent Price Data</h3>
        <div className="table-container">
          <table className="prices-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Price</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {historicalData.prices.slice(-10).reverse().map((item, index) => (
                <tr key={index}>
                  <td>{item.date}</td>
                  <td className="price-cell">${item.price}</td>
                  <td className={`change-cell ${parseFloat(item.change) >= 0 ? 'positive' : 'negative'}`}>
                    {parseFloat(item.change) >= 0 ? '↗' : '↘'} ${Math.abs(parseFloat(item.change)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoricalDataDisplay;