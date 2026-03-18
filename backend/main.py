import numpy as np
import librosa
import joblib
import tensorflow as tf
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import soundfile as sf
import io

app = FastAPI()

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Load model + tools
model = tf.keras.models.load_model("model.keras")
label_encoder = joblib.load("label_encoder.pkl")
scaler = joblib.load("scaler.pkl")

# ✅ EXACT TRAINING FEATURE EXTRACTION
def extract_features(audio, sr):
    # Trim silence
    audio, _ = librosa.effects.trim(audio)

    # Fix length to 3 sec
    if len(audio) < 3 * sr:
        audio = np.pad(audio, (0, 3 * sr - len(audio)))
    else:
        audio = audio[:3 * sr]

    # Normalize
    audio = librosa.util.normalize(audio)

    # MFCC (40)
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40)

    # Chroma (12)
    chroma = librosa.feature.chroma_stft(y=audio, sr=sr)

    # Mel (128)
    mel = librosa.feature.melspectrogram(y=audio, sr=sr)
    mel = librosa.power_to_db(mel)

    # Delta (40)
    delta = librosa.feature.delta(mfcc)

    # Combine → EXACT SAME AS TRAINING
    features = np.hstack([
        np.mean(mfcc.T, axis=0),
        np.mean(chroma.T, axis=0),
        np.mean(mel.T, axis=0),
        np.mean(delta.T, axis=0)
    ])

    return features  # should be (220,)

# ✅ TEST ROUTE
@app.get("/")
def home():
    return {"message": "Backend is running 🚀"}

# ✅ PREDICTION
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        audio, sr = sf.read(io.BytesIO(contents))

        # Convert stereo → mono
        if len(audio.shape) > 1:
            audio = np.mean(audio, axis=1)

        # Extract features
        features = extract_features(audio, sr)
        print("Feature shape:", features.shape)  # should be (220,)

        # Scale
        features = scaler.transform([features])

        # Predict
        prediction = model.predict(features, verbose=0)
        predicted_class = np.argmax(prediction)

        emotion = label_encoder.inverse_transform([predicted_class])[0]
        confidence = float(np.max(prediction))

        return {
            "emotion": emotion,
            "confidence": confidence
        }

    except Exception as e:
        return {"error": str(e)}