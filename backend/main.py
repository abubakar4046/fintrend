"""
FastAPI Backend for Stock Prediction with LSTM Models
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
import sys


# Load local environment variables (optional) from backend/.env
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=False)
except Exception:
    # dotenv is optional; backend will still work if FINNHUB_API_KEY is exported in the shell
    pass

# Add the model path to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'FNSPID_Financial_News_Dataset-main', 'dataset_test'))

from services.model_service import ModelService
from services.data_service import DataService
from api.routes import predictions, stocks, health, news, fx

# Initialize FastAPI app
app = FastAPI(
    title="Stock Prediction API",
    description="API for stock price predictions using LSTM models with sentiment analysis",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3001",
        "https://fintrend-app.onrender.com",
        "https://fintrend-backend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(predictions.router, prefix="/api", tags=["Predictions"])
app.include_router(stocks.router, prefix="/api", tags=["Stocks"])
app.include_router(news.router, prefix="/api", tags=["News"])
app.include_router(fx.router, prefix="/api", tags=["FX"])

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("Initializing model and data services...")
    try:
        # Initialize services (they will be singleton instances)
        ModelService.get_instance()
        DataService.get_instance()
        print("Services initialized successfully")
    except Exception as e:
        print(f"Error initializing services: {e}")



if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,
        reload=True,
        log_level="info"
    )


