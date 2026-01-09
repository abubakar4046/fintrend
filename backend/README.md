# Stock Prediction API Backend

FastAPI backend for stock price predictions using LSTM models with sentiment analysis.

## Features

- **LSTM Model Integration**: Load and use pre-trained LSTM models (sentiment and non-sentiment)
- **Stock Data Management**: Access historical stock data from the FNSPID dataset
- **RESTful API**: Clean REST API endpoints for predictions and stock data
- **CORS Enabled**: Configured for React frontend integration

## Installation

1. **Create a virtual environment** (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

## Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── services/
│   ├── model_service.py   # Model loading and prediction service
│   └── data_service.py    # Stock data loading and preprocessing
└── api/
    └── routes/
        ├── health.py      # Health check endpoints
        ├── predictions.py # Prediction endpoints
        └── stocks.py      # Stock data endpoints
```

## Running the Server

### Development Mode
```bash
cd backend
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

The API will be available at:
- API: `http://localhost:5000`
- API Documentation: `http://localhost:5000/docs`
- Alternative Docs: `http://localhost:5000/redoc`

## API Endpoints

### Health Check
- `GET /api/health` - Check API health status

### Stocks
- `GET /api/stocks` - Get list of available stock symbols
- `GET /api/stocks/{symbol}` - Get historical data for a stock
- `GET /api/stocks/{symbol}/latest` - Get latest data point for a stock

### Predictions
- `POST /api/predictions` - Generate stock price predictions
  ```json
  {
    "symbol": "AAPL",
    "sentiment_type": "nonsentiment",
    "num_csvs": 50,
    "prediction_length": 3
  }
  ```
- `GET /api/predictions/models` - Get list of available models

## Model Configuration

The backend uses models from:
- Path: `FNSPID_Financial_News_Dataset-main/dataset_test/LSTM-for-Time-Series-Prediction/`

Available model configurations:
- **Sentiment Type**: `sentiment` or `nonsentiment`
- **Training Size**: `5`, `25`, or `50` CSV files
- **Sequence Length**: 50 (default)
- **Prediction Length**: 3 (default, configurable)

## Example API Calls

### Get Available Stocks
```bash
curl http://localhost:5000/api/stocks
```

### Get Stock Data
```bash
curl http://localhost:5000/api/stocks/AAPL?limit=100
```

### Make a Prediction
```bash
curl -X POST http://localhost:5000/api/predictions \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "sentiment_type": "nonsentiment",
    "num_csvs": 50,
    "prediction_length": 3
  }'
```

## Environment Variables

- `REACT_APP_API_URL` - Frontend API URL (default: `http://localhost:5000/api`)

## Requirements

- Python 3.8+
- TensorFlow 2.15.0
- Keras 2.15.0
- FastAPI 0.104.1
- See `requirements.txt` for full list

## Notes

- Models are loaded lazily (on first use)
- Models are cached in memory for faster subsequent predictions
- Stock data is loaded from CSV files in the dataset
- Predictions use normalized data and are denormalized before returning

## Troubleshooting

1. **Model not found**: Ensure the model files exist in `saved_models/` directory
2. **Stock data not found**: Check that the stock symbol matches a CSV file in the `data/` directory
3. **Import errors**: Make sure all paths are correct relative to the backend directory
4. **CORS errors**: Verify CORS origins in `main.py` match your frontend URL

## License

See the main project license.


