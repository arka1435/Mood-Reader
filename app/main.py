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

# Global variables
MODEL = None
MOCK_MODE = True

try:
    import joblib
    SCALER = joblib.load('model_api/weights/scaler.pkl')
    LABEL_ENCODER = joblib.load('model_api/weights/label_encoder.pkl')
    # Read directly from label encoder — do not hardcode
    emotion_labels = LABEL_ENCODER.classes_.tolist()
    # Confirms as: ['angry', 'fearful', 'happy', 'neutral', 'sad', 'surprised']
except Exception as e:
    logger.warning(f"Failed to load joblib weights: {e}")
    SCALER = None
    LABEL_ENCODER = None
    emotion_labels = ['angry', 'fearful', 'happy', 'neutral', 'sad', 'surprised']

emotions_meta = [
    {"id": "angry", "color": "#D04040", "label": "Angry", "empathy": "Tension is coming through clearly. A few slow breaths can reset the baseline."},
    {"id": "fearful", "color": "#9858C8", "label": "Fearful", "empathy": "Anxiety is present in your voice. You're not alone in feeling this way."},
    {"id": "happy", "color": "#E8784E", "label": "Happy", "empathy": "There's warmth and energy in your voice. Keep it going."},
    {"id": "neutral", "color": "#888580", "label": "Neutral", "empathy": "You sound composed and level. A calm baseline to work from."},
    {"id": "sad", "color": "#5A9AD8", "label": "Sad", "empathy": "It sounds like something is weighing on you. Take it at your own pace."},
    {"id": "surprised", "color": "#4DB88A", "label": "Surprised", "empathy": "Something caught you off guard. Quite a reaction."}
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    global MODEL, MOCK_MODE
    model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model_api", "weights", "model.h5"))
    try:
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
                # Load full first to check duration
                full_y, sr = librosa.load(tmp_path, sr=22050)
                duration = len(full_y) / sr
                
                # Apply the user's training window (3s with 0.5s offset) if possible
                if duration > 0.5:
                    y = full_y[int(0.5 * sr):int(3.5 * sr)]
                else:
                    y = full_y
                
            logger.info(f"Audio Loaded: {duration:.2f}s total. Processing {len(y)/sr:.2f}s window.")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
        if duration < 0.5:
            raise HTTPException(status_code=422, detail="Audio too short. Please record at least 1 second.")
            
        # Step 4: Extract 220 Features (MFCC, Chroma, Mel, Delta)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
        stft = np.abs(librosa.stft(y))
        chroma = librosa.feature.chroma_stft(S=stft, sr=sr)
        mel = librosa.feature.melspectrogram(y=y, sr=sr)
        mel = librosa.power_to_db(mel)
        delta = librosa.feature.delta(mfcc)
        
        features = np.hstack([
            np.mean(mfcc, axis=1),
            np.mean(chroma, axis=1),
            np.mean(mel, axis=1),
            np.mean(delta, axis=1)
        ])
        
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
