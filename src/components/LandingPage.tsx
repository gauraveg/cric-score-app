import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="relative h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
      {/* Decorative background streaks */}
      <div 
        className="absolute -left-20 top-1/4 w-[600px] h-1 bg-white/10 blur-[40px] rotate-12"
      />
      <div 
        className="absolute -right-20 bottom-1/4 w-[600px] h-1 bg-white/5 blur-[60px] -rotate-12"
      />
      
      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center gap-12">
        <div className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
          <h1 className="text-5xl font-black text-white tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Turf Score
          </h1>
        </div>
        
        <Link 
          to="/home"
          className="group relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.25)] hover:bg-neutral-200 hover:scale-110 transition-all duration-300 animate-in fade-in slide-in-from-bottom-12 delay-300 fill-mode-both"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="black" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
