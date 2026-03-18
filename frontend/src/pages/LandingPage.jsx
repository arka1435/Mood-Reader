import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Waveform = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const barCount = 60;
    const barWidth = 3;
    const barGap = 4;
    canvas.width = 416; // 60 * 3 + 59 * 4
    canvas.height = 64; 

    // Retrieve the secondary accent color safely
    const computedStyle = getComputedStyle(document.documentElement);
    const color = computedStyle.getPropertyValue('--accent-secondary').trim() || '#2E8060';

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerY = canvas.height / 2;
      
      for (let i = 0; i < barCount; i++) {
        const phase = i * 0.2 + time;
        const amplitude = Math.sin(phase) * 20 + 28; // oscillates between 8 and 48
        
        const x = i * (barWidth + barGap);
        const y = centerY - (amplitude / 2);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, amplitude, 2);
        } else {
          ctx.fillRect(x, y, barWidth, amplitude);
        }
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return <canvas ref={canvasRef} className="mx-auto block max-w-full" style={{ width: '416px', height: '64px' }} />;
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col w-full min-h-[calc(100vh-[64px])]">
      {/* Top section - 60vh */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-16 pb-8 min-h-[60vh]">
        <h1 className="font-display font-bold text-[48px] text-text-primary text-center leading-tight max-w-3xl mb-4">
          Hear the emotion behind every voice.
        </h1>
        <p className="font-body text-[18px] text-text-secondary text-center max-w-xl mx-auto mb-12 leading-relaxed">
          Mood Reader analyses your speech in real time and identifies the emotional state behind your words.
        </p>
        
        <div className="mb-12">
          <Waveform />
        </div>
        
        <motion.button
          onClick={() => navigate('/analyse')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="bg-accent-primary text-text-primary font-body font-medium text-[16px] py-[14px] px-[36px] rounded-lg hover:bg-accent-primary-light transition-colors"
        >
          Analyse My Voice
        </motion.button>
      </div>

      {/* Bottom section - 40vh */}
      <div className="w-full max-w-5xl mx-auto px-6 pb-20 mt-auto min-h-[40vh] flex items-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <FeatureCard 
            delay={0.1}
            title="6 emotions detected"
            subtext="Angry · Disgust · Fear · Happy · Neutral · Sad"
          />
          <FeatureCard 
            delay={0.2}
            title="Live waveform"
            subtext="See your voice as you speak in real time"
          />
          <FeatureCard 
            delay={0.3}
            title="Emotion timeline"
            subtext="Track your emotional arc across the session"
          />
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({ title, subtext, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="border-[0.5px] border-border-default bg-card rounded-xl p-6 flex flex-col items-start justify-start"
  >
    <h3 className="font-display font-semibold text-[22px] text-text-primary mb-2">
      {title}
    </h3>
    <p className="font-body text-[16px] text-text-secondary leading-[1.7]">
      {subtext}
    </p>
  </motion.div>
);
