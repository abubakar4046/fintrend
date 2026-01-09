import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import authService from '../utils/authService';
import '../styles/about.css';

const About = ({ setIsAuthenticated }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return window.innerWidth > 1024;
    } catch {
      return true;
    }
  });
  const [currentUser, setCurrentUser] = useState(null);
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

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        activePage="about"
      />
      
      <div className={`dashboard-main ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <Header 
          onLogout={handleLogout}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          currentUser={currentUser}
        />
        
        <div className="dashboard-content">
          <div className="about-hero">
            <h1>About FinTrend</h1>
            <p className="hero-tagline">Stock dashboard, news sentiment, and AI-based price prediction</p>
          </div>

          <div className="about-section">
            <div className="section-content">
              <h2>Our Mission</h2>
              <p>
                FinTrend is a web application that brings stock data, technical indicators, market news sentiment,
                and multiple prediction models into a single dashboard. The goal is to make it easy to explore a stock,
                understand recent movement, and compare model outputs in one place.
              </p>
            </div>
          </div>

          <div className="about-section">
            <div className="section-content">
              <h2>What This Project Does</h2>
              <p>
                FinTrend combines three core capabilities:
              </p>
              <div className="features-list">
                <div className="feature-item">
                  <div className="feature-icon">📰</div>
                  <div className="feature-content">
                    <h3>News + Sentiment</h3>
                    <p>
                      Fetches the latest company news (when a news provider key is configured) and computes an overall
                      sentiment label/score for quick context.
                    </p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">📈</div>
                  <div className="feature-content">
                    <h3>Price Prediction</h3>
                    <p>
                      Supports multiple model families for forecasting (LSTM, GRU, CNN, RNN, TimesNet, Transformer) and shows
                      prediction results alongside indicators like RSI, MACD, and moving averages.
                    </p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">📊</div>
                  <div className="feature-content">
                    <h3>Dashboard + Tracking</h3>
                    <p>
                      Interactive charts, watchlist management, alerts, and exportable reports (PDF) to support analysis and
                      documentation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="about-section tech-section">
            <div className="section-content">
              <h2>Technology Stack</h2>
              <div className="tech-grid">
                <div className="tech-card">
                  <div className="tech-icon">⚛️</div>
                  <h3>React</h3>
                  <p>Frontend UI and interactive charts</p>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">🔮</div>
                  <h3>TensorFlow/Keras</h3>
                  <p>LSTM, GRU, CNN, and RNN model inference</p>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">🧩</div>
                  <h3>FastAPI</h3>
                  <p>Backend APIs for stocks, predictions, news, and FX</p>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">🔥</div>
                  <h3>PyTorch</h3>
                  <p>TimesNet and Transformer model inference</p>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">📄</div>
                  <h3>jsPDF</h3>
                  <p>Client-side PDF export for reports</p>
                </div>
              </div>
            </div>
          </div>

          <div className="about-section">
            <div className="section-content">
              <h2>Who This Is For</h2>
              <div className="users-grid">
                <div className="user-card">
                  <h3>Students & Researchers</h3>
                  <p>Explore how time-series models and sentiment signals relate to market movement.</p>
                </div>
                <div className="user-card">
                  <h3>Learners</h3>
                  <p>Understand indicators, model outputs, and visualization patterns in one UI.</p>
                </div>
                <div className="user-card">
                  <h3>Demo Users</h3>
                  <p>Try predictions, alerts, watchlists, and exports as a complete workflow.</p>
                </div>
                <div className="user-card">
                  <h3>Anyone Tracking Stocks</h3>
                  <p>Search symbols, view trends, and keep a personal watchlist.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="about-section">
            <div className="section-content">
              <h2>Key Features</h2>
              <div className="key-features">
                <div className="key-feature">
                  <span className="key-icon">✅</span>
                  <span>Stock search and dashboard that updates by symbol</span>
                </div>
                <div className="key-feature">
                  <span className="key-icon">✅</span>
                  <span>Prediction page with multiple models (LSTM/GRU/CNN/RNN/TimesNet/Transformer)</span>
                </div>
                <div className="key-feature">
                  <span className="key-icon">✅</span>
                  <span>Technical indicators (RSI, MACD, Moving Averages)</span>
                </div>
                <div className="key-feature">
                  <span className="key-icon">✅</span>
                  <span>Customizable watchlists for portfolio tracking</span>
                </div>
                <div className="key-feature">
                  <span className="key-icon">✅</span>
                  <span>Alerts based on watchlist + settings toggles</span>
                </div>
                <div className="key-feature">
                  <span className="key-icon">✅</span>
                  <span>Interactive charts and visualizations</span>
                </div>
                <div className="key-feature">
                  <span className="key-icon">✅</span>
                  <span>PDF export for reports (snapshot, recent prices, predictions, news sentiment)</span>
                </div>
                <div className="key-feature">
                  <span className="key-icon">✅</span>
                  <span>Settings: theme, chart type, and currency display</span>
                </div>
              </div>
            </div>
          </div>

          <div className="about-section disclaimer-section">
            <div className="section-content">
              <h2>Important Notes</h2>
              <div className="disclaimer-box">
                <p>
                  <strong>This project is for research and educational use, not financial advice.</strong> Predictions are model outputs
                  and should not be treated as guaranteed outcomes.
                </p>
                <p>
                  Stock prices and news depend on the configured data sources. If an external API is not configured, some features may use the
                  available local dataset instead.
                </p>
              </div>
            </div>
          </div>

          <div className="about-section">
            <div className="section-content">
              <h2>Project Details</h2>
              <div className="contact-info">
                <div className="contact-item">
                  <span className="contact-icon">🧱</span>
                  <span>Frontend: React (Dashboard, Prediction, News, Watchlist, Alerts, Settings)</span>
                </div>
                <div className="contact-item">
                  <span className="contact-icon">🧩</span>
                  <span>Backend: FastAPI (stocks, predictions, news, FX conversion)</span>
                </div>
                <div className="contact-item">
                  <span className="contact-icon">📰</span>
                  <span>News: provider API (requires a configured API key)</span>
                </div>
                <div className="contact-item">
                  <span className="contact-icon">📄</span>
                  <span>Reports: PDF export via jsPDF</span>
                </div>
              </div>
            </div>
          </div>

          <div className="about-cta">
            <h2>Ready to Get Started?</h2>
            <p>Explore the power of AI-driven market intelligence</p>
            <button className="cta-btn" onClick={() => navigate('/dashboard')}>
              Go to Dashboard →
            </button>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default About;
