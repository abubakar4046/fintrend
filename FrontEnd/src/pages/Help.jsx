import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import authService from '../utils/authService';
import '../styles/help.css';

const Help = ({ setIsAuthenticated }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return window.innerWidth > 1024;
    } catch {
      return true;
    }
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  React.useEffect(() => {
    const userData = authService.getCurrentUser();
    if (!userData) {
      setIsAuthenticated(false);
      navigate('/signin');
    } else {
      setCurrentUser(userData.user);
    }
  }, [setIsAuthenticated, navigate]);

  React.useEffect(() => {
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

  const faqCategories = [
    { id: 'all', name: 'All Topics', icon: '📚' },
    { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
    { id: 'predictions', name: 'Stock Predictions', icon: '📈' },
    { id: 'sentiment', name: 'Sentiment Analysis', icon: '📰' },
    { id: 'watchlist', name: 'Watchlist', icon: '⭐' },
    { id: 'alerts', name: 'Alerts', icon: '🔔' },
    { id: 'account', name: 'Account & Settings', icon: '⚙️' }
  ];

  const faqs = [
    {
      category: 'getting-started',
      question: 'How do I get started with FinTrend?',
      answer: 'After signing in, visit the Dashboard to see an overview. Select a stock to analyze, run predictions, and check sentiment analysis. Add stocks to your Watchlist for continuous monitoring.'
    },
    {
      category: 'getting-started',
      question: 'What data sources does FinTrend use?',
      answer: 'FinTrend integrates real-time stock market data from major exchanges and financial news from trusted sources. All data is processed through our AI models (FinBERT for sentiment, LSTM/GRU for predictions).'
    },
    {
      category: 'predictions',
      question: 'How accurate are the stock predictions?',
      answer: 'Our LSTM and GRU models are trained on 5+ years of historical data. Each prediction includes a confidence score. Higher confidence (>80%) indicates stronger signal, but no prediction is guaranteed. Always do your own research.'
    },
    {
      category: 'predictions',
      question: 'What do the technical indicators mean?',
      answer: 'RSI (Relative Strength Index) shows momentum - values above 70 suggest overbought, below 30 oversold. MACD shows trend direction. Moving averages smooth price data to identify trends. These help confirm predictions.'
    },
    {
      category: 'predictions',
      question: 'What\'s the difference between LSTM and GRU models?',
      answer: 'Both are deep learning models for time series. LSTM (Long Short-Term Memory) is more complex and captures long-term patterns. GRU (Gated Recurrent Unit) is faster and works well for shorter predictions. Try both to compare!'
    },
    {
      category: 'sentiment',
      question: 'How does sentiment analysis work?',
      answer: 'We use FinBERT, a specialized AI model trained on financial news. It analyzes article language to determine positive, negative, or neutral sentiment. Sentiment scores range from -1 (very negative) to +1 (very positive).'
    },
    {
      category: 'sentiment',
      question: 'How often is news data updated?',
      answer: 'News is fetched in real-time when you click "Fetch Latest News". You can configure auto-refresh intervals in Settings > API & Data. We recommend refreshing every 30-60 minutes during market hours.'
    },
    {
      category: 'watchlist',
      question: 'How many stocks can I add to my Watchlist?',
      answer: 'There\'s no limit! Add as many stocks as you want to monitor. Your watchlist is saved locally and persists between sessions. Use the Refresh button to update all prices at once.'
    },
    {
      category: 'watchlist',
      question: 'Can I export my Watchlist data?',
      answer: 'Yes! Visit any stock page and use the Export Report feature to download your watchlist data as CSV, PDF, or JSON. This includes prices, predictions, and sentiment scores.'
    },
    {
      category: 'alerts',
      question: 'How do I set up price alerts?',
      answer: 'Price alerts are automatically generated when significant changes occur. Configure your alert preferences in Settings > Notifications to choose which types of alerts you want to receive.'
    },
    {
      category: 'alerts',
      question: 'What triggers a sentiment alert?',
      answer: 'Sentiment alerts trigger when overall sentiment for a stock shifts significantly (e.g., from positive to negative) or when individual news articles show strong sentiment scores (>0.8 or <-0.8).'
    },
    {
      category: 'account',
      question: 'How do I change my password?',
      answer: 'Go to Settings > Security tab and click "Change Password". You\'ll need to enter your current password and new password twice for confirmation.'
    },
    {
      category: 'account',
      question: 'Can I use FinTrend on mobile devices?',
      answer: 'Yes! FinTrend is fully responsive and works on all devices - desktop, tablet, and mobile. All features are optimized for touch screens.'
    },
    {
      category: 'account',
      question: 'How do I configure API keys?',
      answer: 'Visit Settings > API & Data tab. Enter your News API key and Stock Data API key. These are optional but enable access to premium data sources. Keys are stored securely and never shared.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        activePage="help"
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
              <h1>❓ Help & Support</h1>
              <p>Find answers to common questions and learn how to use FinTrend</p>
            </div>
          </div>

          <div className="help-search">
            <input
              type="text"
              placeholder="🔍 Search for help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="help-categories">
            {faqCategories.map(category => (
              <button
                key={category.id}
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className="category-icon">{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          <div className="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              {filteredFaqs.map((faq, index) => (
                <details key={index} className="faq-item">
                  <summary className="faq-question">{faq.question}</summary>
                  <p className="faq-answer">{faq.answer}</p>
                </details>
              ))}
            </div>

            {filteredFaqs.length === 0 && (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try a different search term or browse all topics</p>
              </div>
            )}
          </div>

          <div className="quick-tips">
            <h2>💡 Quick Tips</h2>
            <div className="tips-list">
              <div className="tip-item">
                <span className="tip-icon">✨</span>
                <p><strong>Combine Analysis:</strong> Use both sentiment and prediction together for better insights</p>
              </div>
              <div className="tip-item">
                <span className="tip-icon">⏰</span>
                <p><strong>Market Hours:</strong> Best predictions during market hours (9:30 AM - 4:00 PM EST)</p>
              </div>
              <div className="tip-item">
                <span className="tip-icon">📊</span>
                <p><strong>Multiple Timeframes:</strong> Check predictions for different timeframes (1D, 1W, 1M)</p>
              </div>
              <div className="tip-item">
                <span className="tip-icon">🔔</span>
                <p><strong>Enable Alerts:</strong> Set up alerts to never miss important market movements</p>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Help;
