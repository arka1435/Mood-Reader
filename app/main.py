import io
import os
import random
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import librosa
from pydub import AudioSegment
import tensorflow as tf

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Keras Version Patch: Ignore quantization_config during loading
# This resolves "ValueError: Unrecognized keyword arguments passed to Dense: {'quantization_config': None}"
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

# Global variables
MODEL = None
MOCK_MODE = True

try:
    import joblib
    _weights_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model_api", "weights"))
    SCALER = joblib.load(os.path.join(_weights_dir, 'scaler.pkl'))
    LABEL_ENCODER = joblib.load(os.path.join(_weights_dir, 'label_encoder.pkl'))
    # Read directly from label encoder — do not hardcode
    emotion_labels = LABEL_ENCODER.classes_.tolist()
    logger.info(f"Loaded scaler and label encoder from {_weights_dir}")
    logger.info(f"Emotion labels: {emotion_labels}")
except Exception as e:
    logger.warning(f"Failed to load joblib weights: {e}")
    SCALER = None
    LABEL_ENCODER = None
    emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad']

emotions_meta = [
    {"id": "angry", "color": "#D04040", "label": "Angry", "empathy": "Tension is coming through clearly. A few slow breaths can reset the baseline."},
    {"id": "fear", "color": "#9858C8", "label": "Fear", "empathy": "Anxiety is present in your voice. You're not alone in feeling this way."},
    {"id": "happy", "color": "#E8784E", "label": "Happy", "empathy": "There's warmth and energy in your voice. Keep it going."},
    {"id": "neutral", "color": "#888580", "label": "Neutral", "empathy": "You sound composed and level. A calm baseline to work from."},
    {"id": "sad", "color": "#5A9AD8", "label": "Sad", "empathy": "It sounds like something is weighing on you. Take it at your own pace."},
    {"id": "disgust", "color": "#4DB88A", "label": "Disgust", "empathy": "Something seems off-putting to you. Quite a reaction."}
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    global MODEL, MOCK_MODE
    model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model_api", "weights", "model.keras"))
    try:
        try:
            import keras
            MODEL = keras.models.load_model(model_path)
        except:
            MODEL = tf.keras.models.load_model(model_path)
        MOCK_MODE = False
        logger.info(f"Successfully loaded model from {model_path}")
    except Exception as e:
        import traceback
        with open("uvicorn_error.txt", "w") as f:
            traceback.print_exc(file=f)
        logger.warning(f"Failed to load model from {model_path}. Starting in MOCK_MODE. Error: {e}")
        MODEL = None
        MOCK_MODE = True
    yield
    # Cleanup on shutdown if needed

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok", 
        "model_loaded": not MOCK_MODE, 
        "mock_mode": MOCK_MODE,
        "version": "v220_feature_fix_001"
    }

@app.get("/api/emotions/meta")
def get_emotions_meta():
    return {"emotions": emotions_meta}

@app.post("/api/analyse/voice")
async def analyse_voice(audio_file: UploadFile = File(...)):
    try:
        # Step 1: Read bytes
        audio_bytes = await audio_file.read()
        
        # Step 2: Write bytes to temporary WAV file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
            
        try:
            # Step 3: Load with librosa and validate duration
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                # Load full audio — do NOT apply any offset windowing, use the complete clip
                y, sr = librosa.load(tmp_path, sr=22050)
                duration = len(y) / sr
                
            logger.info(f"Audio Loaded: {duration:.2f}s total.")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
        if duration < 0.5:
            raise HTTPException(status_code=422, detail="Audio too short. Please record at least 1 second.")
            
        # Step 4: Extract 220 Features (MFCC, Chroma, Mel, Delta)
        # n_mels=128 must be explicit — matches training configuration
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        stft = np.abs(librosa.stft(y))
        chroma = librosa.feature.chroma_stft(S=stft, sr=sr)
        mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
        mel = librosa.power_to_db(mel)
        delta = librosa.feature.delta(mfcc)
        
        # 40 MFCC + 12 Chroma + 128 Mel + 40 Delta = 220 features
        features = np.hstack([
            np.mean(mfcc, axis=1),
            np.mean(chroma, axis=1),
            np.mean(mel, axis=1),
            np.mean(delta, axis=1)
        ])
        logger.info(f"Feature vector shape: {features.shape}")
        
        # Scale and reshape for model (None, 220)
        model_input = features.reshape(1, -1)
        
        logger.info(f"Raw Features (first 5): {features[:5]}")
        logger.info(f"Audio Length: {duration}s")
        
        if SCALER is not None:
            model_input = SCALER.transform(model_input)
            
        logger.info(f"Scaled Features (first 5): {model_input[0][:5]}")
        
        # Step 5: Inference
        if MOCK_MODE:
            raw_scores = np.random.rand(6)
            scores = np.exp(raw_scores) / np.sum(np.exp(raw_scores))
        else:
            scores = MODEL.predict(model_input)[0]
            logger.info(f"Raw Model Output: {scores}")
            
        # Step 6: Map scores to labels
        all_scores = {label: float(score) for label, score in zip(emotion_labels, scores)}
        dominant_emotion = max(all_scores, key=all_scores.get)
        confidence = all_scores[dominant_emotion]
        
        # Step 7: Return JSON
        return {
            "dominant_emotion": dominant_emotion,
            "confidence": round(confidence, 4),
            "all_scores": {k: round(v, 4) for k, v in all_scores.items()},
            "mock": MOCK_MODE
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Inference failed: {str(e)}", exc_info=True)
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Inference failed. Error: {str(e)}\n\nTraceback: {tb}")
