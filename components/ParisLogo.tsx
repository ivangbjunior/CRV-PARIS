import React from 'react';

interface ParisLogoProps {
  variant?: 'dark' | 'light'; // dark = para fundos claros, light = para fundos escuros
  size?: 'normal' | 'medium' | 'large' | 'xl';
}

export const ParisLogo: React.FC<ParisLogoProps> = ({ variant = 'dark', size = 'normal' }) => {
  const isLarge = size === 'large';
  const isXl = size === 'xl';
  const isMedium = size === 'medium';

  // Cores baseadas na variante
  const towerGradientId = `towerGradient-${variant}`;
  const textColor = variant === 'dark' ? 'text-slate-900' : 'text-white';
  const subColor = variant === 'dark' ? 'text-blue-600' : 'text-blue-400';
  
  // Configurações de Tamanho
  let circleSize = 'w-10 h-10';
  let titleSize = 'text-2xl';
  let subSize = 'text-[10px]';
  let iconSize = 'h-6 w-auto';
  let strokeWidth = 10;
  let gap = 'gap-3';

  if (isLarge) {
    circleSize = 'w-20 h-20';
    titleSize = 'text-5xl';
    subSize = 'text-xs';
    iconSize = 'h-12 w-auto';
    strokeWidth = 8;
    gap = 'gap-4';
  } else if (isXl) {
    circleSize = 'w-32 h-32';
    titleSize = 'text-7xl';
    subSize = 'text-base';
    iconSize = 'h-20 w-auto';
    strokeWidth = 8;
    gap = 'gap-6';
  } else if (isMedium) {
    circleSize = 'w-14 h-14';
    titleSize = 'text-3xl';
    subSize = 'text-[11px]';
    iconSize = 'h-9 w-auto';
    strokeWidth = 9;
    gap = 'gap-3.5';
  }

  return (
    <div className={`flex flex-col items-center justify-center select-none ${gap} relative group`}>
      {/* Efeito de brilho de fundo para versão XL */}
      {isXl && (
        <div className="absolute inset-0 bg-blue-500/20 blur-[50px] rounded-full pointer-events-none"></div>
      )}

      {/* Ícone da Torre */}
      <div className={`${circleSize} relative flex items-center justify-center flex-shrink-0 transition-transform duration-500 group-hover:scale-105`}>
        {/* Círculo decorativo atrás */}
        <div className={`absolute inset-0 rounded-full border-2 ${variant === 'dark' ? 'border-blue-900/10' : 'border-white/10'}`}></div>
        <div className={`absolute inset-2 rounded-full border ${variant === 'dark' ? 'border-blue-600/20' : 'border-blue-400/20'}`}></div>
        
        <svg 
          viewBox="0 0 100 200" 
          className={`${iconSize} drop-shadow-lg`}
          fill="none" 
          stroke={`url(#${towerGradientId})`}
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <defs>
            <linearGradient id={towerGradientId} x1="0" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
              <stop stopColor={variant === 'dark' ? '#1e3a8a' : '#60a5fa'} /> {/* Blue 900 / Blue 400 */}
              <stop offset="1" stopColor={variant === 'dark' ? '#2563eb' : '#ffffff'} /> {/* Blue 600 / White */}
            </linearGradient>
          </defs>
          <path d="M50 10 L50 40" strokeWidth={strokeWidth} />
          <path d="M50 40 Q 45 100 20 190" strokeWidth={strokeWidth} />
          <path d="M50 40 Q 55 100 80 190" strokeWidth={strokeWidth} />
          <path d="M38 85 L62 85" strokeWidth={strokeWidth} />
          <path d="M30 135 L70 135" strokeWidth={strokeWidth} />
          <path d="M25 185 Q 50 160 75 185" strokeWidth={strokeWidth * 0.8} />
        </svg>
      </div>
      
      {/* Texto */}
      <div className="flex flex-col items-center justify-center text-center relative z-10">
        <span className={`font-black ${titleSize} leading-none tracking-tighter ${textColor} font-sans drop-shadow-sm`} style={{ fontFamily: "'Roboto', sans-serif" }}>
          CRV<span className={variant === 'dark' ? 'text-blue-700' : 'text-blue-400'}>PARIS</span>
        </span>
        <div className="flex items-center gap-2 mt-1">
          <div className={`h-[1px] w-8 ${variant === 'dark' ? 'bg-blue-200' : 'bg-blue-800'}`}></div>
          <span className={`${subSize} font-bold tracking-[0.2em] ${subColor} uppercase`}>
            Controle de Frota
          </span>
          <div className={`h-[1px] w-8 ${variant === 'dark' ? 'bg-blue-200' : 'bg-blue-800'}`}></div>
        </div>
      </div>
    </div>
  );
};