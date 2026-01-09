/**
 * API Client for communicating with the backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * Make an API request
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('API Request:', url, 'Options:', options.method || 'GET');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    
    // Check if response is ok before parsing JSON
    if (!response.ok) {
      let errorData = null;
      try {
        errorData = await response.json();
      } catch (e) {
        // If JSON parsing fails, use text
        const text = await response.text();
        throw new ApiError(
          `API error: ${response.status} ${response.statusText} - ${text}`,
          response.status,
          { message: text }
        );
      }
      throw new ApiError(
        errorData.detail || `API error: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // Parse JSON only if response is ok
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Log the full error for debugging
    console.error('API Request Error:', {
      url,
      error: error.message,
      stack: error.stack
    });
    throw new ApiError(
      `Network error: ${error.message}`,
      0,
      null
    );
  }
}

/**
 * Stock API functions
 */
export const stockAPI = {
  /**
   * Get list of available stocks
   */
  getAvailableStocks: async () => {
    return apiRequest('/stocks');
  },

  /**
   * Get historical stock data
   * @param {string} symbol - Stock symbol
   * @param {number} limit - Optional limit on number of records
   */
  getStockData: async (symbol, limit = null) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest(`/stocks/${symbol}${params}`);
  },

  /**
   * Get latest stock data point
   * @param {string} symbol - Stock symbol
   */
  getLatestStockData: async (symbol) => {
    return apiRequest(`/stocks/${symbol}/latest`);
  },
};

/**
 * Prediction API functions
 */
export const predictionAPI = {
  /**
   * Predict stock prices
   * @param {Object} params - Prediction parameters
   * @param {string} params.symbol - Stock symbol
   * @param {string} params.model_type - Model type: 'LSTM', 'GRU', 'CNN', or 'RNN'
   * @param {string} params.sentiment_type - 'sentiment' or 'nonsentiment'
   * @param {number} params.num_csvs - Number of CSV files used for training (5, 25, or 50)
   * @param {number} params.prediction_length - Number of steps to predict
   */
  predict: async ({ symbol, model_type = 'LSTM', sentiment_type = 'nonsentiment', num_csvs = 50, prediction_length = 3 }) => {
    return apiRequest('/predictions', {
      method: 'POST',
      body: {
        symbol,
        model_type,
        sentiment_type,
        num_csvs,
        prediction_length,
      },
    });
  },

  /**
   * Get available models
   */
  getAvailableModels: async () => {
    return apiRequest('/predictions/models');
  },
};

/**
 * News API functions
 */
export const newsAPI = {
  /**
   * Get latest news and computed sentiment for a stock (lightweight lexicon-based)
   * @param {string} symbol
   * @param {number} days - lookback window (1..30)
   * @param {number} limit - max articles (1..50)
   */
  getLatestNews: async (symbol, days = 7, limit = 15) => {
    return apiRequest(`/news/${symbol}?days=${days}&limit=${limit}`);
  },

  /**
   * Get latest news with FinBERT sentiment analysis
   * @param {string} symbol
   * @param {number} days - lookback window (1..30)
   * @param {number} limit - max articles (1..50)
   */
  getNewsWithFinBERT: async (symbol, days = 7, limit = 15) => {
    return apiRequest(`/news/${symbol}/finbert?days=${days}&limit=${limit}`);
  },

  /**
   * Check FinBERT model status
   */
  getFinBERTStatus: async () => {
    return apiRequest('/news/finbert/status');
  },
};

/**
 * FX API functions
 */
export const fxAPI = {
  getRate: async (base = 'USD', quote = 'USD') => {
    return apiRequest(`/fx/rate?base=${base}&quote=${quote}`);
  },
};

/**
 * Health check
 */
export const healthAPI = {
  check: async () => {
    return apiRequest('/health');
  },
};

export default {
  stockAPI,
  predictionAPI,
  newsAPI,
  fxAPI,
  healthAPI,
  ApiError,
};

