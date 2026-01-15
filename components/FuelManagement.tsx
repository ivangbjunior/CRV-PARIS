import React, { useState, useEffect } from 'react';
import { GasStation, RefuelingLog, Vehicle, FuelType, ContractType, UserRole, UserProfile, FUEL_TYPES_LIST, SUPPLY_TYPES_LIST, RefuelingItem } from '../types';
import { storageService } from '../services/storage';
import PasswordModal from './PasswordModal';
import { useAuth } from '../contexts/AuthContext';
import { 
  Fuel, Plus, Save, Trash2, Edit2, Droplet, Filter, X, Calendar, Printer, AlertCircle, Users, ChevronDown, ChevronUp, MapPin, Clock, ClipboardList, ChevronLeft, ChevronRight, Loader2, DollarSign, Receipt, Package, RefreshCw
} from 'lucide-react';
import { PrintHeader } from './PrintHeader';
import MultiSelect, { MultiSelectOption } from './MultiSelect';
import SelectWithSearch from './SelectWithSearch';
import { ParisLogo } from './ParisLogo';

type TabType = 'REFUELING' | 'STATIONS';

const EXTERNAL_EQUIPMENT_TYPES = [
  'BARCO', 'BALSA', 'MOTO', 'CARRO', 'LANCHA', 'MOTOR DE POUPA', 'MOTOPODA', 'GERADOR', 'GALÃO', 'TAMBOR'
];

const FuelManagement: React.FC = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === UserRole.GERENCIA;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('REFUELING');
  
  const [stations, setStations] = useState<GasStation[]>([]);
  const [refuelings, setRefuelings] = useState<RefuelingLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Pagination State - Standardized with Reports
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterPlate, setFilterPlate] = useState<string[]>([]);
  const [filterStation, setFilterStation] = useState<string[]>([]);
  const [filterContract, setFilterContract] = useState<string[]>([]);
  const [filterMunicipality, setFilterMunicipality] = useState<string[]>([]);
  const [filterFuel, setFilterFuel] = useState<string[]>([]);
  const [filterForeman, setFilterForeman] = useState<string[]>([]);
  const [filterInvoice, setFilterInvoice] = useState<string[]>([]);

  const [showFilters, setShowFilters] = useState(false);

  const [uniquePlates, setUniquePlates] = useState<string[]>([]);
  const [uniqueContracts, setUniqueContracts] = useState<string[]>([]);
  const [uniqueMunicipalities, setUniqueMunicipalities] = useState<string[]>([]);
  const [uniqueForemen, setUniqueForemen] = useState<string[]>([]);
  const [uniqueInvoices, setUniqueInvoices] = useState<string[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  const [currentStation, setCurrentStation] = useState<Partial<GasStation>>({});

  // Ticket State
  const [selectedTicket, setSelectedTicket] = useState<RefuelingLog | null>(null);
  
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
  
  // Refueling Form State (Unified for Single Item)
  const [refuelingForm, setRefuelingForm] = useState({
      date: getTodayLocal(),
      time: getCurrentTime(),
      vehicleId: '',
      gasStationId: '',
      foremanSnapshot: '',
      invoiceNumber: '',
      requisitionNumber: '',
      fuelType: '' as FuelType,
      liters: 0,
      totalCost: 0,
      municipality: ''
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

  // Reset page when filters or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDateStart, filterDateEnd, filterPlate, filterStation, filterContract, filterMunicipality, filterFuel, filterForeman, filterInvoice, itemsPerPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, rData, vData] = await Promise.all([
          storageService.getGasStations(),
          storageService.getRefuelings(),
          storageService.getVehicles()
      ]);

      setStations(sData);
      setRefuelings(rData);
      setVehicles(vData);

      const plates = Array.from(new Set(rData.map(r => r.plateSnapshot))).sort();
      const contracts = Array.from(new Set(rData.map(r => r.contractSnapshot))).sort();
      const cities = Array.from(new Set(rData.map(r => r.municipalitySnapshot))).sort();
      const vehicleTeams = Array.from(new Set(vData.map(v => v.foreman).filter(f => f && f.trim() !== ''))).sort();
      const invoices = Array.from(new Set(rData.map(r => r.invoiceNumber).filter(n => n && n.trim() !== ''))).sort();

      setUniquePlates(plates);
      setUniqueContracts(contracts);
      setUniqueMunicipalities(cities);
      setUniqueForemen(vehicleTeams);
      setUniqueInvoices(invoices as string[]);
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

  const handleSaveRefueling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    if (!refuelingForm.gasStationId) {
        alert("Selecione o posto.");
        return;
    }

    if (!refuelingForm.fuelType) {
        alert("Selecione o produto.");
        return;
    }
    
    let snapshotData = {
        plate: '',
        model: '',
        contract: '',
        municipality: refuelingForm.municipality || '',
        foreman: refuelingForm.foremanSnapshot || ''
    };

    let vehicleIdToSave = '';

    if (isExternal) {
        if (!externalData.identifier || !externalData.contract || !refuelingForm.municipality) {
            alert("Para equipamentos externos, preencha Identificação, Contrato e Município.");
            return;
        }
        snapshotData.plate = externalData.identifier.toUpperCase();
        snapshotData.model = externalData.model ? externalData.model.toUpperCase() : '';
        snapshotData.contract = externalData.contract;
        vehicleIdToSave = 'EXTERNAL';
    } else {
        if (!refuelingForm.vehicleId) {
            alert("Selecione o veículo.");
            return;
        }
        
        const vehicle = vehicles.find(v => v.id === refuelingForm.vehicleId);
        if (!vehicle) {
            alert("Veículo não encontrado no cadastro.");
            return;
        }

        snapshotData.plate = vehicle.plate;
        snapshotData.model = vehicle.model || '';
        snapshotData.contract = vehicle.contract;
        if (!snapshotData.foreman) snapshotData.foreman = vehicle.foreman;
        
        vehicleIdToSave = refuelingForm.vehicleId;
    }

    setLoading(true);
    try {
        const newRefueling: RefuelingLog = {
            id: editingRecordId || crypto.randomUUID(),
            date: refuelingForm.date,
            vehicleId: vehicleIdToSave,
            gasStationId: refuelingForm.gasStationId,
            fuelType: refuelingForm.fuelType, 
            liters: Number(refuelingForm.liters || 0), 
            totalCost: Number(refuelingForm.totalCost || 0), 
            invoiceNumber: refuelingForm.invoiceNumber ? refuelingForm.invoiceNumber.toUpperCase() : '',
            requisitionNumber: refuelingForm.requisitionNumber ? refuelingForm.requisitionNumber.toUpperCase() : '',
            time: refuelingForm.time || '', 
            plateSnapshot: snapshotData.plate,
            modelSnapshot: snapshotData.model,
            foremanSnapshot: snapshotData.foreman, 
            contractSnapshot: snapshotData.contract,
            municipalitySnapshot: snapshotData.municipality,
            observation: isExternal ? externalData.description.toUpperCase() : ''
        };

        await storageService.saveRefueling(newRefueling);
        await loadData();
        resetForms();
        alert("Abastecimento registrado com sucesso!");
    } catch (err: any) {
        console.error("Erro ao salvar abastecimento:", err);
        alert(`Erro ao salvar: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleEditRefueling = (refueling: RefuelingLog) => {
    if (isReadOnly) return;
    
    setRefuelingForm({
        date: refueling.date,
        time: refueling.time || '',
        vehicleId: refueling.vehicleId,
        gasStationId: refueling.gasStationId,
        foremanSnapshot: refueling.foremanSnapshot || '',
        invoiceNumber: refueling.invoiceNumber || '',
        requisitionNumber: refueling.requisitionNumber || '',
        fuelType: refueling.fuelType,
        liters: refueling.liters,
        totalCost: refueling.totalCost,
        municipality: refueling.municipalitySnapshot
    });

    setEditingRecordId(refueling.id);
    
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

  const resetForms = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingRecordId(null);
    setRefuelingForm({
      date: getTodayLocal(),
      time: getCurrentTime(),
      vehicleId: '',
      gasStationId: '',
      foremanSnapshot: '',
      invoiceNumber: '',
      requisitionNumber: '',
      fuelType: '' as any,
      liters: 0,
      totalCost: 0,
      municipality: ''
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
    setFilterInvoice([]);
  };

  const confirmDelete = (id: string) => {
    if (isReadOnly) return;
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (itemToDelete) {
        setLoading(true);
        try {
            if (activeTab === 'STATIONS') {
                await storageService.deleteGasStation(itemToDelete);
            } else {
                await storageService.deleteRefueling(itemToDelete);
            }
            await loadData();
            setShowDeleteModal(false);
            setItemToDelete(null);
        } catch (err: any) {
            alert(`Erro ao excluir: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
        setRefuelingForm(prev => ({
            ...prev,
            vehicleId: vehicleId,
            foremanSnapshot: vehicle.foreman || '',
            municipality: vehicle.municipality 
        }));
    } else {
        setRefuelingForm(prev => ({ ...prev, vehicleId: vehicleId, foremanSnapshot: '', municipality: '' }));
    }
  };

  const handleStationChange = (val: string) => {
    const station = stations.find(s => s.id === val);
    setRefuelingForm(prev => ({
        ...prev,
        gasStationId: val,
        municipality: station ? station.municipality : prev.municipality
    }));
    if (isExternal && station) {
        setExternalData(prev => ({ ...prev, municipality: station.municipality }));
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
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
      const matchesForeman = filterForeman.length === 0 || (r.foremanSnapshot && filterForeman.includes(r.foremanSnapshot));
      const matchesInvoice = filterInvoice.length === 0 || (r.invoiceNumber && filterInvoice.includes(r.invoiceNumber));

      return matchesDate && matchesPlate && matchesStation && matchesContract && matchesCity && matchesFuel && matchesForeman && matchesInvoice;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Dynamic Pagination Logic
  const totalPages = Math.ceil(filteredRefuelings.length / itemsPerPage);
  const paginatedRefuelings = filteredRefuelings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalLitersCalculated = filteredRefuelings.reduce((acc, curr) => acc + (curr.liters || 0), 0);
  const totalCostCalculated = filteredRefuelings.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);

  const activeFiltersCount = [
    filterDateStart, filterDateEnd, 
    filterPlate.length, filterStation.length, 
    filterContract.length, filterMunicipality.length, filterFuel.length, filterForeman.length, filterInvoice.length
  ].filter(Boolean).reduce((a, b) => a + (typeof b === 'number' ? b : 1), 0);

  const inputClass = "w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-slate-800 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all";
  const selectClass = "w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none h-[42px] shadow-sm";

  const plateOptions: MultiSelectOption[] = uniquePlates.map(p => ({ value: p, label: p }));
  const stationOptions: MultiSelectOption[] = stations.map(s => ({ value: s.id, label: s.name }));
  const contractOptions: MultiSelectOption[] = uniqueContracts.map(c => ({ value: c, label: c }));
  const municipalityOptions: MultiSelectOption[] = uniqueMunicipalities.map(m => ({ value: m, label: m }));
  const foremanOptions: MultiSelectOption[] = uniqueForemen.map(f => ({ value: f, label: f }));
  const fuelOptions: MultiSelectOption[] = Object.values(FuelType).map(f => ({ value: f, label: f }));
  const invoiceOptions: MultiSelectOption[] = uniqueInvoices.map(i => ({ value: i, label: `NF: ${i}` }));

  const vehicleOptions = vehicles.map(v => ({
      value: v.id,
      label: `${v.plate} - ${v.driverName} (${v.type})`
  }));

  const stationSelectOptions = stations.map(s => ({
      value: s.id,
      label: `${s.name} - ${s.municipality}`
  }));

  const foremanSelectOptions = uniqueForemen.map(f => ({ value: f, label: f }));

  return (
    <div className="space-y-6">
       
      <PrintHeader 
        title="Relatório de Abastecimentos"
        subtitle="Consolidado de Consumo"
        details={
            <>
                <span>Registros: {filteredRefuelings.length}</span>
                <span>Total Litros: {totalLitersCalculated.toFixed(2)} L</span>
                <span>Total Valor: {formatCurrency(totalCostCalculated)}</span>
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

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><Receipt size={20} /> Bilhete de Lançamento</h3>
                    <button onClick={() => setSelectedTicket(null)} className="p-1 hover:bg-slate-800 rounded transition-colors"><X size={20}/></button>
                </div>
                
                <div className="p-6 bg-white font-mono text-xs text-slate-700 space-y-4" id="refueling-ticket-print">
                    <div className="flex flex-col items-center border-b border-dashed border-slate-300 pb-4">
                        <ParisLogo variant="dark" size="normal" />
                        <h4 className="mt-4 font-black text-sm text-slate-900">COMPROVANTE DE ABASTECIMENTO</h4>
                        <p className="mt-1">PARIS ENGENHARIA LTDA</p>
                    </div>

                    <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-4">
                        <div className="flex justify-between"><span>DATA:</span><span className="font-bold">{formatDate(selectedTicket.date)}</span></div>
                        <div className="flex justify-between"><span>HORA:</span><span className="font-bold">{selectedTicket.time || '--:--'}</span></div>
                        <div className="flex justify-between"><span>VEÍCULO:</span><span className="font-bold">{selectedTicket.plateSnapshot}</span></div>
                        <div className="flex justify-between"><span>EQUIPE:</span><span className="font-bold truncate ml-4">{selectedTicket.foremanSnapshot || '-'}</span></div>
                        <div className="flex justify-between"><span>CONTRATO:</span><span className="font-bold">{selectedTicket.contractSnapshot}</span></div>
                    </div>

                    <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-4">
                        <div className="text-[10px] font-bold text-slate-400 mb-1">LOCAL DE ABASTECIMENTO</div>
                        <p className="font-bold text-slate-900">{stations.find(s => s.id === selectedTicket?.gasStationId)?.name || 'POSTO CONVENIADO'}</p>
                        <p className="text-[10px]">{selectedTicket.municipalitySnapshot}</p>
                        {selectedTicket.invoiceNumber && <div className="flex justify-between mt-2"><span>Nº NOTA:</span><span className="font-bold">{selectedTicket.invoiceNumber}</span></div>}
                        {selectedTicket.requisitionNumber && <div className="flex justify-between"><span>Nº REQUISIÇÃO:</span><span className="font-bold">{selectedTicket.requisitionNumber}</span></div>}
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between font-bold text-slate-900 border-b border-slate-100 pb-1">
                            <span>ITEM / QTD</span>
                            <span>SUBTOTAL</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                            <span className="truncate mr-4">{selectedTicket.fuelType} x {selectedTicket.liters.toFixed(2)}{FUEL_TYPES_LIST.includes(selectedTicket.fuelType) ? 'L' : 'un'}</span>
                            <span className="font-bold">{formatCurrency(selectedTicket.totalCost)}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t-2 border-slate-900 mt-4">
                        <div className="flex justify-between items-baseline">
                            <span className="font-black text-sm">TOTAL GERAL</span>
                            <span className="font-black text-lg text-slate-900">
                                {formatCurrency(selectedTicket.totalCost)}
                            </span>
                        </div>
                    </div>

                    <div className="pt-8 space-y-8 text-center opacity-40">
                        <div className="border-t border-slate-400 pt-1">Assinatura do Responsável</div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t flex flex-col gap-2">
                    <button 
                        onClick={() => window.print()}
                        className="bg-slate-900 text-white w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 transition-colors"
                    >
                        <Printer size={18} /> Imprimir Bilhete
                    </button>
                    <button 
                        onClick={() => setSelectedTicket(null)}
                        className="bg-white border border-slate-300 text-slate-600 w-full py-2 rounded-lg font-bold text-xs"
                    >
                        FECHAR
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Fuel className="text-blue-600" size={32} />
            Abastecimento
          </h1>
          <p className="text-slate-500">Controle consolidado de consumo e custos da frota.</p>
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
            <button
                onClick={() => { resetForms(); setShowForm(!showForm); }}
                className={`${showForm ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow transition-colors w-full sm:w-auto whitespace-nowrap h-[40px]`}
            >
                {showForm ? <X size={18} /> : <Plus size={18} />}
                {showForm ? 'Cancelar' : activeTab === 'REFUELING' ? 'Novo Abastecimento' : 'Novo Posto'}
            </button>
        </div>
        )}
      </div>
      
      {activeTab === 'REFUELING' && (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm print:hidden relative z-40">
                <div onClick={() => setShowFilters(!showFilters)} className="p-4 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors rounded-xl overflow-visible">
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
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 animate-in slide-in-from-top-5 duration-200 rounded-b-xl overflow-visible">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-visible">
                            <div className="relative z-[45]">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Data Início</label>
                                <div className="relative">
                                    <input type="date" className={selectClass} value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Calendar size={16} className="text-slate-400" /></div>
                                </div>
                            </div>
                            <div className="relative z-[45]">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Data Final</label>
                                <div className="relative">
                                    <input type="date" className={selectClass} value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Calendar size={16} className="text-slate-400" /></div>
                                </div>
                            </div>
                            
                            <div className="relative z-[45]"><MultiSelect label="Placa / Identificação" options={plateOptions} selected={filterPlate} onChange={setFilterPlate} placeholder="Todas" /></div>
                            <div className="relative z-[45]"><MultiSelect label="Equipe" options={foremanOptions} selected={filterForeman} onChange={setFilterForeman} placeholder="Todos" /></div>
                            <div className="relative z-[45]"><MultiSelect label="Posto" options={stationOptions} selected={filterStation} onChange={setFilterStation} placeholder="Todos" /></div>
                            <div className="relative z-[45]"><MultiSelect label="Nota Fiscal (NF)" options={invoiceOptions} selected={filterInvoice} onChange={setFilterInvoice} placeholder="Todas" /></div>
                            <div className="relative z-[45]"><MultiSelect label="Contrato" options={contractOptions} selected={filterContract} onChange={setFilterContract} placeholder="Todos" /></div>
                            <div className="relative z-[45]"><MultiSelect label="Município" options={municipalityOptions} selected={filterMunicipality} onChange={setFilterMunicipality} placeholder="Todos" /></div>
                            <div className="relative z-[45]"><MultiSelect label="Combustível" options={fuelOptions} selected={filterFuel} onChange={setFilterFuel} placeholder="Todos" /></div>
                        </div>
                    </div>
                )}
            </div>

            {showForm && !isReadOnly && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 animate-in fade-in slide-in-from-top-2 print:hidden">
                    <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                        <Droplet className="text-blue-500" />
                        {isEditing ? 'Editar Abastecimento' : 'Novo Registro de Abastecimento'}
                    </h3>
                    
                    <div className="mb-6 flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isExternal} onChange={(e) => { setIsExternal(e.target.checked); setRefuelingForm({ ...refuelingForm, vehicleId: '' }); }} />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Fuel size={16} />
                            Equipamento Externo / Não Cadastrado
                        </span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Data</label>
                            <input type="date" required value={refuelingForm.date} onChange={e => setRefuelingForm({...refuelingForm, date: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Hora</label>
                            <div className="relative">
                                <input type="time" required value={refuelingForm.time} onChange={e => setRefuelingForm({...refuelingForm, time: e.target.value})} className={inputClass} />
                                <Clock size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {isExternal ? (
                            <>
                                <div>
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
                            </>
                        ) : (
                            <div className="lg:col-span-2 relative">
                                <SelectWithSearch 
                                    label="VEÍCULO CADASTRADO"
                                    options={vehicleOptions}
                                    value={refuelingForm.vehicleId || ''}
                                    onChange={handleVehicleChange}
                                    required
                                    placeholder="Selecione ou digite..."
                                />
                            </div>
                        )}

                        <div className="lg:col-span-2 relative">
                            <SelectWithSearch 
                                label="POSTO CONVENIADO"
                                options={stationSelectOptions}
                                value={refuelingForm.gasStationId || ''}
                                onChange={handleStationChange}
                                required
                                placeholder="Selecione o posto..."
                            />
                        </div>

                        <div className="relative">
                            {isExternal ? (
                                <SelectWithSearch 
                                    label="Equipe"
                                    options={foremanSelectOptions}
                                    value={refuelingForm.foremanSnapshot || ''}
                                    onChange={(val) => setRefuelingForm({...refuelingForm, foremanSnapshot: val})}
                                    placeholder="Selecione a equipe..."
                                />
                            ) : (
                                <>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Equipe</label>
                                    <input type="text" value={refuelingForm.foremanSnapshot || ''} onChange={e => setRefuelingForm({...refuelingForm, foremanSnapshot: e.target.value.toUpperCase()})} className={inputClass} />
                                </>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Município Operação</label>
                            <input 
                                type="text" 
                                value={refuelingForm.municipality} 
                                onChange={e => {
                                    const val = e.target.value.toUpperCase();
                                    setRefuelingForm({...refuelingForm, municipality: val});
                                    if (isExternal) setExternalData(prev => ({...prev, municipality: val}));
                                }} 
                                className={inputClass} 
                                placeholder="O MUNICÍPIO SERÁ PREENCHIDO PELO POSTO"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 mb-8">
                        <div className="flex items-center gap-2 mb-4 text-blue-700 font-bold">
                            <Package size={18} />
                            Informações do Produto
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Produto / Combustível</label>
                                <select 
                                    value={refuelingForm.fuelType || ''} 
                                    onChange={e => setRefuelingForm({...refuelingForm, fuelType: e.target.value as FuelType})} 
                                    className={selectClass}
                                >
                                    <option value="">Selecione o item...</option>
                                    <optgroup label="COMBUSTÍVEL">
                                        {FUEL_TYPES_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                                    </optgroup>
                                    <optgroup label="INSUMOS">
                                        {SUPPLY_TYPES_LIST.map(f => <option key={f} value={f}>{f}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Quantidade (L/UN)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={refuelingForm.liters === 0 ? '' : refuelingForm.liters} 
                                    onChange={e => setRefuelingForm({...refuelingForm, liters: Number(e.target.value)})} 
                                    className={inputClass} 
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Valor Total (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={refuelingForm.totalCost === 0 ? '' : refuelingForm.totalCost} 
                                    onChange={e => setRefuelingForm({...refuelingForm, totalCost: Number(e.target.value)})} 
                                    className={`${inputClass} font-bold text-blue-800`} 
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nº Nota Fiscal</label>
                            <input type="text" placeholder="Nº da Nota" value={refuelingForm.invoiceNumber || ''} onChange={e => setRefuelingForm({...refuelingForm, invoiceNumber: e.target.value.toUpperCase()})} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nº Requisição</label>
                            <input type="text" placeholder="Nº da Requisição" value={refuelingForm.requisitionNumber || ''} onChange={e => setRefuelingForm({...refuelingForm, requisitionNumber: e.target.value.toUpperCase()})} className={inputClass} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button type="button" onClick={resetForms} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
                        <button 
                            onClick={handleSaveRefueling} 
                            disabled={loading} 
                            className="bg-blue-800 text-white px-10 py-3 rounded-lg font-bold hover:bg-blue-900 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 transform active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin"/> : <Save size={20} />}
                            Salvar Registro
                        </button>
                    </div>
                </div>
            )}

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden relative z-0">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Qtd Litros (Total)</p>
                    <p className="text-2xl font-black text-blue-800">{totalLitersCalculated.toFixed(2)} L</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Custo Total (Período)</p>
                    <p className="text-2xl font-black text-green-700">{formatCurrency(totalCostCalculated)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Operações Listadas</p>
                    <p className="text-2xl font-black text-slate-800">{filteredRefuelings.length}</p>
                </div>
             </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:overflow-visible relative z-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center print:hidden">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <ClipboardList size={18} /> Histórico Detalhado
                      <span className="ml-2 text-sm font-normal text-slate-500 bg-white px-2 py-0.5 border rounded-full shadow-sm">{filteredRefuelings.length} Registros</span>
                    </h3>
                    
                    {/* Items Per Page Selector - Mirroring Reports */}
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
                            <option value={1000000}>Todos</option>
                        </select>
                        <button onClick={loadData} className="p-1 hover:bg-slate-200 rounded ml-2 text-slate-500" title="Recarregar"><RefreshCw size={16}/></button>
                    </div>
                </div>

                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] print:bg-slate-200 print:text-slate-900 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 print:px-2">Data / Hora</th>
                                <th className="px-6 py-4 print:px-2">Veículo / Equipe</th>
                                <th className="px-6 py-4 print:px-2">Posto</th>
                                <th className="px-6 py-4 print:px-2">Produto</th>
                                <th className="px-6 py-4 print:px-2 bg-blue-50 text-blue-800">Litros</th>
                                <th className="px-6 py-4 print:px-2 bg-green-50 text-green-800">Valor Total</th>
                                <th className="px-6 py-4 print:hidden text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRefuelings.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 italic font-medium">Nenhum abastecimento encontrado.</td></tr>
                            ) : (
                                paginatedRefuelings.map(item => {
                                    const station = stations.find(s => s.id === item.gasStationId);
                                    const isPending = (item.totalCost || 0) <= 0 || (item.liters || 0) <= 0;

                                    return (
                                        <tr key={item.id} className={`hover:bg-slate-50 transition-colors print:hover:bg-transparent ${isPending ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4 font-medium text-slate-900 print:px-2">
                                                {formatDate(item.date)}
                                                {item.time && <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1"><Clock size={10}/> {item.time}</div>}
                                            </td>
                                            <td className="px-6 py-4 print:px-2">
                                                <div className="font-black text-slate-800 text-base">{item.plateSnapshot}</div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold">{item.foremanSnapshot || 'Sem Equipe'}</div>
                                            </td>
                                            <td className="px-6 py-4 print:px-2">
                                                <div className="text-slate-700 font-bold">{station?.name || 'N/A'}</div>
                                                <div className="text-xs text-slate-400">{item.municipalitySnapshot}</div>
                                            </td>
                                            <td className="px-6 py-4 print:px-2">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded border-2 shadow-sm ${getFuelColor(item.fuelType)} print:border-none print:p-0 print:bg-transparent print:text-black`}>
                                                    {item.fuelType}
                                                </span>
                                                {isPending && (
                                                    <span className="ml-2 inline-flex items-center gap-1 bg-red-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black animate-pulse">PENDENTE</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-mono print:px-2 text-blue-900 font-black text-base bg-blue-50/20">
                                                {item.liters?.toFixed(2)} L
                                            </td>
                                            <td className="px-6 py-4 font-mono font-black text-green-700 text-base bg-green-50/20 print:px-2">
                                                {formatCurrency(item.totalCost)}
                                            </td>
                                            <td className="px-6 py-4 print:hidden text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => setSelectedTicket(item)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all" title="Ver Bilhete"><Receipt size={20} /></button>
                                                    {!isReadOnly && (
                                                        <>
                                                            <button onClick={() => handleEditRefueling(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Editar"><Edit2 size={20} /></button>
                                                            <button onClick={() => confirmDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-all" title="Excluir"><Trash2 size={20} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                         <tfoot className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-300">
                             <tr>
                                 <td colSpan={4} className="px-6 py-4 text-right uppercase text-[10px] tracking-widest text-slate-500">Somatório Geral Listado:</td>
                                 <td className="px-6 py-4 text-blue-900 text-lg bg-blue-50/50">{totalLitersCalculated.toFixed(2)} L</td>
                                 <td className="px-6 py-4 text-green-800 text-lg bg-green-50/50">{formatCurrency(totalCostCalculated)}</td>
                                 <td className="print:hidden"></td>
                             </tr>
                         </tfoot>
                    </table>
                </div>

                {/* Pagination Controls - Mirroring Reports */}
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
                          Mostrando <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> até <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredRefuelings.length)}</span> de <span className="font-bold">{filteredRefuelings.length}</span> resultados
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
                        <button type="submit" disabled={loading} className="bg-blue-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors flex items-center gap-2 shadow-lg">
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
                                    <tr key={station.id} className="hover:bg-slate-50 transition-colors">
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
                                                    <button onClick={() => handleEditStation(station)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-all"><Edit2 size={16} /></button>
                                                    <button onClick={() => confirmDelete(station.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-all"><Trash2 size={16} /></button>
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