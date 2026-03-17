import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();

  const navLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `text-[14px] font-medium transition-colors h-full flex items-center px-1 border-b-2 ${
      isActive 
        ? 'text-accent-primary-light border-accent-primary' 
        : 'text-text-secondary border-transparent hover:text-text-primary'
    }`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-[64px] bg-base border-b-[0.5px] border-border-default z-50 flex items-center justify-between px-6 box-border">
      {/* Left side */}
      <div className="flex items-center h-full">
        <Link to="/" className="h-full flex items-center mr-8">
          <img src="/iem.jpeg" alt="IEM Logo" className="h-[36px] object-contain" />
        </Link>
        <div className="flex h-full gap-6 font-body">
          <Link to="/analyse" className={navLinkClass('/analyse')}>
            Analyse
          </Link>
          <Link to="/about" className={navLinkClass('/about')}>
            About
          </Link>
        </div>
      </div>

      {/* Center - absolute positioning to ensure perfect centering */}
      <Link to="/" className="absolute left-1/2 -translate-x-1/2 h-full flex items-center">
        <img src="/ctrlcv.jpeg" alt="CTRL C CTRL V Logo" className="h-[40px] object-contain" />
      </Link>

      {/* Right side */}
      <div className="flex items-center h-full">
        <img src="/uem.jpeg" alt="UEM Logo" className="h-[36px] object-contain" />
      </div>
    </nav>
  );
}
