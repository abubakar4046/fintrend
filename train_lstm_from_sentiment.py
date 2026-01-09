#!/usr/bin/env python3
"""
LSTM Stock Price Prediction Training Script
Uses the pre-generated sentiment data from nasdaq_with_sentiment.csv
"""

import os
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np

print("="*60)
print("LSTM Training from Pre-generated Sentiment Data")
print("="*60)

# ============================================================
# STEP 1: Load Pre-generated Sentiment Data
# ============================================================
print("\nSTEP 1: Loading sentiment data...")

script_dir = os.path.dirname(os.path.abspath(__file__))
sentiment_path = os.path.join(script_dir, "nasdaq_with_sentiment.csv")

df = pd.read_csv(sentiment_path)
print(f"Loaded {len(df)} rows with sentiment scores")
print(f"Columns: {df.columns.tolist()}")

# ============================================================
# STEP 2: Get Stock Price Data
# ============================================================
print("\nSTEP 2: Fetching stock price data...")

import yfinance as yf

# Parse dates
df['Date'] = pd.to_datetime(df['Date'], errors='coerce', utc=True)
df = df.dropna(subset=['Date'])
df['Date'] = df['Date'].dt.tz_localize(None).dt.normalize()

# Get most common stock symbol
symbol_col = 'Stock_symbol' if 'Stock_symbol' in df.columns else None
if symbol_col:
    top_symbol = df[symbol_col].value_counts().index[0]
    stock_df = df[df[symbol_col] == top_symbol].copy()
else:
    top_symbol = 'AAPL'
    stock_df = df.copy()

print(f"Training on stock: {top_symbol}")

# Get date range
start_date = stock_df['Date'].min().strftime('%Y-%m-%d')
end_date = stock_df['Date'].max().strftime('%Y-%m-%d')
print(f"Date range: {start_date} to {end_date}")

# Download stock prices
print(f"Downloading {top_symbol} price data...")
price_df = yf.download(top_symbol, start=start_date, end=end_date, progress=False)

if price_df.empty:
    print("Warning: No price data. Using AAPL fallback...")
    top_symbol = 'AAPL'
    price_df = yf.download('AAPL', start='2020-01-01', end='2024-01-01', progress=False)

price_df = price_df.reset_index()

# Handle MultiIndex columns
if isinstance(price_df.columns, pd.MultiIndex):
    price_df.columns = ['_'.join(col).strip() if isinstance(col, tuple) else col for col in price_df.columns]
    price_df.columns = [c.split('_')[0] for c in price_df.columns]

print(f"Downloaded {len(price_df)} days of price data")

# ============================================================
# STEP 3: Merge Sentiment with Prices
# ============================================================
print("\nSTEP 3: Merging data...")

# Aggregate daily sentiment
daily_sentiment = stock_df.groupby('Date')['sentiment_score'].mean().reset_index()
daily_sentiment.columns = ['Date', 'avg_sentiment']

# Prepare price data
price_df['Date'] = pd.to_datetime(price_df['Date'])
if price_df['Date'].dt.tz is not None:
    price_df['Date'] = price_df['Date'].dt.tz_localize(None)
price_df['Date'] = price_df['Date'].dt.normalize()

# Merge
merged_df = pd.merge(price_df, daily_sentiment, on='Date', how='inner')
print(f"Merged data shape: {merged_df.shape}")

if len(merged_df) < 100:
    print("Warning: Not enough merged data. Using price data with synthetic sentiment...")
    merged_df = price_df.copy()
    merged_df['avg_sentiment'] = np.random.uniform(-0.5, 0.5, len(merged_df))

# ============================================================
# STEP 4: Feature Engineering
# ============================================================
print("\nSTEP 4: Feature engineering...")

merged_df = merged_df.sort_values('Date').reset_index(drop=True)

# Get Close column
close_col = [c for c in merged_df.columns if 'Close' in c or 'close' in c][0]
print(f"Using close column: {close_col}")

# Lagged sentiment
for i in range(1, 6):
    merged_df[f'sentiment_lag{i}'] = merged_df['avg_sentiment'].shift(i)

# Sentiment moving averages
merged_df['sentiment_SMA3'] = merged_df['avg_sentiment'].rolling(3).mean()
merged_df['sentiment_SMA7'] = merged_df['avg_sentiment'].rolling(7).mean()

# Price moving averages
merged_df['SMA7'] = merged_df[close_col].rolling(7).mean()
merged_df['SMA20'] = merged_df[close_col].rolling(20).mean()

# RSI
delta = merged_df[close_col].diff(1)
gain = delta.where(delta > 0, 0)
loss = -delta.where(delta < 0, 0)
ema_gain = gain.ewm(com=13, adjust=False).mean()
ema_loss = loss.ewm(com=13, adjust=False).mean()
rs = ema_gain / ema_loss
merged_df['RSI'] = 100 - (100 / (1 + rs))

# MACD
exp1 = merged_df[close_col].ewm(span=12, adjust=False).mean()
exp2 = merged_df[close_col].ewm(span=26, adjust=False).mean()
merged_df['MACD'] = exp1 - exp2
merged_df['MACD_Signal'] = merged_df['MACD'].ewm(span=9, adjust=False).mean()

# Target
merged_df['Target'] = merged_df[close_col].shift(-1)

# Drop NaN
merged_df = merged_df.dropna().reset_index(drop=True)
print(f"Final dataset shape: {merged_df.shape}")

# ============================================================
# STEP 5: Prepare Data for LSTM
# ============================================================
print("\nSTEP 5: Preparing LSTM data...")

from sklearn.preprocessing import MinMaxScaler

# Features
feature_cols = ['avg_sentiment', 'sentiment_lag1', 'sentiment_lag2', 'sentiment_lag3',
                'sentiment_lag4', 'sentiment_lag5', 'sentiment_SMA3', 'sentiment_SMA7',
                'SMA7', 'SMA20', 'RSI', 'MACD', 'MACD_Signal']

# Add price columns
for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
    for c in merged_df.columns:
        if col.lower() in c.lower() and c not in feature_cols:
            feature_cols.append(c)
            break

feature_cols = [c for c in feature_cols if c in merged_df.columns]
print(f"Using {len(feature_cols)} features")

X = merged_df[feature_cols].values
y = merged_df['Target'].values.reshape(-1, 1)

# Scale
scaler_X = MinMaxScaler()
scaler_y = MinMaxScaler()
X_scaled = scaler_X.fit_transform(X)
y_scaled = scaler_y.fit_transform(y)

# Create sequences
lookback = 30
X_seq, y_seq = [], []
for i in range(len(X_scaled) - lookback):
    X_seq.append(X_scaled[i:i+lookback])
    y_seq.append(y_scaled[i + lookback])

X_seq = np.array(X_seq)
y_seq = np.array(y_seq)
print(f"Sequence shape - X: {X_seq.shape}, y: {y_seq.shape}")

# Split data
train_size = int(0.8 * len(X_seq))
val_size = int(0.1 * len(X_seq))

X_train = X_seq[:train_size]
y_train = y_seq[:train_size]
X_val = X_seq[train_size:train_size+val_size]
y_val = y_seq[train_size:train_size+val_size]
X_test = X_seq[train_size+val_size:]
y_test = y_seq[train_size+val_size:]

print(f"Train: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")

# ============================================================
# STEP 6: Build and Train LSTM
# ============================================================
print("\nSTEP 6: Building LSTM model...")

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

model = Sequential([
    Input(shape=(X_train.shape[1], X_train.shape[2])),
    LSTM(100, return_sequences=True),
    Dropout(0.2),
    LSTM(100, return_sequences=False),
    Dropout(0.2),
    Dense(50, activation='relu'),
    Dense(1)
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])
model.summary()

# Callbacks
early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6)

print("\nTraining...")
history = model.fit(
    X_train, y_train,
    epochs=50,
    batch_size=32,
    validation_data=(X_val, y_val),
    callbacks=[early_stop, reduce_lr],
    verbose=1
)

# ============================================================
# STEP 7: Evaluate
# ============================================================
print("\nSTEP 7: Evaluating...")

from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

y_pred_scaled = model.predict(X_test)
y_pred = scaler_y.inverse_transform(y_pred_scaled)
y_test_actual = scaler_y.inverse_transform(y_test)

rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred))
mae = mean_absolute_error(y_test_actual, y_pred)
r2 = r2_score(y_test_actual, y_pred)

print(f"\n📊 Model Performance:")
print(f"   RMSE: {rmse:.4f}")
print(f"   MAE:  {mae:.4f}")
print(f"   R²:   {r2:.4f}")

# ============================================================
# STEP 8: Save Model
# ============================================================
print("\nSTEP 8: Saving model...")

model_path = os.path.join(script_dir, "finbert_lstm_model.h5")
model.save(model_path)
print(f"✅ Model saved to: {model_path}")

# Save scalers
import joblib
joblib.dump(scaler_X, os.path.join(script_dir, "scaler_X.pkl"))
joblib.dump(scaler_y, os.path.join(script_dir, "scaler_y.pkl"))

# Save model info
import json
info = {'feature_cols': feature_cols, 'lookback': lookback, 'stock_symbol': top_symbol}
with open(os.path.join(script_dir, "model_info.json"), 'w') as f:
    json.dump(info, f, indent=2)

print("\n" + "="*60)
print("🎉 TRAINING COMPLETE!")
print("="*60)
print(f"\nOutput files:")
print(f"  1. finbert_lstm_model.h5")
print(f"  2. scaler_X.pkl")
print(f"  3. scaler_y.pkl")
print(f"  4. model_info.json")

