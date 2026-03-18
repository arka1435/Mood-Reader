import os
import sys
import numpy as np
import librosa
import joblib
import tensorflow as tf
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Keras Version Patch
def patch_dense(dense_class):
    if not hasattr(dense_class, '_is_patched'):
        _orig_init = dense_class.__init__
        def _patched_init(self, *args, **kwargs):
            kwargs.pop('quantization_config', None)
            return _orig_init(self, *args, **kwargs)
        dense_class.__init__ = _patched_init
        dense_class._is_patched = True
        return True
    return False

try:
    import keras
    if hasattr(keras.layers, 'Dense'):
        if patch_dense(keras.layers.Dense):
            logger.info("Applied standalone Keras Dense patch")
except Exception as e:
    logger.debug(f"Standalone Keras patch skipped: {e}")

try:
    from tensorflow.keras import layers as tf_layers
    if hasattr(tf_layers, 'Dense'):
        if patch_dense(tf_layers.Dense):
            logger.info("Applied TensorFlow Keras Dense patch")
except Exception as e:
    logger.debug(f"TF Keras patch skipped: {e}")

# Paths
weights_dir = r'd:\Archi_Projects\MoodReader\model_api\weights'
model_path = os.path.join(weights_dir, 'model.keras')
scaler_path = os.path.join(weights_dir, 'scaler.pkl')
label_encoder_path = os.path.join(weights_dir, 'label_encoder.pkl')

# Load weights
try:
    scaler = joblib.load(scaler_path)
    label_encoder = joblib.load(label_encoder_path)
    logger.info("Loaded scaler and label encoder")
    logger.info(f"Labels: {label_encoder.classes_}")
except Exception as e:
    logger.error(f"Failed to load joblib weights: {e}")

try:
    model = tf.keras.models.load_model(model_path)
    logger.info("Successfully loaded model with TF Keras")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    try:
        import keras
        model = keras.models.load_model(model_path)
        logger.info("Successfully loaded model with standalone Keras")
    except Exception as e2:
        logger.error(f"Failed to load model with standalone Keras: {e2}")
        model = None

if model:
    # Diagnostic: Print model summary and first layer weights
    model.summary()
    try:
        weights = model.layers[1].get_weights() # layer 0 is likely input, 1 is dense
        if weights:
            logger.info(f"First layer weight shape: {weights[0].shape}")
            logger.info(f"First layer weight mean: {np.mean(weights[0])}")
            logger.info(f"First layer weight std: {np.std(weights[0])}")
    except Exception as e:
        logger.warning(f"Could not inspect weights: {e}")

# Check versions
logger.info(f"Python: {sys.version}")
logger.info(f"Librosa: {librosa.__version__}")
logger.info(f"Numpy: {np.version.version}")
logger.info(f"Tensorflow: {tf.__version__}")
try:
    import sklearn
    logger.info(f"Scikit-learn: {sklearn.__version__}")
except:
    pass
