import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';

// Placeholder Pages
import LandingPage from './pages/LandingPage';
import AnalysePage from './pages/AnalysePage';
import ResultsPage from './pages/ResultsPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col pt-[64px]">
      <Navbar />
      <main className="flex-1 flex flex-col relative w-full">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
            <Route path="/analyse" element={<PageWrapper><AnalysePage /></PageWrapper>} />
            <Route path="/results" element={<PageWrapper><ResultsPage /></PageWrapper>} />
            <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.3, // 300ms fade in
        exit: { duration: 0.2 } // 200ms fade out to --bg-base
      }}
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
};
