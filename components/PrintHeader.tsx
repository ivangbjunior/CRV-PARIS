import React from 'react';
import { ParisLogo } from './ParisLogo';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  reportId?: string; // Opcional: identificador do relatório
  details?: React.ReactNode;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, reportId, details }) => {
  return (
    <div className="hidden print:block mb-2 w-full">
      {/* Top Header Row - More compact */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1">
        <div className="scale-75 origin-left">
          <ParisLogo variant="dark" size="normal" />
        </div>
        
        <div className="text-right">
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h1>
          {subtitle && <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{subtitle}</p>}
        </div>
      </div>

      {/* Metadata Row - Compact */}
      <div className="flex justify-between items-center text-[8px] text-slate-600 bg-slate-50 p-1 border border-slate-200">
         <div className="flex gap-4 font-bold uppercase">
            {details}
         </div>
         <div className="text-right">
            <span>PARIS ENGENHARIA | Gerado: <strong>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString().substring(0,5)}</strong></span>
         </div>
      </div>
    </div>
  );
};