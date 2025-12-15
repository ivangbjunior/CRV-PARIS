
import React, { useState, useEffect } from 'react';
import { GasStation, RefuelingLog, Vehicle, FuelType, ContractType, UserRole, UserProfile, FUEL_TYPES_LIST, SUPPLY_TYPES_LIST } from '../types';
import { storageService } from '../services/storage';
import PasswordModal from './PasswordModal';
import { useAuth } from '../contexts/AuthContext';
import { 
  Fuel, Plus, Save, Trash2, Edit2, Droplet, Filter, X, Calendar, Printer, AlertCircle, Users, ChevronDown, ChevronUp, MapPin, Clock, ClipboardList, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { PrintHeader } from './PrintHeader';
import MultiSelect, { MultiSelectOption } from './MultiSelect';
import SelectWithSearch from './SelectWithSearch';

type TabType = 'REFUELING' | 'STATIONS';

const EXTERNAL_EQUIPMENT_TYPES = [
  'BARCO', 
  'BALSA', 
  'MOTO', 
  'CARRO',
  'LANCHA', 
  'MOTOR DE POUPA',
  'MOTOPODA', 
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
  // Converted to arrays for MultiSelect
  const [filterPlate, setFilterPlate] = useState<string[]>([]);
  const [filterStation, setFilterStation] = useState<string[]>([]);
  const [filterContract, setFilterContract] = useState<string[]>([]);
  const [filterMunicipality, setFilterMunicipality] = useState<string[]>([]);
  const [filterFuel, setFilterFuel] = useState<string[]>([]);
  const [filterForeman, setFilterForeman] = useState<string[]>([]);

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
      
      // ALTERAÇÃO: Buscar Equipes (foreman) dos VEÍCULOS cadastrados, não dos usuários
      const vehicleTeams = Array.from(new Set(vData.map(v => v.foreman).filter(f => f && f.trim() !== ''))).sort();

      setUniquePlates(plates);
      setUniqueContracts(contracts);
      setUniqueMunicipalities(cities);
      setUniqueForemen(vehicleTeams);
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
    try {
        await storageService.saveGasStation(newStation);
        await loadData();
        resetForms();
    } catch (err: any) {
        console.error(err);
        alert(`Erro ao salvar posto: ${err.message}`);
    } finally {
        setLoading(false);
    }
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
    try {
        await storageService.deleteGasStation(id);
        await loadData();
        setShowDeleteModal(false);
        setItemToDelete(null);
    } catch (err: any) {
        console.error(err);
        alert(`Erro ao excluir posto: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveRefueling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    // Removed check for liters/totalCost to allow saving pending records (R$ 0)
    if (!currentRefueling.gasStationId || !currentRefueling.fuelType) return;
    
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
      liters: Number(currentRefueling.liters || 0), // Default to 0 if empty
      totalCost: Number(currentRefueling.totalCost || 0), // Default to 0 if empty
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
    try {
        await storageService.saveRefueling(newRefueling);
        await loadData();
        resetForms();
    } catch (err: any) {
        console.error(err);
        alert(`Erro ao salvar abastecimento: ${err.message}`);
    } finally {
        setLoading(false);
    }
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
    try {
        await storageService.deleteRefueling(id);
        await loadData();
        setShowDeleteModal(false);
        setItemToDelete(null);
    } catch (err: any) {
        console.error(err);
        alert(`Erro ao excluir abastecimento: ${err.message}`);
    } finally {
        setLoading(false);
    }
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
    setFilterPlate([]);
    setFilterStation([]);
    setFilterContract([]);
    setFilterMunicipality([]);
    setFilterFuel([]);
    setFilterForeman([]);
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

      const matchesPlate = filterPlate.length === 0 || filterPlate.includes(r.plateSnapshot);
      const matchesStation = filterStation.length === 0 || filterStation.includes(r.gasStationId);
      const matchesContract = filterContract.length === 0 || filterContract.includes(r.contractSnapshot);
      const matchesCity = filterMunicipality.length === 0 || filterMunicipality.includes(r.municipalitySnapshot);
      const matchesFuel = filterFuel.length === 0 || filterFuel.includes(r.fuelType);
      const matchesForeman = filterForeman.length === 0 || filterForeman.includes(r.foremanSnapshot);

      return matchesDate && matchesPlate && matchesStation && matchesContract && matchesCity && matchesFuel && matchesForeman;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredRefuelings.length / ITEMS_PER_PAGE);
  const paginatedRefuelings = filteredRefuelings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Totals Calculation
  const totalLiters = filteredRefuelings
    .filter(r => FUEL_TYPES_LIST.includes(r.fuelType))
    .reduce((acc, curr) => acc + curr.liters, 0);

  const totalCost = filteredRefuelings
    .reduce((acc, curr) => acc + curr.totalCost, 0);

  const activeFiltersCount = [
    filterDateStart, filterDateEnd, 
    filterPlate.length, filterStation.length, 
    filterContract.length, filterMunicipality.length, filterFuel.length, filterForeman.length
  ].filter(Boolean).reduce((a, b) => a + (typeof b === 'number' ? b : 1), 0);

  const inputClass = "w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-slate-800 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all";
  const selectClass = "w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all h-[42px] shadow-sm";

  // Options for MultiSelect
  const plateOptions: MultiSelectOption[] = uniquePlates.map(p => ({ value: p, label: p }));
  const stationOptions: MultiSelectOption[] = stations.map(s => ({ value: s.id, label: s.name }));
  const contractOptions: MultiSelectOption[] = uniqueContracts.map(c => ({ value: c, label: c }));
  const municipalityOptions: MultiSelectOption[] = uniqueMunicipalities.map(m => ({ value: m, label: m }));
  const foremanOptions: MultiSelectOption[] = uniqueForemen.map(f => ({ value: f, label: f }));
  const fuelOptions: MultiSelectOption[] = Object.values(FuelType).map(f => ({ value: f, label: f }));

  const vehicleOptions = vehicles.map(v => ({
      value: v.id,
      label: `${v.plate} - ${v.driverName} (${v.type})`
  }));

  const stationSelectOptions = stations.map(s => ({
      value: s.id,
      label: `${s.name} - ${s.municipality}`
  }));

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
                <span>Total Litros (Comb.): {totalLiters.toFixed(2)} L</span>
                <span>Total Valor (Geral): {formatCurrency(totalCost)}</span>
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
            <Fuel className="text-blue-600" size={32} />
            Abastecimento
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
                    className={`${showForm ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow transition-colors w-full sm:w-auto whitespace-nowrap h-[40px]`}
                >
                    {showForm ? <X size={18} /> : <Plus size={18} />}
                    {showForm ? 'Cancelar' : 'Novo Abastecimento'}
                </button>
            )}
             {activeTab === 'STATIONS' && (
                <button
                    onClick={() => { resetForms(); setShowForm(!showForm); }}
                    className={`${showForm ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow transition-colors w-full sm:w-auto whitespace-nowrap h-[40px]`}
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
                            
                            <div><MultiSelect label="Placa / Identificação" options={plateOptions} selected={filterPlate} onChange={setFilterPlate} placeholder="Todas" /></div>
                            <div><MultiSelect label="Equipe" options={foremanOptions} selected={filterForeman} onChange={setFilterForeman} placeholder="Todos" /></div>
                            <div><MultiSelect label="Posto" options={stationOptions} selected={filterStation} onChange={setFilterStation} placeholder="Todos" /></div>
                            <div><MultiSelect label="Contrato" options={contractOptions} selected={filterContract} onChange={setFilterContract} placeholder="Todos" /></div>
                            <div><MultiSelect label="Município" options={municipalityOptions} selected={filterMunicipality} onChange={setFilterMunicipality} placeholder="Todos" /></div>
                            <div><MultiSelect label="Combustível" options={fuelOptions} selected={filterFuel} onChange={setFilterFuel} placeholder="Todos" /></div>
                        </div>
                    </div>
                )}
            </div>

            {showForm && !isReadOnly && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 animate-in fade-in slide-in-from-top-2 print:hidden">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <Droplet className="text-blue-500" />
                        {isEditing ? 'Editar Abastecimento' : 'Registrar Novo Abastecimento'}
                    </h3>
                    
                    <div className="mb-6 flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isExternal} onChange={(e) => { setIsExternal(e.target.checked); setCurrentRefueling({ ...currentRefueling, vehicleId: '' }); }} />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                                    <select required value={externalData.identifier} onChange={e => setExternalData({...externalData, identifier: e.target.value})} className={`${inputClass} font-bold border-blue-300 bg-blue-50`}>
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
                            <div className="lg:col-span-2 relative">
                                {/* SUBSTITUIÇÃO POR SELECTWITHSEARCH */}
                                <SelectWithSearch 
                                    label="VEÍCULO CADASTRADO"
                                    options={vehicleOptions}
                                    value={currentRefueling.vehicleId || ''}
                                    onChange={handleVehicleChange}
                                    required
                                    placeholder="Selecione ou digite..."
                                />
                                
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
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Equipe</label>
                             <div className="relative">
                                <select value={currentRefueling.foremanSnapshot || ''} onChange={e => setCurrentRefueling({...currentRefueling, foremanSnapshot: e.target.value})} className={inputClass}>
                                    <option value="">Selecione...</option>
                                    {uniqueForemen.map(f => (<option key={f} value={f}>{f}</option>))}
                                </select>
                             </div>
                        </div>

                         <div className="relative">
                            {/* SUBSTITUIÇÃO POR SELECTWITHSEARCH */}
                            <SelectWithSearch 
                                label="POSTO"
                                options={stationSelectOptions}
                                value={currentRefueling.gasStationId || ''}
                                onChange={(val) => setCurrentRefueling({...currentRefueling, gasStationId: val})}
                                required
                                placeholder="Selecione o posto..."
                            />
                            {stations.length === 0 && <p className="text-red-500 text-xs mt-1">Nenhum posto cadastrado.</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Item / Combustível</label>
                            <select required value={currentRefueling.fuelType || ''} onChange={e => setCurrentRefueling({...currentRefueling, fuelType: e.target.value as FuelType})} className={inputClass}>
                                <option value="">Selecione...</option>
                                <optgroup label="COMBUSTÍVEIS">
                                    {FUEL_TYPES_LIST.map(f => (<option key={f} value={f}>{f}</option>))}
                                </optgroup>
                                <optgroup label="INSUMOS">
                                    {SUPPLY_TYPES_LIST.map(f => (<option key={f} value={f}>{f}</option>))}
                                </optgroup>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Litros / Quantidade</label>
                            <input type="number" step="0.01" placeholder="0.00" value={currentRefueling.liters || ''} onChange={e => setCurrentRefueling({...currentRefueling, liters: Number(e.target.value)})} className={inputClass} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Valor Total (R$)</label>
                            <input type="number" step="0.01" placeholder="0.00" value={currentRefueling.totalCost || ''} onChange={e => setCurrentRefueling({...currentRefueling, totalCost: Number(e.target.value)})} className={inputClass} />
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
                <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Registros Listados</p>
                    <p className="text-lg md:text-xl font-bold text-slate-800">{filteredRefuelings.length}</p>
                </div>
                <div className="bg-blue-50 p-2 md:p-3 rounded-lg shadow-sm border border-blue-100">
                    <p className="text-[10px] md:text-xs font-bold text-blue-600 uppercase">Total Litros (Comb.)</p>
                    <p className="text-lg md:text-xl font-bold text-blue-800">{totalLiters.toFixed(2)} L</p>
                </div>
                <div className="bg-green-50 p-2 md:p-3 rounded-lg shadow-sm border border-green-100">
                    <p className="text-[10px] md:text-xs font-bold text-green-600 uppercase">Total Valor (Geral)</p>
                    <p className="text-lg md:text-xl font-bold text-green-800">{formatCurrency(totalCost)}</p>
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
                                <th className="px-6 py-3 print:px-2">Insumos</th>
                                <th className="px-6 py-3 print:px-2">Litros</th>
                                <th className="px-6 py-3 print:px-2">Valor Total</th>
                                <th className="px-6 py-3 print:hidden text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRefuelings.length === 0 ? (
                                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400">Nenhum abastecimento encontrado para os filtros selecionados.</td></tr>
                            ) : (
                                paginatedRefuelings.map(item => {
                                    const station = stations.find(s => s.id === item.gasStationId);
                                    const isExt = item.vehicleId === 'EXTERNAL' || !vehicles.find(v => v.id === item.vehicleId);
                                    const isFuel = FUEL_TYPES_LIST.includes(item.fuelType);

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
                                            
                                            {/* COLUNA COMBUSTÍVEL */}
                                            <td className="px-6 py-3 print:px-2">
                                                {isFuel ? (
                                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${getFuelColor(item.fuelType)} print:border-none print:p-0 print:bg-transparent print:text-black`}>
                                                        {item.fuelType}
                                                    </span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            
                                            {/* COLUNA INSUMOS */}
                                            <td className="px-6 py-3 print:px-2">
                                                {!isFuel ? (
                                                    <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                                        {item.fuelType} ({item.liters})
                                                    </span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>

                                            <td className="px-6 py-3 font-mono print:px-2">
                                                {isFuel ? `${item.liters.toFixed(2)} L` : '-'}
                                            </td>
                                            
                                            <td className="px-6 py-3 font-mono font-bold text-slate-700 print:px-2">
                                                {/* Se for insumo, contabiliza o valor também */}
                                                {(isFuel || !isFuel) && item.totalCost > 0 ? formatCurrency(item.totalCost) : (
                                                     <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200 animate-pulse print:animate-none print:bg-transparent print:text-red-700"><AlertCircle size={12} /> PENDÊNCIA</span>
                                                )}
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
                                 <td colSpan={6} className="px-6 py-3 text-right uppercase text-xs tracking-wider">Totais do Período</td>
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
             <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 animate-in fade-in slide-in-from-top-2">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <Fuel className="text-blue-500" />
                    {isEditing ? 'Editar Posto' : 'Cadastrar Novo Posto'}
                </h3>
                <form onSubmit={handleSaveStation} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome Fantasia</label>
                        <input type="text" required value={currentStation.name || ''} onChange={e => setCurrentStation({...currentStation, name: e.target.value.toUpperCase()})} className={inputClass} placeholder="EX: POSTO IPIRANGA..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Município</label>
                        <input type="text" required value={currentStation.municipality || ''} onChange={e => setCurrentStation({...currentStation, municipality: e.target.value.toUpperCase()})} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">CNPJ (Opcional)</label>
                        <input type="text" value={currentStation.cnpj || ''} onChange={e => setCurrentStation({...currentStation, cnpj: e.target.value.toUpperCase()})} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Telefone (Opcional)</label>
                        <input type="text" value={currentStation.phone || ''} onChange={e => setCurrentStation({...currentStation, phone: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Endereço (Opcional)</label>
                        <input type="text" value={currentStation.address || ''} onChange={e => setCurrentStation({...currentStation, address: e.target.value.toUpperCase()})} className={inputClass} />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={resetForms} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors flex items-center gap-2">
                            {loading ? <Loader2 className="animate-spin"/> : <Save size={18} />}
                            Salvar Posto
                        </button>
                    </div>
                </form>
             </div>
           )}

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Fuel size={18} /> Postos Conveniados
                    </h3>
                    <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">{stations.length} Cadastrados</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">Município</th>
                                <th className="px-6 py-3">Contato/Info</th>
                                {!isReadOnly && <th className="px-6 py-3 text-center">Ações</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stations.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Nenhum posto cadastrado.</td></tr>
                            ) : (
                                stations.map(station => (
                                    <tr key={station.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-bold text-slate-800">{station.name}</td>
                                        <td className="px-6 py-3 text-slate-600 flex items-center gap-1">
                                            <MapPin size={14} className="text-slate-400"/> {station.municipality}
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 text-xs">
                                            {station.phone && <div>Tel: {station.phone}</div>}
                                            {station.cnpj && <div>CNPJ: {station.cnpj}</div>}
                                        </td>
                                        {!isReadOnly && (
                                            <td className="px-6 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEditStation(station)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                                    <button onClick={() => confirmDelete(station.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        )}
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
