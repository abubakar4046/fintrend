import React from 'react';

const NewsPanel = ({ selectedStock }) => {
  // Mock news data - in real app, this would come from API
  const newsItems = [
    {
      title: `${selectedStock} Reports Strong Q3 Earnings, Beating Expectations`,
      source: 'Financial Times',
      time: '2 hours ago',
      sentiment: 'positive'
    },
    {
      title: 'Market Volatility Expected as Fed Meeting Approaches',
      source: 'Reuters',
      time: '4 hours ago',
      sentiment: 'neutral'
    },
    {
      title: 'Tech Stocks Under Pressure Amid Rising Interest Rates',
      source: 'Bloomberg',
      time: '6 hours ago',
      sentiment: 'negative'
    },
    {
      title: `Analysts Upgrade ${selectedStock} Price Target Following Innovation Announcement`,
      source: 'MarketWatch',
      time: '8 hours ago',
      sentiment: 'positive'
    },
    {
      title: 'Global Supply Chain Issues Continue to Impact Tech Sector',
      source: 'WSJ',
      time: '12 hours ago',
      sentiment: 'negative'
    }
  ];

  return (
    <div className="news-panel">
      <div className="news-header">
        <h2 className="news-title">Latest News</h2>
        <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '14px' }}>
          Refresh
        </button>
      </div>
      
      <div className="news-list">
        {newsItems.map((item, index) => (
          <div key={index} className="news-item" onClick={() => console.log('Open news:', item.title)}>
            <h3 className="news-item-title">{item.title}</h3>
            <div className="news-item-meta">
              <span>{item.source} • {item.time}</span>
              <span className={`sentiment-badge sentiment-${item.sentiment}`}>
                {item.sentiment}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsPanel;