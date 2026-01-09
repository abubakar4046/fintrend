"""
Stock data endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import sys
import os

# Add parent directories to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from services.data_service import DataService

router = APIRouter()

@router.get("/stocks")
async def get_available_stocks():
    """Get list of available stock symbols"""
    try:
        data_service = DataService.get_instance()
        stocks = data_service.get_available_stocks()
        return {
            "stocks": stocks,
            "count": len(stocks)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stocks: {str(e)}"
        )

@router.get("/stocks/{symbol}")
async def get_stock_data(
    symbol: str,
    limit: Optional[int] = Query(None, description="Maximum number of records to return")
):
    """
    Get historical stock data for a symbol
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL')
        limit: Maximum number of records to return
    
    Returns:
        Historical stock data
    """
    try:
        data_service = DataService.get_instance()
        data = data_service.get_historical_data(symbol, limit)
        
        if data is None:
            raise HTTPException(
                status_code=404,
                detail=f"Stock data not found for symbol: {symbol}"
            )
        
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stock data: {str(e)}"
        )

@router.get("/stocks/{symbol}/latest")
async def get_latest_stock_data(symbol: str):
    """Get the latest stock data point for a symbol"""
    try:
        data_service = DataService.get_instance()
        df = data_service.load_stock_data(symbol)
        
        if df is None or len(df) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Stock data not found for symbol: {symbol}"
            )
        
        # Get the latest row (last row in DataFrame)
        latest_row = df.iloc[-1].to_dict()
        
        # Convert to JSON-serializable format
        import pandas as pd
        import numpy as np
        for key, value in latest_row.items():
            if pd.isna(value):
                latest_row[key] = None
            elif isinstance(value, (np.integer, np.floating)):
                latest_row[key] = float(value)
            elif pd.api.types.is_datetime64_any_dtype(type(value)):
                latest_row[key] = str(value)
        
        return {
            "symbol": symbol.upper(),
            "latest": latest_row
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching latest stock data: {str(e)}"
        )

