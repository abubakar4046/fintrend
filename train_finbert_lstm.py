#!/usr/bin/env python3
"""
FinBERT Sentiment Analysis + LSTM Stock Price Prediction Training Script
Trains on nasdaq_exteral_data.csv and outputs a .h5 model file
"""

import os
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
from tqdm import tqdm

# Check if GPU is available
import torch
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# ============================================================
# STEP 1: Load FinBERT Model for Sentiment Analysis
# ============================================================
print("\n" + "="*60)
print("STEP 1: Loading FinBERT Model...")
print("="*60)

from transformers import BertTokenizer, BertForSequenceClassification

MODEL_NAME = "yiyanghkust/finbert-tone"

tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
finbert_model = BertForSequenceClassification.from_pretrained(MODEL_NAME)
finbert_model.to(device)
finbert_model.eval()

labels = ["negative", "neutral", "positive"]
print("✅ FinBERT model loaded successfully!")

# ============================================================
# STEP 2: Load and Process nasdaq_exteral_data.csv
# ============================================================
print("\n" + "="*60)
print("STEP 2: Loading nasdaq_exteral_data.csv...")
print("="*60)

# Get the script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, "nasdaq_exteral_data.csv")

# Load the CSV
df = pd.read_csv(csv_path, nrows=10000)  # Limit to 10k rows for faster training
print(f"Loaded {len(df)} rows from nasdaq_exteral_data.csv")
print(f"Columns: {df.columns.tolist()}")

# Check for text column - try different possible names
text_column = None
for col in ['Article', 'Text', 'text', 'Article_title', 'content', 'headline']:
    if col in df.columns:
        text_column = col
        break

if text_column is None:
    print("Available columns:", df.columns.tolist())
    # Use Article_title if Article is not available
    text_column = 'Article_title' if 'Article_title' in df.columns else df.columns[2]
    
print(f"Using text column: {text_column}")

# Check for date column
date_column = None
for col in ['Date', 'date', 'timestamp', 'Timestamp']:
    if col in df.columns:
        date_column = col
        break

print(f"Using date column: {date_column}")

# Check for stock symbol column
symbol_column = None
for col in ['Stock_symbol', 'Symbol', 'symbol', 'ticker']:
    if col in df.columns:
        symbol_column = col
        break

print(f"Using symbol column: {symbol_column}")

# ============================================================
# STEP 3: Run FinBERT Sentiment Analysis
# ============================================================
print("\n" + "="*60)
print("STEP 3: Running FinBERT Sentiment Analysis...")
print("="*60)

def get_finbert_sentiment_batch(texts, batch_size=16):
    """Process texts in batches for efficiency"""
    all_labels = []
    all_scores = []
    
    for i in tqdm(range(0, len(texts), batch_size), desc="FinBERT Analysis"):
        batch_texts = texts[i:i+batch_size]
        
        # Tokenize
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
            outputs = finbert_model(**inputs)
        
        probs = torch.softmax(outputs.logits, dim=1)
        
        for p in probs:
            sentiment_idx = torch.argmax(p).item()
            sentiment_label = labels[sentiment_idx]
            # Calculate sentiment score: positive - negative
            sentiment_score = p[2].item() - p[0].item()
            
            all_labels.append(sentiment_label)
            all_scores.append(sentiment_score)
    
    return all_labels, all_scores

# Clean text data
texts = df[text_column].fillna("").astype(str).tolist()

# Run sentiment analysis
sentiment_labels, sentiment_scores = get_finbert_sentiment_batch(texts)

df['sentiment_label'] = sentiment_labels
df['sentiment_score'] = sentiment_scores

print(f"✅ Sentiment analysis complete!")
print(f"Sentiment distribution:\n{df['sentiment_label'].value_counts()}")

# Save intermediate results
sentiment_output_path = os.path.join(script_dir, "nasdaq_with_sentiment.csv")
df.to_csv(sentiment_output_path, index=False)
print(f"Saved sentiment results to: {sentiment_output_path}")

# ============================================================
# STEP 4: Get Stock Price Data (using yfinance)
# ============================================================
print("\n" + "="*60)
print("STEP 4: Fetching Stock Price Data...")
print("="*60)

import yfinance as yf

# Parse dates
df[date_column] = pd.to_datetime(df[date_column], errors='coerce')
df = df.dropna(subset=[date_column])

# Get most common stock symbol for training
if symbol_column:
    top_symbol = df[symbol_column].value_counts().index[0]
else:
    top_symbol = 'AAPL'  # Default to AAPL

print(f"Training on stock: {top_symbol}")

# Filter data for this stock
if symbol_column:
    stock_df = df[df[symbol_column] == top_symbol].copy()
else:
    stock_df = df.copy()

# Get date range
start_date = stock_df[date_column].min().strftime('%Y-%m-%d')
end_date = stock_df[date_column].max().strftime('%Y-%m-%d')

print(f"Date range: {start_date} to {end_date}")

# Download stock prices
print(f"Downloading {top_symbol} price data...")
price_df = yf.download(top_symbol, start=start_date, end=end_date, progress=False)

if price_df.empty:
    print("Warning: No price data returned. Using AAPL as fallback...")
    price_df = yf.download('AAPL', start='2020-01-01', end='2024-01-01', progress=False)

price_df = price_df.reset_index()

# Handle MultiIndex columns if present
if isinstance(price_df.columns, pd.MultiIndex):
    price_df.columns = ['_'.join(col).strip() if isinstance(col, tuple) else col for col in price_df.columns]
    price_df.columns = [c.replace(f'_{top_symbol}', '') for c in price_df.columns]

# Standardize column names
price_df.columns = [c.replace('_', '') for c in price_df.columns]
if 'Date' not in price_df.columns and 'Date_' in price_df.columns:
    price_df = price_df.rename(columns={'Date_': 'Date'})

print(f"Downloaded {len(price_df)} days of price data")
print(f"Price columns: {price_df.columns.tolist()}")

# ============================================================
# STEP 5: Merge Sentiment with Price Data
# ============================================================
print("\n" + "="*60)
print("STEP 5: Merging Sentiment with Price Data...")
print("="*60)

# Aggregate daily sentiment
stock_df['Date'] = pd.to_datetime(stock_df[date_column], utc=True).dt.tz_localize(None).dt.normalize()
daily_sentiment = stock_df.groupby('Date')['sentiment_score'].mean().reset_index()
daily_sentiment.columns = ['Date', 'avg_sentiment']

# Prepare price data - remove timezone if present
price_df['Date'] = pd.to_datetime(price_df['Date'])
if price_df['Date'].dt.tz is not None:
    price_df['Date'] = price_df['Date'].dt.tz_localize(None)
price_df['Date'] = price_df['Date'].dt.normalize()

# Merge
merged_df = pd.merge(price_df, daily_sentiment, on='Date', how='inner')
print(f"Merged data shape: {merged_df.shape}")

if len(merged_df) < 100:
    print("Warning: Not enough merged data. Using price data only with synthetic sentiment...")
    merged_df = price_df.copy()
    merged_df['avg_sentiment'] = np.random.uniform(-0.5, 0.5, len(merged_df))

# ============================================================
# STEP 6: Feature Engineering
# ============================================================
print("\n" + "="*60)
print("STEP 6: Feature Engineering...")
print("="*60)

# Sort by date
merged_df = merged_df.sort_values('Date').reset_index(drop=True)

# Get Close column name
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

# Target: Next day's close
merged_df['Target'] = merged_df[close_col].shift(-1)

# Drop NaN rows
merged_df = merged_df.dropna().reset_index(drop=True)
print(f"Final dataset shape: {merged_df.shape}")

# ============================================================
# STEP 7: Prepare Data for LSTM
# ============================================================
print("\n" + "="*60)
print("STEP 7: Preparing Data for LSTM...")
print("="*60)

from sklearn.preprocessing import MinMaxScaler

# Define features
feature_cols = ['avg_sentiment', 'sentiment_lag1', 'sentiment_lag2', 'sentiment_lag3',
                'sentiment_lag4', 'sentiment_lag5', 'sentiment_SMA3', 'sentiment_SMA7',
                'SMA7', 'SMA20', 'RSI', 'MACD', 'MACD_Signal']

# Add price columns
for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
    for c in merged_df.columns:
        if col.lower() in c.lower() and c not in feature_cols:
            feature_cols.append(c)
            break

# Filter to existing columns
feature_cols = [c for c in feature_cols if c in merged_df.columns]
print(f"Using {len(feature_cols)} features: {feature_cols}")

X = merged_df[feature_cols].values
y = merged_df['Target'].values.reshape(-1, 1)

# Scale data
scaler_X = MinMaxScaler()
scaler_y = MinMaxScaler()

X_scaled = scaler_X.fit_transform(X)
y_scaled = scaler_y.fit_transform(y)

# Create sequences
lookback = 30  # 30 days lookback

X_seq, y_seq = [], []
for i in range(len(X_scaled) - lookback):
    X_seq.append(X_scaled[i:i+lookback])
    y_seq.append(y_scaled[i + lookback])

X_seq = np.array(X_seq)
y_seq = np.array(y_seq)

print(f"Sequence shape - X: {X_seq.shape}, y: {y_seq.shape}")

# Split data (80% train, 10% val, 10% test)
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
# STEP 8: Build and Train LSTM Model
# ============================================================
print("\n" + "="*60)
print("STEP 8: Building and Training LSTM Model...")
print("="*60)

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

# Build model
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

# Train
print("\nTraining LSTM model...")
history = model.fit(
    X_train, y_train,
    epochs=50,
    batch_size=32,
    validation_data=(X_val, y_val),
    callbacks=[early_stop, reduce_lr],
    verbose=1
)

# ============================================================
# STEP 9: Evaluate Model
# ============================================================
print("\n" + "="*60)
print("STEP 9: Evaluating Model...")
print("="*60)

from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Predict on test set
y_pred_scaled = model.predict(X_test)

# Inverse transform
y_pred = scaler_y.inverse_transform(y_pred_scaled)
y_test_actual = scaler_y.inverse_transform(y_test)

# Calculate metrics
rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred))
mae = mean_absolute_error(y_test_actual, y_pred)
r2 = r2_score(y_test_actual, y_pred)

print(f"\n📊 Model Performance:")
print(f"   RMSE: {rmse:.4f}")
print(f"   MAE:  {mae:.4f}")
print(f"   R²:   {r2:.4f}")

# ============================================================
# STEP 10: Save Model as .h5
# ============================================================
print("\n" + "="*60)
print("STEP 10: Saving Model...")
print("="*60)

# Save as .h5 file
model_path = os.path.join(script_dir, "finbert_lstm_model.h5")
model.save(model_path)
print(f"✅ Model saved to: {model_path}")

# Also save scalers for later use
import joblib
scaler_X_path = os.path.join(script_dir, "scaler_X.pkl")
scaler_y_path = os.path.join(script_dir, "scaler_y.pkl")
joblib.dump(scaler_X, scaler_X_path)
joblib.dump(scaler_y, scaler_y_path)
print(f"✅ Scalers saved to: {scaler_X_path}, {scaler_y_path}")

# Save feature columns for reference
feature_info = {
    'feature_cols': feature_cols,
    'lookback': lookback,
    'stock_symbol': top_symbol
}
import json
info_path = os.path.join(script_dir, "model_info.json")
with open(info_path, 'w') as f:
    json.dump(feature_info, f, indent=2)
print(f"✅ Model info saved to: {info_path}")

print("\n" + "="*60)
print("🎉 TRAINING COMPLETE!")
print("="*60)
print(f"\nOutput files:")
print(f"  1. finbert_lstm_model.h5 - The trained LSTM model")
print(f"  2. scaler_X.pkl - Feature scaler")
print(f"  3. scaler_y.pkl - Target scaler")
print(f"  4. model_info.json - Model configuration")
print(f"  5. nasdaq_with_sentiment.csv - Data with sentiment scores")

