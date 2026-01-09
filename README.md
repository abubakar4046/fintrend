# Stock Prediction Application

AI-powered stock price prediction system with sentiment analysis, featuring multiple deep learning models (LSTM, GRU, CNN, RNN).

## Project Structure

```
.
├── backend/              # FastAPI backend server
│   ├── api/             # API routes
│   ├── services/        # Business logic (models, data)
│   └── main.py          # Application entry point
├── FrontEnd/            # React frontend application
│   ├── src/            # Source code
│   │   ├── pages/      # Page components
│   │   ├── components/ # React components
│   │   ├── styles/     # CSS files
│   │   └── utils/      # Utilities (API client, auth)
│   └── public/         # Static files
└── FNSPID_Financial_News_Dataset-main/  # Dataset and trained models
    └── dataset_test/   # Trained models (LSTM, GRU, CNN, RNN)
```

## Features

- **Multiple Model Types**: LSTM, GRU, CNN, RNN models for stock prediction
- **Sentiment Analysis**: Both sentiment-aware and non-sentiment models
- **Real-time Predictions**: Get predictions for any supported stock
- **Historical Data**: View stock price history and charts
- **Dashboard**: Comprehensive dashboard with statistics and predictions
- **Model Selection**: Choose between different model types and configurations

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 16+ and npm
- Trained models in `FNSPID_Financial_News_Dataset-main/dataset_test/`

### Backend Setup

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Backend runs on: http://localhost:5000

### Frontend Setup

```powershell
cd FrontEnd
npm install
npm start
```

Frontend runs on: http://localhost:3000

## API Endpoints

### Health
- `GET /api/health` - Health check

### Stocks
- `GET /api/stocks` - List available stocks
- `GET /api/stocks/{symbol}` - Get historical stock data
- `GET /api/stocks/{symbol}/latest` - Get latest stock data

### Predictions
- `POST /api/predictions` - Generate stock predictions
  ```json
  {
    "symbol": "AAPL",
    "model_type": "LSTM",
    "sentiment_type": "nonsentiment",
    "num_csvs": 50,
    "prediction_length": 3
  }
  ```
- `GET /api/predictions/models` - List all available models

## Available Models

- **LSTM**: 6 models (nonsentiment/sentiment × 5/25/50 stocks)
- **GRU**: 6 models (nonsentiment/sentiment × 5/25/50 stocks)
- **CNN**: 6 models (nonsentiment/sentiment × 5/25/50 stocks)
- **RNN**: 6 models (nonsentiment/sentiment × 5/25/50 stocks)

**Total**: 24 trained models available

## Environment Variables

Create `.env` files:

**backend/.env** (optional, uses defaults):
```
# No environment variables required currently
```

**FrontEnd/.env**:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Documentation

- `backend/README.md` - Backend documentation
- `FrontEnd/README.md` - Frontend documentation
- `FNSPID_Financial_News_Dataset-main/README.md` - Dataset documentation

## License

See LICENSE files in respective directories.
