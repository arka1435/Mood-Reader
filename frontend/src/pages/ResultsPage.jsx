import React, { useEffect, useState } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Chart as ChartJS, 
  RadialLinearScale, 
  PointElement, 
  LineElement, 
  Filler, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const emotionColors = {
  calm: '#5A9AD8',
  happy: '#E8784E',
  sad: '#5A9AD8',
  angry: '#D04040',
  fearful: '#9858C8',
  surprise: '#4DB88A',
  disgust: '#7A6A20'
};

const empathyMessages = {
  calm: "You sound grounded and composed. That's a good place to be.",
  happy: "There's warmth and energy in your voice. Keep it going.",
  sad: "It sounds like something is weighing on you. Take it at your own pace.",
  angry: "Tension is coming through clearly. A few slow breaths can reset the baseline.",
  fearful: "Anxiety is present in your voice. You're not alone in feeling this way.",
  surprise: "Something caught you off guard. Quite a reaction.",
  disgust: "Strong aversion detected. It's okay to feel strongly about things."
};

const emotionLabels = ["calm", "happy", "sad", "angry", "fearful", "surprise", "disgust"];

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState([]);

  // Redirect if no state
  if (!location.state || !location.state.dominant_emotion) {
    return <Navigate to="/analyse" replace />;
  }

  const { dominant_emotion, confidence, all_scores, mock } = location.state;
  const currentEmotionColor = emotionColors[dominant_emotion] || '#5A9AD8';
  
  useEffect(() => {
    // Determine color and apply to root
    document.documentElement.style.setProperty('--current-emotion-color', currentEmotionColor);
    document.documentElement.style.transition = 'all 500ms ease';

    // Timeline logic
    const stored = sessionStorage.getItem('moodreader_timeline');
    let parsed = [];
    if (stored) {
      try { parsed = JSON.parse(stored); } catch(e) {}
    }
    
    // Create new entry
    const newEntry = {
      id: Date.now() + Math.random().toString(),
      emotion: dominant_emotion,
      label: dominant_emotion.charAt(0).toUpperCase() + dominant_emotion.slice(1),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: currentEmotionColor
    };
    
    const updated = [newEntry, ...parsed];
    setTimeline(updated);
    sessionStorage.setItem('moodreader_timeline', JSON.stringify(updated));

    // Cleanup root style on unmount
    return () => {
      document.documentElement.style.removeProperty('--current-emotion-color');
      document.documentElement.style.transition = '';
    };
  }, [dominant_emotion, currentEmotionColor]);

  // Chart Logic
  const dataScores = emotionLabels.map(label => all_scores[label] || 0);

  const chartData = {
    labels: emotionLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [
      {
        label: 'Emotion Signature',
        data: dataScores,
        backgroundColor: `${currentEmotionColor}26`, // ~15% opacity hex
        borderColor: currentEmotionColor,
        borderWidth: 2,
        pointBackgroundColor: currentEmotionColor,
        pointBorderColor: '#fff',
        pointRadius: 4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(22, 24, 32, 0.9)',
        titleFont: { family: 'DM Sans', size: 13 },
        bodyFont: { family: 'JetBrains Mono', size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx) => `${(ctx.raw * 100).toFixed(1)}%`
        }
      }
    },
    scales: {
      r: {
        backgroundColor: 'transparent',
        grid: {
          color: 'var(--border-default)',
        },
        angleLines: {
          color: 'var(--border-default)'
        },
        pointLabels: {
          color: 'var(--text-secondary)',
          font: { family: 'DM Sans', size: 13 }
        },
        ticks: {
          display: false,
          max: Math.max(...dataScores, 0.5) < 0.8 && Math.max(...dataScores) < 0.5 ? 0.5 : 1, // Keep scale normalized
          min: 0,
        }
      }
    }
  };

  const handleClear = () => {
    sessionStorage.removeItem('moodreader_timeline');
    setTimeline([timeline[0]]); // Keep just the current one or clear entirely? The prompt says "re-renders empty state". Let's clear completely.
    setTimeline([]);
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-6 pt-12 pb-24 relative overflow-x-hidden">
      
      {mock && (
        <div className="absolute top-6 right-6 bg-elevated border-[0.5px] border-accent-highlight rounded-md px-[10px] py-[4px] z-20">
          <span className="font-mono text-[12px] text-accent-highlight-light">
            Demo mode — mock results
          </span>
        </div>
      )}

      {/* Dominant Emotion Section */}
      <div className="w-full flex flex-col items-center pt-8 pb-8 relative">
        <div 
          className="absolute z-0 w-[400px] h-[200px] rounded-full blur-[60px] opacity-[0.08]"
          style={{ backgroundColor: 'var(--current-emotion-color)', transition: 'background-color 500ms ease' }}
        />
        
        <motion.h1 
          key={dominant_emotion}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="font-display font-bold text-[64px] z-10 leading-none mb-4 capitalize"
          style={{ color: 'var(--current-emotion-color)', transition: 'color 500ms ease' }}
        >
          {dominant_emotion}
        </motion.h1>

        <span className="font-mono text-[28px] text-accent-highlight-light z-10 block mb-6">
          {(confidence * 100).toFixed(1)}%
        </span>

        <div className="w-full max-w-[400px] h-[4px] bg-elevated rounded-full overflow-hidden z-10">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${confidence * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: 'var(--current-emotion-color)', transition: 'background-color 500ms ease' }}
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col md:flex-row gap-12 mt-12 w-full">
        {/* Left Col - Radar */}
        <div className="w-full md:w-[55%] flex items-center justify-center min-h-[300px]">
          <Radar data={chartData} options={chartOptions} />
        </div>

        {/* Right Col - Breakdown & Empathy */}
        <div className="w-full md:w-[45%] flex flex-col">
          <div 
            className="bg-card rounded-xl border-l-[3px] p-5 px-[24px] mb-8 transition-colors duration-500"
            style={{ borderColor: 'var(--current-emotion-color)' }}
          >
            <h4 className="font-body font-medium text-[13px] text-text-muted uppercase tracking-[0.05em] mb-2">
              How you sound
            </h4>
            <p className="font-body text-[16px] text-text-primary">
              {empathyMessages[dominant_emotion]}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {emotionLabels.map((lbl, i) => {
              const score = all_scores[lbl] || 0;
              return (
                <div key={lbl} className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-center w-full">
                    <span className="font-body font-medium text-[13px] text-text-secondary capitalize">{lbl}</span>
                    <span className="font-mono text-[12px] text-text-muted">{(score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-[3px] bg-elevated rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${score * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className="h-full rounded-full opacity-60"
                      style={{ backgroundColor: 'var(--current-emotion-color)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Session Timeline */}
      <div className="w-full mt-24 flex flex-col">
        <h4 className="font-body font-medium text-[13px] text-text-muted uppercase tracking-[0.05em] mb-4">
          Session timeline
        </h4>
        
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-3 min-w-max">
            <AnimatePresence>
              {timeline.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-card rounded-[20px] px-3.5 py-1.5 flex items-center gap-2"
                  style={{ border: `0.5px solid ${item.color}` }}
                >
                  <div 
                    className="w-[8px] h-[8px] rounded-full" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="font-body font-medium text-[13px] text-text-primary capitalize">
                    {item.label}
                  </span>
                  <span className="font-body text-[11px] text-text-muted ml-1">
                    {item.timestamp}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {timeline.length === 0 && (
              <span className="font-body text-[14px] text-text-muted italic">No timeline entries yet.</span>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button 
            onClick={() => navigate('/analyse')}
            className="border-[0.5px] border-border-default bg-transparent font-body font-medium text-[14px] text-text-secondary rounded-lg px-6 py-2 hover:bg-hover hover:text-text-primary transition-colors"
          >
            Analyse again
          </button>
          <button 
            onClick={handleClear}
            className="border-[0.5px] border-border-default bg-transparent font-body font-medium text-[14px] text-text-secondary rounded-lg px-6 py-2 hover:bg-hover hover:text-text-primary transition-colors"
          >
            Clear timeline
          </button>
        </div>
      </div>
    </div>
  );
}
