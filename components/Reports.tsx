import React, { useState, useEffect, useRef } from 'react';
import { DailyLog, DailyLogReport, Vehicle, ContractType, VehicleType, UserRole } from '../types';
import { storageService } from '../services/storage';
import { calculateWorkHours } from '../utils/timeUtils';
import PasswordModal from './PasswordModal';
import MultiSelect, { MultiSelectOption } from './MultiSelect';
import { useAuth } from '../contexts/AuthContext';
import { Filter, FileText, Trash2, Edit3, Calendar, X, Save, Clock, AlertTriangle, Search, User, MapPin, Key, Ban, Settings, HardHat, Printer, Fuel, Droplet, MessageSquareText, Loader2, WifiOff, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { PrintHeader } from './PrintHeader';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === UserRole.RH || user?.role === UserRole.GERENCIA;

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<DailyLogReport[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DailyLogReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [uniqueDrivers, setUniqueDrivers] = useState<string[]>([]);
  const [uniqueMunicipalities, setUniqueMunicipalities] = useState<string[]>([]);
  const [uniqueForemen, setUniqueForemen] = useState<string[]>([]);

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterForeman, setFilterForeman] = useState<string[]>([]); 
  const [filterContract, setFilterContract] = useState<string[]>([]);
  const [filterVehicleId, setFilterVehicleId] = useState<string[]>([]);
  const [filterDriver, setFilterDriver] = useState<string[]>([]);
  const [filterMunicipality, setFilterMunicipality] = useState<string[]>([]);

  const [showFilters, setShowFilters] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

  const [obsModalData, setObsModalData] = useState<{content: string, date: string, plate: string} | null>(null);

  // Pagination State
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, filterForeman, filterContract, filterVehicleId, filterDriver, filterMunicipality]);

  const handlePrint = () => {
    window.print();
  };

  const loadData = async () => {
    setLoading(true);
    try {
        const [rawLogs, vehiclesData, refuelingsData] = await Promise.all([
            storageService.getLogs(),
            storageService.getVehicles(),
            storageService.getRefuelings()
        ]);

        setVehicles(vehiclesData);

        const processed: DailyLogReport[] = rawLogs.map(log => {
        let vehicle = vehiclesData.find(v => v.id === log.vehicleId);
        
        if (!vehicle) {
            vehicle = {
                id: log.vehicleId,
                plate: log.historicalPlate || 'VEÍCULO EXCLUÍDO',
                model: log.historicalModel || '-',
                year: '-',
                contract: (log.historicalContract as ContractType) || ContractType.ADM_MANAUS,
                driverName: log.historicalDriver || 'N/A',
                municipality: log.historicalMunicipality || 'N/A',
                foreman: '-', 
                type: VehicleType.PICK_UP, 
                status: 'INATIVO'
            };
        }

        const relevantRefuelings = refuelingsData
            .filter(r => r.vehicleId === log.vehicleId && r.date <= log.date)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let lastRefuelingInfo = undefined;

        if (relevantRefuelings.length > 0) {
            const lastRef = relevantRefuelings[0];
            
            const kmSince = rawLogs
                .filter(l => 
                    l.vehicleId === log.vehicleId && 
                    l.date >= lastRef.date && 
                    l.date <= log.date
                )
                .reduce((sum, l) => {
                    let dailyContribution = l.kmDriven || 0;
                    if (l.date === lastRef.date && l.kmBeforeRefueling !== undefined) {
                        dailyContribution = Math.max(0, dailyContribution - l.kmBeforeRefueling);
                    }
                    return sum + dailyContribution;
                }, 0);

            lastRefuelingInfo = {
                date: lastRef.date,
                liters: lastRef.liters,
                kmSince: kmSince
            };
        }

        return {
            ...log,
            vehicle: vehicle,
            calculatedHours: calculateWorkHours(
            log.startTime, 
            log.endTime, 
            log.lunchStart, 
            log.lunchEnd,
            log.extraTimeStart, 
            log.extraTimeEnd
            ),
            lastRefuelingInfo
        };
        });

        // Always sort by date descending (newest first)
        processed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const uDrivers = new Set<string>();
        const uMunicipalities = new Set<string>();
        const uForemen = new Set<string>();

        processed.forEach(log => {
        const driver = log.historicalDriver || log.vehicle.driverName;
        if (driver) uDrivers.add(driver);

        const muni = log.historicalMunicipality || log.vehicle.municipality;
        if (muni) uMunicipalities.add(muni);

        if (log.vehicle.foreman) uForemen.add(log.vehicle.foreman);
        });

        vehiclesData.forEach(v => {
        if (v.driverName) uDrivers.add(v.driverName);
        if (v.municipality) uMunicipalities.add(v.municipality);
        if (v.foreman) uForemen.add(v.foreman);
        });

        setUniqueDrivers(Array.from(uDrivers).sort());
        setUniqueMunicipalities(Array.from(uMunicipalities).sort());
        setUniqueForemen(Array.from(uForemen).sort());

        setLogs(processed);
        setFilteredLogs(processed);
    } catch(e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const start = dateRange.start ? new Date(dateRange.start).getTime() : null;
    const end = dateRange.end ? new Date(dateRange.end).getTime() : null;

    const filtered = logs.filter(log => {
      const logDate = new Date(log.date).getTime();
      const matchesDate = (!start || logDate >= start) && (!end || logDate <= end);
      const logContract = log.historicalContract || log.vehicle.contract;
      const matchesContract = filterContract.length === 0 || filterContract.includes(logContract);
      const matchesVehicleId = filterVehicleId.length === 0 || filterVehicleId.includes(log.vehicle.id);
      const logForeman = log.vehicle.foreman || '';
      const matchesForeman = filterForeman.length === 0 || filterForeman.includes(logForeman);
      const logDriver = log.historicalDriver || log.vehicle.driverName || '';
      const matchesDriver = filterDriver.length === 0 || filterDriver.includes(logDriver);
      const logCity = log.historicalMunicipality || log.vehicle.municipality || '';
      const matchesMunicipality = filterMunicipality.length === 0 || filterMunicipality.includes(logCity);

      return matchesDate && matchesContract && matchesVehicleId && matchesForeman && matchesDriver && matchesMunicipality;
    });

    // Ensure sorting is maintained after filtering (Newest First)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setFilterForeman([]);
    setFilterContract([]);
    setFilterVehicleId([]);
    setFilterDriver([]);
    setFilterMunicipality([]);
    setFilteredLogs(logs);
  };

  const confirmDelete = (id: string) => {
    setLogToDelete(id);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (logToDelete) {
      setLoading(true);
      await storageService.deleteLog(logToDelete);
      await loadData();
      setLogToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const handleEditClick = (logReport: DailyLogReport) => {
    const logToEdit: DailyLog = {
        id: logReport.id,
        date: logReport.date,
        vehicleId: logReport.vehicleId,
        firstIgnition: logReport.firstIgnition,
        startTime: logReport.startTime,
        lunchStart: logReport.lunchStart,
        lunchEnd: logReport.lunchEnd,
        endTime: logReport.endTime,
        kmDriven: logReport.kmDriven,
        maxSpeed: logReport.maxSpeed,
        speedingCount: logReport.speedingCount,
        observations: logReport.observations,
        extraTimeStart: logReport.extraTimeStart,
        extraTimeEnd: logReport.extraTimeEnd,
        historicalDriver: logReport.historicalDriver || logReport.vehicle.driverName,
        historicalMunicipality: logReport.historicalMunicipality || logReport.vehicle.municipality,
        historicalContract: logReport.historicalContract || logReport.vehicle.contract,
        historicalPlate: logReport.historicalPlate,
        historicalModel: logReport.historicalModel,
        nonOperatingReason: logReport.nonOperatingReason,
        kmBeforeRefueling: logReport.kmBeforeRefueling 
    };
    setEditingLog(logToEdit);
    setShowEditModal(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editingLog) return;
    const { name, value, type } = e.target;
    let val: string | number = value;
    if (type === 'number') {
      val = value === '' ? 0 : Number(value);
    }
    setEditingLog({ ...editingLog, [name]: val });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLog) {
      setLoading(true);
      await storageService.saveLog(editingLog);
      setShowEditModal(false);
      setEditingLog(null);
      await loadData();
    }
  };

  const openObsModal = (log: DailyLogReport) => {
      setObsModalData({
          content: log.observations,
          date: log.date,
          plate: log.vehicle.plate
      });
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year.slice(-2)}`;
  };

  const formatRefuelingDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`;
  };
  
  const getContractColor = (contract: string) => {
    switch (contract) {
      case ContractType.MANUTENCAO: return 'bg-blue-100 text-blue-800 border-blue-200';
      case ContractType.LINHA_VIVA: return 'bg-red-100 text-red-800 border-red-200';
      case ContractType.PLPT: return 'bg-green-100 text-green-800 border-green-200';
      case ContractType.ADM_MANAUS: return 'bg-slate-100 text-slate-800 border-slate-200';
      case ContractType.ADM_PIN: return 'bg-teal-100 text-teal-800 border-teal-200';
      case ContractType.CTRNOVO: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case ContractType.AME: return 'bg-purple-100 text-purple-800 border-purple-200';
      case ContractType.OFICINA: return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNonOperatingColor = (reason: string) => {
     switch(reason) {
       case 'OFICINA': return 'bg-orange-50 text-orange-700 border-orange-200';
       case 'GARAGEM': return 'bg-slate-50 text-slate-700 border-slate-200';
       case 'SEM SINAL': return 'bg-red-50 text-red-700 border-red-200';
       case 'EM MANUTENÇÃO': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
       case 'NÃO LIGOU': return 'bg-gray-100 text-gray-600 border-gray-300';
       default: return 'bg-gray-50';
     }
  };

  const calculateSummary = () => {
    let totalMinutes = 0;
    let totalKm = 0;
    let daysNoSignal = 0;
    let daysStopped = 0;

    filteredLogs.forEach(log => {
       if (log.nonOperatingReason) {
          if (log.nonOperatingReason === 'SEM SINAL') daysNoSignal++;
          if (['OFICINA', 'EM MANUTENÇÃO', 'GARAGEM'].includes(log.nonOperatingReason)) daysStopped++;
       } else {
          const [h, m] = log.calculatedHours.split(':').map(Number);
          totalMinutes += (h * 60) + m;
          totalKm += log.kmDriven || 0;
       }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const formattedTime = `${hours}h ${minutes}m`;

    return { formattedTime, totalKm, daysNoSignal, daysStopped };
  };

  const summary = calculateSummary();

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const inputClass = "rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all w-full";
  const editInputClass = "w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-slate-800 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all";

  const contractOptions: MultiSelectOption[] = Object.values(ContractType).map(t => ({ value: t, label: t }));
  const vehicleOptions: MultiSelectOption[] = vehicles.map(v => ({ value: v.id, label: `${v.plate} - ${v.type}` }));
  const foremanOptions: MultiSelectOption[] = uniqueForemen.map(f => ({ value: f, label: f }));
  const driverOptions: MultiSelectOption[] = uniqueDrivers.map(d => ({ value: d, label: d }));
  const municipalityOptions: MultiSelectOption[] = uniqueMunicipalities.map(m => ({ value: m, label: m }));

  if (loading && logs.length === 0) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="space-y-6">
       
       <PrintHeader 
        title="Relatório Geral de Frota"
        subtitle="Diário de Bordo e Métricas"
        details={
            <>
                <span>Período: {dateRange.start ? formatDateDisplay(dateRange.start) : 'Início'} até {dateRange.end ? formatDateDisplay(dateRange.end) : 'Hoje'}</span>
                <span>Registros: {filteredLogs.length}</span>
                <span>KM Total: {summary.totalKm}</span>
                <span>Horas Totais: {summary.formattedTime}</span>
            </>
        }
      />

      <div className="print:hidden">
        <PasswordModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={executeDelete}
            title="Excluir Lançamento"
        />
      </div>

      {obsModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 print:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
             <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                   <MessageSquareText size={20} />
                   <span className="font-bold">Observação Registrada</span>
                </div>
                <button onClick={() => setObsModalData(null)} className="text-blue-100 hover:text-white">
                   <X size={20} />
                </button>
             </div>
             <div className="p-6">
                <div className="flex gap-4 mb-4 border-b border-slate-100 pb-3">
                   <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Data</span>
                      <p className="text-sm font-medium text-slate-800">{formatDateDisplay(obsModalData.date)}</p>
                   </div>
                   <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Placa</span>
                      <p className="text-sm font-medium text-slate-800">{obsModalData.plate}</p>
                   </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 text-sm whitespace-pre-wrap">
                   {obsModalData.content}
                </div>
                <div className="mt-5 flex justify-end">
                   <button onClick={() => setObsModalData(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium text-sm">Fechar</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showEditModal && editingLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh]">
            <div className="bg-blue-900 p-4 text-white flex justify-between items-center rounded-t-xl sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Edit3 size={20} className="text-blue-300"/>
                <h3 className="font-bold text-lg">Editar Lançamento</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={saveEdit} className="p-6 overflow-y-auto">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="col-span-full border-b pb-2 mb-2">
                      <h4 className="text-xs font-bold uppercase text-slate-500">Dados do Veículo e Data</h4>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                    <input type="date" name="date" value={editingLog.date} onChange={handleEditChange} required className={editInputClass} />
                  </div>
                  
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Veículo (Cadastro Original)</label>
                    <select name="vehicleId" value={editingLog.vehicleId} onChange={handleEditChange} required className={editInputClass}>
                      {vehicles.map(v => (<option key={v.id} value={v.id}>{v.plate} - {v.driverName}</option>))}
                      {!vehicles.find(v => v.id === editingLog?.vehicleId) && editingLog?.vehicleId && (<option value={editingLog.vehicleId}>VEÍCULO EXCLUÍDO / ID: {editingLog.vehicleId}</option>)}
                    </select>
                  </div>

                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Motorista (No Dia)</label>
                    <input type="text" name="historicalDriver" value={editingLog.historicalDriver || ''} onChange={handleEditChange} className={editInputClass} />
                  </div>

                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Município (No Dia)</label>
                     <input type="text" name="historicalMunicipality" value={editingLog.historicalMunicipality || ''} onChange={handleEditChange} className={editInputClass} />
                  </div>
                  
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Contrato (No Dia)</label>
                     <select name="historicalContract" value={editingLog.historicalContract || ''} onChange={handleEditChange} className={editInputClass}>
                      <option value="">Selecione...</option>
                      {Object.values(ContractType).map(type => (<option key={type} value={type}>{type}</option>))}
                    </select>
                  </div>

                  <div className="lg:col-span-1">
                     <label className="block text-xs font-bold text-slate-500 mb-1">Status Operacional</label>
                     <select name="nonOperatingReason" value={editingLog.nonOperatingReason || ''} onChange={handleEditChange} className={editInputClass}>
                        <option value="">EM OPERAÇÃO (NORMAL)</option>
                        {['OFICINA','GARAGEM','SEM SINAL','EM MANUTENÇÃO','NÃO LIGOU'].map(o => <option key={o} value={o}>{o}</option>)}
                     </select>
                  </div>

                  {!editingLog.nonOperatingReason && (
                    <>
                      <div className="col-span-full border-b pb-2 mb-2 mt-2">
                          <h4 className="text-xs font-bold uppercase text-slate-500">Horários</h4>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">1ª Ignição</label>
                        <input type="time" name="firstIgnition" value={editingLog.firstIgnition} onChange={handleEditChange} className={editInputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Início Expediente</label>
                        <input type="time" name="startTime" value={editingLog.startTime} onChange={handleEditChange} required className={`${editInputClass} bg-blue-50`} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Fim Expediente</label>
                        <input type="time" name="endTime" value={editingLog.endTime} onChange={handleEditChange} required className={`${editInputClass} bg-blue-50`} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Início Intervalo</label>
                        <input type="time" name="lunchStart" value={editingLog.lunchStart} onChange={handleEditChange} className={editInputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Fim de Intervalo</label>
                        <input type="time" name="lunchEnd" value={editingLog.lunchEnd} onChange={handleEditChange} className={editInputClass} />
                      </div>
                      
                      <div className="hidden lg:block"></div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Hora Extra (Início)</label>
                        <input type="time" name="extraTimeStart" value={editingLog.extraTimeStart} onChange={handleEditChange} className={editInputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Hora Extra (Fim)</label>
                        <input type="time" name="extraTimeEnd" value={editingLog.extraTimeEnd} onChange={handleEditChange} className={editInputClass} />
                      </div>

                      <div className="col-span-full border-b pb-2 mb-2 mt-2">
                          <h4 className="text-xs font-bold uppercase text-slate-500">Métricas</h4>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">KM Rodados</label>
                        <input type="number" name="kmDriven" value={editingLog.kmDriven} onChange={handleEditChange} className={editInputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Velocidade Máxima</label>
                        <input type="number" name="maxSpeed" value={editingLog.maxSpeed} onChange={handleEditChange} className={editInputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Qtd. Excesso Vel.</label>
                        <input type="number" name="speedingCount" value={editingLog.speedingCount} onChange={handleEditChange} className={editInputClass} />
                      </div>
                    </>
                  )}
                  
                   <div className="col-span-full">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Observações</label>
                    <textarea name="observations" value={editingLog.observations} onChange={handleEditChange} rows={3} className={editInputClass} />
                  </div>
               </div>
               
               <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin"/> : <Save size={18} />} Salvar Alterações
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Modernized Collapsible Filters - REMOVED OVERFLOW HIDDEN */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm print:hidden relative z-20">
        <div 
            onClick={() => setShowFilters(!showFilters)} 
            className="p-4 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors rounded-xl"
        >
            <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Filter size={20} className="text-blue-600" />
                Filtros Avançados (Multi-seleção)
                <span className="text-xs font-normal text-slate-400 ml-1">(Clique para expandir)</span>
            </div>
            <div className="flex items-center gap-2">
                {showFilters ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
            </div>
        </div>

        {showFilters && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 animate-in slide-in-from-top-5 duration-200 rounded-b-xl">
                <form onSubmit={handleFilter} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex gap-2 col-span-1 md:col-span-2">
                        <div className="w-1/2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Data Início</label>
                            <div className="relative w-full">
                            <input type="date" ref={startDateRef} value={dateRange.start} onClick={(e) => e.currentTarget.showPicker()} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className={`${inputClass} pr-10 cursor-pointer`} />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500"><Calendar size={18} /></div>
                            </div>
                        </div>
                        <div className="w-1/2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Data Final</label>
                            <div className="relative w-full">
                            <input type="date" ref={endDateRef} value={dateRange.end} onClick={(e) => e.currentTarget.showPicker()} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className={`${inputClass} pr-10 cursor-pointer`} />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500"><Calendar size={18} /></div>
                            </div>
                        </div>
                    </div>

                    <div><MultiSelect label="Contratos" options={contractOptions} selected={filterContract} onChange={setFilterContract} placeholder="Todos os contratos" /></div>
                    <div><MultiSelect label="Placas" options={vehicleOptions} selected={filterVehicleId} onChange={setFilterVehicleId} placeholder="Todas as placas" /></div>
                    <div><MultiSelect label="Equipes" options={foremanOptions} selected={filterForeman} onChange={setFilterForeman} placeholder="Todas as equipes" /></div>
                    <div><MultiSelect label="Motoristas" options={driverOptions} selected={filterDriver} onChange={setFilterDriver} placeholder="Todos motoristas" /></div>
                    <div><MultiSelect label="Municípios" options={municipalityOptions} selected={filterMunicipality} onChange={setFilterMunicipality} placeholder="Todos municípios" /></div>

                    <div className="col-span-1 flex items-end gap-2">
                        <button type="submit" className="flex-1 bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-900 transition-colors h-[42px] flex items-center justify-center gap-2"><Search size={18} /> Filtrar</button>
                        <button type="button" onClick={clearFilters} className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors h-[42px]" title="Limpar Filtros"><X size={18} /></button>
                        <button type="button" onClick={handlePrint} className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors h-[42px]" title="Imprimir Relatório"><Printer size={18} /></button>
                    </div>
                </form>
            </div>
        )}
      </div>

      {/* Resumo Compacto */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2 print:flex print:flex-row print:justify-between print:gap-4 print:border-b print:border-slate-200 print:pb-4 print:mb-6 relative z-0">
            {/* Time */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-all group print:border-none print:shadow-none print:p-0 print:bg-transparent">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors print:hidden">
                    <Clock size={20} strokeWidth={2} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">Tempo em Operação</p>
                    <p className="text-xl font-black text-slate-800 leading-none mt-1 print:text-sm">{summary.formattedTime}</p>
                </div>
            </div>

            {/* KM */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-green-300 transition-all group print:border-none print:shadow-none print:p-0 print:bg-transparent">
                <div className="p-3 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors print:hidden">
                    <MapPin size={20} strokeWidth={2} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">KM Total</p>
                    <p className="text-xl font-black text-slate-800 leading-none mt-1 print:text-sm">{summary.totalKm} <span className="text-xs font-bold text-slate-400">km</span></p>
                </div>
            </div>

            {/* No Signal */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-orange-300 transition-all group print:border-none print:shadow-none print:p-0 print:bg-transparent">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors print:hidden">
                    <WifiOff size={20} strokeWidth={2} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">Sem Sinal</p>
                    <p className="text-xl font-black text-slate-800 leading-none mt-1 print:text-sm">{summary.daysNoSignal} <span className="text-xs font-bold text-slate-400">dias</span></p>
                </div>
            </div>

            {/* Stopped */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-red-300 transition-all group print:border-none print:shadow-none print:p-0 print:bg-transparent">
                <div className="p-3 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors print:hidden">
                    <Ban size={20} strokeWidth={2} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-slate-600">Parado / Oficina</p>
                    <p className="text-xl font-black text-slate-800 leading-none mt-1 print:text-sm">{summary.daysStopped} <span className="text-xs font-bold text-slate-400">dias</span></p>
                </div>
            </div>
        </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none print:overflow-visible relative z-0">
         <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center print:hidden">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <FileText size={18} /> Listagem Detalhada
              <span className="ml-2 text-sm font-normal text-slate-500 bg-white px-2 py-0.5 border rounded-full shadow-sm">{filteredLogs.length} Registros</span>
            </h3>
            
            {/* Items Per Page Selector */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">Exibir:</span>
                <select 
                    value={itemsPerPage} 
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="text-xs border border-slate-300 rounded p-1 bg-white outline-none focus:border-blue-500"
                >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
            </div>
         </div>

         <div className="overflow-x-auto print:overflow-visible">
           <table className="w-full text-base text-left whitespace-nowrap">
             <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-sm print:bg-slate-200 print:text-slate-900">
               <tr>
                 <th className="px-4 py-3 border-b print:px-1 print:py-1">Data</th>
                 <th className="px-4 py-3 border-b min-w-[200px] print:px-1 print:py-1">Veículo / Motorista / Local</th>
                 <th className="px-4 py-3 border-b bg-blue-50 print:bg-transparent print:px-1 print:py-1">Expediente</th>
                 <th className="px-4 py-3 border-b bg-blue-50 print:bg-transparent print:px-1 print:py-1">Int./Extras</th>
                 <th className="px-4 py-3 border-b bg-green-50 text-green-700 print:bg-transparent print:text-black print:px-1 print:py-1">T.Ligado</th>
                 <th className="px-4 py-3 border-b print:px-1 print:py-1">KM Rodado</th>
                 <th className="px-4 py-3 border-b print:px-1 print:py-1">Vel. Máx</th>
                 <th className="px-4 py-3 border-b min-w-[160px] print:px-1 print:py-1">Últ. Abast.</th>
                 {!isReadOnly && <th className="px-4 py-3 border-b text-center print:hidden">Ações</th>}
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {paginatedLogs.length === 0 ? (
                 <tr><td colSpan={isReadOnly ? 8 : 9} className="px-6 py-12 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
               ) : (
                 paginatedLogs.map(log => {
                   const displayContract = log.historicalContract || log.vehicle.contract;
                   return (
                   <tr key={log.id} className="hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                     <td className="px-4 py-3 font-medium text-slate-900 align-top print:px-1 print:py-1 print:text-xs">
                        <div>{formatDateDisplay(log.date)}</div>
                        {log.lastRefuelingInfo && log.lastRefuelingInfo.date === log.date && (
                           <div className="flex items-center gap-1 mt-1 text-orange-600 text-[10px] font-bold bg-orange-50 px-1.5 py-0.5 rounded w-fit border border-orange-100" title="Abastecimento registrado neste dia">
                                <Fuel size={10} />
                                <span>Abast.</span>
                           </div>
                        )}
                        {log.observations && (
                          <button onClick={(e) => { e.stopPropagation(); openObsModal(log); }} className="mt-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full p-1 transition-colors print:hidden">
                              <MessageSquareText size={16} className="fill-yellow-100" />
                          </button>
                        )}
                     </td>
                     <td className="px-4 py-3 align-top print:px-1 print:py-1">
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold ${log.vehicle.plate === 'VEÍCULO EXCLUÍDO' ? 'text-red-500' : 'text-slate-800'} print:text-black print:text-xs`}>{log.vehicle.plate}</span>
                              <span className={`px-2 py-0.5 rounded-[4px] text-xs font-bold border uppercase ${getContractColor(displayContract)} print:border-none print:p-0 print:text-black`}>{displayContract.substring(0,3)}</span>
                           </div>
                           <div className="flex items-center gap-1 text-slate-600 text-sm truncate max-w-[220px] print:text-xs print:whitespace-normal">
                              <User size={14} className="text-slate-400 print:hidden" />
                              <span className="font-medium truncate" title={log.historicalDriver || log.vehicle.driverName}>
                                 {log.historicalDriver || log.vehicle.driverName}
                              </span>
                           </div>
                           <div className="flex items-center gap-1 text-slate-500 text-sm truncate max-w-[220px] print:text-xs print:whitespace-normal" title={log.historicalMunicipality || log.vehicle.municipality}>
                              <MapPin size={14} className="text-slate-400 print:hidden" />
                              <span>{log.historicalMunicipality || log.vehicle.municipality}</span>
                           </div>
                            {log.vehicle.foreman && log.vehicle.foreman !== '-' && (
                             <div className="flex items-center gap-1 text-slate-400 text-[10px] truncate max-w-[220px] print:hidden" title={`Equipe: ${log.vehicle.foreman}`}>
                                <HardHat size={10} className="text-slate-300" />
                                <span>{log.vehicle.foreman}</span>
                             </div>
                           )}
                        </div>
                     </td>

                     {log.nonOperatingReason ? (
                        <td colSpan={5} className="px-4 py-3 align-middle print:px-1 print:py-1">
                           <div className={`flex items-center gap-2 p-2 rounded-lg border ${getNonOperatingColor(log.nonOperatingReason)} print:border-none print:p-0`}>
                             <AlertTriangle size={18} className="print:hidden"/>
                             <span className="font-bold text-sm print:text-xs">{log.nonOperatingReason}</span>
                           </div>
                        </td>
                     ) : (
                       <>
                          <td className="px-4 py-3 align-top bg-blue-50/30 print:bg-transparent print:px-1 print:py-1">
                             <div className="flex flex-col gap-1">
                                <span className="font-medium text-slate-700 print:text-xs">{log.startTime} - {log.endTime}</span>
                                <span className="text-sm text-slate-500 flex items-center gap-1 print:text-xs" title="1ª Ignição"><Key size={14} className="print:hidden" /> (1ª: {log.firstIgnition || '--:--'})</span>
                             </div>
                          </td>
                          <td className="px-4 py-3 align-top bg-blue-50/30 print:bg-transparent print:px-1 print:py-1">
                             <div className="flex flex-col gap-1">
                                <span className="text-slate-600 text-sm print:text-xs" title="Intervalo">Int: {log.lunchStart && log.lunchEnd ? `${log.lunchStart}-${log.lunchEnd}` : '-'}</span>
                                {(log.extraTimeStart && log.extraTimeEnd) && (<span className="text-orange-600 font-medium text-sm print:text-xs print:text-black" title="Hora Extra">Ext: {log.extraTimeStart}-{log.extraTimeEnd}</span>)}
                             </div>
                          </td>
                          <td className="px-4 py-3 align-top bg-green-50/30 print:bg-transparent print:px-1 print:py-1">
                             <div className="flex flex-col"><span className="font-bold text-green-700 text-sm print:text-xs print:text-black">{log.calculatedHours}h</span></div>
                          </td>
                          <td className="px-4 py-3 align-top print:px-1 print:py-1"><span className="text-slate-600 font-medium print:text-xs">{log.kmDriven} km</span></td>
                          <td className="px-4 py-3 align-top print:px-1 print:py-1">
                             <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1"><span className={`${log.maxSpeed > 90 ? "text-red-600 font-bold" : "text-slate-600"} print:text-xs print:text-black`}>{log.maxSpeed} km/h</span>{log.maxSpeed > 90 && <AlertTriangle size={16} className="text-red-600 print:hidden" />}</div>
                                {log.speedingCount > 0 && (<span className="text-sm text-red-500 font-medium print:text-xs print:text-black">Exc: {log.speedingCount}x</span>)}
                             </div>
                          </td>
                       </>
                     )}
                     
                     <td className="px-4 py-3 align-top print:px-1 print:py-1">
                        {log.lastRefuelingInfo ? (
                            <div className="flex flex-col gap-1 text-sm">
                                <div className={`flex items-center gap-1 font-bold ${log.lastRefuelingInfo.date === log.date ? 'text-orange-700' : 'text-slate-700'}`}>
                                    <Fuel size={14} className="text-orange-600 print:hidden" />
                                    <span>{formatRefuelingDate(log.lastRefuelingInfo.date)}</span>
                                    <span className="text-slate-400 text-xs font-normal mx-1">|</span>
                                    <span>{log.lastRefuelingInfo.liters} L</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-500 text-xs">
                                    <Droplet size={12} className="text-blue-400 print:hidden" />
                                    <span>{log.lastRefuelingInfo.date === log.date ? 'Rodou após:' : 'Acumulado:'}</span>
                                    <span className="font-bold text-slate-700">{log.lastRefuelingInfo.kmSince} km</span>
                                </div>
                                {log.lastRefuelingInfo.date === log.date && log.kmBeforeRefueling === undefined && (
                                    <span className="text-[10px] text-red-400 italic leading-tight">
                                        *KM Antes n/ inf.
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-slate-400 italic">Sem registro</span>
                        )}
                     </td>

                     {!isReadOnly && (
                      <td className="px-4 py-3 align-middle text-center print:hidden">
                        <div className="flex justify-center gap-1">
                            <button onClick={() => handleEditClick(log)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit3 size={18} /></button>
                          <button onClick={() => confirmDelete(log.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Excluir"><Trash2 size={18} /></button>
                        </div>
                      </td>
                     )}
                   </tr>
                 )})
               )}
             </tbody>
           </table>
         </div>

         {/* Pagination Controls */}
         {totalPages > 1 && (
             <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 print:hidden">
                 <div className="flex flex-1 justify-between sm:hidden">
                     <button
                         onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                         disabled={currentPage === 1}
                         className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                     >
                         Anterior
                     </button>
                     <button
                         onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                         disabled={currentPage === totalPages}
                         className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                     >
                         Próximo
                     </button>
                 </div>
                 <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                     <div>
                         <p className="text-sm text-slate-700">
                             Mostrando <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> até <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> de <span className="font-bold">{filteredLogs.length}</span> resultados
                         </p>
                     </div>
                     <div>
                         <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                             <button
                                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                 disabled={currentPage === 1}
                                 className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                             >
                                 <span className="sr-only">Anterior</span>
                                 <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                             </button>
                             {/* Simplified Pagination Numbers */}
                             <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">
                                 Página {currentPage} de {totalPages}
                             </span>
                             <button
                                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                 disabled={currentPage === totalPages}
                                 className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                             >
                                 <span className="sr-only">Próximo</span>
                                 <ChevronRight className="h-5 w-5" aria-hidden="true" />
                             </button>
                         </nav>
                     </div>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default Reports;