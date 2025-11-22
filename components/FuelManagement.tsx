import React, { useState, useEffect } from 'react';
import { GasStation, RefuelingLog, Vehicle, FuelType, ContractType, UserRole, UserProfile } from '../types';
import { storageService } from '../services/storage';
import PasswordModal from './PasswordModal';
import { useAuth } from '../contexts/AuthContext';
import { 
  Fuel, Plus, Save, Trash2, Edit2, Droplet, Filter, X, Calendar, Printer, AlertCircle, Users, ChevronDown, ChevronUp, Anchor, FileText, MapPin, Clock, ClipboardList, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { PrintHeader } from './PrintHeader';

type TabType = 'REFUELING' | 'STATIONS';

const EXTERNAL_EQUIPMENT_TYPES = [
  'BARCO', 
  'BALSA', 
  'MOTO', 
  'CARRO',
  'LANCHA', 
  'MOTOR DE POUPA', 
  'GERADOR', 
  'GALÃO', 
  'TAMBOR'
];

const ITEMS_PER_PAGE = 50;

const FuelManagement: React.FC = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === UserRole.GERENCIA;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('REFUELING');
  
  const [stations, setStations] = useState<GasStation[]>([]);
  const [refuelings, setRefuelings] = useState<RefuelingLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [currentPage, setCurrentPage] = useState(1);

  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterPlate, setFilterPlate] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [filterContract, setFilterContract] = useState('');
  const [filterMunicipality, setFilterMunicipality] = useState('');
  const [filterFuel, setFilterFuel] = useState('');
  const [filterForeman, setFilterForeman] = useState('');

  const [showFilters, setShowFilters] = useState(false);

  const [uniquePlates, setUniquePlates] = useState<string[]>([]);
  const [uniqueContracts, setUniqueContracts] = useState<string[]>([]);
  const [uniqueMunicipalities, setUniqueMunicipalities] = useState<string[]>([]);
  const [uniqueForemen, setUniqueForemen] = useState<string[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentStation, setCurrentStation] = useState<Partial<GasStation>>({});
  
  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  
  const [currentRefueling, setCurrentRefueling] = useState<Partial<RefuelingLog>>({
    date: getTodayLocal(),
    time: getCurrentTime(),
    foremanSnapshot: '', 
    invoiceNumber: '',
    requisitionNumber: ''
  });

  const [isExternal, setIsExternal] = useState(false);
  const [externalData, setExternalData] = useState({
    identifier: '', 
    model: '',
    contract: '',
    municipality: '',
    description: '' 
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDateStart, filterDateEnd, filterPlate, filterStation, filterContract, filterMunicipality, filterFuel, filterForeman]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, rData, vData, uData] = await Promise.all([
          storageService.getGasStations(),
          storageService.getRefuelings(),
          storageService.getVehicles(),
          storageService.getAllUsers()
      ]);

      setStations(sData);
      setRefuelings(rData);
      setVehicles(vData);

      const plates = Array.from(new Set(rData.map(r => r.plateSnapshot))).sort();
      const contracts = Array.from(new Set(rData.map(r => r.contractSnapshot))).sort();
      const cities = Array.from(new Set(rData.map(r => r.municipalitySnapshot))).sort();
      
      const encarregados = uData
        .filter(u => u.role === UserRole.ENCARREGADO)
        .map(u => u.name || u.email.split('@')[0])
        .sort();

      setUniquePlates(plates);
      setUniqueContracts(contracts);
      setUniqueMunicipalities(cities);
      setUniqueForemen(encarregados);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  };

  const getFuelColor = (fuelType: string) => {
    switch (fuelType) {
      case FuelType.GASOLINA: return 'bg-orange-100 text-orange-800 border-orange-200'; 
      case FuelType.ETANOL: return 'bg-green-100 text-green-800 border-green-200';
      case FuelType.DIESEL: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case FuelType.DIESEL_S10: return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!currentStation.name || !currentStation.municipality) return;

    const newStation: GasStation = {
      id: currentStation.id || crypto.randomUUID(),
      name: currentStation.name.toUpperCase(),
      cnpj: currentStation.cnpj ? currentStation.cnpj.toUpperCase() : '',
      municipality: currentStation.municipality.toUpperCase(),
      phone: currentStation.phone || '',
      address: currentStation.address ? currentStation.address.toUpperCase() : ''
    };

    setLoading(true);
    await storageService.saveGasStation(newStation);
    await loadData();
    resetForms();
  };

  const handleEditStation = (station: GasStation) => {
    if (isReadOnly) return;
    setCurrentStation(station);
    setIsEditing(true);
    setShowForm(true);
    setActiveTab('STATIONS');
  };

  const deleteStation = async (id: string) => {
    if (isReadOnly) return;
    const hasUsage = refuelings.some(r => r.gasStationId === id);
    if(hasUsage) {
        alert("Não é possível excluir este posto pois existem abastecimentos vinculados a ele.");
        return;
    }
    setLoading(true);
    await storageService.deleteGasStation(id);
    await loadData();
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleSaveRefueling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    if (!currentRefueling.gasStationId || !currentRefueling.liters || !currentRefueling.fuelType) return;
    
    let snapshotData = {
        plate: '',
        model: '',
        contract: '',
        municipality: '',
        foreman: currentRefueling.foremanSnapshot || ''
    };

    let vehicleIdToSave = '';

    if (isExternal) {
        if (!externalData.identifier || !externalData.contract || !externalData.municipality) {
            alert("Para equipamentos externos, preencha Identificação, Contrato e Município.");
            return;
        }
        snapshotData.plate = externalData.identifier.toUpperCase();
        snapshotData.model = externalData.model ? externalData.model.toUpperCase() : '';
        snapshotData.contract = externalData.contract;
        snapshotData.municipality = externalData.municipality.toUpperCase();
        vehicleIdToSave = 'EXTERNAL';
    } else {
        if (!currentRefueling.vehicleId) return;
        
        const vehicle = vehicles.find(v => v.id === currentRefueling.vehicleId);
        if (!vehicle) return;

        snapshotData.plate = vehicle.plate;
        snapshotData.model = vehicle.model || '';
        snapshotData.contract = vehicle.contract;
        snapshotData.municipality = vehicle.municipality;
        if (!snapshotData.foreman) snapshotData.foreman = vehicle.foreman;
        
        vehicleIdToSave = currentRefueling.vehicleId;
    }

    const newRefueling: RefuelingLog = {
      id: currentRefueling.id || crypto.randomUUID(),
      date: currentRefueling.date!,
      vehicleId: vehicleIdToSave,
      gasStationId: currentRefueling.gasStationId,
      fuelType: currentRefueling.fuelType as FuelType,
      liters: Number(currentRefueling.liters),
      totalCost: Number(currentRefueling.totalCost || 0),
      invoiceNumber: currentRefueling.invoiceNumber ? currentRefueling.invoiceNumber.toUpperCase() : '',
      requisitionNumber: currentRefueling.requisitionNumber ? currentRefueling.requisitionNumber.toUpperCase() : '',
      time: currentRefueling.time || '', 
      
      plateSnapshot: snapshotData.plate,
      modelSnapshot: snapshotData.model,
      foremanSnapshot: snapshotData.foreman, 
      contractSnapshot: snapshotData.contract,
      municipalitySnapshot: snapshotData.municipality,
      observation: isExternal && externalData.description ? externalData.description.toUpperCase() : ''
    };

    setLoading(true);
    await storageService.saveRefueling(newRefueling);
    await loadData();
    resetForms();
  };

  const handleEditRefueling = (refueling: RefuelingLog) => {
    if (isReadOnly) return;
    setCurrentRefueling(refueling);
    
    const vehicleExists = vehicles.find(v => v.id === refueling.vehicleId);
    
    if (!vehicleExists || refueling.vehicleId === 'EXTERNAL') {
        setIsExternal(true);
        setExternalData({
            identifier: refueling.plateSnapshot,
            model: refueling.modelSnapshot,
            contract: refueling.contractSnapshot,
            municipality: refueling.municipalitySnapshot,
            description: refueling.observation || ''
        });
    } else {
        setIsExternal(false);
        setExternalData({ identifier: '', model: '', contract: '', municipality: '', description: '' });
    }

    setIsEditing(true);
    setShowForm(true);
    setActiveTab('REFUELING');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteRefueling = async (id: string) => {
    if (isReadOnly) return;
    setLoading(true);
    await storageService.deleteRefueling(id);
    await loadData();
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const resetForms = () => {
    setShowForm(false);
    setIsEditing(false);
    setCurrentStation({});
    setCurrentRefueling({
      date: getTodayLocal(),
      time: getCurrentTime(),
      foremanSnapshot: '',
      invoiceNumber: '',
      requisitionNumber: ''
    });
    setIsExternal(false);
    setExternalData({ identifier: '', model: '', contract: '', municipality: '', description: '' });
  };

  const resetFilters = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterPlate('');
    setFilterStation('');
    setFilterContract('');
    setFilterMunicipality('');
    setFilterFuel('');
    setFilterForeman('');
  };

  const confirmDelete = (id: string) => {
    if (isReadOnly) return;
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const executeDelete = () => {
    if (itemToDelete) {
      if (activeTab === 'STATIONS') {
        deleteStation(itemToDelete);
      } else {
        deleteRefueling(itemToDelete);
      }
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
        setCurrentRefueling(prev => ({
            ...prev,
            vehicleId: vehicleId,
            foremanSnapshot: vehicle.foreman 
        }));
    } else {
        setCurrentRefueling(prev => ({ ...prev, vehicleId: vehicleId, foremanSnapshot: '' }));
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredRefuelings = refuelings.filter(r => {
      const rDate = new Date(r.date).getTime();
      const start = filterDateStart ? new Date(filterDateStart).getTime() : null;
      const end = filterDateEnd ? new Date(filterDateEnd).getTime() : null;
      const matchesDate = (!start || rDate >= start) && (!end || rDate <= end);

      const matchesPlate = !filterPlate || r.plateSnapshot === filterPlate;
      const matchesStation = !filterStation || r.gasStationId === filterStation;
      const matchesContract = !filterContract || r.contractSnapshot === filterContract;
      const matchesCity = !filterMunicipality || r.municipalitySnapshot === filterMunicipality;
      const matchesFuel = !filterFuel || r.fuelType === filterFuel;
      const matchesForeman = !filterForeman || r.foremanSnapshot === filterForeman;

      return matchesDate && matchesPlate && matchesStation && matchesContract && matchesCity && matchesFuel && matchesForeman;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredRefuelings.length / ITEMS_PER_PAGE);
  const paginatedRefuelings = filteredRefuelings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalLiters = filteredRefuelings.reduce((acc, curr) => acc + curr.liters, 0);
  const totalCost = filteredRefuelings.reduce((acc, curr) => acc + curr.totalCost, 0);

  const activeFiltersCount = [
    filterDateStart, filterDateEnd, filterPlate, filterStation, 
    filterContract, filterMunicipality, filterFuel, filterForeman
  ].filter(Boolean).length;

  const inputClass = "w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-slate-800 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all";
  const selectClass = "w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all h-[42px] shadow-sm";

  if (loading && activeTab === 'REFUELING' && refuelings.length === 0) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="space-y-6">
       
      {/* PRINT HEADER */}
      <PrintHeader 
        title="Relatório de Abastecimentos"
        subtitle="Consolidado de Consumo"
        details={
            <>
                <span>Registros: {filteredRefuelings.length}</span>
                <span>Total Litros: {totalLiters.toFixed(2)} L</span>
                <span>Total Valor: {formatCurrency(totalCost)}</span>
            </>
        }
      />

       <div className="print:hidden">
        <PasswordModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={executeDelete}
            title={activeTab === 'STATIONS' ? "Excluir Posto" : "Excluir Abastecimento"}
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Fuel className="text-orange-600" size={32} />
            Gestão de Abastecimento
          </h1>
          <p className="text-slate-500">Controle de combustível e cadastro de postos conveniados.</p>
        </div>
        
        <div className="flex flex-col gap-2 w-full md:w-auto">
             <button
                onClick={handlePrint}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full md:w-auto"
            >
                <Printer size={20} />
                Imprimir Relatório
            </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 print:hidden bg-slate-50 p-2 rounded-xl shadow-sm border border-slate-100">
        
        <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-full sm:w-auto">
            <button
            onClick={() => { setActiveTab('REFUELING'); resetForms(); }}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'REFUELING' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            >
            <ClipboardList size={16} />
            Registros
            </button>
            <button
            onClick={() => { setActiveTab('STATIONS'); resetForms(); }}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'STATIONS' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            >
            <Fuel size={16} />
            Postos
            </button>
        </div>

        {!isReadOnly && (
          <div className="w-full sm:w-auto">
            {activeTab === 'REFUELING' && (
                <button
                    onClick={() => { resetForms(); setShowForm(!showForm); }}
                    className={`${showForm ? 'bg-slate-600 hover:bg-slate-700' : 'bg-red-600 hover:bg-red-700'} text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow transition-colors w-full sm:w-auto whitespace-nowrap h-[40px]`}
                >
                    {showForm ? <X size={18} /> : <Plus size={18} />}
                    {showForm ? 'Cancelar' : 'Novo Abastecimento'}
                </button>
            )}
             {activeTab === 'STATIONS' && (
                <button
                    onClick={() => { resetForms(); setShowForm(!showForm); }}
                    className={`${showForm ? 'bg-slate-600 hover:bg-slate-700' : 'bg-red-600 hover:bg-red-700'} text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow transition-colors w-full sm:w-auto whitespace-nowrap h-[40px]`}
                >
                     {showForm ? <X size={18} /> : <Plus size={18} />}
                    {showForm ? 'Cancelar' : 'Novo Posto'}
                </button>
            )}
        </div>
        )}
      </div>
      
      {activeTab === 'REFUELING' && (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm print:hidden overflow-hidden">
                <div onClick={() => setShowFilters(!showFilters)} className="p-4 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <Filter size={20} className="text-blue-600" />
                        Filtros Avançados
                        {activeFiltersCount > 0 && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full ml-2">{activeFiltersCount} ativos</span>}
                    </div>
                    <div className="flex items-center gap-2">
                         {activeFiltersCount > 0 && <button onClick={(e) => { e.stopPropagation(); resetFilters(); }} className="text-xs text-red-600 hover:bg-red-50 px-3 py-1 rounded-full font-medium flex items-center gap-1 transition-colors mr-2"><X size={14} /> Limpar</button>}
                        {showFilters ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                    </div>
                </div>
                
                {showFilters && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 animate-in slide-in-from-top-5 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Data Início</label>
                                <div className="relative">
                                    <input type="date" className={selectClass} value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Calendar size={16} className="text-slate-400" /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Data Final</label>
                                <div className="relative">
                                    <input type="date" className={selectClass} value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Calendar size={16} className="text-slate-400" /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Placa / Identificação</label>
                                <select className={selectClass} value={filterPlate} onChange={(e) => setFilterPlate(e.target.value)}>
                                    <option value="">Todas</option>
                                    {uniquePlates.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Encarregado</label>
                                <select className={selectClass} value={filterForeman} onChange={(e) => setFilterForeman(e.target.value)}>
                                    <option value="">Todos</option>
                                    {uniqueForemen.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Posto</label>
                                <select className={selectClass} value={filterStation} onChange={(e) => setFilterStation(e.target.value)}>
                                    <option value="">Todos</option>
                                    {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Contrato</label>
                                <select className={selectClass} value={filterContract} onChange={(e) => setFilterContract(e.target.value)}>
                                    <option value="">Todos</option>
                                    {uniqueContracts.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Município</label>
                                <select className={selectClass} value={filterMunicipality} onChange={(e) => setFilterMunicipality(e.target.value)}>
                                    <option value="">Todos</option>
                                    {uniqueMunicipalities.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Combustível</label>
                                <select className={selectClass} value={filterFuel} onChange={(e) => setFilterFuel(e.target.value)}>
                                    <option value="">Todos</option>
                                    {Object.values(FuelType).map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showForm && !isReadOnly && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 animate-in fade-in slide-in-from-top-2 print:hidden">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <Droplet className="text-orange-500" />
                        {isEditing ? 'Editar Abastecimento' : 'Registrar Novo Abastecimento'}
                    </h3>
                    
                    <div className="mb-6 flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isExternal} onChange={(e) => { setIsExternal(e.target.checked); setCurrentRefueling({ ...currentRefueling, vehicleId: '' }); }} />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        <span className="ml-3 text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Fuel size={16} />
                            Abastecimento de Equipamento Externo / Não Cadastrado (Balsas, Barcos, Motos...)
                        </span>
                        </label>
                    </div>

                    <form onSubmit={handleSaveRefueling} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Data</label>
                            <input type="date" required value={currentRefueling.date} onChange={e => setCurrentRefueling({...currentRefueling, date: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Hora</label>
                            <div className="relative">
                                <input type="time" required value={currentRefueling.time} onChange={e => setCurrentRefueling({...currentRefueling, time: e.target.value})} className={inputClass} />
                                <Clock size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {isExternal ? (
                            <>
                                <div className="">
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Identificação</label>
                                    <select required value={externalData.identifier} onChange={e => setExternalData({...externalData, identifier: e.target.value})} className={`${inputClass} font-bold border-orange-300 bg-orange-50`}>
                                        <option value="">Selecione o tipo...</option>
                                        {EXTERNAL_EQUIPMENT_TYPES.map(type => (<option key={type} value={type}>{type}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Contrato</label>
                                    <select required value={externalData.contract} onChange={e => setExternalData({...externalData, contract: e.target.value})} className={inputClass}>
                                        <option value="">Selecione...</option>
                                        {Object.values(ContractType).map(c => (<option key={c} value={c}>{c}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Município</label>
                                    <input type="text" required value={externalData.municipality} onChange={e => setExternalData({...externalData, municipality: e.target.value.toUpperCase()})} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Descrição / Obs.</label>
                                    <input type="text" placeholder="Detalhes (Opcional)" value={externalData.description} onChange={e => setExternalData({...externalData, description: e.target.value.toUpperCase()})} className={inputClass} />
                                </div>
                            </>
                        ) : (
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Veículo Cadastrado</label>
                                <select required value={currentRefueling.vehicleId || ''} onChange={e => handleVehicleChange(e.target.value)} className={inputClass}>
                                    <option value="">Selecione o veículo...</option>
                                    {vehicles.map(v => (<option key={v.id} value={v.id}>{v.plate} - {v.foreman} ({v.model})</option>))}
                                </select>
                                {currentRefueling.vehicleId && (() => {
                                    const v = vehicles.find(veh => veh.id === currentRefueling.vehicleId);
                                    if(v) return (
                                        <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-200 flex flex-wrap gap-3">
                                            <span><strong>Contrato:</strong> {v.contract}</span>
                                            <span><strong>Município:</strong> {v.municipality}</span>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Encarregado / Equipe</label>
                             <div className="relative">
                                <select value={currentRefueling.foremanSnapshot || ''} onChange={e => setCurrentRefueling({...currentRefueling, foremanSnapshot: e.target.value})} className={inputClass}>
                                    <option value="">Selecione...</option>
                                    {uniqueForemen.map(f => (<option key={f} value={f}>{f}</option>))}
                                </select>
                             </div>
                        </div>

                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Posto</label>
                            <select required value={currentRefueling.gasStationId || ''} onChange={e => setCurrentRefueling({...currentRefueling, gasStationId: e.target.value})} className={inputClass}>
                                <option value="">Selecione o posto...</option>
                                {stations.map(s => (<option key={s.id} value={s.id}>{s.name} - {s.municipality}</option>))}
                            </select>
                            {stations.length === 0 && <p className="text-red-500 text-xs mt-1">Nenhum posto cadastrado.</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Combustível</label>
                            <select required value={currentRefueling.fuelType || ''} onChange={e => setCurrentRefueling({...currentRefueling, fuelType: e.target.value as FuelType})} className={inputClass}>
                                <option value="">Selecione...</option>
                                {Object.values(FuelType).map(f => (<option key={f} value={f}>{f}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Litros</label>
                            <input type="number" step="0.01" required placeholder="0.00" value={currentRefueling.liters || ''} onChange={e => setCurrentRefueling({...currentRefueling, liters: Number(e.target.value)})} className={inputClass} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Valor Total (R$)</label>
                            <input type="number" step="0.01" required placeholder="0.00" value={currentRefueling.totalCost || ''} onChange={e => setCurrentRefueling({...currentRefueling, totalCost: Number(e.target.value)})} className={inputClass} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nota Fiscal</label>
                            <input type="text" placeholder="Nº da Nota" value={currentRefueling.invoiceNumber || ''} onChange={e => setCurrentRefueling({...currentRefueling, invoiceNumber: e.target.value.toUpperCase()})} className={inputClass} />
                        </div>
                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Requisição</label>
                            <input type="text" placeholder="Nº da Requisição" value={currentRefueling.requisitionNumber || ''} onChange={e => setCurrentRefueling({...currentRefueling, requisitionNumber: e.target.value.toUpperCase()})} className={inputClass} />
                        </div>

                        <div className="lg:col-span-4 flex justify-end pt-4 gap-3 border-t border-slate-100 mt-2">
                             <button type="button" onClick={resetForms} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                            <button type="submit" disabled={loading} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors flex items-center gap-2 disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin"/> : <Save size={18} />}
                                Salvar Lançamento
                            </button>
                        </div>
                    </form>
                </div>
            )}

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase">Registros Listados</p>
                    <p className="text-2xl font-bold text-slate-800">{filteredRefuelings.length}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase">Total Litros</p>
                    <p className="text-2xl font-bold text-blue-800">{totalLiters.toFixed(2)} L</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100">
                    <p className="text-xs font-bold text-green-600 uppercase">Total Valor</p>
                    <p className="text-2xl font-bold text-green-800">{formatCurrency(totalCost)}</p>
                </div>
             </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:overflow-visible">
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs print:bg-slate-200 print:text-slate-900 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 print:px-2">Data / Hora</th>
                                <th className="px-6 py-3 print:px-2">Veículo / Encarregado</th>
                                <th className="px-6 py-3 print:px-2">Posto</th>
                                <th className="px-6 py-3 print:px-2">Documentos</th>
                                <th className="px-6 py-3 print:px-2">Combustível</th>
                                <th className="px-6 py-3 print:px-2">Litros</th>
                                <th className="px-6 py-3 print:px-2">Valor Total</th>
                                <th className="px-6 py-3 print:hidden text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRefuelings.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Nenhum abastecimento encontrado para os filtros selecionados.</td></tr>
                            ) : (
                                paginatedRefuelings.map(item => {
                                    const station = stations.find(s => s.id === item.gasStationId);
                                    const isExt = item.vehicleId === 'EXTERNAL' || !vehicles.find(v => v.id === item.vehicleId);
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                                            <td className="px-6 py-3 font-medium text-slate-900 print:px-2">
                                                {formatDate(item.date)}
                                                {item.time && <div className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10}/> {item.time}</div>}
                                            </td>
                                            <td className="px-6 py-3 print:px-2">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-bold text-slate-800">{item.plateSnapshot}</span>
                                                        {isExt && <AlertCircle size={12} className="text-orange-500" title="Externo / Não Cadastrado" />}
                                                    </div>
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Users size={10} /> {item.foremanSnapshot}
                                                    </span>
                                                    {item.observation && (
                                                        <span className="text-[10px] text-slate-400 italic mt-1 block max-w-[150px] truncate" title={item.observation}>
                                                            {item.observation}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 print:px-2">
                                                <div className="flex items-center gap-1">
                                                    <Fuel size={14} className="text-slate-400 print:hidden" />
                                                    <span className="font-medium">{station?.name || 'Posto Desconhecido'}</span>
                                                </div>
                                                <div className="text-xs text-slate-500">{item.municipalitySnapshot}</div>
                                            </td>
                                            <td className="px-6 py-3 print:px-2">
                                                <div className="flex flex-col gap-1">
                                                    {item.invoiceNumber && (<span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 w-fit">NF: {item.invoiceNumber}</span>)}
                                                    {item.requisitionNumber && (<span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 w-fit">REQ: {item.requisitionNumber}</span>)}
                                                    {!item.invoiceNumber && !item.requisitionNumber && <span className="text-xs text-slate-300">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 print:px-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded border ${getFuelColor(item.fuelType)} print:border-none print:p-0 print:bg-transparent print:text-black`}>
                                                    {item.fuelType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 font-mono print:px-2">{item.liters.toFixed(2)} L</td>
                                            <td className="px-6 py-3 font-mono font-bold text-slate-700 print:px-2">
                                                {item.totalCost > 0 ? formatCurrency(item.totalCost) : <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200 animate-pulse print:animate-none print:bg-transparent print:text-red-700"><AlertCircle size={12} /> PENDÊNCIA</span>}
                                            </td>
                                            <td className="px-6 py-3 print:hidden text-center">
                                                {!isReadOnly && (
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleEditRefueling(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                                        <button onClick={() => confirmDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                         <tfoot className="bg-slate-100 font-bold text-slate-800 border-t border-slate-300 print:bg-slate-200">
                             <tr>
                                 <td colSpan={5} className="px-6 py-3 text-right uppercase text-xs tracking-wider">Totais do Período</td>
                                 <td className="px-6 py-3 text-blue-800">{totalLiters.toFixed(2)} L</td>
                                 <td className="px-6 py-3 text-green-800">{formatCurrency(totalCost)}</td>
                                 <td className="print:hidden"></td>
                             </tr>
                         </tfoot>
                    </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 print:hidden">
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-700">
                          Mostrando <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> até <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRefuelings.length)}</span> de <span className="font-medium">{filteredRefuelings.length}</span> resultados
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"><span className="sr-only">Anterior</span><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
                          <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">Página {currentPage} de {totalPages}</span>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"><span className="sr-only">Próximo</span><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
            </div>
        </div>
      )}

      {activeTab === 'STATIONS' && (
        <div className="space-y-6">
             {showForm && !isReadOnly && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 animate-in fade-in slide-in-from-top-2 print:hidden">
                     <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <Fuel className="text-blue-500" />
                        {isEditing ? 'Editar Posto' : 'Cadastrar Novo Posto'}
                    </h3>
                    <form onSubmit={handleSaveStation} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome do Posto</label>
                            <input type="text" required placeholder="Ex: Posto Ipiranga Centro" value={currentStation.name || ''} onChange={e => setCurrentStation({...currentStation, name: e.target.value.toUpperCase()})} className={inputClass} />
                        </div>
                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">CNPJ</label>
                            <input type="text" placeholder="00.000.000/0000-00" value={currentStation.cnpj || ''} onChange={e => setCurrentStation({...currentStation, cnpj: e.target.value.toUpperCase()})} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Município</label>
                            <input type="text" required value={currentStation.municipality || ''} onChange={e => setCurrentStation({...currentStation, municipality: e.target.value.toUpperCase()})} className={inputClass} />
                        </div>
                         <div className="lg:col-span-2">
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Endereço</label>
                            <input type="text" placeholder="Rua, Número, Bairro..." value={currentStation.address || ''} onChange={e => setCurrentStation({...currentStation, address: e.target.value.toUpperCase()})} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Telefone (Opcional)</label>
                            <input type="text" value={currentStation.phone || ''} onChange={e => setCurrentStation({...currentStation, phone: e.target.value})} className={inputClass} />
                        </div>
                         <div className="lg:col-span-3 flex justify-end pt-4 gap-3">
                             <button type="button" onClick={resetForms} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin"/> : <Save size={18} />}
                                Salvar Posto
                            </button>
                        </div>
                    </form>
                </div>
             )}

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:overflow-visible">
                 <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Nome do Posto</th>
                                <th className="px-6 py-3">Município / Endereço</th>
                                <th className="px-6 py-3">CNPJ</th>
                                <th className="px-6 py-3">Telefone</th>
                                <th className="px-6 py-3 text-center print:hidden">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                             {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={24} /><p className="text-slate-400 mt-2">Carregando postos...</p></td></tr>
                             ) : stations.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum posto cadastrado.</td></tr>
                            ) : (
                                stations.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 font-bold text-slate-800">
                                            <div className="flex items-center gap-2">
                                                <Fuel size={16} className="text-slate-400" />
                                                {s.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{s.municipality}</span>
                                                {s.address && (<span className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} /> {s.address}</span>)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-slate-600">{s.cnpj || '-'}</td>
                                        <td className="px-6 py-3 text-slate-600">{s.phone || '-'}</td>
                                        <td className="px-6 py-3 text-center print:hidden">
                                            {!isReadOnly && (
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEditStation(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                                    <button onClick={() => confirmDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default FuelManagement;