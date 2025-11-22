import React from 'react';

interface ParisLogoProps {
  variant?: 'dark' | 'light';
  size?: 'normal' | 'large';
}

export const ParisLogo: React.FC<ParisLogoProps> = ({ variant = 'dark', size = 'normal' }) => {
  const isLarge = size === 'large';
  const textColor = variant === 'dark' ? 'text-slate-900' : 'text-white';
  const subColor = variant === 'dark' ? 'text-blue-700' : 'text-blue-200';
  const circleBorder = variant === 'dark' ? 'border-blue-900' : 'border-white/30';
  const towerColor = variant === 'dark' ? 'text-blue-900' : 'text-white';

  const circleSize = isLarge ? 'w-28 h-28' : 'w-10 h-10';
  const titleSize = isLarge ? 'text-6xl' : 'text-2xl';
  const subSize = isLarge ? 'text-sm' : 'text-[10px]';
  const iconSize = isLarge ? 'h-20 w-auto' : 'h-7 w-auto'; 
  const strokeWidth = isLarge ? 8 : 10;

  return (
    <div className="flex items-center gap-4 select-none">
      <div className={`${circleSize} rounded-full border-2 ${circleBorder} flex items-center justify-center bg-transparent flex-shrink-0`}>
        <svg 
          viewBox="0 0 100 200" 
          className={`${towerColor} ${iconSize}`}
          fill="none" 
          stroke="currentColor" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M50 10 L50 40" strokeWidth={strokeWidth} />
          <path d="M50 40 Q 45 100 20 190" strokeWidth={strokeWidth} />
          <path d="M50 40 Q 55 100 80 190" strokeWidth={strokeWidth} />
          <path d="M38 85 L62 85" strokeWidth={strokeWidth} />
          <path d="M30 135 L70 135" strokeWidth={strokeWidth} />
          <path d="M25 185 Q 50 160 75 185" strokeWidth={strokeWidth * 0.8} />
        </svg>
      </div>
      
      <div className="flex flex-col justify-center">
        <span className={`font-black ${titleSize} leading-none tracking-tighter ${textColor} font-sans`} style={{ fontFamily: "'Roboto', sans-serif" }}>
          CRV-PARIS
        </span>
        <span className={`${subSize} font-bold tracking-[0.15em] ${subColor} uppercase ml-1`}>
          Controle de Frota
        </span>
      </div>
    </div>
  );
};