import joblib
import tensorflow as tf
import os
import numpy as np

# Paths
weights_dir = r'd:\Archi_Projects\MoodReader\model_api\weights'
le_path = os.path.join(weights_dir, 'label_encoder.pkl')
sc_path = os.path.join(weights_dir, 'scaler.pkl')
model_path = os.path.join(weights_dir, 'model.keras')

print(f"--- DIAGNOSTIC START ---")

try:
    le = joblib.load(le_path)
    print(f"Labels: {le.classes_.tolist()}")
    print(f"Num Classes: {len(le.classes_)}")
except Exception as e:
    print(f"LE Error: {e}")

try:
    sc = joblib.load(sc_path)
    print(f"Scaler Mean Shape: {sc.mean_.shape}")
    print(f"Scaler Mean (first 5): {sc.mean_[:5].tolist()}")
except Exception as e:
    print(f"Scaler Error: {e}")

try:
    # Keras Version Patch (if needed)
    def patch_dense(dense_class):
        if not hasattr(dense_class, '_is_patched'):
            _orig_init = dense_class.__init__
            def _patched_init(self, *args, **kwargs):
                kwargs.pop('quantization_config', None)
                return _orig_init(self, *args, **kwargs)
            dense_class.__init__ = _patched_init
            dense_class._is_patched = True
    
    from tensorflow.keras import layers
    patch_dense(layers.Dense)
    
    model = tf.keras.models.load_model(model_path)
    print(f"Model Input Shape: {model.input_shape}")
    print(f"Model Output Shape: {model.output_shape}")
    model.summary()
except Exception as e:
    print(f"Model Error: {e}")

print(f"--- DIAGNOSTIC END ---")
