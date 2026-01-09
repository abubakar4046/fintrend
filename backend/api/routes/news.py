"""
News endpoints

Fetches real company news from Finnhub and computes sentiment scores.
Includes both lightweight lexicon-based and FinBERT-based sentiment analysis.

Setup:
  export FINNHUB_API_KEY="your_token"
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import os
import time
import requests
from datetime import datetime, timedelta, timezone

router = APIRouter()

# Flag to track if FinBERT is available
_finbert_available = None

# Simple in-memory cache to avoid hammering the API during development
_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL_SECONDS = 60


POS_WORDS = {
    "beat", "beats", "strong", "surge", "growth", "record", "profit", "profits", "up",
    "upgrade", "bullish", "outperform", "raise", "raises", "raised", "positive", "wins",
    "breakthrough", "rally", "rebound", "accelerate",
}
NEG_WORDS = {
    "miss", "misses", "weak", "drop", "drops", "fall", "falls", "down", "lawsuit", "probe",
    "downgrade", "bearish", "cut", "cuts", "cuts", "negative", "slump", "risk", "risks",
    "warning", "layoff", "layoffs", "decline", "halt",
}


def _sentiment_score(text: str) -> float:
    """
    Lightweight lexicon sentiment score mapped to [0..1].
    """
    t = (text or "").lower()
    tokens = [w.strip(".,:;!?()[]{}'\"") for w in t.split()]
    pos = sum(1 for w in tokens if w in POS_WORDS)
    neg = sum(1 for w in tokens if w in NEG_WORDS)
    raw = (pos - neg) / max(1, pos + neg)  # [-1..1]
    return (raw + 1) / 2  # [0..1]


def _sentiment_label(score01: float) -> str:
    if score01 >= 0.56:
        return "Positive"
    if score01 <= 0.44:
        return "Negative"
    return "Neutral"


def _relative_time(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    delta = now - dt
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} minutes ago" if minutes != 1 else "1 minute ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hours ago" if hours != 1 else "1 hour ago"
    days = hours // 24
    return f"{days} days ago" if days != 1 else "1 day ago"


@router.get("/news/{symbol}")
async def get_latest_news(
    symbol: str,
    days: int = Query(7, ge=1, le=30, description="Lookback window in days"),
    limit: int = Query(15, ge=1, le=50, description="Maximum number of articles"),
):
    """
    Fetch latest news for a stock symbol and compute sentiment scores.
    """
    token = os.getenv("FINNHUB_API_KEY")
    if not token:
        raise HTTPException(
            status_code=503,
            detail="FINNHUB_API_KEY is not set on the backend. Set it to enable real news fetching.",
        )

    symbol = symbol.upper()
    cache_key = f"{symbol}:{days}:{limit}"
    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"] < _CACHE_TTL_SECONDS):
        return cached["data"]

    to_dt = datetime.now(timezone.utc)
    from_dt = to_dt - timedelta(days=days)

    url = "https://finnhub.io/api/v1/company-news"
    params = {
        "symbol": symbol,
        "from": from_dt.strftime("%Y-%m-%d"),
        "to": to_dt.strftime("%Y-%m-%d"),
        "token": token,
    }

    # Finnhub can occasionally reset connections or rate-limit.
    # Retry a few times with small backoff for transient network issues.
    headers = {
        "Accept": "application/json",
        "User-Agent": "FinTrend/1.0 (+FastAPI)",
    }
    last_err: Optional[str] = None
    resp = None
    for attempt in range(1, 4):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=20)
            if resp.status_code == 429:
                # Rate limited
                raise HTTPException(status_code=502, detail="News provider rate limit reached. Please try again in a minute.")
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"News provider error: {resp.status_code} {resp.text}")
            items = resp.json()
            if not isinstance(items, list):
                raise HTTPException(status_code=502, detail="Unexpected response from news provider")
            break
        except HTTPException:
            raise
        except requests.exceptions.RequestException as e:
            # Connection reset / timeouts / transient network
            last_err = str(e)
            if attempt < 3:
                time.sleep(0.4 * attempt)
                continue
            raise HTTPException(
                status_code=502,
                detail=f"Failed to fetch news (network issue). Please try again. Details: {last_err}",
            )
        except Exception as e:
            last_err = str(e)
            raise HTTPException(status_code=502, detail=f"Failed to fetch news: {last_err}")

    items = items[:limit]
    articles = []
    scores = []
    for idx, it in enumerate(items):
        headline = it.get("headline") or ""
        summary = it.get("summary") or ""
        combined = f"{headline} {summary}".strip()
        score = float(_sentiment_score(combined))
        label = _sentiment_label(score)
        dt = datetime.fromtimestamp(int(it.get("datetime", 0)), tz=timezone.utc) if it.get("datetime") else to_dt
        scores.append(score)
        articles.append(
            {
                "id": it.get("id", idx + 1),
                "title": headline or "(No title)",
                "source": it.get("source", "Unknown"),
                "timestamp": _relative_time(dt),
                "sentiment": label,
                "score": score,  # [0..1]
                "summary": summary or "",
                "url": it.get("url"),
            }
        )

    avg_score = float(sum(scores) / max(1, len(scores))) if scores else 0.5
    overall = _sentiment_label(avg_score)

    data = {
        "stock": symbol,
        "totalArticles": len(articles),
        "overallSentiment": overall,
        "sentimentScore": avg_score,  # [0..1]
        "articles": articles,
    }

    _CACHE[cache_key] = {"ts": time.time(), "data": data}
    return data


def _check_finbert_available():
    """Check if FinBERT model is available."""
    global _finbert_available
    if _finbert_available is None:
        try:
            from services.finbert_service import get_model_status
            _finbert_available = True
        except ImportError:
            _finbert_available = False
    return _finbert_available


@router.get("/news/{symbol}/finbert")
async def get_news_with_finbert(
    symbol: str,
    days: int = Query(7, ge=1, le=30, description="Lookback window in days"),
    limit: int = Query(15, ge=1, le=50, description="Maximum number of articles"),
):
    """
    Fetch latest news for a stock symbol and compute sentiment using FinBERT.
    This endpoint uses the actual FinBERT transformer model for accurate sentiment analysis.
    """
    # First check if FinBERT is available
    if not _check_finbert_available():
        raise HTTPException(
            status_code=503,
            detail="FinBERT model is not available. Install transformers and torch packages."
        )
    
    # Import FinBERT service
    try:
        from services.finbert_service import analyze_texts_batch
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"FinBERT service error: {e}")
    
    token = os.getenv("FINNHUB_API_KEY")
    if not token:
        raise HTTPException(
            status_code=503,
            detail="FINNHUB_API_KEY is not set on the backend. Set it to enable real news fetching.",
        )

    symbol = symbol.upper()
    
    # Check cache for FinBERT results
    cache_key = f"finbert:{symbol}:{days}:{limit}"
    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"] < _CACHE_TTL_SECONDS):
        return cached["data"]

    to_dt = datetime.now(timezone.utc)
    from_dt = to_dt - timedelta(days=days)

    url = "https://finnhub.io/api/v1/company-news"
    params = {
        "symbol": symbol,
        "from": from_dt.strftime("%Y-%m-%d"),
        "to": to_dt.strftime("%Y-%m-%d"),
        "token": token,
    }

    headers = {
        "Accept": "application/json",
        "User-Agent": "FinTrend/1.0 (+FastAPI)",
    }
    
    last_err: Optional[str] = None
    resp = None
    items = []
    
    for attempt in range(1, 4):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=20)
            if resp.status_code == 429:
                raise HTTPException(status_code=502, detail="News provider rate limit reached. Please try again in a minute.")
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"News provider error: {resp.status_code} {resp.text}")
            items = resp.json()
            if not isinstance(items, list):
                raise HTTPException(status_code=502, detail="Unexpected response from news provider")
            break
        except HTTPException:
            raise
        except requests.exceptions.RequestException as e:
            last_err = str(e)
            if attempt < 3:
                time.sleep(0.4 * attempt)
                continue
            raise HTTPException(
                status_code=502,
                detail=f"Failed to fetch news (network issue). Please try again. Details: {last_err}",
            )
        except Exception as e:
            last_err = str(e)
            raise HTTPException(status_code=502, detail=f"Failed to fetch news: {last_err}")

    items = items[:limit]
    
    if not items:
        return {
            "stock": symbol,
            "totalArticles": 0,
            "overallSentiment": "Neutral",
            "sentimentScore": 0.5,
            "articles": [],
            "model": "FinBERT"
        }
    
    # Extract texts for FinBERT analysis
    texts = []
    for it in items:
        headline = it.get("headline") or ""
        summary = it.get("summary") or ""
        combined = f"{headline}. {summary}".strip()
        texts.append(combined if combined else "No content")
    
    # Analyze with FinBERT
    try:
        finbert_results = analyze_texts_batch(texts, batch_size=8)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FinBERT analysis failed: {e}")
    
    articles = []
    scores = []
    
    for idx, (it, fb_result) in enumerate(zip(items, finbert_results)):
        headline = it.get("headline") or ""
        summary = it.get("summary") or ""
        
        # Convert FinBERT label to our format (capitalize first letter)
        label = fb_result["label"].capitalize()
        # Convert score from [-1, 1] to [0, 1]
        score01 = (fb_result["score"] + 1) / 2
        
        dt = datetime.fromtimestamp(int(it.get("datetime", 0)), tz=timezone.utc) if it.get("datetime") else to_dt
        
        scores.append(score01)
        articles.append({
            "id": it.get("id", idx + 1),
            "title": headline or "(No title)",
            "source": it.get("source", "Unknown"),
            "timestamp": _relative_time(dt),
            "sentiment": label,
            "score": score01,
            "probabilities": fb_result["probabilities"],  # [neg, neu, pos]
            "summary": summary or "",
            "url": it.get("url"),
        })

    avg_score = float(sum(scores) / max(1, len(scores))) if scores else 0.5
    
    # Determine overall sentiment based on average score
    if avg_score >= 0.56:
        overall = "Positive"
    elif avg_score <= 0.44:
        overall = "Negative"
    else:
        overall = "Neutral"

    data = {
        "stock": symbol,
        "totalArticles": len(articles),
        "overallSentiment": overall,
        "sentimentScore": avg_score,
        "articles": articles,
        "model": "FinBERT"
    }

    _CACHE[cache_key] = {"ts": time.time(), "data": data}
    return data


@router.get("/news/finbert/status")
async def get_finbert_status():
    """Check if FinBERT model is available and its status."""
    try:
        from services.finbert_service import get_model_status
        status = get_model_status()
        return {"available": True, **status}
    except ImportError:
        return {"available": False, "error": "FinBERT service not installed"}
    except Exception as e:
        return {"available": False, "error": str(e)}
