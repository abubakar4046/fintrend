"""
FinBERT Sentiment Analysis Service

Loads the pre-trained FinBERT model and provides sentiment analysis for financial text.
"""

import os
import torch
from typing import List, Dict, Tuple, Optional

# Global model instance (lazy loaded)
_model = None
_tokenizer = None
_device = None
_labels = ["negative", "neutral", "positive"]


def _get_device():
    """Get the best available device."""
    global _device
    if _device is None:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return _device


def _load_model():
    """Lazy-load the FinBERT model."""
    global _model, _tokenizer
    
    if _model is not None and _tokenizer is not None:
        return _model, _tokenizer
    
    print("Loading FinBERT model...")
    
    try:
        from transformers import BertTokenizer, BertForSequenceClassification
        
        MODEL_NAME = "yiyanghkust/finbert-tone"
        
        _tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
        _model = BertForSequenceClassification.from_pretrained(MODEL_NAME)
        
        device = _get_device()
        _model.to(device)
        _model.eval()
        
        print(f"✅ FinBERT model loaded successfully on {device}")
        return _model, _tokenizer
        
    except Exception as e:
        print(f"❌ Failed to load FinBERT model: {e}")
        raise RuntimeError(f"Failed to load FinBERT model: {e}")


def analyze_text(text: str) -> Tuple[str, float, List[float]]:
    """
    Analyze sentiment of a single text.
    
    Returns:
        Tuple of (label, score, probabilities)
        - label: "positive", "neutral", or "negative"
        - score: sentiment score (-1 to 1, where 1 is most positive)
        - probabilities: [negative_prob, neutral_prob, positive_prob]
    """
    model, tokenizer = _load_model()
    device = _get_device()
    
    # Tokenize
    inputs = tokenizer(
        text,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=512
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    # Get prediction
    with torch.no_grad():
        outputs = model(**inputs)
    
    probs = torch.softmax(outputs.logits, dim=1)[0]
    probs_list = probs.tolist()
    
    # Get label (index of max probability)
    sentiment_idx = torch.argmax(probs).item()
    label = _labels[sentiment_idx]
    
    # Calculate sentiment score: positive - negative (range: -1 to 1)
    sentiment_score = probs_list[2] - probs_list[0]
    
    return label, sentiment_score, probs_list


def analyze_texts_batch(texts: List[str], batch_size: int = 8) -> List[Dict]:
    """
    Analyze sentiment of multiple texts in batches.
    
    Returns:
        List of dicts with keys: label, score, probabilities
    """
    model, tokenizer = _load_model()
    device = _get_device()
    
    results = []
    
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        
        # Tokenize batch
        inputs = tokenizer(
            batch_texts,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Get predictions
        with torch.no_grad():
            outputs = model(**inputs)
        
        probs = torch.softmax(outputs.logits, dim=1)
        
        for p in probs:
            probs_list = p.tolist()
            sentiment_idx = torch.argmax(p).item()
            label = _labels[sentiment_idx]
            sentiment_score = probs_list[2] - probs_list[0]
            
            results.append({
                "label": label,
                "score": sentiment_score,
                "probabilities": probs_list
            })
    
    return results


def get_model_status() -> Dict:
    """Check if the model is loaded and ready."""
    global _model, _tokenizer
    
    return {
        "loaded": _model is not None and _tokenizer is not None,
        "device": str(_get_device()) if _device else "not initialized",
        "model_name": "yiyanghkust/finbert-tone"
    }


def preload_model():
    """Preload the model (call this during app startup if desired)."""
    try:
        _load_model()
        return True
    except Exception:
        return False

