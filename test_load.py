import numpy as np
import tensorflow as tf
import joblib

SCALER = joblib.load(r'd:\Archi_Projects\MoodReader\model_api\weights\scaler.pkl')
MODEL = tf.keras.models.load_model(r'd:\Archi_Projects\MoodReader\model_api\weights\model.h5')

print(f"Scaler Mean Shape: {SCALER.mean_.shape}")
print(f"Scaler Mean (first 5): {SCALER.mean_[:5]}")
print(f"Scaler Scale (first 5): {SCALER.scale_[:5]}")

# Let's see if we have any valid wav files in temp or if we can make a dummy signal resembling voice
t = np.linspace(0, 3, 3*22050)
dummy_voice = 0.5 * np.sin(2 * np.pi * 440 * t) + 0.1 * np.random.randn(len(t))

import librosa
mfcc = librosa.feature.mfcc(y=dummy_voice, sr=22050, n_mfcc=40)
stft = np.abs(librosa.stft(dummy_voice))
chroma = librosa.feature.chroma_stft(S=stft, sr=22050)
mel = librosa.feature.melspectrogram(y=dummy_voice, sr=22050)
mel = librosa.power_to_db(mel)
delta = librosa.feature.delta(mfcc)

features = np.hstack([
    np.mean(mfcc, axis=1),
    np.mean(chroma, axis=1),
    np.mean(mel, axis=1),
    np.mean(delta, axis=1)
])

print(f"Extracted Features (first 5): {features[:5]}")
feature_input = features.reshape(1, -1)
scaled = SCALER.transform(feature_input)
print(f"Scaled Features (first 5): {scaled[0][:5]}")

preds = MODEL.predict(scaled)
print(f"Predictions: {preds}")
