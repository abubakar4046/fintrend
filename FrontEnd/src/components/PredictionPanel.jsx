import React, { useState, useEffect } from 'react';
import { predictionAPI } from '../utils/api';
import { formatCurrency } from '../utils/helpers';

const PredictionPanel = ({ selectedStock }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generatePrediction = async () => {
    if (!selectedStock) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await predictionAPI.predict({
        symbol: selectedStock,
        model_type: 'LSTM',  // Default to LSTM for dashboard predictions
        sentiment_type: 'nonsentiment',
        num_csvs: 50,
        prediction_length: 3
      });
      
      // Calculate direction based on first prediction vs current price
      const currentPrice = result.current_price || 0;
      const firstPrediction = result.predictions[0] || currentPrice;
      const direction = firstPrediction > currentPrice ? 'UP' : 'DOWN';
      const changePercent = currentPrice > 0 
        ? ((firstPrediction - currentPrice) / currentPrice * 100).toFixed(2)
        : 0;
      
      // Calculate confidence based on prediction consistency
      const predictions = result.predictions;
      const avgPrediction = predictions.reduce((a, b) => a + b, 0) / predictions.length;
      const variance = predictions.reduce((sum, p) => sum + Math.pow(p - avgPrediction, 2), 0) / predictions.length;
      const confidence = Math.max(50, Math.min(95, 100 - (Math.sqrt(variance) / currentPrice * 100)));
      
      setPrediction({
        direction,
        confidence: confidence.toFixed(1),
        targetPrice: Number(firstPrediction || 0),
        changePercent: parseFloat(changePercent),
        currentPrice: Number(currentPrice || 0),
        predictions: result.predictions,
        modelInfo: result.model_info,
        factors: [
          { label: 'Model Type', value: result.model_info.model_type, type: 'neutral' },
          { label: 'Prediction Type', value: result.model_info.sentiment_type, type: 'neutral' },
          { label: 'Price Change', value: `${changePercent > 0 ? '+' : ''}${changePercent}%`, type: changePercent > 0 ? 'positive' : 'negative' },
          { label: 'Prediction Steps', value: `${result.predictions.length} steps`, type: 'neutral' }
        ]
      });
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err.message || 'Failed to generate prediction');
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-generate prediction when stock changes
    if (selectedStock) {
      generatePrediction();
    }
  }, [selectedStock]);

  return (
    <div className="prediction-panel">
      <div className="prediction-header">
        <h2 className="prediction-title">AI Prediction</h2>
        <p className="prediction-subtitle">Next 24-hour trend forecast</p>
      </div>

      {loading ? (
        <div className="prediction-result">
          <div className="spinner" style={{ margin: '32px auto' }}></div>
          <p>Analyzing market data with LSTM model...</p>
        </div>
      ) : error ? (
        <div className="prediction-result">
          <p style={{ color: '#f87171', marginBottom: '16px' }}>❌ {error}</p>
          <button className="btn btn-primary" onClick={generatePrediction}>
            🔄 Retry
          </button>
        </div>
      ) : prediction ? (
        <>
          <div className="prediction-result">
            <div className="prediction-direction">
              {prediction.direction === 'UP' ? '📈' : '📉'}
            </div>
            <div className={`prediction-text ${prediction.direction === 'UP' ? 'text-success' : 'text-danger'}`}>
              {prediction.direction === 'UP' ? 'BULLISH' : 'BEARISH'}
            </div>
            <div className="prediction-confidence">
              {prediction.confidence}% Confidence
            </div>
            <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: '600' }}>
              Target: {formatCurrency(prediction.targetPrice)}
            </div>
          </div>

          <div className="prediction-factors">
            <h3 className="factors-title">Key Factors</h3>
            {prediction.factors.map((factor, index) => (
              <div key={index} className="factor-item">
                <span className="factor-label">{factor.label}</span>
                <span className={`factor-value ${factor.type}`}>
                  {factor.value}
                </span>
              </div>
            ))}
          </div>

          <button 
            className="btn btn-primary" 
            onClick={generatePrediction}
            style={{ width: '100%', marginTop: '24px' }}
          >
            🔄 Refresh Prediction
          </button>
        </>
      ) : (
        <div className="prediction-result">
          <p>Click to generate prediction</p>
          <button className="btn btn-primary" onClick={generatePrediction}>
            Generate Prediction
          </button>
        </div>
      )}
    </div>
  );
};

export default PredictionPanel;