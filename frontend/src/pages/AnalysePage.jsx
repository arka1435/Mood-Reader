import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Trash2, UploadCloud } from 'lucide-react';
import axios from 'axios';

export default function AnalysePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('record');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorToast, setErrorToast] = useState('');
  
  // Audio state
  const [audioFile, setAudioFile] = useState(null); // The actual file/blob to upload
  const [audioUrl, setAudioUrl] = useState(null); // Local URL for playback
  const [audioDuration, setAudioDuration] = useState(0);

  // Tabs structure
  const tabs = [
    { id: 'record', label: 'Record live' },
    { id: 'upload', label: 'Upload file' }
  ];

  const handleAnalyse = async () => {
    if (!audioFile) return;
    setIsProcessing(true);
    setErrorToast('');

    try {
      // Decode ANY audio format into a raw AudioBuffer via AudioContext
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      // Convert standard AudioBuffer to raw PCM WAV blob
      const wavBlob = audioBufferToWav(audioBuffer);

      const formData = new FormData();
      formData.append('audio_file', wavBlob, 'recording.wav');

      // Assuming Vite proxy handles /api
      const response = await axios.post('/api/analyse/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Navigate to results
      navigate('/results', { state: response.data });
    } catch (err) {
      console.error(err);
      const detailMsg = err.response?.data?.detail;
      const displayStr = typeof detailMsg === 'string' ? detailMsg : 'Analysis failed. Please try again.';
      setErrorToast(displayStr);
      setIsProcessing(false);
    }
  };

  // Helper utility to convert Web Audio API AudioBuffer to standard WAV Blob
  // This bypasses the need for ffmpeg on the python backend since browser natively understands all formats
  const audioBufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };
    const setString = (data) => { for (let j=0; j<data.length; j++) { view.setUint8(pos, data.charCodeAt(j)); pos++; } };

    setString('RIFF');
    setUint32(length - 8);
    setString('WAVE');
    setString('fmt ');
    setUint32(16);
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setString('data');
    setUint32(length - pos - 4);

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while(pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true); 
            pos += 2;
        }
        offset++;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-6 relative items-center pb-20">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-6 left-6 right-6 z-50 bg-elevated border-l-[3px] border-accent-primary p-4 rounded-md shadow-lg flex justify-between items-center"
          >
            <span className="font-body text-[14px] text-text-primary">{errorToast}</span>
            <button 
              onClick={() => setErrorToast('')}
              className="text-text-secondary hover:text-text-primary font-body text-[13px] uppercase tracking-wider font-medium px-3 py-1 bg-hover rounded"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="font-display font-semibold text-[32px] text-text-primary text-center mt-12 mb-8">
        Analyse your voice
      </h1>

      <AnimatePresence mode="wait">
        {isProcessing ? (
          <ProcessingState key="processing" />
        ) : (
          <motion.div
            key="tabs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex justify-center flex-col" // Correct flex direction to column for layout
          >
            {/* Tab Bar */}
            <div className="flex bg-card p-1 rounded-lg mx-auto mb-10 border-[0.5px] border-border-default self-center w-[280px]">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                       setActiveTab(tab.id);
                       setAudioFile(null);
                       setAudioUrl(null);
                       setAudioDuration(0);
                    }}
                    className={`relative flex-1 py-1.5 px-4 font-body text-[14px] font-medium transition-colors z-10 ${
                      isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBadge"
                        className="absolute inset-0 bg-accent-primary rounded-md -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Container */}
            <div className="w-full flex justify-center items-center flex-col">
              {activeTab === 'record' && (
                <RecordLiveTab 
                  onRecordingComplete={(blob, duration) => {
                    setAudioFile(blob);
                    setAudioUrl(URL.createObjectURL(blob));
                    setAudioDuration(duration);
                  }}
                />
              )}

              {activeTab === 'upload' && (
                <UploadFileTab
                  onFileAccepted={(file, url, duration) => {
                    setAudioFile(file);
                    setAudioUrl(url);
                    setAudioDuration(duration);
                  }}
                />
              )}

              {/* Shared Audio Preview Row */}
              {audioFile && audioUrl && (
                <div className="w-full max-w-lg mt-8 flex flex-col gap-4">
                  <AudioPreviewRow 
                    url={audioUrl} 
                    filename={audioFile.name || 'recording.webm'} 
                    duration={audioDuration}
                    onClear={() => {
                      setAudioFile(null);
                      setAudioUrl(null);
                      setAudioDuration(0);
                    }}
                  />
                  <button
                    onClick={handleAnalyse}
                    className="w-full bg-accent-primary hover:bg-accent-primary-light text-text-primary font-body font-medium text-[16px] py-[14px] rounded-lg transition-colors border-[0.5px] border-border-default shadow-sm font-medium"
                  >
                    Analyse
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------
// COMPONENTS
// ----------------------------------------------------

const ProcessingState = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex-1 flex flex-col items-center justify-center min-h-[300px]"
  >
    <div className="flex gap-2 items-end h-[60px] mb-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          animate={{
            height: ['10px', '40px', '10px'],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut"
          }}
          className="w-[4px] bg-accent-secondary rounded-full"
        />
      ))}
    </div>
    <p className="font-body text-[16px] text-text-secondary mb-1">Analysing your voice...</p>
    <p className="font-body text-[13px] text-text-muted">This usually takes 2–4 seconds</p>
  </motion.div>
);

const RecordLiveTab = ({ onRecordingComplete }) => {
  const [recordingState, setRecordingState] = useState('idle'); // idle | recording | recorded
  const [duration, setDuration] = useState(0);
  const [permissionError, setPermissionError] = useState('');
  
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const durationIntervalRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      stopStreams();
    };
  }, []);

  const stopStreams = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    cancelAnimationFrame(animationFrameRef.current);
    clearInterval(durationIntervalRef.current);
  };

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const computedStyle = getComputedStyle(document.documentElement);
    const borderColor = computedStyle.getPropertyValue('--border-default').trim() || '#2E3250';
    const secondaryColor = computedStyle.getPropertyValue('--accent-secondary').trim() || '#2E8060';
    const highlightColor = computedStyle.getPropertyValue('--accent-highlight-light').trim() || '#E8CC20';

    ctx.clearRect(0, 0, width, height);
    
    // Calculate vertical center
    const centerY = height / 2;

    if (recordingState === 'idle' || recordingState === 'recorded') {
      // Flat line
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (analyserRef.current) {
      // Drawing real time
      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      const sliceWidth = width * 1.0 / bufferLength;
      let x = 0;

      // Check max amplitude to flag peak flash
      let maxVal = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i];
        if (Math.abs(v - 128) > maxVal) maxVal = Math.abs(v - 128);
      }

      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = maxVal > 80 ? highlightColor : secondaryColor; // flash on peak

      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // 0.0 to 2.0
        const y = v * centerY;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [recordingState]);

  useEffect(() => {
    // Redraw whenever state changes
    if (recordingState === 'idle' || recordingState === 'recorded') {
      cancelAnimationFrame(animationFrameRef.current);
      drawWaveform();
    }
  }, [recordingState, drawWaveform]);

  // Adjust canvas size on mount
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = canvasRef.current.offsetWidth;
      canvasRef.current.height = canvasRef.current.offsetHeight;
      drawWaveform();
    }
  }, [drawWaveform]);

  const handleToggleRecord = async () => {
    if (recordingState === 'idle') {
      setPermissionError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // Stop interval so duration stops climbing
          clearInterval(durationIntervalRef.current);
          
          // Use a functional update to get the latest duration state, 
          // or just pass a locally tracked variable if we need it synchronously.
          // Since setDuration is async, let's just calculate it based on when we started
          setDuration((latestDuration) => {
             onRecordingComplete(blob, latestDuration);
             return latestDuration;
          });
        };

        mediaRecorder.start();
        setRecordingState('recording');
        setDuration(0);

        durationIntervalRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);

        drawWaveform();

      } catch (err) {
        console.error("Mic error:", err);
        setPermissionError('Microphone access denied. Please use the Upload tab instead.');
      }
    } else if (recordingState === 'recording') {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      stopStreams();
      setRecordingState('recorded'); // Shows preview externally
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-lg flex flex-col items-center">
      <div className="w-full h-[120px] bg-elevated rounded-xl border-[0.5px] border-border-default mb-8 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      <motion.button
        animate={{
          backgroundColor: recordingState === 'recording' 
            ? 'var(--accent-secondary)' 
            : 'var(--accent-primary)'
        }}
        transition={{ duration: 0.3 }}
        onClick={handleToggleRecord}
        disabled={recordingState === 'recorded'}
        className={`w-[72px] h-[72px] rounded-full flex items-center justify-center relative ${recordingState === 'recorded' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform cursor-pointer shadow-lg'}`}
      >
        {recordingState === 'idle' || recordingState === 'recorded' ? (
          <div className="w-[12px] h-[12px] rounded-full bg-text-primary" />
        ) : (
          <div className="w-[14px] h-[14px] rounded-sm bg-text-primary" />
        )}
      </motion.button>

      {permissionError && (
        <p className="mt-4 font-body text-[14px] text-accent-primary-light text-center">
          {permissionError}
        </p>
      )}

      {!permissionError && recordingState !== 'recorded' && (
        <span className="mt-4 font-body text-[14px] text-text-muted">
          {recordingState === 'recording' ? formatTime(duration) : 'Ready to record'}
        </span>
      )}
    </div>
  );
};

const UploadFileTab = ({ onFileAccepted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorStr, setErrorStr] = useState('');
  const fileInputRef = useRef(null);

  const supportedTypes = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/x-m4a', 'audio/mp4'];
  const extRegex = /\.(wav|mp3|webm|ogg|m4a)$/i;

  const validateAndProcess = (file) => {
    if (!file) return;
    setErrorStr('');
    
    // Check type by mime or extension
    const matchesExt = extRegex.test(file.name);
    if (!supportedTypes.includes(file.type) && !matchesExt && file.type !== '') {
      setErrorStr('Unsupported file type. Please use WAV, MP3, WebM, OGG, or M4A.');
      return;
    }

    // Try to get duration, although exact duration isn't strictly required, 
    // it makes the UI look good. We'll use an Audio element to peek the duration.
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      onFileAccepted(file, url, Math.round(audio.duration || 0));
    };
    audio.onerror = () => {
      // Still accept if duration check fails
      onFileAccepted(file, url, 0);
    };
  };

  const handleAnalyseClick = () => {
    fileInputRef.current?.click();
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const onDragLeave = () => setIsDragging(false);
  
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-lg mt-4 flex flex-col items-center">
      <div 
        onClick={handleAnalyseClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full h-[180px] border-[1.5px] border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragging ? 'border-accent-secondary bg-elevated' : 'border-border-default bg-card hover:border-accent-tertiary-light hover:bg-elevated'
        }`}
      >
        <UploadCloud className="w-8 h-8 text-text-muted mb-3" />
        <span className="font-body text-[16px] text-text-primary mb-1 pointer-events-none">
          Drop your audio file here
        </span>
        <span className="font-body text-[13px] text-text-muted pointer-events-none">
          Supports WAV · MP3 · WebM · OGG · M4A
        </span>
      </div>
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        accept="audio/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            validateAndProcess(e.target.files[0]);
          }
        }}
      />
      
      {errorStr && (
        <span className="mt-4 font-body text-[14px] text-accent-primary-light text-center">
          {errorStr}
        </span>
      )}
    </div>
  );
};

const AudioPreviewRow = ({ url, filename, duration, onClear }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(url);
    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);
    audio.onplay = () => setIsPlaying(true);
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [url]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const formatMs = (secs) => {
    const min = Math.floor(secs / 60);
    const rSecs = Math.floor(secs % 60);
    return `${min}:${rSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-elevated rounded-lg p-3 flex items-center justify-between border-[0.5px] border-border-default h-[64px]">
      <div className="flex items-center">
        <button 
          onClick={handlePlayPause}
          className="w-10 h-10 rounded-full bg-card flex items-center justify-center hover:bg-hover transition-colors text-accent-tertiary-light mr-4"
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <div className="flex flex-col">
          <span className="font-body text-[14px] text-text-primary truncate max-w-[200px] sm:max-w-[280px]">
            {filename}
          </span>
          <span className="font-mono text-[12px] text-text-muted">
            {formatMs(duration)}
          </span>
        </div>
      </div>
      <button 
        onClick={onClear}
        className="p-2 text-text-muted hover:text-accent-primary-light transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};
