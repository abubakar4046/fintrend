"""
Unified Model Service for loading and using all model types (LSTM, GRU, CNN, RNN)
"""
import os
import json
import numpy as np
from typing import Optional, Tuple, Dict
from keras.models import load_model as keras_load_model
import sys

# Get the base directory (project root)
from .utils import get_base_dir
BASE_DIR = get_base_dir()

# Model paths configuration
MODEL_PATHS = {
    'LSTM': os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'LSTM-for-Time-Series-Prediction'),
    'GRU': os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'GRU-for-Time-Series-Prediction'),
    'CNN': os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'CNN-for-Time-Series-Prediction'),
    'RNN': os.path.join(BASE_DIR, 'FNSPID_Financial_News_Dataset-main', 'dataset_test', 'RNN-for-Time-Series-Prediction'),
}

# Add model core paths to sys.path
for model_type, base_path in MODEL_PATHS.items():
    core_path = os.path.join(base_path, 'core')
    if os.path.exists(core_path) and core_path not in sys.path:
        sys.path.insert(0, core_path)

# Generic Model wrapper that works with all model types
class Model:
    """Generic model wrapper that can load and use any Keras model"""
    
    def __init__(self):
        self.model = None
        self.model_type = None
    
    def load_model(self, filepath, model_type='LSTM'):
        """Load a Keras model from file with compatibility handling for old Keras models"""
        import warnings
        warnings.filterwarnings('ignore')
        
        try:
            # Create custom layer classes that ignore unsupported parameters
            from keras.layers import LSTM as BaseLSTM, GRU as BaseGRU, Dense, Dropout
            from keras.layers import Conv1D, MaxPooling1D, Flatten, RNN
            from keras.layers import SimpleRNN as BaseSimpleRNN
            
            # Create wrapper classes that filter out unsupported kwargs
            class CompatibleLSTM(BaseLSTM):
                def __init__(self, *args, **kwargs):
                    # Remove time_major if present (not supported in newer Keras)
                    kwargs.pop('time_major', None)
                    super().__init__(*args, **kwargs)
            
            class CompatibleGRU(BaseGRU):
                def __init__(self, *args, **kwargs):
                    kwargs.pop('time_major', None)
                    super().__init__(*args, **kwargs)

            class CompatibleSimpleRNN(BaseSimpleRNN):
                def __init__(self, *args, **kwargs):
                    # Older saved models may include unsupported args like time_major
                    kwargs.pop('time_major', None)
                    super().__init__(*args, **kwargs)
            
            custom_objects = {
                'LSTM': CompatibleLSTM,
                'GRU': CompatibleGRU,
                'Dense': Dense,
                'Dropout': Dropout,
                'Conv1D': Conv1D,
                'MaxPooling1D': MaxPooling1D,
                'Flatten': Flatten,
                'RNN': RNN,
                'SimpleRNN': CompatibleSimpleRNN,
            }
            
            # Try loading with custom_objects and safe_mode parameter handling
            try:
                # For Keras 3.0+, try with safe_mode=False
                try:
                    self.model = keras_load_model(filepath, compile=False, safe_mode=False, custom_objects=custom_objects)
                except TypeError:
                    # safe_mode doesn't exist in older versions
                    self.model = keras_load_model(filepath, compile=False, custom_objects=custom_objects)
                
                self.model_type = model_type
                print(f"Model loaded successfully from {filepath}")
                return True
            except Exception as e1:
                print(f"Error loading with custom_objects: {e1}")
                # Fallback: try without custom_objects (in case the issue is something else)
                try:
                    try:
                        self.model = keras_load_model(filepath, compile=False, safe_mode=False)
                    except TypeError:
                        self.model = keras_load_model(filepath, compile=False)
                    self.model_type = model_type
                    print(f"Model loaded without custom_objects from {filepath}")
                    return True
                except Exception as e2:
                    print(f"All loading attempts failed. Last error: {e2}")
                    return False
                    
        except Exception as e:
            print(f"Unexpected error loading model: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def predict_sequences_multiple_modified(self, data, window_size, prediction_len):
        """Make predictions using the loaded model"""
        import numpy as np
        from numpy import newaxis
        
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        prediction_seqs = []
        
        # Process data in batches
        for i in range(0, len(data), prediction_len):
            curr_frame = data[i].copy()
            predicted = []
            
            for j in range(prediction_len):
                # Prepare input - ensure correct shape
                input_data = curr_frame[newaxis, :, :]
                
                # Make prediction
                try:
                    pred = self.model.predict(input_data, verbose=0)
                    # Handle different output shapes
                    if isinstance(pred, np.ndarray):
                        if pred.ndim > 1:
                            pred_value = pred[0, 0] if pred.shape[1] > 0 else pred[0]
                        else:
                            pred_value = pred[0]
                    else:
                        pred_value = float(pred)
                    
                    predicted.append(pred_value)
                    
                    # Update window for next prediction
                    curr_frame = curr_frame[1:]
                    # Insert prediction at the end
                    if curr_frame.shape[0] < window_size - 1:
                        curr_frame = np.insert(curr_frame, [curr_frame.shape[0]], predicted[-1], axis=0)
                    else:
                        curr_frame = np.insert(curr_frame, [window_size - 2], predicted[-1], axis=0)
                        
                except Exception as e:
                    print(f"Error during prediction step {j}: {e}")
                    # Use last prediction if available, otherwise use 0
                    if predicted:
                        predicted.append(predicted[-1])
                    else:
                        predicted.append(0.0)
            
            prediction_seqs.append(predicted)
        
        return prediction_seqs

class ModelService:
    """Unified service for loading and using all model types"""
    _instance = None
    _models = {}
    _configs = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._initialized = True
            self._load_all_configs()
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def _load_all_configs(self):
        """Load configurations for all model types"""
        for model_type, base_path in MODEL_PATHS.items():
            if not os.path.exists(base_path):
                continue
                
            configs = {}
            for config_type in ['sentiment', 'nonsentiment']:
                config_path = os.path.join(base_path, f'{config_type}_config.json')
                if os.path.exists(config_path):
                    try:
                        with open(config_path, 'r') as f:
                            configs[config_type] = json.load(f)
                    except Exception as e:
                        print(f"Warning: Could not load {model_type} {config_type} config: {e}")
            
            if configs:
                self._configs[model_type] = configs
                print(f"Loaded configs for {model_type}")
    
    def _get_model_key(self, model_type: str, sentiment_type: str, num_csvs: int) -> str:
        """Generate model key"""
        return f"{model_type}_{sentiment_type}_{num_csvs}"
    
    def get_model_path(self, model_type: str, sentiment_type: str, num_csvs: int) -> Optional[str]:
        """Get the path to a model file"""
        if model_type not in MODEL_PATHS:
            return None
        
        base_path = MODEL_PATHS[model_type]
        saved_models_path = os.path.join(base_path, 'saved_models')
        
        if not os.path.exists(saved_models_path):
            return None
        
        # Try exact filename
        model_filename = f"{model_type}_{sentiment_type}_{num_csvs}.h5"
        model_path = os.path.join(saved_models_path, model_filename)
        
        if os.path.exists(model_path):
            return model_path
        
        # Try case variations
        for case_var in [sentiment_type.lower(), sentiment_type.upper(), sentiment_type]:
            alt_filename = f"{model_type}_{case_var}_{num_csvs}.h5"
            alt_path = os.path.join(saved_models_path, alt_filename)
            if os.path.exists(alt_path):
                return alt_path
        
        return None
    
    def load_model(self, model_type: str = "LSTM", sentiment_type: str = "nonsentiment", num_csvs: int = 50) -> Optional[Model]:
        """
        Load a trained model of any type
        
        Args:
            model_type: "LSTM", "GRU", "CNN", or "RNN"
            sentiment_type: "sentiment" or "nonsentiment"
            num_csvs: Number of CSV files used for training (5, 25, or 50)
        
        Returns:
            Loaded model or None if not found
        """
        model_key = self._get_model_key(model_type, sentiment_type, num_csvs)
        
        # Check if model is already loaded
        if model_key in self._models:
            return self._models[model_key]
        
        # Get model path
        model_path = self.get_model_path(model_type, sentiment_type, num_csvs)
        
        if not model_path:
            print(f"Model not found: {model_key}")
            print(f"  Searched in: {MODEL_PATHS.get(model_type, 'Unknown')}")
            return None
        
        try:
            model_wrapper = Model()
            if model_wrapper.load_model(model_path, model_type):
                self._models[model_key] = model_wrapper
                print(f"Model loaded successfully: {model_key} from {model_path}")
                return model_wrapper
            else:
                print(f"Failed to load model: {model_key}")
                return None
        except Exception as e:
            print(f"Error loading model {model_key}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_config(self, model_type: str, sentiment_type: str):
        """Get model configuration"""
        if model_type in self._configs:
            if sentiment_type in self._configs[model_type]:
                return self._configs[model_type][sentiment_type]
        
        # Fallback to LSTM config if available
        if 'LSTM' in self._configs:
            if sentiment_type in self._configs['LSTM']:
                print(f"Warning: Using LSTM config as fallback for {model_type}")
                return self._configs['LSTM'][sentiment_type]
        
        # Return default config
        return {
            'data': {
                'sequence_length': 50,
                'prediction_length': 3,
                'columns': ['Close', 'Volume'] if sentiment_type == 'nonsentiment' else ['Close', 'Volume', 'Scaled_sentiment']
            }
        }
    
    def predict(
        self, 
        data: np.ndarray, 
        model_type: str = "LSTM",
        sentiment_type: str = "nonsentiment",
        num_csvs: int = 50,
        prediction_length: int = 3
    ) -> np.ndarray:
        """
        Make predictions using the loaded model
        
        Args:
            data: Input sequence data (shape: [batch_size, sequence_length-1, features])
            model_type: "LSTM", "GRU", "CNN", or "RNN"
            sentiment_type: "sentiment" or "nonsentiment"
            num_csvs: Number of CSV files used for training
            prediction_length: Number of steps to predict
        
        Returns:
            Predictions array
        """
        model = self.load_model(model_type, sentiment_type, num_csvs)
        if model is None:
            raise ValueError(f"Model not available: {model_type}_{sentiment_type}_{num_csvs}")
        
        config = self.get_config(model_type, sentiment_type)
        sequence_length = config.get('data', {}).get('sequence_length', 50)
        
        # Use the model's prediction method
        predictions = model.predict_sequences_multiple_modified(
            data,
            window_size=sequence_length,
            prediction_len=prediction_length
        )
        
        return predictions
    
    def list_available_models(self) -> Dict:
        """List all available models"""
        available = {}
        for model_type in ['LSTM', 'GRU', 'CNN', 'RNN']:
            if model_type not in MODEL_PATHS:
                continue
            
            base_path = MODEL_PATHS[model_type]
            saved_models_path = os.path.join(base_path, 'saved_models')
            
            if not os.path.exists(saved_models_path):
                continue
            
            models = []
            for filename in os.listdir(saved_models_path):
                if filename.endswith('.h5') and not filename.startswith('sp500'):
                    # Parse filename: MODELTYPE_sentimenttype_numcsvs.h5
                    parts = filename.replace('.h5', '').split('_')
                    if len(parts) >= 3:
                        file_model_type = parts[0]
                        file_sentiment = parts[1]
                        try:
                            file_num_csvs = int(parts[2])
                            models.append({
                                'filename': filename,
                                'sentiment_type': file_sentiment,
                                'num_csvs': file_num_csvs,
                                'key': f"{file_model_type}_{file_sentiment}_{file_num_csvs}"
                            })
                        except ValueError:
                            continue
            
            if models:
                available[model_type] = models
        
        return available
