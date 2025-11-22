
import React, { useState, useEffect } from 'react';
import { Vehicle, ContractType, VehicleType, DailyLog, UserRole, UserProfile } from '../types';
import { storageService } from '../services/storage';
import PasswordModal from './PasswordModal';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Edit2, Trash2, Save, X, Car, Truck, Search, History, 
  Calendar as CalendarIcon, MapPin, User, Filter, Printer, Loader2, Eye
} from 'lucide-react';

const Vehicles: React.FC = () => {
  const { user } = useAuth();
  const isFinanceiro = user?.role === UserRole.FINANCEIRO;
  // RH e Gerencia só podem ver, não podem editar/excluir/criar
  const isReadOnly = isFinanceiro || user?.role === UserRole.RH || user?.role === UserRole.GERENCIA;

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]); // Store logs to calculate status
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  
  // Form visibility
  const [showForm, setShowForm] = useState(false);
  
  // Edit / Create State
  const [isEditing, setIsEditing] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Partial<Vehicle>>({});
  const [foremenList, setForemenList] = useState<string[]>([]);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<DailyLog[]>([]);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<Vehicle | null>(null);
  const [historyDateRange, setHistoryDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Helper to get the effective status string for filtering
  const getCalculatedStatus = (vehicle: Vehicle, currentLogs: DailyLog[]) => {
    // Se foi marcado manualmente como inativo (ex: vendido), respeita
    if (vehicle.status === 'INATIVO') return 'INATIVO';

    const vehicleLogs = currentLogs
      .filter(l => l.vehicleId === vehicle.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const lastLog = vehicleLogs[0];

    if (lastLog && lastLog.nonOperatingReason) {
      const reason = lastLog.nonOperatingReason;
      // EXCEPTION: Se for "SEM SINAL" ou "NÃO LIGOU", o status deve permanecer ATIVO (Visualmente verde)
      if (reason === 'SEM SINAL' || reason === 'NÃO LIGOU') {
        return 'ATIVO';
      }
      return reason; // 'OFICINA', 'GARAGEM', 'EM MANUTENÇÃO'
    }

    return 'ATIVO';
  };

  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = vehicles.filter(v => {
       const matchesSearch = 
          v.plate.toLowerCase().includes(lowerTerm) ||
          v.driverName.toLowerCase().includes(lowerTerm) ||
          v.contract.toLowerCase().includes(lowerTerm);
       
       const matchesContract = !filterContract || v.contract === filterContract;
       
       // Calculate status dynamically for filtering to match the display
       const currentStatus = getCalculatedStatus(v, logs);
       const matchesStatus = !filterStatus || currentStatus === filterStatus;
       
       const matchesType = !filterType || v.type === filterType;

       return matchesSearch && matchesContract && matchesStatus && matchesType;
    });
    setFilteredVehicles(filtered);
  }, [searchTerm, filterContract, filterStatus, filterType, vehicles, logs]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vData, lData, uData] = await Promise.all([
        storageService.getVehicles(),
        storageService.getLogs(),
        storageService.getAllUsers()
      ]);
      setVehicles(vData);
      setFilteredVehicles(vData);
      setLogs(lData);
      
      const foremen = uData
        .filter((u: UserProfile) => u.role === UserRole.ENCARREGADO)
        .map((u: UserProfile) => u.name || u.email.split('@')[0])
        .sort();
      setForemenList(foremen);

    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Force Uppercase
    setCurrentVehicle(prev => ({ ...prev, [name]: value.toUpperCase() }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!currentVehicle.plate || !currentVehicle.contract) return;

    const newVehicle: Vehicle = {
      id: currentVehicle.id || crypto.randomUUID(),
      contract: currentVehicle.contract as ContractType,
      plate: currentVehicle.plate.toUpperCase(),
      model: currentVehicle.model ? currentVehicle.model.toUpperCase() : '',
      year: currentVehicle.year || '',
      driverName: currentVehicle.driverName ? currentVehicle.driverName.toUpperCase() : '',
      municipality: currentVehicle.municipality ? currentVehicle.municipality.toUpperCase() : '',
      foreman: currentVehicle.foreman ? currentVehicle.foreman.toUpperCase() : '',
      type: currentVehicle.type as VehicleType || VehicleType.PICK_UP,
      status: 'ATIVO' // Default, as option was removed
    };

    setLoading(true);
    await storageService.saveVehicle(newVehicle);
    await loadData();
    resetForm();
  };

  const handleEdit = (vehicle: Vehicle) => {
    if (isReadOnly) return; // Security check
    setCurrentVehicle(vehicle);
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = (id: string) => {
    if (isReadOnly) return; // Security check
    setVehicleToDelete(id);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (vehicleToDelete) {
      setLoading(true);
      await storageService.deleteVehicle(vehicleToDelete);
      await loadData();
      setVehicleToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const showHistory = async (vehicle: Vehicle) => {
    setSelectedVehicleForHistory(vehicle);
    setHistoryDateRange({ start: '', end: '' }); // Reset filters on open
    
    const vehicleLogs = logs
      .filter(log => log.vehicleId === vehicle.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const relevantLogs: DailyLog[] = [];
    let lastDriver = '';
    let lastMunicipality = '';
    let lastContract = '';
    
    vehicleLogs.forEach((log) => {
       const currentDriver = log.historicalDriver || vehicle.driverName; 
       const currentMunicipality = log.historicalMunicipality || vehicle.municipality;
       const currentContract = log.historicalContract || vehicle.contract;
       const currentStatus = log.nonOperatingReason || 'ATIVO';

       const hasChanged = 
          currentDriver.trim().toLowerCase() !== lastDriver.trim().toLowerCase() || 
          currentMunicipality.trim().toLowerCase() !== lastMunicipality.trim().toLowerCase() ||
          currentContract.trim().toLowerCase() !== lastContract.trim().toLowerCase();

       if (hasChanged) {
         relevantLogs.push({
            ...log,
            historicalDriver: currentDriver,
            historicalMunicipality: currentMunicipality,
            historicalContract: currentContract,
            nonOperatingReason: currentStatus === 'ATIVO' ? undefined : currentStatus 
         });
         lastDriver = currentDriver;
         lastMunicipality = currentMunicipality;
         lastContract = currentContract;
       }
    });

    setHistoryLogs(relevantLogs.reverse());
    setShowHistoryModal(true);
  };

  const resetForm = () => {
    setCurrentVehicle({});
    setIsEditing(false);
    setShowForm(false);
  };

  // Helper to avoid timezone issues
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper for contract colors
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

  // Helper to determine Real Status based on Last Log
  const getVehicleStatusDisplay = (vehicle: Vehicle) => {
    const vehicleLogs = logs
      .filter(l => l.vehicleId === vehicle.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const lastLog = vehicleLogs[0];

    if (lastLog && lastLog.nonOperatingReason) {
      const reason = lastLog.nonOperatingReason;
      
      if (reason === 'SEM SINAL' || reason === 'NÃO LIGOU') {
        return { 
          label: 'ATIVO', 
          className: 'bg-green-100 text-green-700 border-green-200', 
          dotColor: 'bg-green-600' 
        };
      }

      let colorClass = 'bg-orange-100 text-orange-700 border-orange-200';
      let dotColor = 'bg-orange-500';

      if (reason === 'GARAGEM') {
         colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
         dotColor = 'bg-yellow-500';
      } else if (reason === 'OFICINA' || reason === 'EM MANUTENÇÃO') {
         colorClass = 'bg-red-100 text-red-700 border-red-200';
         dotColor = 'bg-red-500';
      }

      return { label: reason, className: colorClass, dotColor };
    }

    return { 
      label: 'ATIVO', 
      className: 'bg-green-100 text-green-700 border-green-200', 
      dotColor: 'bg-green-600' 
    };
  };

  const inputClass = "w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-slate-800 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all";
  const selectFilterClass = "w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm shadow-sm";

  if (loading && vehicles.length === 0) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Print Header - Hidden in screen view */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-bold text-black">Relatório de Veículos da Frota</h1>
        <p className="text-sm text-gray-600">
          CRV-PARIS | Gerado em: {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Total de Veículos Listados: {filteredVehicles.length}
        </p>
      </div>

      {/* Modals - Hidden on Print */}
      <div className="print:hidden">
        <PasswordModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={executeDelete}
            title="Excluir Veículo"
        />
      </div>

      {/* History Modal */}
      {showHistoryModal && selectedVehicleForHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                   <History size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Histórico de Movimentação</h3>
                  <p className="text-slate-300 text-xs">
                    {selectedVehicleForHistory.plate} - {selectedVehicleForHistory.type}
                    <span className="block opacity-70 mt-1 font-normal italic">
                      (Exibindo alterações de Motorista, Contrato ou Município)
                    </span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            {/* Date Filter Bar */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap items-center gap-4 justify-end px-6">
                <div className="flex items-center gap-2 text-slate-600 mr-auto">
                    <Filter size={16} />
                    <span className="text-xs font-bold uppercase">Filtrar Período:</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">De</span>
                    <div className="relative">
                        <CalendarIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input 
                            type="date" 
                            value={historyDateRange.start}
                            onChange={(e) => setHistoryDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="border border-slate-300 rounded pl-8 pr-2 py-1 text-sm text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm bg-white"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Até</span>
                    <div className="relative">
                        <CalendarIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input 
                            type="date" 
                            value={historyDateRange.end}
                            onChange={(e) => setHistoryDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="border border-slate-300 rounded pl-8 pr-2 py-1 text-sm text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm bg-white"
                        />
                    </div>
                </div>
                {(historyDateRange.start || historyDateRange.end) && (
                    <button 
                        onClick={() => setHistoryDateRange({ start: '', end: '' })}
                        className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                    >
                        <X size={14} /> Limpar
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
               {(() => {
                 const filteredHistoryLogs = historyLogs.filter(log => {
                    const { start, end } = historyDateRange;
                    if (start && log.date < start) return false;
                    if (end && log.date > end) return false;
                    return true;
                 });

                 if (filteredHistoryLogs.length === 0) {
                    return (
                        <div className="text-center py-12 text-slate-400">
                            <History size={48} className="mx-auto mb-3 opacity-20" />
                            <p>Nenhuma alteração encontrada no período selecionado.</p>
                        </div>
                    );
                 }

                 return (
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pl-8 py-2">
                    {filteredHistoryLogs.map((log) => {
                        const getHistoryStatusParams = (reason?: string) => {
                            if (reason === 'SEM SINAL' || reason === 'NÃO LIGOU') {
                            return { 
                                label: 'ATIVO', 
                                className: 'bg-green-100 text-green-700 border-green-200', 
                                dotColor: 'bg-green-600' 
                            };
                            }
                            if (reason === 'GARAGEM') {
                                return { label: 'GARAGEM', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', dotColor: 'bg-yellow-500' };
                            }
                            if (reason === 'OFICINA' || reason === 'EM MANUTENÇÃO') {
                                return { label: reason, className: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500' };
                            }
                            if (reason === 'INATIVO') { 
                                return { label: 'INATIVO', className: 'bg-slate-100 text-slate-700 border-slate-200', dotColor: 'bg-slate-500' };
                            }
                            return { 
                            label: 'ATIVO', 
                            className: 'bg-green-100 text-green-700 border-green-200', 
                            dotColor: 'bg-green-600' 
                            };
                        };

                        const statusParams = getHistoryStatusParams(log.nonOperatingReason);

                        return (
                        <div key={log.id} className="relative group">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[41px] top-0 w-5 h-5 bg-blue-100 border-4 border-blue-600 rounded-full group-hover:scale-110 transition-transform"></div>
                        
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                <div className="flex items-center gap-2 text-slate-800 font-bold">
                                <CalendarIcon size={16} />
                                <span>{formatDateDisplay(log.date)}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ml-2 ${statusParams.className}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${statusParams.dotColor}`}></div>
                                    {statusParams.label}
                                </span>
                                </div>
                                <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                Registro de Movimentação
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="flex items-start gap-3 bg-white p-3 rounded border border-slate-100">
                                <User size={20} className="text-blue-500 mt-0.5" />
                                <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Motorista</p>
                                <p className="text-slate-800 font-bold text-sm">
                                    {log.historicalDriver || (vehicles.find(v => v.id === log.vehicleId)?.driverName) || "N/A"}
                                </p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3 bg-white p-3 rounded border border-slate-100">
                                <MapPin size={20} className="text-green-500 mt-0.5" />
                                <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Município</p>
                                <p className="text-slate-800 font-bold text-sm">
                                    {log.historicalMunicipality || (vehicles.find(v => v.id === log.vehicleId)?.municipality) || "N/A"}
                                </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-white p-3 rounded border border-slate-100">
                                <Truck size={20} className="text-purple-500 mt-0.5" />
                                <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Contrato</p>
                                <p className="text-slate-800 font-bold text-sm">
                                    {log.historicalContract || (vehicles.find(v => v.id === log.vehicleId)?.contract) || "N/A"}
                                </p>
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>
                    )})}
                    </div>
                 );
               })()}
            </div>
            <div className="bg-slate-50 p-4 border-t text-right">
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Header Section - Screen Only */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestão de Veículos</h1>
          <p className="text-slate-500">
             {isReadOnly ? "Visualize os veículos da frota" : "Cadastre e gerencie todos os veículos da frota"}
          </p>
        </div>
        <div>
             <button
              onClick={handlePrint}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
              <Printer size={20} />
              Imprimir Lista
            </button>
        </div>
      </div>

      {/* Search and Action Bar - Hidden on Print */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center print:hidden">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-shadow"
            placeholder="Buscar por placa, motorista, contrato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
           <select
             value={filterContract}
             onChange={(e) => setFilterContract(e.target.value)}
             className={selectFilterClass}
           >
             <option value="">Contrato: Todos</option>
             {Object.values(ContractType).map(type => (
               <option key={type} value={type}>{type}</option>
             ))}
           </select>

           <select
             value={filterType}
             onChange={(e) => setFilterType(e.target.value)}
             className={selectFilterClass}
           >
             <option value="">Tipo: Todos</option>
             {Object.values(VehicleType).map(type => (
               <option key={type} value={type}>{type}</option>
             ))}
           </select>

           <select
             value={filterStatus}
             onChange={(e) => setFilterStatus(e.target.value)}
             className={selectFilterClass}
           >
             <option value="">Status Atual: Todos</option>
             <option value="ATIVO">ATIVO</option>
             <option value="OFICINA">OFICINA</option>
             <option value="EM MANUTENÇÃO">EM MANUTENÇÃO</option>
             <option value="GARAGEM">GARAGEM</option>
             <option value="INATIVO">INATIVO</option>
           </select>
        </div>
      </div>
      
      {/* New Button Row - Between Filters and List - HIDDEN FOR READ ONLY ROLES */}
      {!isReadOnly && (
        <div className="flex justify-start print:hidden">
            <button
            onClick={() => {
                resetForm();
                setShowForm(!showForm);
            }}
            className="w-auto bg-blue-800 hover:bg-blue-900 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20 whitespace-nowrap"
            >
            <Plus size={20} />
            {showForm ? 'Fechar' : 'Novo'}
            </button>
        </div>
      )}

      {/* Form Section (Collapsible) - Hidden on Print and for Read Only */}
      <div className="print:hidden">
        {showForm && !isReadOnly && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              <div className="bg-blue-100 p-2 rounded-full text-blue-700">
                <Car size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {isEditing ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
                </h2>
                <p className="text-sm text-slate-500">Preencha as informações completas do veículo</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Placa</label>
                <input
                  type="text"
                  name="plate"
                  value={currentVehicle.plate || ''}
                  onChange={handleInputChange}
                  placeholder="ABC-1234"
                  required
                  className={`${inputClass} uppercase font-mono`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo do Veículo</label>
                <select
                  name="type"
                  value={currentVehicle.type || ''}
                  onChange={handleInputChange}
                  required
                  className={inputClass}
                >
                  <option value="">Selecione...</option>
                  {Object.values(VehicleType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Modelo</label>
                <input
                  type="text"
                  name="model"
                  value={currentVehicle.model || ''}
                  onChange={handleInputChange}
                  placeholder="Ex: Hilux, Strada..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Ano</label>
                <input
                  type="text"
                  name="year"
                  value={currentVehicle.year || ''}
                  onChange={handleInputChange}
                  placeholder="Ex: 2023/2024"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Contrato</label>
                <select
                  name="contract"
                  value={currentVehicle.contract || ''}
                  onChange={handleInputChange}
                  required
                  className={inputClass}
                >
                  <option value="">Selecione...</option>
                  {Object.values(ContractType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome do Motorista</label>
                <input
                  type="text"
                  name="driverName"
                  value={currentVehicle.driverName || ''}
                  onChange={handleInputChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Município</label>
                <input
                  type="text"
                  name="municipality"
                  value={currentVehicle.municipality || ''}
                  onChange={handleInputChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Equipe</label>
                {/* Changed to Input with Datalist for free text or selection */}
                <input
                    list="foremen-list"
                    type="text"
                    name="foreman"
                    value={currentVehicle.foreman || ''}
                    onChange={handleInputChange}
                    required
                    placeholder="Digite ou selecione a equipe..."
                    className={inputClass}
                />
                <datalist id="foremen-list">
                    {foremenList.map(f => (
                        <option key={f} value={f} />
                    ))}
                </datalist>
              </div>
              
              <div className="md:col-span-2 lg:col-span-3 flex gap-3 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-bold shadow-sm shadow-green-600/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {isEditing ? 'Salvar Alterações' : 'Cadastrar Veículo'}
                </button>
                
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center justify-center gap-2 bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                >
                  <X size={18} /> Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* List Section */}
      <div className="bg-white rounded-t-xl shadow-sm border border-slate-200 overflow-hidden print:overflow-visible">
        <div className="bg-slate-800 p-4 flex justify-between items-center print:hidden">
          <h3 className="font-bold text-white flex items-center gap-2">
             <Truck size={20} /> 
             Veículos Cadastrados ({filteredVehicles.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 print:bg-white print:text-black">
              <tr>
                <th className="px-6 py-4 print:px-2 print:py-2">Placa</th>
                <th className="px-6 py-4 print:px-2 print:py-2">Status Atual</th>
                <th className="px-6 py-4 print:px-2 print:py-2">Modelo/Ano</th>
                <th className="px-6 py-4 print:px-2 print:py-2">Contrato</th>
                <th className="px-6 py-4 print:px-2 print:py-2">Tipo</th>
                <th className="px-6 py-4 print:px-2 print:py-2">Motorista</th>
                <th className="px-6 py-4 print:px-2 print:py-2">Município</th>
                <th className="px-6 py-4 print:px-2 print:py-2">Equipe</th>
                <th className="px-6 py-4 text-center print:hidden">
                   {isReadOnly ? 'Histórico' : 'Ações'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr>
                   <td colSpan={9} className="px-6 py-12 text-center">
                     <Loader2 className="animate-spin mx-auto text-blue-500" size={24} />
                     <p className="text-slate-400 mt-2">Carregando...</p>
                   </td>
                 </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    Nenhum veículo encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(vehicle => {
                  const statusDisplay = getVehicleStatusDisplay(vehicle);
                  return (
                    <tr key={vehicle.id} className="hover:bg-blue-50/30 transition-colors group print:hover:bg-transparent">
                      <td className="px-6 py-4 font-bold text-slate-900 font-mono print:px-2 print:py-2">{vehicle.plate}</td>
                      <td className="px-6 py-4 print:px-2 print:py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${statusDisplay.className} print:border-none print:p-0`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusDisplay.dotColor} print:hidden`}></div>
                          {statusDisplay.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 print:px-2 print:py-2">
                         <div className="flex flex-col text-xs">
                           <span className="font-bold">{vehicle.model || '-'}</span>
                           <span className="text-slate-400 print:text-slate-600">{vehicle.year || '-'}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 print:px-2 print:py-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${getContractColor(vehicle.contract)} print:border-none print:bg-transparent print:text-black print:p-0`}>
                          {vehicle.contract}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs uppercase font-medium print:px-2 print:py-2">
                        {vehicle.type}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2 text-slate-700 print:px-2 print:py-2">
                        <User size={16} className="text-slate-400 print:hidden" />
                        {vehicle.driverName}
                      </td>
                      <td className="px-6 py-4 text-slate-600 print:px-2 print:py-2">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-slate-400 print:hidden" />
                          {vehicle.municipality}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs print:px-2 print:py-2">
                        {vehicle.foreman}
                      </td>
                      <td className="px-6 py-4 print:hidden">
                        <div className="flex justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => showHistory(vehicle)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Histórico de Movimentação"
                          >
                            <History size={18} />
                          </button>
                          
                          {!isReadOnly && (
                            <>
                                <button
                                    onClick={() => handleEdit(vehicle)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => confirmDelete(vehicle.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Vehicles;
