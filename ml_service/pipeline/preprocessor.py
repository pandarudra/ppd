import numpy as np

from pipeline.feature_extractor import FEATURE_ORDER


def to_vector(features: dict) -> np.ndarray:
    """Order a (possibly partial) feature dict into the model's training column order."""
    row = [features.get(name, 0) for name in FEATURE_ORDER]
    return np.array([row], dtype=float)


def scale(vector: np.ndarray, scaler) -> np.ndarray:
    return scaler.transform(vector)
