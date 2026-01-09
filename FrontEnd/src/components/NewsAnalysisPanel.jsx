import React, { useState, useEffect } from 'react';
import '../styles/newsAnalysis.css';

const NewsAnalysisPanel = ({ selectedStock }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newsData, setNewsData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (selectedStock) {
      setNewsData(null);
      setError(null);
    }
  }, [selectedStock]);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock: 85% chance of success
      const newsAvailable = Math.random() > 0.15;

      if (!newsAvailable) {
        throw new Error('Unable to fetch news from API');
      }

      // Mock news articles
      const mockNews = generateMockNews(selectedStock);
      setNewsData(mockNews);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeSentiment = async () => {
    setAnalyzing(true);
    
    // Simulate FinBERT sentiment analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add sentiment scores to news
    const analyzedNews = newsData.articles.map(article => ({
      ...article,
      sentimentAnalyzed: true,
      sentimentScore: article.sentiment === 'Positive' ? 
        (Math.random() * 0.3 + 0.7).toFixed(2) :
        article.sentiment === 'Negative' ?
        (Math.random() * 0.3 + 0.1).toFixed(2) :
        (Math.random() * 0.2 + 0.4).toFixed(2)
    }));

    setNewsData({
      ...newsData,
      articles: analyzedNews,
      analyzed: true
    });
    
    setAnalyzing(false);
  };

  const generateMockNews = (stock) => {
    const sentiments = ['Positive', 'Negative', 'Neutral'];
    const sources = ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'Financial Times'];
    
    const articles = Array.from({ length: 8 }, (_, i) => {
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      return {
        id: i + 1,
        title: generateNewsTitle(stock, sentiment),
        source: sources[Math.floor(Math.random() * sources.length)],
        time: `${Math.floor(Math.random() * 12) + 1} hours ago`,
        sentiment: sentiment,
        sentimentAnalyzed: false
      };
    });

    const sentimentCounts = {
      Positive: articles.filter(a => a.sentiment === 'Positive').length,
      Negative: articles.filter(a => a.sentiment === 'Negative').length,
      Neutral: articles.filter(a => a.sentiment === 'Neutral').length
    };

    const overallScore = ((sentimentCounts.Positive * 1 + sentimentCounts.Neutral * 0.5) / articles.length * 100).toFixed(0);

    return {
      stock,
      totalArticles: articles.length,
      fetchedAt: new Date().toLocaleString(),
      articles,
      sentimentCounts,
      overallScore,
      analyzed: false
    };
  };

  const generateNewsTitle = (stock, sentiment) => {
    const positive = [
      `${stock} Reports Strong Quarterly Earnings, Beats Expectations`,
      `Analysts Upgrade ${stock} with Bullish Price Target`,
      `${stock} Announces Major Innovation, Stock Surges`,
      `${stock} Receives Positive Outlook from Industry Experts`
    ];
    
    const negative = [
      `${stock} Faces Regulatory Challenges, Stock Dips`,
      `Analysts Downgrade ${stock} Amid Market Concerns`,
      `${stock} Reports Lower-than-Expected Revenue`,
      `${stock} Under Pressure as Competition Intensifies`
    ];
    
    const neutral = [
      `${stock} Maintains Steady Performance in Q3`,
      `Market Analysis: ${stock} Outlook Remains Stable`,
      `${stock} Announces Routine Board Meeting`,
      `Industry Report Mentions ${stock} in Sector Review`
    ];

    const titles = sentiment === 'Positive' ? positive : 
                   sentiment === 'Negative' ? negative : neutral;
    
    return titles[Math.floor(Math.random() * titles.length)];
  };

  if (!selectedStock) {
    return (
      <div className="news-analysis-container">
        <div className="empty-news-state">
          <div className="empty-news-icon">📰</div>
          <p className="empty-news-text">Select a stock to analyze news sentiment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="news-analysis-container">
      <div className="news-header">
        <div className="news-header-left">
          <h2 className="news-title">📰 News Sentiment Analysis</h2>
          <p className="news-subtitle">Powered by FinBERT AI Model</p>
        </div>
        <div className="news-header-right">
          {!newsData && !loading && !error && (
            <button className="fetch-news-btn" onClick={fetchNews}>
              🔍 Fetch Latest News
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="news-loading-state">
          <div className="news-loading-spinner"></div>
          <p className="news-loading-text">Fetching latest financial news...</p>
          <p className="news-loading-subtext">Scanning {selectedStock} articles from multiple sources</p>
        </div>
      )}

      {error && (
        <div className="news-error-state">
          <div className="news-error-icon">⚠️</div>
          <h3 className="news-error-title">Unable to Fetch News</h3>
          <p className="news-error-message">{error}</p>
          <p className="news-error-hint">The news API might be temporarily unavailable. Please try again later.</p>
          <button className="retry-news-btn" onClick={fetchNews}>
            🔄 Retry
          </button>
        </div>
      )}

      {newsData && (
        <>
          <div className="news-summary-section">
            <div className="summary-card">
              <span className="summary-label">Total Articles</span>
              <span className="summary-value">{newsData.totalArticles}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Positive</span>
              <span className="summary-value positive">{newsData.sentimentCounts.Positive}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Negative</span>
              <span className="summary-value negative">{newsData.sentimentCounts.Negative}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Neutral</span>
              <span className="summary-value neutral">{newsData.sentimentCounts.Neutral}</span>
            </div>
            <div className="summary-card overall">
              <span className="summary-label">Overall Score</span>
              <span className="summary-value">{newsData.overallScore}%</span>
            </div>
          </div>

          {!newsData.analyzed && (
            <div className="analyze-section">
              <button 
                className="analyze-btn"
                onClick={analyzeSentiment}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <div className="btn-spinner"></div>
                    Running FinBERT Analysis...
                  </>
                ) : (
                  <>
                    🤖 Analyze News with FinBERT
                  </>
                )}
              </button>
            </div>
          )}

          <div className="news-articles-list">
            {newsData.articles.map(article => (
              <div key={article.id} className="news-article-card">
                <div className="article-header-row">
                  <span className={`sentiment-badge sentiment-${article.sentiment.toLowerCase()}`}>
                    {article.sentiment}
                    {article.sentimentAnalyzed && (
                      <span className="sentiment-score">({article.sentimentScore})</span>
                    )}
                  </span>
                  <span className="article-time">{article.time}</span>
                </div>
                <h3 className="article-title">{article.title}</h3>
                <div className="article-footer">
                  <span className="article-source">📌 {article.source}</span>
                  {article.sentimentAnalyzed && (
                    <span className="analyzed-badge">✓ Analyzed</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="news-actions">
            <button className="refresh-news-btn" onClick={fetchNews}>
              🔄 Refresh News
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default NewsAnalysisPanel;