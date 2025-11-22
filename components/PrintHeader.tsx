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
    <div className="hidden print:block mb-6 w-full">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-2">
        <ParisLogo variant="dark" size="normal" />
        
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mt-1">{subtitle}</p>}
        </div>
      </div>

      {/* Metadata Row */}
      <div className="flex justify-between items-end text-[10px] text-slate-600 bg-slate-50 p-2 border border-slate-200 rounded-sm">
         <div className="flex gap-6 font-medium">
            {details}
         </div>
         <div className="text-right flex flex-col items-end">
            <span>PARIS ENGENHARIA LTDA</span>
            <span>Gerado em: <strong>{new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</strong></span>
         </div>
      </div>
    </div>
  );
};