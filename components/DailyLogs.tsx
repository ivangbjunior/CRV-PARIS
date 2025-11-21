
import React, { useState, useEffect } from 'react';
import { Vehicle, DailyLog, RefuelingLog, UserRole } from '../types';
import { storageService } from '../services/storage';
import { ClipboardList, Save, AlertTriangle, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

  const [formData, setFormData] = useState<Partial<DailyLog>>({
    date: getTodayLocal(),
    speedingCount: 0,
    observations: '',
    maxSpeed: 0,
    kmDriven: 0,
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

  // Check if there is a refueling record for the selected vehicle on the selected date
  const hasRefuelingToday = refuelings.some(r => 
    r.vehicleId === formData.vehicleId && 
    r.date === formData.date
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let val: string | number = value;
    if (type === 'number') {
      val = value === '' ? 0 : Number(value);
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: val };

      // Logic: If maxSpeed changes and is <= 90, reset speedingCount to 0
      if (name === 'maxSpeed') {
        if ((val as number) <= 90) {
          newData.speedingCount = 0;
        }
      }

      return newData;
    });
    
    // Limpar erro ao mexer no formulário
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

    // DUPLICATE CHECK
    const duplicateLog = existingLogs.find(l => 
      l.vehicleId === formData.vehicleId && 
      l.date === formData.date
    );

    if (duplicateLog) {
      setErrorMsg("ATENÇÃO: JÁ EXISTE UM LANÇAMENTO DESTE VEÍCULO PARA ESTA DATA.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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
      date: formData.date,
      
      // If operating, use form values. If not, use defaults/empty.
      firstIgnition: isOperating ? (formData.firstIgnition || '') : '',
      startTime: isOperating ? formData.startTime! : '',
      lunchStart: isOperating ? (formData.lunchStart || '') : '',
      lunchEnd: isOperating ? (formData.lunchEnd || '') : '',
      endTime: isOperating ? formData.endTime! : '',
      extraTimeStart: isOperating ? (formData.extraTimeStart || '') : '',
      extraTimeEnd: isOperating ? (formData.extraTimeEnd || '') : '',
      
      // If not operating, metrics are 0
      kmDriven: isOperating ? (formData.kmDriven || 0) : 0,
      maxSpeed: isOperating ? (formData.maxSpeed || 0) : 0,
      speedingCount: isOperating ? (formData.speedingCount || 0) : 0,
      
      observations: formData.observations || '',
      nonOperatingReason: formData.nonOperatingReason || undefined,
      
      // Snapshot current details for history
      historicalDriver: selectedVehicle?.driverName || '',
      historicalMunicipality: selectedVehicle?.municipality || '',
      historicalContract: selectedVehicle?.contract || '',
      historicalPlate: selectedVehicle?.plate || '', // Snapshot Plate
      historicalModel: selectedVehicle?.model || '', // Snapshot Model
    };

    setLoading(true);
    await storageService.saveLog(newLog);
    await loadData(); // Refresh logs for duplicate check
    
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
      kmDriven: 0,
      maxSpeed: 0,
      speedingCount: 0,
      observations: '',
      extraTimeStart: '',
      extraTimeEnd: '',
      nonOperatingReason: ''
    });

    setTimeout(() => setSuccessMsg(''), 3000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inputClass = "w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-slate-800 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all";
  const isOperating = !formData.nonOperatingReason;

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
            <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                
                {/* Section: Identificação */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 pb-2 border-b border-slate-100 mb-2">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Dados Principais</h3>
                </div>

                <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className={inputClass}
                />
                </div>

                <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Veículo / Motorista</label>
                <select
                    name="vehicleId"
                    value={formData.vehicleId || ''}
                    onChange={handleChange}
                    required
                    className={inputClass}
                >
                    <option value="">Selecione o Veículo...</option>
                    {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                        {v.plate} - {v.driverName} ({v.type})
                    </option>
                    ))}
                </select>
                </div>

                <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Situação do Veículo</label>
                <select
                    name="nonOperatingReason"
                    value={formData.nonOperatingReason || ''}
                    onChange={handleChange}
                    className={`${inputClass} ${!isOperating ? 'bg-orange-50 border-orange-300 font-bold text-orange-800' : 'bg-green-50 border-green-200'}`}
                >
                    <option value="">EM OPERAÇÃO (NORMAL)</option>
                    {NON_OPERATING_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                </div>

                {!isOperating ? (
                <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-orange-600 mt-1 flex-shrink-0" size={24} />
                    <div>
                    <h4 className="font-bold text-orange-800">Registro de Veículo Não Operacional</h4>
                    <p className="text-sm text-orange-700 mt-1">
                        Ao selecionar a opção <strong>{formData.nonOperatingReason}</strong>, não é necessário preencher horários, quilometragem ou velocidade. 
                        O sistema registrará apenas o status do veículo para esta data.
                    </p>
                    </div>
                </div>
                ) : (
                <>
                    {/* Section: Horários Operacionais */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 pb-2 border-b border-slate-100 mt-4 mb-2">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Horários & Jornada</h3>
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">1ª Ignição</label>
                    <input
                        type="time"
                        name="firstIgnition"
                        value={formData.firstIgnition || ''}
                        onChange={handleChange}
                        className={inputClass}
                    />
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora que ligou <span className="text-red-500">*</span></label>
                    <input
                        type="time"
                        name="startTime"
                        value={formData.startTime || ''}
                        onChange={handleChange}
                        required={isOperating}
                        className={`${inputClass} bg-blue-50 border-blue-200`}
                    />
                    </div>
                    
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora que desligou <span className="text-red-500">*</span></label>
                    <input
                        type="time"
                        name="endTime"
                        value={formData.endTime || ''}
                        onChange={handleChange}
                        required={isOperating}
                        className={`${inputClass} bg-blue-50 border-blue-200`}
                    />
                    </div>

                    <div className="hidden lg:block"></div> {/* Spacer */}

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Início Intervalo</label>
                    <input
                        type="time"
                        name="lunchStart"
                        value={formData.lunchStart || ''}
                        onChange={handleChange}
                        className={inputClass}
                    />
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fim de Intervalo</label>
                    <input
                        type="time"
                        name="lunchEnd"
                        value={formData.lunchEnd || ''}
                        onChange={handleChange}
                        className={inputClass}
                    />
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Atividade Extra (Início)</label>
                    <input
                        type="time"
                        name="extraTimeStart"
                        value={formData.extraTimeStart || ''}
                        onChange={handleChange}
                        className={`${inputClass} focus:ring-orange-500 focus:border-orange-500`}
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Atividade Extra (Fim)</label>
                    <input
                        type="time"
                        name="extraTimeEnd"
                        value={formData.extraTimeEnd || ''}
                        onChange={handleChange}
                        className={`${inputClass} focus:ring-orange-500 focus:border-orange-500`}
                    />
                    </div>


                    {/* Section: Métricas */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 pb-2 border-b border-slate-100 mt-4 mb-2">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Métricas & Ocorrências</h3>
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">KM Rodados</label>
                    <div className="relative">
                        <input
                        type="number"
                        name="kmDriven"
                        value={formData.kmDriven}
                        onChange={handleChange}
                        min="0"
                        className={`${inputClass} pr-8`}
                        />
                        <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-medium">KM</span>
                    </div>
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Velocidade Máxima</label>
                    <div className="relative">
                        <input
                        type="number"
                        name="maxSpeed"
                        value={formData.maxSpeed}
                        onChange={handleChange}
                        min="0"
                        className={`${inputClass} pr-8 ${
                            (formData.maxSpeed || 0) > 90 ? 'text-red-600 font-bold border-red-300 bg-red-50' : ''
                        }`}
                        />
                        <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-medium">Km/h</span>
                    </div>
                    </div>

                    <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                        Ocorrências {'>'} 90km/h
                        {(formData.maxSpeed || 0) > 90 && <AlertTriangle size={14} className="text-red-500" />}
                    </label>
                    <input
                        type="number"
                        name="speedingCount"
                        value={formData.speedingCount}
                        onChange={handleChange}
                        min="0"
                        disabled={(formData.maxSpeed || 0) <= 90}
                        className={`${inputClass} ${(formData.maxSpeed || 0) <= 90 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                        placeholder={(formData.maxSpeed || 0) <= 90 ? "N/A (Vel. < 90)" : "Quantas vezes excedeu?"}
                    />
                    </div>
                </>
                )}

                <div className="col-span-1 md:col-span-2 lg:col-span-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações Diárias</label>
                <textarea
                    name="observations"
                    value={formData.observations}
                    onChange={handleChange}
                    rows={3}
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
