import React from 'react';
import { motion } from 'framer-motion';

export default function AboutPage() {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="w-full max-w-[720px] mx-auto px-6 py-12 flex flex-col gap-12 bg-base">
      {/* Section 1 */}
      <section>
        <h2 className="font-display font-semibold text-[32px] text-text-primary mb-4">What is Mood Reader</h2>
        <p className="font-body text-[16px] text-text-secondary leading-[1.7]">
          Mood Reader is an advanced real-time speech emotion recognition tool. It analyzes the acoustic properties of your voice to map your expressed state to one of seven distinct emotional categories. Whether for self-reflection, accessibility features, or conversational analytics, Mood Reader reveals the feelings behind the words.
        </p>
      </section>

      {/* Section 2 */}
      <section>
        <h2 className="font-display font-semibold text-[32px] text-text-primary mb-6">How it works</h2>
        <div className="flex flex-col gap-4">
          <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="bg-card rounded-xl px-[24px] py-[20px] border-l-[3px] border-accent-primary">
             <p className="font-body text-[16px] text-text-primary">Your voice is recorded or uploaded</p>
          </motion.div>
          <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="bg-card rounded-xl px-[24px] py-[20px] border-l-[3px] border-accent-secondary">
             <p className="font-body text-[16px] text-text-primary">40 MFCC features (or Mel Spectrograms) are extracted from the audio signal</p>
          </motion.div>
          <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="bg-card rounded-xl px-[24px] py-[20px] border-l-[3px] border-accent-tertiary">
             <p className="font-body text-[16px] text-text-primary">A deep learning model classifies the emotion from the features</p>
          </motion.div>
        </div>
      </section>

      {/* Section 3 */}
      <section>
        <h2 className="font-display font-semibold text-[32px] text-text-primary mb-6">The model</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col justify-center">
            <ul className="font-body text-[16px] text-text-secondary leading-[1.7] space-y-2">
              <li><strong className="text-text-primary font-medium">Architecture:</strong> Convolutional Neural Network (CNN)</li>
              <li><strong className="text-text-primary font-medium">Input:</strong> Mel Spectrogram, 128 mel bands × 128 time frames</li>
              <li><strong className="text-text-primary font-medium">Output:</strong> 7-class softmax probabilities</li>
              <li><strong className="text-text-primary font-medium">Classes:</strong> Calm · Happy · Sad · Angry · Fearful · Surprise · Disgust</li>
              <li><strong className="text-text-primary font-medium">Training dataset:</strong> RAVDESS, 1440 audio files, 24 professional actors, 22050Hz sample rate</li>
            </ul>
          </div>
          <div className="bg-elevated rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <span className="font-display font-bold text-[48px] text-accent-highlight-light leading-none mb-2">~72%</span>
            <span className="font-body text-[13px] text-text-muted">validation accuracy</span>
          </div>
        </div>
      </section>

      {/* Section 4 */}
      <section>
        <h3 className="font-body font-medium text-[13px] text-text-muted uppercase tracking-[0.05em] mb-6">The team</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <TeamCard initials="AN" name="Arkapriya Nandi" delay={0.1} />
          <TeamCard initials="NK" name="Nourin Khan" delay={0.2} />
          <TeamCard initials="AD" name="Archishman Das" delay={0.3} />
          <TeamCard initials="DD" name="Debanshu Dolui" delay={0.4} />
        </div>
        <p className="font-body text-[14px] text-text-muted text-center">
          Submitted as part of a hackathon project by students of Department CSE-AIML, IEM Saltlake.
        </p>
      </section>
    </div>
  );
}

const TeamCard = ({ initials, name, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.4, ease: "easeOut" }}
    className="bg-card rounded-xl p-[20px] px-[24px] border-[0.5px] border-border-default flex items-center"
  >
    <div className="w-[44px] h-[44px] rounded-full bg-elevated flex items-center justify-center shrink-0 mr-4">
      <span className="font-display font-semibold text-[16px] text-accent-primary-light">{initials}</span>
    </div>
    <div className="flex flex-col">
      <span className="font-body font-medium text-[15px] text-text-primary">{name}</span>
      <span className="font-body text-[13px] text-text-muted block mt-0.5">CTRL C CTRL V</span>
    </div>
  </motion.div>
);
