
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label: string;
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ 
  options, 
  selected, 
  onChange, 
  label, 
  placeholder = 'Selecione...' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleRemove = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    toggleOption(value);
  };
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectAll = () => {
      // Seleciona apenas os visíveis na busca atual
      const visibleValues = filteredOptions.map(o => o.value);
      // Junta com os já selecionados, removendo duplicatas
      const unique = Array.from(new Set([...selected, ...visibleValues]));
      onChange(unique);
  };

  const clearAll = () => {
      onChange([]);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      
      {/* Botão Gatilho */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer flex items-center justify-between ${isOpen ? 'ring-2 ring-blue-100 border-blue-600' : ''}`}
      >
        <div className="flex flex-wrap gap-1 w-full overflow-hidden">
          {selected.length === 0 ? (
            <span className="text-slate-400 text-sm truncate">{placeholder}</span>
          ) : (
             selected.length < 3 ? (
                selected.map(val => {
                    const opt = options.find(o => o.value === val);
                    return (
                      <span key={val} onClick={(e) => e.stopPropagation()} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap max-w-[120px]">
                        <span className="truncate max-w-[100px]">{opt?.label || val}</span>
                        <X size={12} className="cursor-pointer hover:text-blue-900 flex-shrink-0" onClick={(e) => handleRemove(e, val)} />
                      </span>
                    )
                })
             ) : (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold">
                   {selected.length} selecionados
                </span>
             )
          )}
        </div>
        <ChevronDown size={16} className="text-slate-400 flex-shrink-0 ml-1" />
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-100">
           {/* Header: Search & Actions */}
           <div className="p-2 border-b border-slate-100 bg-slate-50/50 rounded-t-lg">
             <div className="relative">
               <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
               <input
                 type="text"
                 className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                 placeholder="Buscar..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 autoFocus
               />
             </div>
             <div className="flex justify-between mt-2 px-1">
                <button 
                    type="button"
                    onClick={selectAll} 
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                    Selecionar Todos
                </button>
                <button 
                    type="button"
                    onClick={clearAll} 
                    className="text-xs font-medium text-slate-500 hover:text-red-600 hover:underline"
                >
                    Limpar
                </button>
             </div>
           </div>
           
           {/* List Options */}
           <div className="overflow-y-auto flex-1 p-1 max-h-60 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                 <div className="p-4 text-center text-sm text-slate-400 italic">Nenhum resultado encontrado</div>
              ) : (
                 filteredOptions.map(opt => {
                    const isSelected = selected.includes(opt.value);
                    return (
                        <div 
                            key={opt.value}
                            onClick={() => toggleOption(opt.value)}
                            className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors text-sm ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <Check size={14} className="text-white" />}
                            </div>
                            <span className={`truncate ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                                {opt.label}
                            </span>
                        </div>
                    )
                 })
              )}
           </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
