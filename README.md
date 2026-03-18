# Mood Reader Documentation

This document provides a comprehensive overview of the **Mood Reader** project, including its core features, detailed audio processing pipeline, the model architecture, and the frontend pages.

---

## 🚀 Features

- **Real-time Voice Analysis**: Users can record their speech directly from their browser, visualizing the live waveform as they speak.
- **File Uploads**: Support for uploading pre-recorded audio files in various formats (WAV, MP3, WebM, OGG, M4A).
- **Client-Side Audio Decoding**: Uses the browser's native Web Audio API to decode inputs into raw PCM WAV, eliminating the need for complex server-side dependency setups (like ffmpeg).
- **6-Class Emotion Detection**: Detects emotions categorized into: *Angry*, *Disgust*, *Fear*, *Happy*, *Neutral*, and *Sad*.
- **Emotion Timeline (Session History)**: Tracks the user's emotional arc across a session, saving events safely within `sessionStorage`.
- **Dynamic Theming**: The application dynamically changes colors to match the detected dominant emotion.
- **Empathy Engine**: Provides tailored empathy messages acknowledging the current detected state.
- **Fail-safe Mock Mode**: Development mode that generates mock data if the deep learning model fails to load in the backend.

---

## ⚙️ Detailed Pipeline

The request flow from the user recording their audio to seeing the results operates as follows:

### 1. Frontend Collection
The user initiates a recording or drops an audio file in the core interface (`AnalysePage.jsx`).
- For Live Recording: Handled via `navigator.mediaDevices.getUserMedia`. The stream is converted using `MediaRecorder` into chunks. A live visualizer reads the active stream.

### 2. Client-Side Pre-processing
To ensure backend compatibility regardless of the user's browser, the frontend processes the file natively:
- Uses the `AudioContext` to decode the audio into an `AudioBuffer`.
- A custom extraction utility (`audioBufferToWav`) parses the raw audio channels into a standard **16-bit PCM WAV Blob**.

### 3. API Transmission
The payload (Wav Blob) is bundled into `FormData` under the key `audio_file` and sent via POST to the backend API (`/api/analyse/voice`).

### 4. Backend Processing (`main.py`)
- **Ingestion**: The FastAPI endpoint receives the bytes and writes them to a temporary `<uuid>.wav` file.
- **Loading**: The audio is loaded using `librosa.load()` at a target sample rate of `22050Hz`.
- **Validation**: Audio files smaller than `0.5s` are rejected with a `422` error.

### 5. Feature Extraction
- The backend computes a **Mel Spectrogram** (`n_mels=128`, `fmax=8000`) and converts powers to Decibels (dB).
- The output dimensions are clipped or padded to guarantee an exact `128x128` dimension representing time/frequency.
- Reshaped into a typical 4D tensor input `(1, 128, 128, 1)` suited for Convolutional Neural Networks.

### 6. Model Inference
- If the keras weights are loaded successfully on startup, `MODEL.predict()` maps the features into raw scores.
- Otherwise, the system defaults to generating mock random scores indicating the Mock state to the frontend in JSON.

### 7. Results Interpretation
- The raw neural network softmax outputs are mapped to the 6 emotion labels.
- The dominant emotion (highest probability) and the probability score itself (confidence) are extracted and returned as a JSON response.

### 8. UI Rendering (`ResultsPage.jsx`)
- The payload is routed correctly. `ChartJS` plots a stylized Radar Chart using `all_scores`.
- CSS variables inject the specific emotion's highlight color globally.
- The new emotion record is appended to the `sessionStorage` tracking timeline.

---

## 📄 Pages (Frontend Architecture)

Driven largely by **React Router DOM** and **Framer Motion**, the presentation layer is sliced into modular pages:

### `LandingPage.jsx` (`/`)
The main entry point designed to convert potential users. Showcases a simulated waveform banner and outlines the 3 key pillars of value: 7 tracked emotions, live waveform, and an emotion timeline.

### `AnalysePage.jsx` (`/analyse`)
The foundational interactive page. Built around a robust tab-system encompassing:
- **Record Live Tab**: Houses the `canvas` element responsible for waveform rendering and manages microphone permissions and the `MediaRecorder` API. 
- **Upload File Tab**: Supports drag-and-drop mechanics with client-side verification to handle audio inputs dynamically. 
Also coordinates the API call loop (including error toasts and processing animations).

### `ResultsPage.jsx` (`/results`)
The output visualization dashboard dynamically adjusting to the data:
- Plots the `emotionColors` mapped variables.
- Manages the `ChartJS` `Radar` dataset for "Emotion Signature".
- Controls the "Empathy Feedback" text maps.
- Renders the progressive "Session Timeline" from prior requests maintained inside `sessionStorage`.

### `AboutPage.jsx` (`/about`)
Static informational display. Outlines the dataset (RAVDESS), the architecture specifications (CNN on Mel Spectrograms resulting in a `128x128` input), model accuracy figures (`~72%`), and highlights the team creators.

---

## 🛠 Tech Stack Overview

- **Frontend**: React (Vite build), Tailwind CSS for styling, Framer Motion for layout/route animations, Chart.js for data visualization, and Lucide React for UI iconography.
- **Backend API**: FastAPI (Python), uvicorn.
- **Machine Learning / Audio**: TensorFlow / Keras for model inferences, `librosa` for advanced audio/music analysis.
