import React, { useState, useEffect } from 'react';
import { stockAPI } from '../utils/api';
import { formatCurrency } from '../utils/helpers';

const StatsCards = ({ selectedStock }) => {
  const [stats, setStats] = useState([
    {
      title: 'Current Price',
      value: '$0.00',
      change: '0.00%',
      icon: '💰',
      type: 'neutral'
    },
    {
      title: 'Volume',
      value: '0',
      change: '0.00%',
      icon: '📊',
      type: 'neutral'
    },
    {
      title: 'Sentiment Score',
      value: 'N/A',
      change: '0.00%',
      icon: '😊',
      type: 'neutral'
    }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedStock) {
      console.log('StatsCards: Fetching stats for', selectedStock);
      fetchStats();
    } else {
      console.warn('StatsCards: No selectedStock provided');
    }
  }, [selectedStock]);

  useEffect(() => {
    // Re-render stats when display settings (currency) change
    const onSettingsChanged = () => {
      if (selectedStock) fetchStats();
    };
    window.addEventListener('settings:changed', onSettingsChanged);
    return () => window.removeEventListener('settings:changed', onSettingsChanged);
  }, [selectedStock]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get latest stock data
      const latest = await stockAPI.getLatestStockData(selectedStock);
      
      if (latest && latest.latest) {
        const data = latest.latest;
        const currentPrice = parseFloat(data.Close || data['Adj close'] || 0);
        const volume = parseFloat(data.Volume || 0);
        
        // Get historical data for comparison
        const historical = await stockAPI.getStockData(selectedStock, 30);
        let prevPrice = currentPrice;
        let sentimentScore = 'N/A';
        
        if (historical && historical.data && historical.data.length > 1) {
          prevPrice = parseFloat(historical.data[historical.data.length - 2].Close || historical.data[historical.data.length - 2]['Adj close'] || currentPrice);
          
          // Calculate average sentiment if available
          const sentiments = historical.data
            .filter(d => d.Scaled_sentiment !== undefined && d.Scaled_sentiment !== null)
            .map(d => parseFloat(d.Scaled_sentiment));
          
          if (sentiments.length > 0) {
            const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
            sentimentScore = (avgSentiment * 100).toFixed(1) + '%';
          }
        }
        
        const priceChange = currentPrice > 0 && prevPrice > 0 
          ? ((currentPrice - prevPrice) / prevPrice * 100)
          : 0;
        
        const volumeFormatted = volume >= 1000000 
          ? (volume / 1000000).toFixed(1) + 'M'
          : volume >= 1000 
          ? (volume / 1000).toFixed(1) + 'K'
          : volume.toFixed(0);
        
        setStats([
          {
            title: 'Current Price',
            value: formatCurrency(currentPrice),
            change: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`,
            icon: '💰',
            type: priceChange >= 0 ? 'positive' : 'negative'
          },
          {
            title: 'Volume',
            value: volumeFormatted,
            change: '0.00%',
            icon: '📊',
            type: 'neutral'
          },
          {
            title: 'Sentiment Score',
            value: sentimentScore,
            change: '0.00%',
            icon: '😊',
            type: sentimentScore !== 'N/A' && parseFloat(sentimentScore) > 50 ? 'positive' : 'neutral'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        selectedStock: selectedStock,
        apiUrl: 'http://localhost:5001/api'
      });
      // Show error message in stats with more details
      const errorMsg = error.message || 'Failed to fetch';
      setStats([
        {
          title: 'Current Price',
          value: 'Error',
          change: errorMsg.substring(0, 15) + '...',
          icon: '⚠️',
          type: 'neutral'
        },
        {
          title: 'Volume',
          value: 'Error',
          change: 'N/A',
          icon: '⚠️',
          type: 'neutral'
        },
        {
          title: 'Sentiment Score',
          value: 'Error',
          change: 'N/A',
          icon: '⚠️',
          type: 'neutral'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stats-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat-card neutral">
            <div className="stat-header">
              <span className="stat-title">Loading...</span>
              <div className="stat-icon neutral">⏳</div>
            </div>
            <div className="stat-value">...</div>
            <div className="stat-change neutral">0.00%</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div key={index} className={`stat-card ${stat.type}`}>
          <div className="stat-header">
            <span className="stat-title">{stat.title}</span>
            <div className={`stat-icon ${stat.type}`} style={{
              background: stat.type === 'positive' ? '#ecfdf5' : 
                         stat.type === 'negative' ? '#fef2f2' : '#f9fafb',
              color: stat.type === 'positive' ? '#059669' : 
                     stat.type === 'negative' ? '#dc2626' : '#6b7280'
            }}>
              {stat.icon}
            </div>
          </div>
          <div className="stat-value">{stat.value}</div>
          <div className={`stat-change ${stat.type}`}>
            <span>{stat.change.startsWith('+') ? '↗' : '↘'}</span>
            {stat.change}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;