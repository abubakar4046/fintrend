import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ExportReport from '../components/ExportReport';
import StockSelector from '../components/StockSelector';
import authService from '../utils/authService';
import { predictionAPI, stockAPI } from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import '../styles/stockPrediction.css';

const StockPrediction = ({ setIsAuthenticated }) => {
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return window.innerWidth > 1024;
    } catch {
      return true;
    }
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('1D');
  const [modelType, setModelType] = useState('LSTM');
  const [error, setError] = useState(null);
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

  const getPredictionLengthForTimeframe = (tf, model) => {
    switch (tf) {
      case '1D':
        return 1;
      case '3D':
        return 3;
      case '1W':
        return 7;
      case '2W':
        return 14;
      case '1M':
        return 30;
      default:
        return 3;
    }
  };

  const computeSMA = (values, period) => {
    if (!values || values.length < period) return null;
    const slice = values.slice(-period);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    return avg;
  };

  const computeEMA = (values, period) => {
    if (!values || values.length < period) return null;
    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  };

  const computeRSI = (values, period = 14) => {
    if (!values || values.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let i = values.length - period; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const runPrediction = async () => {
    if (!selectedStock) return;
    setLoading(true);
    setError(null);
    setPredictionData(null);

    try {
      let prediction_length = getPredictionLengthForTimeframe(timeframe, modelType);

      // TimesNet and Transformer checkpoints in this project support up to 3 steps.
      if (modelType === 'TIMESNET') {
        prediction_length = 3;
      } else if (modelType === 'TRANSFORMER') {
        prediction_length = Math.min(3, Math.max(1, prediction_length));
      }

      // 0) Fetch latest price from same source as Dashboard (last row of CSV)
      const latestResp = await stockAPI.getLatestStockData(selectedStock);
      const latestRow = latestResp?.latest || null;
      const latestClose = latestRow ? Number(latestRow.Close ?? latestRow['Adj close'] ?? 0) : 0;

      // 1) Fetch prediction from backend (real model)
      const result = await predictionAPI.predict({
        symbol: selectedStock,
        model_type: modelType,
        sentiment_type: 'nonsentiment',
        num_csvs: 50,
        prediction_length
      });

      // Use latest close (Dashboard-consistent) as "current price" for display & change calculations.
      // The prediction endpoint's `current_price` is derived from the model's base series and can differ.
      const currentPrice = latestClose > 0 ? latestClose : Number(result.current_price || 0);
      const preds = Array.isArray(result.predictions) ? result.predictions.map(Number) : [];
      const firstPrediction = preds[0] ?? currentPrice;
      const lastPrediction = preds[preds.length - 1] ?? firstPrediction;

      const trend = firstPrediction > currentPrice ? 'Bullish' : 'Bearish';
      const changePercent = currentPrice > 0 ? ((firstPrediction - currentPrice) / currentPrice) * 100 : 0;

      // 2) Compute technical indicators from real historical data
      const hist = await stockAPI.getStockData(selectedStock, 250);
      const closes = (hist?.data || [])
        .map(d => Number(d.Close ?? d['Adj close'] ?? 0))
        .filter(v => Number.isFinite(v) && v > 0);

      const ma50 = computeSMA(closes, 50);
      const ma200 = computeSMA(closes, 200);
      const ema12 = computeEMA(closes, 12);
      const ema26 = computeEMA(closes, 26);
      const macd = ema12 != null && ema26 != null ? (ema12 - ema26) : null;
      const rsi = computeRSI(closes, 14);

      // 3) Confidence (same idea as Dashboard PredictionPanel)
      let confidence = 0;
      if (preds.length > 0 && currentPrice > 0) {
        const avg = preds.reduce((a, b) => a + b, 0) / preds.length;
        const variance = preds.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / preds.length;
        confidence = Math.max(50, Math.min(95, 100 - (Math.sqrt(variance) / currentPrice * 100)));
      } else {
        confidence = 50;
      }

      setPredictionData({
        // UI fields
        stock: result.symbol,
        currentPrice: currentPrice ? currentPrice.toFixed(2) : '0.00',
        predictedPrice: lastPrediction ? Number(lastPrediction).toFixed(2) : '0.00',
        confidence: Number(confidence).toFixed(1),
        trend,
        changePercent: Number(changePercent.toFixed(2)),
      modelUsed: modelType,
        timeframe,
      timestamp: new Date().toLocaleString(),
      technicalIndicators: {
          rsi: rsi != null ? Number(rsi).toFixed(1) : 'N/A',
          macd: macd != null ? Number(macd).toFixed(2) : 'N/A',
          movingAvg50: ma50 != null ? Number(ma50).toFixed(2) : 'N/A',
          movingAvg200: ma200 != null ? Number(ma200).toFixed(2) : 'N/A'
        },

        // Raw backend fields (so ExportReport/PDF can use them)
        current_price: Number(result.current_price || 0),
        latest_close: latestClose,
        predictions: preds,
        model_info: result.model_info
      });
    } catch (e) {
      console.error('Real prediction failed:', e);
      setError(e?.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        activePage="prediction"
      />
      
      <div className={`dashboard-main ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <Header 
          onLogout={handleLogout}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          currentUser={currentUser}
        />
        
        <div className="dashboard-content">
          <div className="page-header">
            <h1>📈 Stock Trend Forecasting</h1>
            <p>Predict short-term price movements using advanced deep learning models</p>
          </div>

          {/* Stock Search (same component as Dashboard) */}
          <StockSelector
            selectedStock={selectedStock}
            onStockSelect={setSelectedStock}
          />

          <div className="prediction-controls">
            <div className="control-row">
              <div className="control-group">
                <label>Model Type</label>
                <select value={modelType} onChange={(e) => setModelType(e.target.value)}>
                  <option value="LSTM">LSTM (Long Short-Term Memory)</option>
                  <option value="GRU">GRU (Gated Recurrent Unit)</option>
                  <option value="CNN">CNN (Convolutional Neural Network)</option>
                  <option value="RNN">RNN (Recurrent Neural Network)</option>
                  <option value="TIMESNET">TimesNet (PyTorch)</option>
                  <option value="TRANSFORMER">Transformer (PyTorch)</option>
                </select>
              </div>

              <div className="control-group">
                <label>Prediction Timeframe</label>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                  <option value="1D">1 Day</option>
                  <option value="3D">3 Days</option>
                  <option value="1W">1 Week</option>
                  <option value="2W">2 Weeks</option>
                  <option value="1M">1 Month</option>
                </select>
              </div>
            </div>

            <button className="run-prediction-btn" onClick={runPrediction} disabled={loading}>
              {loading ? '🔄 Running Prediction...' : '🚀 Run Prediction'}
            </button>
          </div>

          {error && !loading && (
            <div className="prediction-results" style={{ borderLeft: '4px solid #ef4444' }}>
              <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>❌ Prediction failed</h3>
              <p style={{ color: '#6b7280', margin: 0 }}>{error}</p>
            </div>
          )}

          {loading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Analyzing historical data and running {modelType} model...</p>
            </div>
          )}

          {predictionData && !loading && (
            <div className="prediction-results">
              <div className="result-header">
                <h2>Prediction Results for {predictionData.stock}</h2>
                <span className="timestamp">Generated: {predictionData.timestamp}</span>
              </div>

              <div className="results-grid">
                <div className="result-card primary">
                  <div className="card-icon">💰</div>
                  <div className="card-content">
                    <label>Current Price</label>
                    <h3>{formatCurrency(Number(predictionData.currentPrice || 0))}</h3>
                  </div>
                </div>

                <div className="result-card primary">
                  <div className="card-icon">🎯</div>
                  <div className="card-content">
                    <label>Predicted Price ({predictionData.timeframe})</label>
                    <h3>{formatCurrency(Number(predictionData.predictedPrice || 0))}</h3>
                  </div>
                </div>

                <div className={`result-card ${predictionData.trend === 'Bullish' ? 'bullish' : 'bearish'}`}>
                  <div className="card-icon">{predictionData.trend === 'Bullish' ? '📈' : '📉'}</div>
                  <div className="card-content">
                    <label>Trend Forecast</label>
                    <h3>{predictionData.trend}</h3>
                    <span className="change">{predictionData.changePercent > 0 ? '+' : ''}{predictionData.changePercent}%</span>
                  </div>
                </div>

                <div className="result-card">
                  <div className="card-icon">✅</div>
                  <div className="card-content">
                    <label>Model Confidence</label>
                    <h3>{predictionData.confidence}%</h3>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{width: `${predictionData.confidence}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="technical-indicators">
                <h3>📊 Technical Indicators</h3>
                <div className="indicators-grid">
                  <div className="indicator">
                    <label>RSI (Relative Strength Index)</label>
                    <div className="indicator-value">{predictionData.technicalIndicators.rsi}</div>
                    <div className="indicator-bar">
                      <div className="indicator-fill" style={{width: `${predictionData.technicalIndicators.rsi}%`}}></div>
                    </div>
                  </div>
                  <div className="indicator">
                    <label>MACD</label>
                    <div className="indicator-value">{predictionData.technicalIndicators.macd}</div>
                  </div>
                  <div className="indicator">
                    <label>50-Day Moving Average</label>
                    <div className="indicator-value">{formatCurrency(Number(predictionData.technicalIndicators.movingAvg50 || 0))}</div>
                  </div>
                  <div className="indicator">
                    <label>200-Day Moving Average</label>
                    <div className="indicator-value">{formatCurrency(Number(predictionData.technicalIndicators.movingAvg200 || 0))}</div>
                  </div>
                </div>
              </div>

              <div className="model-info">
                <h4>🤖 Model Information</h4>
                <p><strong>Model Type:</strong> {predictionData.modelUsed}</p>
                <p><strong>Training Data:</strong> Historical stock prices (5 years)</p>
                <p><strong>Features Used:</strong> Open, High, Low, Close, Volume, Technical Indicators</p>
              </div>

              <ExportReport 
                stockData={{
                  symbol: predictionData.stock,
                  price: predictionData.currentPrice,
                  change: predictionData.changePercent
                }}
                predictionData={predictionData}
                sentimentData={null}
              />
            </div>
          )}

          {!predictionData && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No Predictions Yet</h3>
              <p>Select a stock, choose your model, and run a prediction to see results</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default StockPrediction;
