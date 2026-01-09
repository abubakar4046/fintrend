"""
FX endpoints (currency conversion)

Uses Frankfurter (no API key): https://www.frankfurter.app/
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any
import time
import requests

router = APIRouter()

_CACHE: Dict[str, Dict[str, Any]] = {}
_TTL_SECONDS = 60 * 60  # 1 hour


@router.get("/fx/rate")
async def get_fx_rate(
    base: str = Query("USD", min_length=3, max_length=3),
    quote: str = Query("USD", min_length=3, max_length=3),
):
    base = base.upper()
    quote = quote.upper()
    if base == quote:
        return {"base": base, "quote": quote, "rate": 1.0, "source": "static"}

    key = f"{base}_{quote}"
    cached = _CACHE.get(key)
    if cached and (time.time() - cached["ts"] < _TTL_SECONDS):
        return cached["data"]

    try:
        # Use the API host (the www host may serve a static site)
        url = "https://api.frankfurter.app/latest"
        resp = requests.get(url, params={"from": base, "to": quote}, timeout=15)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"FX provider error: {resp.status_code} {resp.text}")
        payload = resp.json()
        rates = payload.get("rates") or {}
        rate = rates.get(quote)
        if rate is None:
            raise HTTPException(status_code=502, detail="FX provider returned no rate")
        data = {"base": base, "quote": quote, "rate": float(rate), "source": "frankfurter", "date": payload.get("date")}
        _CACHE[key] = {"ts": time.time(), "data": data}
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch FX rate: {str(e)}")


