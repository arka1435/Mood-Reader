# 🎤 MOOD READER — Speech Emotion Detection System

An AI-powered web application that analyzes human speech and detects emotions such as **happy, sad, angry, fear, neutral, and disgust**.

---

## 🚀 Features

* 🎧 Upload audio and detect emotion instantly
* 🧠 Deep Learning model (TensorFlow / Keras)
* 📊 Real-time emotion probability visualization (Radar Chart)
* 🎨 Modern premium UI with animations
* ⚡ FastAPI backend for real-time inference

---

## 🧠 Model Details

* Dataset: **RAVDESS + CREMA-D**
* Features Extracted:

  * MFCC (40)
  * Chroma (12)
  * Mel Spectrogram (128)
  * Delta (40)
* Total Features: **220**
* Model: Fully Connected Neural Network
* Accuracy: ~58%

---

## 📁 Project Structure

```
speech_emotion_app/
│
├── backend/
│   ├── main.py
│   ├── model.keras
│   ├── scaler.pkl
│   ├── label_encoder.pkl
│
├── frontend/
│   ├── index.html
│
├── requirements.txt
├── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/mood-reader.git
cd mood-reader
```

---

### 2️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

---

### 3️⃣ Run Backend

```bash
cd backend
uvicorn main:app --reload
```

Backend will run at:

```
http://127.0.0.1:8000
```

---

### 4️⃣ Run Frontend

```bash
cd frontend
python -m http.server 5500
```

Open in browser:

```
http://localhost:5500
```

---

## 📊 API Endpoint

### POST `/predict`

Upload an audio file and get emotion prediction.

**Response:**

```json
{
  "emotion": "happy",
  "confidence": 0.45,
  "probabilities": {
    "happy": 0.45,
    "sad": 0.12,
    "angry": 0.10,
    "neutral": 0.08,
    "fear": 0.15,
    "disgust": 0.10
  }
}
```

---

## 🎯 Future Improvements

* 🎤 Live microphone emotion detection
* 📈 Real-time waveform visualization
* 🌐 Deploy to cloud (AWS / Render)
* 🤖 Improve model accuracy with CNN / LSTM
---
Video Demo Link: https://drive.google.com/file/d/152lv-fuxacC3TzJGVZm2kKMNM7UKWogB/view?usp=sharing

