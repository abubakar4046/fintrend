"""
PyTorch model services for TimesNet and Transformer models.

These models are stored as `.pt` state_dict files in:
- FNSPID_Financial_News_Dataset-main/dataset_test/TimesNet-for-Time-Series-Prediction/model_saved/
- FNSPID_Financial_News_Dataset-main/dataset_test/Transformer-for-Time-Series-Prediction/model_saved/

We implement lightweight inference-only loading and prediction, with caching.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

from .utils import get_base_dir
from .data_service import DataService


def _device():
    import torch
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _ensure_col(df: pd.DataFrame, col: str, default: float = 0.0) -> pd.DataFrame:
    if col not in df.columns:
        df = df.copy()
        df[col] = default
    return df


def _split_and_scale(raw: np.ndarray, split_ratio: float = 0.85) -> Tuple[np.ndarray, MinMaxScaler]:
    split_idx = int(split_ratio * len(raw))
    raw_train = raw[:split_idx]
    scaler = MinMaxScaler().fit(raw_train)
    scaled = scaler.transform(raw)
    return scaled, scaler


@dataclass(frozen=True)
class TorchPrediction:
    predictions: List[float]
    current_price: Optional[float]
    model_info: Dict


class TimesNetService:
    _instance: Optional["TimesNetService"] = None

    def __init__(self) -> None:
        self.base_dir = get_base_dir()
        self.model_dir = os.path.join(
            self.base_dir,
            "FNSPID_Financial_News_Dataset-main",
            "dataset_test",
            "TimesNet-for-Time-Series-Prediction",
            "model_saved",
        )
        self._cache: Dict[str, object] = {}

    @classmethod
    def get_instance(cls) -> "TimesNetService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _model_path(self, sentiment_type: str, num_csvs: int) -> str:
        filename = f"{sentiment_type}_{num_csvs}.pt"
        return os.path.join(self.model_dir, filename)

    def _load_model(self, sentiment_type: str, num_csvs: int):
        import torch
        import torch.nn as nn

        key = f"TIMESNET_{sentiment_type}_{num_csvs}"
        if key in self._cache:
            return self._cache[key]

        model_path = self._model_path(sentiment_type, num_csvs)
        if not os.path.exists(model_path):
            raise ValueError(f"Model not available: TIMESNET_{sentiment_type}_{num_csvs}")

        # Architecture matches dataset_test/.../run.py
        class TimesNet(nn.Module):
            def __init__(self, input_features: int, sequence_length: int, output_length: int, num_layers: int = 4):
                super().__init__()
                self.conv_layers = nn.ModuleList()
                for i in range(num_layers):
                    in_channels = input_features if i == 0 else 64
                    self.conv_layers.append(nn.Conv1d(in_channels=in_channels, out_channels=64, kernel_size=3, padding=1))
                self.flatten = nn.Flatten()
                self.dense = nn.Linear(64 * sequence_length, output_length)

            def forward(self, x):
                for conv in self.conv_layers:
                    x = torch.relu(conv(x))
                x = self.flatten(x)
                x = self.dense(x)
                return x

        input_features = 4 if sentiment_type == "sentiment" else 3
        sequence_length = 50
        output_length = 3

        model = TimesNet(input_features, sequence_length, output_length, num_layers=4).to(_device())
        model.load_state_dict(torch.load(model_path, map_location=_device()))
        model.eval()

        self._cache[key] = model
        return model

    def predict(self, symbol: str, sentiment_type: str, num_csvs: int, prediction_length: int) -> TorchPrediction:
        # Models are trained for output_length=3 only
        if prediction_length != 3:
            raise ValueError("TimesNet only supports prediction_length=3 with the provided saved models.")

        df = DataService.get_instance().load_stock_data(symbol)
        if df is None or len(df) < 60:
            raise ValueError(f"Not enough data for symbol: {symbol}")

        if sentiment_type == "sentiment":
            df = _ensure_col(df, "Scaled_sentiment", 0.0)
            cols = ["Volume", "Open", "Close", "Scaled_sentiment"]
        else:
            cols = ["Volume", "Open", "Close"]

        data = df[cols].astype(float).values
        scaled, scaler = _split_and_scale(data, split_ratio=0.85)

        input_len = 50
        x_last = scaled[-input_len:]  # (50, features)

        import torch
        x_tensor = torch.tensor(x_last, dtype=torch.float32).unsqueeze(0)  # (1, 50, f)
        x_tensor = x_tensor.transpose(1, 2).to(_device())  # (1, f, 50) for Conv1d

        model = self._load_model(sentiment_type, num_csvs)
        with torch.no_grad():
            y_scaled = model(x_tensor).cpu().numpy().reshape(-1)  # (3,)

        # Inverse transform: build placeholder with correct feature dimension and put close at index 2
        feat_dim = len(cols)
        expanded = np.zeros((len(y_scaled), feat_dim), dtype=float)
        expanded[:, 2] = y_scaled
        y_inv = scaler.inverse_transform(expanded)[:, 2]

        latest_close = float(df["Close"].iloc[-1]) if "Close" in df.columns else None

        return TorchPrediction(
            predictions=[float(v) for v in y_inv.tolist()],
            current_price=latest_close,
            model_info={
                "model_type": "TIMESNET",
                "sentiment_type": sentiment_type,
                "num_csvs": num_csvs,
                "sequence_length": 50,
                "prediction_length": 3,
            },
        )


class TransformerService:
    _instance: Optional["TransformerService"] = None

    def __init__(self) -> None:
        self.base_dir = get_base_dir()
        self.model_dir = os.path.join(
            self.base_dir,
            "FNSPID_Financial_News_Dataset-main",
            "dataset_test",
            "Transformer-for-Time-Series-Prediction",
            "model_saved",
        )
        self.tst_dir = os.path.join(
            self.base_dir,
            "FNSPID_Financial_News_Dataset-main",
            "dataset_test",
            "Transformer-for-Time-Series-Prediction",
        )
        self._cache: Dict[str, object] = {}

    @classmethod
    def get_instance(cls) -> "TransformerService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _model_candidates(self, sentiment_type: str, num_csvs: int, layers: int = 4) -> List[str]:
        # Some checkpoints are multi-output (d_input=6, d_output=18) and named like _48_4layers.pt
        # Others are single-output (d_input=3/4, d_output=1) and named Sentiment_50_4layers.pt / Nonsentiment_50_4layers.pt.
        prefix = "Sentiment" if sentiment_type == "sentiment" else "Nonsentiment"
        return [
            os.path.join(self.model_dir, f"_{num_csvs}_{layers}layers.pt"),
            os.path.join(self.model_dir, f"{prefix}_{num_csvs}_{layers}layers.pt"),
        ]

    def _pick_model_path(self, sentiment_type: str, num_csvs: int, layers: int = 4) -> str:
        for p in self._model_candidates(sentiment_type, num_csvs, layers):
            if os.path.exists(p):
                return p
        raise ValueError(f"Model not available: TRANSFORMER_{sentiment_type}_{num_csvs}_{layers}layers")

    def _load_model(self, sentiment_type: str, num_csvs: int, layers: int = 4):
        import sys
        import torch

        model_path = self._pick_model_path(sentiment_type, num_csvs, layers=layers)
        # Infer input/output dimensions from checkpoint (so we can support both variants).
        sd = torch.load(model_path, map_location="cpu")
        emb_w = sd.get("_embedding.weight")
        lin_w = sd.get("_linear.weight")
        if emb_w is None or lin_w is None:
            raise ValueError(f"Transformer checkpoint missing expected keys: {os.path.basename(model_path)}")

        d_input = int(emb_w.shape[1])
        d_output = int(lin_w.shape[0])

        key = f"TRANSFORMER_{os.path.basename(model_path)}"
        if key in self._cache:
            return self._cache[key]

        # Import Transformer from dataset code
        if self.tst_dir not in sys.path:
            sys.path.insert(0, self.tst_dir)
        from tst import Transformer  # type: ignore

        # Match run.py parameters
        d_model = 32
        q = 8
        v = 8
        h = 8
        N = layers
        attention_size = 50
        dropout = 0.1
        chunk_mode = None
        pe = "regular"

        model = Transformer(
            d_input, d_model, d_output, q, v, h, N,
            attention_size=attention_size, dropout=dropout, chunk_mode=chunk_mode, pe=pe
        ).to(_device())

        model.load_state_dict(torch.load(model_path, map_location=_device()))
        model.eval()
        self._cache[key] = (model, d_input, d_output, model_path)
        return self._cache[key]

    def predict(self, symbol: str, sentiment_type: str, num_csvs: int, prediction_length: int) -> TorchPrediction:
        if prediction_length < 1 or prediction_length > 3:
            raise ValueError("Transformer supports prediction_length 1..3 in this backend integration.")

        df = DataService.get_instance().load_stock_data(symbol)
        if df is None or len(df) < 80:
            raise ValueError(f"Not enough data for symbol: {symbol}")

        import torch
        (model, d_input, d_output, model_path) = self._load_model(sentiment_type, num_csvs, layers=4)

        # Choose columns based on checkpoint d_input
        # - d_input=6: Volume, Open, High, Low, Close, Scaled_sentiment (multi-output 3x6)
        # - d_input=4: Volume, Open, Close, Scaled_sentiment (single-output)
        # - d_input=3: Volume, Open, Close (single-output)
        df = _ensure_col(df, "Scaled_sentiment", 0.0)
        if d_input == 6:
            cols = ["Volume", "Open", "High", "Low", "Close", "Scaled_sentiment"]
            close_index = 4
        elif d_input == 4:
            cols = ["Volume", "Open", "Close", "Scaled_sentiment"]
            close_index = 2
        elif d_input == 3:
            cols = ["Volume", "Open", "Close"]
            close_index = 2
        else:
            raise ValueError(f"Unsupported Transformer input dimension: {d_input} (file: {os.path.basename(model_path)})")

        data = df[cols].astype(float).values
        scaled, scaler = _split_and_scale(data, split_ratio=0.85)

        input_len = 50
        window = scaled[-input_len:].copy()  # (50, d_input)

        close_preds_scaled: List[float] = []

        # If checkpoint is multi-output (d_output == 18), we can get 3 steps in one forward
        if d_output == 18 and d_input == 6:
            x_tensor = torch.tensor(window, dtype=torch.float32).unsqueeze(0).to(_device())  # (1, 50, 6)
            with torch.no_grad():
                out = model(x_tensor)  # (1, 18)
            out = out.view(1, 3, 6).cpu().numpy()[0]  # (3, 6)
            out = np.clip(out, 0.0, 1.0)
            out_inv = scaler.inverse_transform(out)  # (3, 6)
            close_preds = out_inv[:prediction_length, close_index].tolist()
        # If checkpoint is single-output, generate up to 3 steps autoregressively.
        elif d_output == 1:
            last_row = window[-1].copy()
            for _ in range(prediction_length):
                x_tensor = torch.tensor(window, dtype=torch.float32).unsqueeze(0).to(_device())  # (1, 50, d_input)
                with torch.no_grad():
                    out = model(x_tensor)  # (1, 1)
                pred_scaled = float(out.view(-1)[0].cpu().item())
                pred_scaled = float(np.clip(pred_scaled, 0.0, 1.0))
                close_preds_scaled.append(pred_scaled)

                # Update window: shift and append new row with predicted close, keep others same as last row.
                new_row = last_row.copy()
                new_row[close_index] = pred_scaled
                window = np.vstack([window[1:], new_row])
                last_row = new_row

            expanded = np.tile(last_row, (len(close_preds_scaled), 1))
            expanded[:, close_index] = np.array(close_preds_scaled)
            expanded = np.clip(expanded, 0.0, 1.0)
            inv = scaler.inverse_transform(expanded)
            close_preds = inv[:, close_index].tolist()
        else:
            raise ValueError(
                f"Unsupported Transformer checkpoint shapes (d_input={d_input}, d_output={d_output}) "
                f"for file {os.path.basename(model_path)}"
            )

        latest_close = float(df["Close"].iloc[-1]) if "Close" in df.columns else None

        return TorchPrediction(
            predictions=[float(v) for v in close_preds],
            current_price=latest_close,
            model_info={
                "model_type": "TRANSFORMER",
                "sentiment_type": sentiment_type,
                "num_csvs": num_csvs,
                "sequence_length": 50,
                "prediction_length": prediction_length,
                "layers": 4,
                "checkpoint": os.path.basename(model_path),
            },
        )


