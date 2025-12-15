
import React, { useState, useEffect } from 'react';
import { Vehicle, DailyLog, RefuelingLog, UserRole, VehicleType } from '../types';
import { storageService } from '../services/storage';
import { ClipboardList, Save, AlertTriangle, AlertCircle, CheckCircle, Loader2, Clock, MapPin, Gauge } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SelectWithSearch from './SelectWithSearch';

const NON_OPERATING_OPTIONS = [
  'OFICINA',
  'GARAGEM',
  'SEM SINAL',
  'EM MANUTENÇÃO',
  'NÃO LIGOU'
];

const DailyLogs: React.FC = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === UserRole.GERENCIA;

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [refuelings, setRefuelings] = useState<RefuelingLog[]>([]);
  const [existingLogs, setExistingLogs] = useState<DailyLog[]>([]);
  
  // Helper to get local date string YYYY-MM-DD correctly
  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State initialized with undefined for metrics to show empty inputs
  const [formData, setFormData] = useState<Partial<DailyLog>>({
    date: getTodayLocal(),
    speedingCount: undefined,
    observations: '',
    maxSpeed: undefined,
    kmDriven: undefined,
    nonOperatingReason: ''
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      try {
          const [vData, rData, lData] = await Promise.all([
              storageService.getVehicles(),
              storageService.getRefuelings(),
              storageService.getLogs()
          ]);
          setVehicles(vData);
          setRefuelings(rData);
          setExistingLogs(lData);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  }

  // Determine speed limit based on vehicle type
  const getSpeedLimit = (vehicleId?: string) => {
    if (!vehicleId) return 100; // Default safe fallback
    const v = vehicles.find(veh => veh.id === vehicleId);
    if (!v) return 100;

    // Caminhões e Linha Viva: 90km/h
    if (v.type === VehicleType.CAMINHAO || v.type === VehicleType.LINHA_VIVA) {
        return 90;
    }
    // Carros/Outros: 100km/h
    return 100;
  };

  const currentSpeedLimit = getSpeedLimit(formData.vehicleId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let val: string | number | undefined = value;
    if (type === 'number') {
      // Se estiver vazio, define como undefined para limpar o input
      val = value === '' ? undefined : Number(value);
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: val };

      // Logic: If maxSpeed changes and is <= limit, reset speedingCount to 0
      if (name === 'maxSpeed' && typeof val === 'number') {
        // We need to check the vehicle ID from the *current* state (prev) or new value if it was changing (but vehicle change is handled separately)
        const limit = getSpeedLimit(prev.vehicleId);
        if (val <= limit) {
          newData.speedingCount = 0;
        }
      }

      return newData;
    });
    
    // Limpar erro ao mexer no formulário
    if (errorMsg) setErrorMsg('');
  };

  // Custom handler for SelectWithSearch
  const handleVehicleChange = (value: string) => {
      setFormData(prev => ({ ...prev, vehicleId: value }));
      if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setErrorMsg('');
    setSuccessMsg('');
    
    const isOperating = !formData.nonOperatingReason;

    // Basic validation
    if (!formData.vehicleId || !formData.date) {
      setErrorMsg("Por favor preencha os campos obrigatórios (Veículo e Data)");
      return;
    }

    // --- REFORÇO DA VERIFICAÇÃO DE DUPLICIDADE ---
    const freshLogs = await storageService.getLogs();
    const duplicateLog = freshLogs.find(l => 
      l.vehicleId === formData.vehicleId && 
      l.date === formData.date
    );

    if (duplicateLog) {
      setErrorMsg("BLOQUEADO: Já existe um registro para este veículo nesta data. Não é permitido duplicidade.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // ------------------------------------------------

    // Time validation only if operating
    if (isOperating) {
       if(!formData.startTime || !formData.endTime) {
         setErrorMsg("Para veículos em operação, Hora que ligou e Hora que desligou são obrigatórios.");
         return;
       }
    }

    const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);

    const newLog: DailyLog = {
      id: crypto.randomUUID(),
      vehicleId: formData.vehicleId,
      date: formData.date!,
      
      firstIgnition: isOperating ? (formData.firstIgnition || '') : '',
      startTime: isOperating ? formData.startTime! : '',
      lunchStart: isOperating ? (formData.lunchStart || '') : '',
      lunchEnd: isOperating ? (formData.lunchEnd || '') : '',
      endTime: isOperating ? formData.endTime! : '',
      extraTimeStart: isOperating ? (formData.extraTimeStart || '') : '',
      extraTimeEnd: isOperating ? (formData.extraTimeEnd || '') : '',
      
      // Converte undefined/null para 0 ao salvar
      kmDriven: isOperating ? (Number(formData.kmDriven) || 0) : 0,
      maxSpeed: isOperating ? (Number(formData.maxSpeed) || 0) : 0,
      speedingCount: isOperating ? (Number(formData.speedingCount) || 0) : 0,
      
      observations: formData.observations || '',
      nonOperatingReason: formData.nonOperatingReason || undefined,
      
      historicalDriver: selectedVehicle?.driverName || '',
      historicalMunicipality: selectedVehicle?.municipality || '',
      historicalContract: selectedVehicle?.contract || '',
      historicalPlate: selectedVehicle?.plate || '',
      historicalModel: selectedVehicle?.model || '',
    };

    setLoading(true);
    try {
        await storageService.saveLog(newLog);
        
        setExistingLogs(prev => [...prev, newLog]);
        await loadData(); 
        
        setLoading(false);
        setSuccessMsg('Lançamento salvo com sucesso!');
        
        // Reset form but keep date
        setFormData({
        date: formData.date,
        vehicleId: '',
        firstIgnition: '',
        startTime: '',
        lunchStart: '',
        lunchEnd: '',
        endTime: '',
        kmDriven: undefined,
        maxSpeed: undefined,
        speedingCount: undefined,
        observations: '',
        extraTimeStart: '',
        extraTimeEnd: '',
        nonOperatingReason: ''
        });

        setTimeout(() => setSuccessMsg(''), 3000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
        setLoading(false);
        console.error(err);
        setErrorMsg(`Erro ao salvar: ${err.message || 'Falha na comunicação com o banco'}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-slate-800 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all";
  const smallInputClass = "w-full rounded border border-slate-300 bg-white p-2 text-center text-sm font-medium text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all";
  
  const isOperating = !formData.nonOperatingReason;

  const vehicleOptions = vehicles.map(v => ({
      value: v.id,
      label: `${v.plate} - ${v.driverName} (${v.type})`
  }));

  if (loading && vehicles.length === 0) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between flex-wrap gap-4">
           <div className="flex items-center gap-3">
             <div className="bg-blue-500 p-2 rounded-lg">
                <ClipboardList size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold">Diário de Bordo</h2>
               <p className="text-blue-200 text-sm">Lançamento de atividades diárias</p>
             </div>
           </div>
           
           <div className="flex flex-col items-end gap-2">
             {successMsg && (
               <div className="bg-green-500 text-white px-4 py-2 rounded-lg animate-pulse font-medium text-sm flex items-center gap-2 shadow-lg">
                 <CheckCircle size={18} />
                 {successMsg}
               </div>
             )}
             {errorMsg && (
               <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg border border-red-400 animate-bounce">
                 <AlertTriangle size={18} />
                 {errorMsg}
               </div>
             )}
           </div>
        </div>

        {isReadOnly ? (
            <div className="p-12 flex flex-col items-center justify-center text-center opacity-70">
                 <AlertCircle size={64} className="text-slate-300 mb-4" />
                 <h3 className="text-xl font-bold text-slate-600">Modo Visualização</h3>
                 <p className="text-slate-500 mt-2">
                     Seu perfil de <strong>GERENCIA</strong> permite visualizar dados, mas não realizar novos lançamentos neste menu.
                 </p>
                 <p className="text-sm text-blue-600 mt-4">
                    Para consultar o histórico de atividades, acesse o menu <strong>Relatórios</strong>.
                 </p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                
                {/* --- 1. DADOS PRINCIPAIS --- */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 border-b border-slate-100 pb-2 mb-2">
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={14} /> Dados Principais
                  </h3>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                  <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      className={inputClass}
                  />
                </div>

                <div className="lg:col-span-3 relative">
                  {/* REPLACED STANDARD SELECT WITH SEARCHABLE COMPONENT */}
                  <SelectWithSearch 
                    label="Veículo / Motorista"
                    options={vehicleOptions}
                    value={formData.vehicleId || ''}
                    onChange={handleVehicleChange}
                    placeholder="Selecione ou digite para buscar..."
                    required
                  />
                </div>

                {/* --- STATUS OPERACIONAL --- */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                   <div className={`p-4 rounded-xl border-2 transition-colors ${!isOperating ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status Operacional do Dia</label>
                      <select
                          name="nonOperatingReason"
                          value={formData.nonOperatingReason || ''}
                          onChange={handleChange}
                          className={`w-full p-3 rounded-lg font-bold text-sm outline-none border transition-colors ${
                              !isOperating 
                                ? 'bg-white text-orange-700 border-orange-300 shadow-sm' 
                                : 'bg-white text-green-700 border-green-300 shadow-sm'
                          }`}
                      >
                          <option value="">🟢 EM OPERAÇÃO (VEÍCULO RODOU NORMALMENTE)</option>
                          {NON_OPERATING_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>🔴 {opt}</option>
                          ))}
                      </select>
                   </div>
                </div>

                {!isOperating ? (
                <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="text-orange-600 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h4 className="font-bold text-orange-800">Registro de Veículo Parado / Não Operacional</h4>
                      <p className="text-sm text-orange-700 mt-1">
                          Ao selecionar a opção <strong>{formData.nonOperatingReason}</strong>, o sistema registrará apenas o status. 
                          Não é necessário preencher horários ou quilometragem.
                      </p>
                    </div>
                </div>
                ) : (
                <>
                    {/* --- 2. HORÁRIOS & JORNADA --- */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 border-b border-slate-100 pb-2 mt-4 mb-2">
                      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                         <Clock size={14} /> Horários & Jornada
                      </h3>
                    </div>

                    <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                            
                            {/* Grupo Jornada */}
                            <div className="col-span-2 md:col-span-3 lg:col-span-2 space-y-3 border-r border-slate-200 pr-4">
                                <span className="text-xs font-black text-blue-900 uppercase tracking-wide block mb-2">Jornada Principal</span>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">1ª Ignição</label>
                                    <input type="time" name="firstIgnition" value={formData.firstIgnition || ''} onChange={handleChange} className={smallInputClass} />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Ligou <span className="text-red-500">*</span></label>
                                    <input type="time" name="startTime" value={formData.startTime || ''} onChange={handleChange} required={isOperating} className={`${smallInputClass} border-blue-300 bg-blue-50 text-blue-900`} />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Desligou <span className="text-red-500">*</span></label>
                                    <input type="time" name="endTime" value={formData.endTime || ''} onChange={handleChange} required={isOperating} className={`${smallInputClass} border-blue-300 bg-blue-50 text-blue-900`} />
                                  </div>
                                </div>
                            </div>

                            {/* Grupo Intervalo */}
                            <div className="col-span-2 md:col-span-3 lg:col-span-2 space-y-3 border-r border-slate-200 px-4 md:border-r-0 lg:border-r">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wide block mb-2">Intervalo / Pausa</span>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Início</label>
                                    <input type="time" name="lunchStart" value={formData.lunchStart || ''} onChange={handleChange} className={smallInputClass} />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Fim</label>
                                    <input type="time" name="lunchEnd" value={formData.lunchEnd || ''} onChange={handleChange} className={smallInputClass} />
                                  </div>
                                </div>
                            </div>

                            {/* Grupo Extra */}
                            <div className="col-span-2 md:col-span-3 lg:col-span-2 space-y-3 pl-0 lg:pl-4">
                                <span className="text-xs font-black text-orange-800 uppercase tracking-wide block mb-2">Horas Extras</span>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Início Extra</label>
                                    <input type="time" name="extraTimeStart" value={formData.extraTimeStart || ''} onChange={handleChange} className={`${smallInputClass} focus:border-orange-500 focus:ring-orange-200`} />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Fim Extra</label>
                                    <input type="time" name="extraTimeEnd" value={formData.extraTimeEnd || ''} onChange={handleChange} className={`${smallInputClass} focus:border-orange-500 focus:ring-orange-200`} />
                                  </div>
                                </div>
                            </div>

                        </div>
                    </div>


                    {/* --- 3. MÉTRICAS --- */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 border-b border-slate-100 pb-2 mt-4 mb-2">
                      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                         <Gauge size={14} /> Métricas & Ocorrências
                      </h3>
                    </div>

                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">KM Rodados</label>
                      <div className="relative">
                          <input
                          type="number"
                          name="kmDriven"
                          value={formData.kmDriven === undefined ? '' : formData.kmDriven}
                          onChange={handleChange}
                          min="0"
                          placeholder=""
                          className={`${inputClass} pr-8`}
                          />
                          <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-medium">KM</span>
                      </div>
                    </div>

                    <div className="lg:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Velocidade Máx.</label>
                      <div className="relative">
                          <input
                          type="number"
                          name="maxSpeed"
                          value={formData.maxSpeed === undefined ? '' : formData.maxSpeed}
                          onChange={handleChange}
                          min="0"
                          placeholder=""
                          className={`${inputClass} pr-8 ${
                              (formData.maxSpeed || 0) > currentSpeedLimit ? 'text-red-600 font-bold border-red-300 bg-red-50' : ''
                          }`}
                          />
                          <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-medium">Km/h</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Limite: {currentSpeedLimit} km/h</p>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
                          Ocorrências de Excesso {'>'} {currentSpeedLimit}km/h
                          {(formData.maxSpeed || 0) > currentSpeedLimit && <AlertTriangle size={14} className="text-red-500" />}
                      </label>
                      <input
                          type="number"
                          name="speedingCount"
                          value={formData.speedingCount === undefined ? '' : formData.speedingCount}
                          onChange={handleChange}
                          min="0"
                          placeholder=""
                          disabled={(formData.maxSpeed || 0) <= currentSpeedLimit}
                          className={`${inputClass} ${(formData.maxSpeed || 0) <= currentSpeedLimit ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                      />
                    </div>
                </>
                )}

                <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações Diárias</label>
                  <textarea
                      name="observations"
                      value={formData.observations}
                      onChange={handleChange}
                      rows={2}
                      className={`${inputClass} resize-none`}
                      placeholder="Descreva ocorrências, manutenção necessária, etc..."
                  />
                </div>

            </div>

            <div className="mt-8 flex justify-end">
                <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all flex items-center gap-2 transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                SALVAR LANÇAMENTO
                </button>
            </div>

            </form>
        )}
      </div>
    </div>
  );
};

export default DailyLogs;
