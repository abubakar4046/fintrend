import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StockSelector from '../components/StockSelector';
import authService from '../utils/authService';
import { newsAPI } from '../utils/api';
import '../styles/newsSentiment.css';

const NewsSentiment = ({ setIsAuthenticated }) => {
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return window.innerWidth > 1024;
    } catch {
      return true;
    }
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [useFinBERT, setUseFinBERT] = useState(false);  // Track if FinBERT analysis was used
  const navigate = useNavigate();

  useEffect(() => {
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

  const handleLogout = () => {
    authService.signOut();
    setIsAuthenticated(false);
    navigate('/signin');
  };

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    setNewsData(null);
    setUseFinBERT(false);

    try {
      const result = await newsAPI.getLatestNews(selectedStock, 7, 15);
      setNewsData(result);
    } catch (e) {
      console.error('Error fetching news:', e);
      setError(e?.message || 'Failed to fetch news');
    } finally {
      setLoading(false);
    }
  };

  const analyzeSentimentWithFinBERT = async () => {
    // Use FinBERT model for accurate sentiment analysis
    setAnalyzing(true);
    setError(null);
    
    try {
      const result = await newsAPI.getNewsWithFinBERT(selectedStock, 7, 15);
      setNewsData(result);
      setUseFinBERT(true);
    } catch (e) {
      console.error('Error analyzing with FinBERT:', e);
      setError(e?.message || 'Failed to analyze with FinBERT. The model may be loading...');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch(sentiment) {
      case 'Positive': return '#10b981';
      case 'Negative': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const filteredArticles = newsData?.articles.filter(article => {
    if (filter === 'all') return true;
    return article.sentiment === filter;
  });

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        activePage="news"
      />
      
      <div className={`dashboard-main ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <Header 
          onLogout={handleLogout}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          currentUser={currentUser}
        />
        
        <div className="dashboard-content">
          <div className="page-header">
            <h1>📰 Financial News Sentiment Analysis</h1>
            <p>Real-time sentiment analysis of financial news using FinBERT AI model</p>
          </div>

          {/* Stock Search (same as Dashboard / Prediction page) */}
          <StockSelector
            selectedStock={selectedStock}
            onStockSelect={setSelectedStock}
          />

          <div className="news-controls">
            <div className="action-buttons">
              <button className="fetch-news-btn" onClick={fetchNews} disabled={loading}>
                {loading ? '🔄 Fetching News...' : '📡 Fetch Latest News'}
              </button>
              {newsData && (
                <button className="analyze-btn finbert-btn" onClick={analyzeSentimentWithFinBERT} disabled={analyzing}>
                  {analyzing ? '🔄 Analyzing with FinBERT...' : '🤖 Analyze with FinBERT'}
                </button>
              )}
            </div>

            {error && (
              <div style={{ marginTop: '12px', color: '#ef4444', fontWeight: 600 }}>
                ❌ {error}
                {String(error).includes('FINNHUB_API_KEY') && (
                  <div style={{ marginTop: '6px', color: '#6b7280', fontWeight: 500 }}>
                    Set <code>FINNHUB_API_KEY</code> on the backend to enable real news fetching.
                  </div>
                )}
              </div>
            )}
          </div>

          {loading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Fetching latest financial news for {selectedStock}...</p>
            </div>
          )}

          {newsData && !loading && (
            <>
              <div className="sentiment-overview">
                <h2>
                  Overall Sentiment Analysis 
                  {useFinBERT && <span className="finbert-badge">🤖 FinBERT</span>}
                  {!useFinBERT && <span className="lexicon-badge">📊 Basic</span>}
                </h2>
                <div className="overview-cards">
                  <div className="overview-card">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                      <label>Total Articles</label>
                      <h3>{newsData.totalArticles}</h3>
                    </div>
                  </div>
                  <div className="overview-card" style={{borderColor: getSentimentColor(newsData.overallSentiment)}}>
                    <div className="card-icon">💭</div>
                    <div className="card-content">
                      <label>Overall Sentiment</label>
                      <h3 style={{color: getSentimentColor(newsData.overallSentiment)}}>{newsData.overallSentiment}</h3>
                    </div>
                  </div>
                  <div className="overview-card">
                    <div className="card-icon">🎯</div>
                    <div className="card-content">
                      <label>Sentiment Score</label>
                      <h3>{(newsData.sentimentScore * 100).toFixed(0)}%</h3>
                      <div className="score-bar">
                        <div className="score-fill" style={{width: `${(newsData.sentimentScore * 100)}%`}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="filter-section">
                <label>Filter by Sentiment:</label>
                <div className="filter-buttons">
                  <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
                    All ({newsData.articles.length})
                  </button>
                  <button className={filter === 'Positive' ? 'active' : ''} onClick={() => setFilter('Positive')}>
                    Positive ({newsData.articles.filter(a => a.sentiment === 'Positive').length})
                  </button>
                  <button className={filter === 'Neutral' ? 'active' : ''} onClick={() => setFilter('Neutral')}>
                    Neutral ({newsData.articles.filter(a => a.sentiment === 'Neutral').length})
                  </button>
                  <button className={filter === 'Negative' ? 'active' : ''} onClick={() => setFilter('Negative')}>
                    Negative ({newsData.articles.filter(a => a.sentiment === 'Negative').length})
                  </button>
                </div>
              </div>

              <div className="news-articles">
                <h3>📄 News Articles</h3>
                {filteredArticles.map(article => (
                  <div key={article.id} className="news-card">
                    <div className="news-header">
                      <h4>{article.title}</h4>
                      <span className={`sentiment-badge ${article.sentiment.toLowerCase()}`}>
                        {article.sentiment === 'Positive' && '😊'}
                        {article.sentiment === 'Negative' && '😟'}
                        {article.sentiment === 'Neutral' && '😐'}
                        {article.sentiment} ({(article.score * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="news-meta">
                      <span className="source">📰 {article.source}</span>
                      <span className="time">🕐 {article.timestamp}</span>
                    </div>
                    <p className="news-summary">{article.summary}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {!newsData && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📰</div>
              <h3>No News Data</h3>
              <p>Select a stock and fetch the latest financial news to see sentiment analysis</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default NewsSentiment;
