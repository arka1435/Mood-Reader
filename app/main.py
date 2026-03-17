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

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
MODEL = None
MOCK_MODE = True

emotion_labels = ["calm", "happy", "sad", "angry", "fearful", "surprise", "disgust"]

emotions_meta = [
    {"id": "calm", "color": "#5A9AD8", "label": "Calm", "empathy": "You sound grounded and composed. That's a good place to be."},
    {"id": "happy", "color": "#E8784E", "label": "Happy", "empathy": "There's warmth and energy in your voice. Keep it going."},
    {"id": "sad", "color": "#5A9AD8", "label": "Sad", "empathy": "It sounds like something is weighing on you. Take it at your own pace."},
    {"id": "angry", "color": "#D04040", "label": "Angry", "empathy": "Tension is coming through clearly. A few slow breaths can reset the baseline."},
    {"id": "fearful", "color": "#9858C8", "label": "Fearful", "empathy": "Anxiety is present in your voice. You're not alone in feeling this way."},
    {"id": "surprise", "color": "#4DB88A", "label": "Surprise", "empathy": "Something caught you off guard. Quite a reaction."},
    {"id": "disgust", "color": "#7A6A20", "label": "Disgust", "empathy": "Strong aversion detected. It's okay to feel strongly about things."}
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    global MODEL, MOCK_MODE
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model_api", "weights", "emotion_model.keras")
    try:
        import tensorflow as tf
        MODEL = tf.keras.models.load_model(model_path)
        MOCK_MODE = False
        logger.info(f"Successfully loaded model from {model_path}")
    except Exception as e:
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
        "mock_mode": MOCK_MODE
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
                y, sr = librosa.load(tmp_path, sr=22050)
                
            duration = len(y) / sr
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
        if duration < 0.5:
            raise HTTPException(status_code=422, detail="Audio too short. Please record at least 1 second.")
            
        # Step 4: Generate Mel Spectrogram
        mel_spec = librosa.feature.melspectrogram(y=y, sr=22050, n_mels=128, fmax=8000)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # Output shape is (128, T)
        T = mel_spec_db.shape[1]
        
        if T < 128:
            pad_width = 128 - T
            mel_spec_db = np.pad(mel_spec_db, ((0, 0), (0, pad_width)), mode='constant')
        elif T > 128:
            mel_spec_db = mel_spec_db[:, :128]
            
        # Reshape for CNN
        mel_input = mel_spec_db.reshape(1, 128, 128, 1)
        
        # Step 5: Inference
        if MOCK_MODE:
            raw_scores = np.random.rand(7)
            scores = np.exp(raw_scores) / np.sum(np.exp(raw_scores))
        else:
            scores = MODEL.predict(mel_input)[0]
            
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
