"""
Utility functions for services
"""
import os

def get_base_dir():
    """Get the base project directory"""
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


