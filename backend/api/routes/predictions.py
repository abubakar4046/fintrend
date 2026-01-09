"""
Prediction endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
import sys
import os

# Add parent directories to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from services.model_service import ModelService
from services.torch_model_service import TimesNetService, TransformerService
from services.data_service import DataService

router = APIRouter()

class PredictionRequest(BaseModel):
    symbol: str
    model_type: Optional[str] = "LSTM"  # LSTM, GRU, CNN, RNN, TIMESNET, TRANSFORMER
    sentiment_type: Optional[str] = "nonsentiment"
    num_csvs: Optional[int] = 50
    prediction_length: Optional[int] = 3

class PredictionResponse(BaseModel):
    symbol: str
    predictions: List[float]
    current_price: Optional[float] = None
    prediction_type: str
    model_info: dict

@router.post("/predictions", response_model=PredictionResponse)
async def predict_stock(request: PredictionRequest):
    """
    Predict stock prices using LSTM models
    
    Args:
        request: Prediction request with symbol and options
    
    Returns:
        Prediction results
    """
    try:
        # Validate model_type
        if request.model_type not in ["LSTM", "GRU", "CNN", "RNN", "TIMESNET", "TRANSFORMER"]:
            raise HTTPException(
                status_code=400,
                detail="model_type must be 'LSTM', 'GRU', 'CNN', 'RNN', 'TIMESNET', or 'TRANSFORMER'"
            )
        
        # Validate sentiment_type
        if request.sentiment_type not in ["sentiment", "nonsentiment"]:
            raise HTTPException(
                status_code=400,
                detail="sentiment_type must be 'sentiment' or 'nonsentiment'"
            )
        
        # Torch models (TimesNet / Transformer) use a different inference pipeline.
        if request.model_type in ["TIMESNET", "TRANSFORMER"]:
            try:
                if request.model_type == "TIMESNET" and request.prediction_length != 3:
                    raise HTTPException(
                        status_code=400,
                        detail="TIMESNET only supports prediction_length=3 with the provided saved models"
                    )
                if request.model_type == "TRANSFORMER" and (request.prediction_length < 1 or request.prediction_length > 3):
                    raise HTTPException(
                        status_code=400,
                        detail="TRANSFORMER supports prediction_length 1..3 in this backend integration"
                    )

                if request.model_type == "TIMESNET":
                    out = TimesNetService.get_instance().predict(
                        request.symbol,
                        request.sentiment_type,
                        request.num_csvs,
                        request.prediction_length,
                    )
                else:
                    out = TransformerService.get_instance().predict(
                        request.symbol,
                        request.sentiment_type,
                        request.num_csvs,
                        request.prediction_length,
                    )

                return PredictionResponse(
                    symbol=request.symbol.upper(),
                    predictions=out.predictions,
                    current_price=out.current_price,
                    prediction_type=request.sentiment_type,
                    model_info=out.model_info,
                )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error making prediction: {str(e)}")

        # Keras/TensorFlow models
        model_service = ModelService.get_instance()
        data_service = DataService.get_instance()
        
        # Prepare data - use the model type to get correct config
        data_result = data_service.prepare_prediction_data(
            request.symbol,
            request.sentiment_type,
            use_recent=True,
            model_type=request.model_type
        )
        
        if data_result is None:
            raise HTTPException(
                status_code=404,
                detail=f"Stock data not found for symbol: {request.symbol}"
            )
        
        x_test, y_test, y_base = data_result
        
        # Make predictions
        predictions = model_service.predict(
            x_test,
            model_type=request.model_type,
            sentiment_type=request.sentiment_type,
            num_csvs=request.num_csvs,
            prediction_length=request.prediction_length
        )
        
        # Flatten predictions
        predictions_flat = []
        if predictions:
            for pred_seq in predictions:
                predictions_flat.extend(pred_seq)
        
        # Get current price from the base data
        current_price = None
        if len(y_base) > 0:
            current_price = float(y_base[-1, 0])
        
        # Denormalize predictions (convert back to original scale)
        # Predictions are normalized: (price/base - 1), so reverse: (pred + 1) * base
        if current_price and predictions_flat:
            denormalized_predictions = [(pred + 1) * current_price for pred in predictions_flat[:request.prediction_length]]
        else:
            denormalized_predictions = predictions_flat[:request.prediction_length]
        
        # Get model config
        config = model_service.get_config(request.model_type, request.sentiment_type)
        
        return PredictionResponse(
            symbol=request.symbol.upper(),
            predictions=denormalized_predictions,
            current_price=current_price,
            prediction_type=request.sentiment_type,
            model_info={
                "model_type": request.model_type,
                "sentiment_type": request.sentiment_type,
                "num_csvs": request.num_csvs,
                "sequence_length": config.get('data', {}).get('sequence_length', 50),
                "prediction_length": request.prediction_length
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error making prediction: {str(e)}"
        )

@router.get("/predictions/models")
async def get_available_models():
    """Get list of all available models"""
    model_service = ModelService.get_instance()
    
    # Get all available models from the service
    available_models_dict = model_service.list_available_models()
    
    models = []
    for model_type, model_list in available_models_dict.items():
        for model_info in model_list:
            config = model_service.get_config(model_type, model_info['sentiment_type'])
            
            models.append({
                "model_type": model_type,
                "sentiment_type": model_info['sentiment_type'],
                "num_csvs": model_info['num_csvs'],
                "key": model_info['key'],
                "filename": model_info['filename'],
                "config": {
                    "sequence_length": config.get('data', {}).get('sequence_length', 50),
                    "prediction_length": config.get('data', {}).get('prediction_length', 3),
                    "features": config.get('data', {}).get('columns', [])
                }
            })
    
    return {
        "models": models,
        "count": len(models),
        "model_types": list(available_models_dict.keys())
    }

