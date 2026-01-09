"""
Data Service for loading and preprocessing stock data
"""
import os
import pandas as pd
import numpy as np
from typing import Optional, Tuple
import sys

# Get the base directory (project root)
from .utils import get_base_dir
BASE_DIR = get_base_dir()

# Add model core paths for DataLoader import (all models use similar data_processor)
MODEL_CORE_PATHS = [
    os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'LSTM-for-Time-Series-Prediction', 'core'),
    os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'GRU-for-Time-Series-Prediction', 'core'),
    os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'CNN-for-Time-Series-Prediction', 'core'),
    os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'RNN-for-Time-Series-Prediction', 'core'),
]

for core_path in MODEL_CORE_PATHS:
    if os.path.exists(core_path) and core_path not in sys.path:
        sys.path.insert(0, core_path)

DataLoader = None
for core_path in MODEL_CORE_PATHS:
    try:
        from data_processor import DataLoader
        print(f"Successfully imported DataLoader from {core_path}")
        break
    except ImportError:
        continue

if DataLoader is None:
    print("Warning: Could not import DataLoader from any model core path")

class DataService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.base_path = os.path.join(
                BASE_DIR,
                'FNSPID_Financial_News_Dataset-main',
                'dataset_test',
                'LSTM-for-Time-Series-Prediction'
            )
            self.data_path = os.path.join(self.base_path, 'data')
            self._initialized = True
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def get_available_stocks(self) -> list:
        """Get list of available stock symbols"""
        if not os.path.exists(self.data_path):
            return []
        
        csv_files = [f for f in os.listdir(self.data_path) if f.endswith('.csv')]
        # Extract stock symbols from filenames (remove .csv extension)
        symbols = [f.replace('.csv', '').upper() for f in csv_files]
        return sorted(symbols)
    
    def load_stock_data(self, symbol: str) -> Optional[pd.DataFrame]:
        """
        Load stock data for a given symbol
        
        Args:
            symbol: Stock symbol (e.g., 'AAPL')
        
        Returns:
            DataFrame with stock data or None if not found
        """
        # Try different case variations
        possible_files = [
            f"{symbol}.csv",
            f"{symbol.upper()}.csv",
            f"{symbol.lower()}.csv"
        ]
        
        for filename in possible_files:
            filepath = os.path.join(self.data_path, filename)
            if os.path.exists(filepath):
                try:
                    df = pd.read_csv(filepath)
                    # Convert Date column to datetime if it exists
                    if 'Date' in df.columns:
                        df['Date'] = pd.to_datetime(df['Date'])
                    return df
                except Exception as e:
                    print(f"Error loading {filepath}: {e}")
        
        return None
    
    def prepare_prediction_data(
        self, 
        symbol: str, 
        sentiment_type: str = "nonsentiment",
        use_recent: bool = True,
        model_type: str = "LSTM"
    ) -> Optional[Tuple[np.ndarray, np.ndarray, np.ndarray]]:
        """
        Prepare data for prediction
        
        Args:
            symbol: Stock symbol
            sentiment_type: "sentiment" or "nonsentiment"
            use_recent: If True, use most recent data; if False, use test data
        
        Returns:
            Tuple of (x_test, y_test, y_base) or None if error
        """
        # Load configuration - try model-specific path first, then fallback to LSTM
        model_base_paths = {
            'LSTM': os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'LSTM-for-Time-Series-Prediction'),
            'GRU': os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'GRU-for-Time-Series-Prediction'),
            'CNN': os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'CNN-for-Time-Series-Prediction'),
            'RNN': os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'RNN-for-Time-Series-Prediction'),
        }
        
        # Try model-specific config first
        model_base_path = model_base_paths.get(model_type, self.base_path)
        config_path = os.path.join(model_base_path, f"{sentiment_type}_config.json")
        
        # Fallback to LSTM config if model-specific doesn't exist
        if not os.path.exists(config_path):
            config_path = os.path.join(self.base_path, f"{sentiment_type}_config.json")
        
        if not os.path.exists(config_path):
            return None
        
        import json
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Load data
        data_file = os.path.join(self.data_path, f"{symbol}.csv")
        # Try different case variations
        if not os.path.exists(data_file):
            for case_var in [symbol.upper(), symbol.lower()]:
                alt_file = os.path.join(self.data_path, f"{case_var}.csv")
                if os.path.exists(alt_file):
                    data_file = alt_file
                    break
            else:
                return None
        
        try:
            if DataLoader is None:
                raise ImportError("DataLoader not available")
            
            # Initialize DataLoader
            data_loader = DataLoader(
                data_file,
                config['data']['train_test_split'],
                config['data']['columns'],
                config['data']['columns_to_normalise'],
                config['data']['prediction_length']
            )
            
            # Get test data
            x_test, y_test, y_base = data_loader.get_test_data(
                seq_len=config['data']['sequence_length'],
                normalise=config['data']['normalise'],
                cols_to_norm=config['data']['columns_to_normalise']
            )
            
            if use_recent:
                # Use the most recent sequence for prediction
                x_test = x_test[-1:] if len(x_test) > 0 else x_test
            
            return (x_test, y_test, y_base)
        except Exception as e:
            print(f"Error preparing data for {symbol}: {e}")
            return None
    
    def get_historical_data(self, symbol: str, limit: Optional[int] = None) -> Optional[dict]:
        """
        Get historical stock data
        
        Args:
            symbol: Stock symbol
            limit: Maximum number of records to return
        
        Returns:
            Dictionary with historical data or None
        """
        df = self.load_stock_data(symbol)
        if df is None:
            return None
        
        if limit:
            df = df.tail(limit)
        
        # Convert to list of dictionaries
        data = df.to_dict('records')
        
        # Convert datetime to string for JSON serialization
        for record in data:
            if 'Date' in record and pd.notna(record['Date']):
                record['Date'] = str(record['Date'])
            # Convert numpy types to native Python types
            for key, value in record.items():
                if isinstance(value, (np.integer, np.floating)):
                    record[key] = float(value)
                elif pd.isna(value):
                    record[key] = None
        
        return {
            'symbol': symbol.upper(),
            'data': data,
            'count': len(data)
        }

