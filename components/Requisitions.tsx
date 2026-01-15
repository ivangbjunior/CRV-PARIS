
import React, { useState, useEffect } from 'react';
import { Requisition, RequisitionStatus, Vehicle, FuelType, ContractType, UserRole, UserVehicle, UserProfile, GasStation, RefuelingLog, FUEL_TYPES_LIST, SUPPLY_TYPES_LIST } from '../types';
import { storageService } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, Plus, Check, X, Search, Filter, Clock, User, Truck, Fuel, MapPin, AlertCircle, 
  Calendar, Loader2, Send, ThumbsUp, ThumbsDown, Eye, Users, Settings, Link as LinkIcon, Save, AlertTriangle, ArrowLeft, Gauge, Receipt, Trash2, RotateCcw, ShoppingCart, List, Droplet, Box
} from 'lucide-react';
import MultiSelect from './MultiSelect';

const EXTERNAL_EQUIPMENT_TYPES = [
  'CARRO', 'MOTO', 'BARCO', 'BALSA', 'LANCHA', 'MOTOR DE POPA', 'GALÃO', 'GERADOR', 'TAMBOR'
];

interface CartItem {
    id: string;
    fuelType: FuelType;
    liters: number;
    isFullTank: boolean;
    observation?: string;
}

const Requisitions: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MY_REQS' | 'APPROVAL' | 'MANAGE_USERS'>('MY_REQS');

  // Data
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [userVehicles, setUserVehicles] = useState<UserVehicle[]>([]);
  const [stations, setStations] = useState<GasStation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [refuelings, setRefuelings] = useState<RefuelingLog[]>([]); // To check history

  // Approval Filters (Aba Aprovação)
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterRequester, setFilterRequester] = useState('');
  
  // History/All Requisitions Filters (Aba Todas as Requisições)
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyRequester, setHistoryRequester] = useState('');

  const [uniqueRequesters, setUniqueRequesters] = useState<string[]>([]);

  // UI States
  const [showForm, setShowForm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  
  // Manage Users View State
  const [manageViewMode, setManageViewMode] = useState<'LIST' | 'EDIT'>('LIST');

  // CART STATE
  const [selectedVehicleForCart, setSelectedVehicleForCart] = useState<string>('');
  const [selectedExternalType, setSelectedExternalType] = useState<string>('');
  const [selectedExternalPlate, setSelectedExternalPlate] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  
  // New: Alternative Municipality Logic
  const [isAlternativeMunicipality, setIsAlternativeMunicipality] = useState(false);
  const [manualMunicipality, setManualMunicipality] = useState('');
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<CartItem>>({
      fuelType: '' as any,
      liters: 0,
      isFullTank: false,
      observation: ''
  });

  const [approvalData, setApprovalData] = useState({
    gasStationId: '',
    externalId: '',
    confirmedLiters: 0,
    invoiceNumber: '', // Novo: Nota Fiscal
    selectedContract: '' // Novo: Contrato
  });

  // Manage Users State
  const [manageUserSelection, setManageUserSelection] = useState<string>('');
  const [selectedVehiclesForUser, setSelectedVehiclesForUser] = useState<string[]>([]);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');

  // User Roles
  const isEncarregado = user?.role === UserRole.ENCARREGADO;
  const isFinanceiro = user?.role === UserRole.FINANCEIRO;
  const isGerencia = user?.role === UserRole.GERENCIA;
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Permitir exclusão para ADMIN ou FINANCEIRO
  const canManageDeletion = isAdmin || isFinanceiro;
  
  // Helper for date
  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    loadData();
    // Set default tab based on role
    if (isFinanceiro) setActiveTab('APPROVAL');
    else if (isGerencia) setActiveTab('MANAGE_USERS');
    else setActiveTab('MY_REQS');
  }, []);

  useEffect(() => {
    // Extract unique requesters for filter whenever requisitions or users change
    // Filter OUT Financeiro role from the dropdown list
    const financeiroIds = users.filter(u => u.role === UserRole.FINANCEIRO).map(u => u.id);
    const validRequisitions = requisitions.filter(r => !financeiroIds.includes(r.requesterId));
    
    const requesters = Array.from(new Set(validRequisitions.map(r => r.requesterName))).filter(Boolean).sort();
    setUniqueRequesters(requesters as string[]);
  }, [requisitions, users]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, vehs, uVehs, stats, allUsers, refLogs] = await Promise.all([
        storageService.getRequisitions(),
        storageService.getVehicles(),
        storageService.getUserVehicles(),
        storageService.getGasStations(),
        storageService.getAllUsers(),
        storageService.getRefuelings()
      ]);
      
      setRequisitions(reqs);
      setVehicles(vehs);
      setUserVehicles(uVehs);
      setStations(stats);
      setUsers(allUsers);
      setRefuelings(refLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE REQUISITION (ADMIN/FINANCEIRO) ---
  const handleDelete = async (id: string) => {
    if (!canManageDeletion) return;
    
    if (confirm("Tem certeza que deseja excluir permanentemente esta requisição? Esta ação não pode ser desfeita.")) {
        setLoading(true);
        try {
            await storageService.deleteRequisition(id);
            // Refresh local state immediately and then reload from storage
            setRequisitions(prev => prev.filter(r => r.id !== id));
            await loadData();
        } catch (err: any) {
            console.error(err);
            alert(`Erro ao excluir: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }
  };

  // --- RESET ALL REQUESTS (ADMIN) ---
  const handleResetMyRequests = async () => {
     if (!isAdmin || !user) return;
     if (confirm("ATENÇÃO ADMIN: Isso excluirá TODAS as requisições criadas pelo seu usuário. Confirma?")) {
         setLoading(true);
         try {
             // Filter requests made by current admin
             const myReqs = requisitions.filter(r => r.requesterId === user.id);
             for (const req of myReqs) {
                 await storageService.deleteRequisition(req.id);
             }
             await loadData();
             alert("Suas requisições foram limpas.");
         } catch (err: any) {
             console.error(err);
             alert(`Erro ao limpar requisições: ${err.message}`);
         } finally {
             setLoading(false);
         }
     }
  };

  // --- CART LOGIC ---
  const handleAddItemToCart = () => {
      if (!currentItem.fuelType) {
          alert("Selecione o tipo de item/combustível.");
          return;
      }
      
      // Se não for tanque cheio e litros for 0 ou inválido
      if (!currentItem.isFullTank && (!currentItem.liters || currentItem.liters <= 0)) {
           alert("Informe a quantidade de litros ou marque 'Completar Tanque'.");
           return;
      }

      setCartItems(prev => [...prev, {
          id: crypto.randomUUID(),
          fuelType: currentItem.fuelType as FuelType,
          liters: currentItem.isFullTank ? 0 : Number(currentItem.liters),
          isFullTank: currentItem.isFullTank || false,
          observation: currentItem.observation || ''
      }]);

      // Reset item input
      setCurrentItem({
          fuelType: '' as any,
          liters: 0,
          isFullTank: false,
          observation: ''
      });
  };

  const handleRemoveItemFromCart = (id: string) => {
      setCartItems(prev => prev.filter(item => item.id !== id));
  };
  
  const handleSaveCart = async () => {
    if (!user) return;
    if (!selectedVehicleForCart) {
        alert("Selecione um veículo.");
        return;
    }
    if (cartItems.length === 0) {
        alert("Adicione pelo menos um item à lista.");
        return;
    }
    
    setLoading(true);

    try {
        const now = new Date();
        
        // Snapshot data
        let municipality = '';
        let requesterName = user.email.split('@')[0].toUpperCase();
        let isExternal = selectedVehicleForCart === 'EXTERNAL';

        if (!isExternal) {
            // Se for veiculo registrado
            const v = vehicles.find(vh => vh.id === selectedVehicleForCart);
            // Lógica: Se marcou "Outro Município", usa o manual. Senão, usa o do veículo.
            if (isAlternativeMunicipality && manualMunicipality) {
                municipality = manualMunicipality.toUpperCase();
            } else if (v) {
                municipality = v.municipality;
            }
        } else {
            municipality = selectedMunicipality ? selectedMunicipality.toUpperCase() : '';
        }

        const itemsToSave = cartItems; 
        const internalIds: number[] = [];

        // Save Requisitions for ALL Items
        for (const item of itemsToSave) {
            const nextId = await storageService.getNextInternalId();
            internalIds.push(nextId);

            const requisition: Requisition = {
                id: crypto.randomUUID(),
                internalId: nextId,
                date: getTodayLocal(),
                requestTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                requesterId: user.id,
                requesterName: requesterName,
                vehicleId: selectedVehicleForCart,
                externalType: isExternal ? selectedExternalType : undefined,
                externalPlate: isExternal && selectedExternalPlate ? selectedExternalPlate.toUpperCase() : undefined,
                fuelType: item.fuelType,
                liters: item.liters,
                isFullTank: item.isFullTank,
                observation: item.observation ? item.observation.toUpperCase() : '',
                municipality: municipality,
                status: RequisitionStatus.PENDING
            };

            await storageService.saveRequisition(requisition);
        }
        
        await loadData();
        
        // Generate WhatsApp Link automatically with ALL items
        const waLink = generateConsolidatedWhatsAppLink(
            selectedVehicleForCart, 
            requesterName, 
            municipality, 
            cartItems, 
            internalIds,
            isExternal,
            selectedExternalType,
            selectedExternalPlate
        );
        
        setShowForm(false);
        
        // Reset Cart
        setCartItems([]);
        setSelectedVehicleForCart('');
        setSelectedExternalType('');
        setSelectedExternalPlate('');
        setSelectedMunicipality('');
        setIsAlternativeMunicipality(false);
        setManualMunicipality('');
        
        window.open(waLink, '_blank');
    } catch (err: any) {
        console.error(err);
        alert(`Erro ao salvar requisição: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  // --- APPROVAL LOGIC ---

  const handleOpenApproval = (req: Requisition) => {
    setSelectedRequisition(req);
    
    setApprovalData({ 
        gasStationId: '', 
        externalId: '',
        confirmedLiters: req.liters || 0,
        invoiceNumber: '',
        selectedContract: '' // Inicia vazio propositalmente
    });
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequisition || !user) return;
    
    if (!approvalData.gasStationId) {
      alert("Por favor selecione o Posto.");
      return;
    }
    
    if (!approvalData.selectedContract) {
        alert("Por favor selecione o Contrato para alocação de custo.");
        return;
    }

    if (selectedRequisition.isFullTank && approvalData.confirmedLiters <= 0) {
        alert("Para requisições de 'Completar Tanque', você deve informar a quantidade exata de litros abastecidos conforme a nota/cupom.");
        return;
    }

    setLoading(true);
    
    try {
        // 1. Update Requisition Status
        const updatedReq: Requisition = {
        ...selectedRequisition,
        status: RequisitionStatus.APPROVED,
        approvedBy: user.id,
        approvalDate: getTodayLocal(),
        gasStationId: approvalData.gasStationId,
        externalId: approvalData.externalId ? approvalData.externalId.toUpperCase() : '', 
        liters: Number(approvalData.confirmedLiters) 
        };
        
        await storageService.saveRequisition(updatedReq);

        // 2. Create Refueling Log
        let vehicleData = { plate: '', model: '', contract: '', foreman: '' };
        
        if (updatedReq.vehicleId === 'EXTERNAL') {
            vehicleData.plate = updatedReq.externalPlate || updatedReq.externalType || 'EXTERNO';
            vehicleData.contract = 'EXTERNO'; 
        } else {
            const v = vehicles.find(vh => vh.id === updatedReq.vehicleId);
            if (v) {
                vehicleData = { plate: v.plate, model: v.model || '', contract: v.contract, foreman: v.foreman };
            }
        }

        const newRefueling: RefuelingLog = {
        id: crypto.randomUUID(),
        date: updatedReq.date, 
        time: updatedReq.requestTime,
        vehicleId: updatedReq.vehicleId,
        gasStationId: approvalData.gasStationId,
        fuelType: updatedReq.fuelType,
        liters: Number(approvalData.confirmedLiters),
        totalCost: 0, 
        requisitionNumber: approvalData.externalId ? approvalData.externalId.toUpperCase() : '',
        invoiceNumber: approvalData.invoiceNumber ? approvalData.invoiceNumber.toUpperCase() : '', 
        
        plateSnapshot: vehicleData.plate,
        modelSnapshot: vehicleData.model,
        foremanSnapshot: vehicleData.foreman,
        contractSnapshot: approvalData.selectedContract || vehicleData.contract, 
        municipalitySnapshot: updatedReq.municipality,
        observation: `REQ INT #${updatedReq.internalId} - ${updatedReq.observation || ''}`
        };
        
        await storageService.saveRefueling(newRefueling);
        
        await loadData();
        setShowApprovalModal(false);
        setSelectedRequisition(null);
    } catch (err: any) {
        console.error(err);
        alert(`Erro ao aprovar: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleReject = async () => {
     if (!selectedRequisition) return;
     if (!confirm("Tem certeza que deseja recusar esta requisição?")) return;
     
     setLoading(true);
     try {
        const updatedReq: Requisition = {
        ...selectedRequisition,
        status: RequisitionStatus.REJECTED,
        approvedBy: user?.id, 
        approvalDate: getTodayLocal()
        };
        
        await storageService.saveRequisition(updatedReq);
        await loadData();
        setShowApprovalModal(false);
        setSelectedRequisition(null);
     } catch (err: any) {
        console.error(err);
        alert(`Erro ao rejeitar: ${err.message}`);
     } finally {
        setLoading(false);
     }
  };

  // --- MANAGE USERS LOGIC ---

  const handleUserSelectionChange = (userId: string) => {
    setManageUserSelection(userId);
    const assigned = userVehicles.filter(uv => uv.userId === userId).map(uv => uv.vehicleId);
    setSelectedVehiclesForUser(assigned);
    setVehicleSearchTerm('');
    setManageViewMode('EDIT');
  };

  const handleSaveUserVehicles = async () => {
    if (!manageUserSelection) return;
    setLoading(true);

    try {
        const freshUserVehicles = await storageService.getUserVehicles();
        const currentAssignments = freshUserVehicles.filter(uv => uv.userId === manageUserSelection);
        const currentVehicleIds = currentAssignments.map(uv => uv.vehicleId);

        const toRemove = currentAssignments.filter(uv => !selectedVehiclesForUser.includes(uv.vehicleId));
        const toAddIds = selectedVehiclesForUser.filter(vid => !currentVehicleIds.includes(vid));
        
        for (const item of toRemove) {
            await storageService.deleteUserVehicle(item.id);
        }

        for (const vid of toAddIds) {
            await storageService.saveUserVehicle({
                id: crypto.randomUUID(),
                userId: manageUserSelection,
                vehicleId: vid
            });
        }

        await loadData();
        alert("Vínculos atualizados com sucesso!");
        setManageViewMode('LIST');
    } catch (err) {
        console.error(err);
        alert("Erro ao salvar vínculos. Tente novamente.");
    } finally {
        setLoading(false);
    }
  };

  // --- WHATSAPP GENERATOR ---
  const generateWhatsAppLink = (req: Requisition) => {
      return generateConsolidatedWhatsAppLink(
          req.vehicleId, 
          req.requesterName || '', 
          req.municipality, 
          [{ id: '', fuelType: req.fuelType, liters: req.liters, isFullTank: req.isFullTank || false, observation: req.observation }], 
          [req.internalId],
          req.vehicleId === 'EXTERNAL',
          req.externalType || '',
          req.externalPlate || ''
      );
  };

  const generateConsolidatedWhatsAppLink = (
      vehicleId: string, 
      requesterName: string, 
      municipality: string, 
      items: CartItem[], 
      internalIds: number[],
      isExternal: boolean,
      extType: string,
      extPlate: string
    ) => {
     
     // Find last refueling info
     let lastRefuelingText = "Não encontrado";
     
     if (!isExternal) {
         const vRefuelings = refuelings
             .filter(r => r.vehicleId === vehicleId && r.date <= getTodayLocal())
             .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
         
         if (vRefuelings.length > 0) {
             const last = vRefuelings[0];
             const [y,m,d] = last.date.split('-');
             // Added Municipality to last refueling text
             lastRefuelingText = `${d}/${m}/${y} (${last.liters} L) - ${last.municipalitySnapshot}`;
         }
     }

     let vehicleInfo = "";
     if (isExternal) {
         vehicleInfo = `${extType} - ${extPlate || 'S/ Placa'}`;
     } else {
         const v = vehicles.find(vh => vh.id === vehicleId);
         vehicleInfo = `${v?.plate} - ${v?.model}`;
     }

     const idsString = internalIds.length > 0 ? internalIds.join(', ') : 'N/A (Insumos)';

     let messageBody = '';

     if (items.length === 1) {
        const item = items[0];
        const qtyText = item.isFullTank ? "TANQUE CHEIO" : `${item.liters} Litros`;
        const obsText = item.observation ? item.observation : '-';

        messageBody = `*SOLICITAÇÃO DE ABASTECIMENTO*
Nº: ${idsString}
Solicitante: ${requesterName}
Veículo: ${vehicleInfo}
Município: ${municipality}
Combustível: ${item.fuelType}
Quantidade: ${qtyText}
Observação: ${obsText}

ℹ️ Último Abastecimento: ${lastRefuelingText}`;

     } else {
        const itemsList = items.map((item, i) => {
            const qtyText = item.isFullTank ? "TANQUE CHEIO" : `${item.liters} Litros`;
            const obsText = item.observation ? ` (${item.observation})` : '';
            return `${i + 1}. ${item.fuelType} - ${qtyText}${obsText}`;
        }).join('\n');

        messageBody = `*SOLICITAÇÃO DE ABASTECIMENTO*
Nº: ${idsString}
Solicitante: ${requesterName}
Veículo: ${vehicleInfo}
Município: ${municipality}

*Itens Solicitados:*
${itemsList}

ℹ️ Último Abastecimento: ${lastRefuelingText}`;
     }

     const finalMessage = `${messageBody}`;

     return `https://wa.me/?text=${encodeURIComponent(finalMessage)}`;
  };
  
  // --- HELPERS ---
  const getAvailableVehicles = () => {
      if (isFinanceiro || isGerencia || isAdmin) return vehicles;
      if (isEncarregado && user) {
          const myVehicleIds = userVehicles.filter(uv => uv.userId === user.id).map(uv => uv.vehicleId);
          return vehicles.filter(v => myVehicleIds.includes(v.id));
      }
      return [];
  };
  
  const clearApprovalFilters = () => {
      setFilterStartDate('');
      setFilterEndDate('');
      setFilterRequester('');
  };

  const clearHistoryFilters = () => {
    setHistoryStartDate('');
    setHistoryEndDate('');
    setHistoryRequester('');
  };

  const inputClass = "w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-800 focus:border-blue-600 outline-none transition-all";
  const selectClass = "w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-700 focus:border-blue-600 outline-none h-[42px] shadow-sm";

  if (loading && requisitions.length === 0) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="text-orange-600" /> Gestão de Requisições
                </h1>
                <p className="text-slate-500">Solicitação e aprovação de combustível.</p>
            </div>
            {(isEncarregado || isFinanceiro || isAdmin) && (
                 <button 
                    onClick={() => { setShowForm(true); setCartItems([]); setSelectedVehicleForCart(''); setIsAlternativeMunicipality(false); setManualMunicipality(''); }}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all"
                 >
                    <Plus size={20} /> Nova Requisição
                 </button>
            )}
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 space-x-4 overflow-x-auto">
            {(isEncarregado || isFinanceiro || isAdmin) && (
                <button 
                    onClick={() => setActiveTab('MY_REQS')}
                    className={`pb-3 px-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'MY_REQS' ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {(isFinanceiro || isAdmin) ? 'Todas as Requisições' : 'Minhas Requisições'}
                </button>
            )}
            {(isFinanceiro || isAdmin) && (
                <button 
                    onClick={() => setActiveTab('APPROVAL')}
                    className={`pb-3 px-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'APPROVAL' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Aprovação Pendente
                </button>
            )}
            {(isGerencia || isAdmin) && (
                <button 
                    onClick={() => { setActiveTab('MANAGE_USERS'); setManageViewMode('LIST'); }}
                    className={`pb-3 px-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'MANAGE_USERS' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Gestão de Vínculos (Encarregados)
                </button>
            )}
        </div>

        {/* --- TAB: MY REQUESTS (LIST) --- */}
        {activeTab === 'MY_REQS' && (
            <div className="space-y-6">
                {isAdmin && (
                     <div className="flex justify-end">
                         <button 
                             onClick={handleResetMyRequests}
                             className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center gap-2 transition-colors"
                             title="Limpar requisições criadas pelo meu usuário"
                         >
                             <RotateCcw size={14} /> Resetar Minhas Solicitações (Admin)
                         </button>
                     </div>
                )}

                {(isFinanceiro || isAdmin) && (
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                         <div className="flex items-center gap-2 font-bold text-slate-700 mb-3">
                             <Filter size={18} /> Filtros de Histórico
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Data Início</label>
                                 <input 
                                    type="date" 
                                    className={selectClass}
                                    value={historyStartDate}
                                    onChange={(e) => setHistoryStartDate(e.target.value)}
                                 />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Data Fim</label>
                                 <input 
                                    type="date" 
                                    className={selectClass}
                                    value={historyEndDate}
                                    onChange={(e) => setHistoryEndDate(e.target.value)}
                                 />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Encarregado</label>
                                 <select 
                                    className={selectClass}
                                    value={historyRequester}
                                    onChange={(e) => setHistoryRequester(e.target.value)}
                                 >
                                     <option value="">Todos</option>
                                     {uniqueRequesters.map(req => (
                                         <option key={req} value={req}>{req}</option>
                                     ))}
                                 </select>
                             </div>
                             <div className="flex items-end">
                                 <button 
                                    onClick={clearHistoryFilters}
                                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 h-[42px] rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                 >
                                     <X size={16} /> Limpar
                                 </button>
                             </div>
                         </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Nº Int</th>
                                    <th className="px-6 py-3">Data / Solicitante</th>
                                    <th className="px-6 py-3">Veículo</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Combustível</th>
                                    <th className="px-6 py-3">Insumos</th>
                                    <th className="px-6 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requisitions
                                .filter(r => (isFinanceiro || isAdmin) ? true : r.requesterId === user?.id)
                                .filter(r => {
                                    if (!(isFinanceiro || isAdmin)) return true;
                                    
                                    const rDate = new Date(r.date).getTime();
                                    const start = historyStartDate ? new Date(historyStartDate).getTime() : null;
                                    const end = historyEndDate ? new Date(historyEndDate).getTime() : null;
                                    const matchesDate = (!start || rDate >= start) && (!end || rDate <= end);
                                    const matchesRequester = !historyRequester || r.requesterName === historyRequester;
                                    
                                    return matchesDate && matchesRequester;
                                })
                                .map(req => {
                                    const isFuel = FUEL_TYPES_LIST.includes(req.fuelType);
                                    return (
                                    <tr key={req.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-mono font-bold text-slate-700">#{req.internalId}</td>
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-slate-800">{req.date}</div> 
                                            <div className="text-xs text-slate-500">{req.requesterName}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            {req.vehicleId === 'EXTERNAL' ? (
                                                <span className="text-orange-600 font-bold">{req.externalType} - {req.externalPlate}</span>
                                            ) : (
                                                (() => {
                                                    const v = vehicles.find(veh => veh.id === req.vehicleId);
                                                    return <span className="font-medium">{v?.plate} <span className="text-slate-400 text-xs font-normal">({v?.model})</span></span>
                                                })()
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                                req.status === RequisitionStatus.PENDING ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                req.status === RequisitionStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-200' :
                                                'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                {(req.status === 'REPROVADA' || req.status === 'RECUSADA') ? 'RECUSADA' : req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-xs">
                                            {isFuel ? (
                                                <>
                                                    {req.isFullTank ? (
                                                        <div className="font-bold text-blue-600 flex items-center gap-1">
                                                            <Gauge size={14} /> TANQUE CHEIO
                                                        </div>
                                                    ) : (
                                                        <div className="font-bold">{req.liters}L</div>
                                                    )}
                                                    <div className="text-slate-500">{req.fuelType} • {req.municipality}</div>
                                                </>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-xs">
                                            {!isFuel ? (
                                                <div className="bg-orange-50 text-orange-800 border border-orange-100 px-2 py-1 rounded w-fit">
                                                    <div className="font-bold">{req.fuelType}</div>
                                                    <div className="text-[10px] opacity-80">{req.liters > 0 ? `${req.liters} un/L` : '-'}</div>
                                                </div>
                                            ) : (
                                                 <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button 
                                                    onClick={() => window.open(generateWhatsAppLink(req), '_blank')}
                                                    className="text-green-600 hover:bg-green-50 p-2 rounded-full transition-colors"
                                                    title="Enviar no WhatsApp"
                                                >
                                                    <Send size={16} />
                                                </button>
                                                {canManageDeletion && (
                                                    <button 
                                                        onClick={() => handleDelete(req.id)}
                                                        className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                        title="Excluir Requisição"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                                {requisitions.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma requisição encontrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB: APPROVAL --- */}
        {activeTab === 'APPROVAL' && (
             <div className="space-y-6">
                {/* Filters */}
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                     <div className="flex items-center gap-2 font-bold text-slate-700 mb-3">
                         <Filter size={18} /> Filtros de Pendências
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1">Data Início</label>
                             <input 
                                type="date" 
                                className={selectClass}
                                value={filterStartDate}
                                onChange={(e) => setFilterStartDate(e.target.value)}
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1">Data Fim</label>
                             <input 
                                type="date" 
                                className={selectClass}
                                value={filterEndDate}
                                onChange={(e) => setFilterEndDate(e.target.value)}
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1">Encarregado / Solicitante</label>
                             <select 
                                className={selectClass}
                                value={filterRequester}
                                onChange={(e) => setFilterRequester(e.target.value)}
                             >
                                 <option value="">Todos</option>
                                 {uniqueRequesters.map(req => (
                                     <option key={req} value={req}>{req}</option>
                                 ))}
                             </select>
                         </div>
                         <div className="flex items-end">
                             <button 
                                onClick={clearApprovalFilters}
                                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 h-[42px] rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                             >
                                 <X size={16} /> Limpar
                             </button>
                         </div>
                     </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                        <Clock size={18} /> Pendentes de Aprovação
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-slate-600 font-bold uppercase text-xs border-b">
                            <tr>
                                <th className="px-6 py-3">Nº Int</th>
                                <th className="px-6 py-3">Solicitante</th>
                                <th className="px-6 py-3">Veículo</th>
                                <th className="px-6 py-3">Combustível</th>
                                <th className="px-6 py-3">Insumo</th>
                                <th className="px-6 py-3 text-center">Aprovar/Reprovar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requisitions
                                .filter(r => r.status === RequisitionStatus.PENDING)
                                .filter(r => {
                                    const rDate = new Date(r.date).getTime();
                                    const start = filterStartDate ? new Date(filterStartDate).getTime() : null;
                                    const end = filterEndDate ? new Date(filterEndDate).getTime() : null;
                                    const matchesDate = (!start || rDate >= start) && (!end || rDate <= end);
                                    const matchesRequester = !filterRequester || r.requesterName === filterRequester;
                                    return matchesDate && matchesRequester;
                                })
                                .map(req => {
                                    const isFuel = FUEL_TYPES_LIST.includes(req.fuelType);
                                    return (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-mono font-bold">#{req.internalId}</td>
                                    <td className="px-6 py-3">
                                        <div className="font-bold text-slate-800">{req.requesterName}</div>
                                        <div className="text-xs text-slate-500">{req.date}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        {req.vehicleId === 'EXTERNAL' ? (
                                            <div className="text-orange-600 font-bold flex items-center gap-1"><AlertCircle size={12}/> {req.externalType}</div>
                                        ) : (
                                            (() => {
                                                const v = vehicles.find(veh => veh.id === req.vehicleId);
                                                return <div>{v?.plate} <div className="text-xs text-slate-500">{v?.model}</div></div>
                                            })()
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        {isFuel ? (
                                            <>
                                                {req.isFullTank ? (
                                                    <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded w-fit flex items-center gap-1">
                                                        <Gauge size={12} /> COMPLETAR
                                                    </div>
                                                ) : (
                                                    <div className="font-bold">{req.liters}L</div>
                                                )}
                                                <div className="text-xs text-slate-500 mt-1">{req.fuelType} • {req.municipality}</div>
                                            </>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-6 py-3">
                                         {!isFuel ? (
                                             <div className="text-orange-700 font-bold text-xs">{req.fuelType} ({req.liters})</div>
                                         ) : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleOpenApproval(req)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold">Analisar</button>
                                            {canManageDeletion && (
                                                <button onClick={() => handleDelete(req.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs" title="Excluir"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {requisitions.filter(r => r.status === RequisitionStatus.PENDING).length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma requisição pendente encontrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- TAB: MANAGE USERS --- */}
        {activeTab === 'MANAGE_USERS' && (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                {manageViewMode === 'LIST' ? (
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-6 border-b pb-4">
                             <Users className="text-blue-600" />
                             <div>
                                  <h2 className="text-xl font-bold text-slate-800">Gestão de Encarregados</h2>
                                  <p className="text-sm text-slate-500">Selecione um encarregado para vincular veículos.</p>
                             </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Nome / Login</th>
                                        <th className="px-6 py-3">Função</th>
                                        <th className="px-6 py-3">Veículos (Placas)</th>
                                        <th className="px-6 py-3 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.filter(u => u.role === UserRole.ENCARREGADO).map(u => {
                                            const uVehs = userVehicles.filter(uv => uv.userId === u.id);
                                            const count = uVehs.length;
                                            const plates = uVehs.map(uv => {
                                                const v = vehicles.find(veh => veh.id === uv.vehicleId);
                                                return v ? v.plate : '?';
                                            }).join(', ');
                                            return (
                                                <tr key={u.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-3"><div className="font-bold text-slate-800">{u.email.split('@')[0].toUpperCase()}</div></td>
                                                    <td className="px-6 py-3"><span className="bg-cyan-100 text-cyan-800 text-xs px-2 py-1 rounded font-bold">{u.role}</span></td>
                                                    <td className="px-6 py-3"><div className="flex flex-col"><span className="font-bold text-lg">{count}</span><span className="text-xs text-slate-500 truncate max-w-[200px]" title={plates}>{plates || '-'}</span></div></td>
                                                    <td className="px-6 py-3 text-center"><button onClick={() => handleUserSelectionChange(u.id)} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-xs border border-blue-200 hover:border-blue-300 transition-all">Gerenciar Vínculos</button></td>
                                                </tr>
                                            );
                                        })}
                                     {users.filter(u => u.role === UserRole.ENCARREGADO).length === 0 && (<tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum usuário com perfil ENCARREGADO encontrado.</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-6 border-b pb-4">
                            <button onClick={() => setManageViewMode('LIST')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Voltar para a lista"><ArrowLeft size={24} /></button>
                            <div><h2 className="text-xl font-bold text-slate-800">Vincular Veículos</h2><p className="text-sm text-slate-500">Editando: <span className="font-bold text-blue-700">{users.find(u => u.id === manageUserSelection)?.email.split('@')[0].toUpperCase()}</span></p></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-1">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 sticky top-4">
                                    <p className="text-sm text-blue-800 font-bold mb-4 flex items-center gap-2"><Truck size={16} /> Veículos Selecionados</p>
                                    <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {selectedVehiclesForUser.length === 0 ? (<span className="text-sm text-slate-400 italic">Nenhum veículo selecionado.</span>) : (selectedVehiclesForUser.map(vid => {
                                                const v = vehicles.find(veh => veh.id === vid);
                                                return v ? (<div key={vid} className="bg-white text-blue-900 border border-blue-200 px-3 py-2 rounded text-xs shadow-sm flex justify-between items-center"><div><div className="font-bold">{v.plate}</div><div className="opacity-70">{v.model}</div></div><button onClick={() => setSelectedVehiclesForUser(prev => prev.filter(id => id !== vid))} className="text-slate-400 hover:text-red-500 p-1"><X size={14} /></button></div>) : null;
                                            }))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                         <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-blue-900">Total:</span><span className="text-lg font-bold text-blue-700">{selectedVehiclesForUser.length}</span></div>
                                         <button onClick={handleSaveUserVehicles} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">{loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar Alterações</button>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2 flex flex-col h-full">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                    <label className="block text-sm font-bold text-slate-700">Catálogo de Veículos</label>
                                    <div className="relative w-full sm:w-64">
                                         <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                         <input type="text" placeholder="Buscar placa, modelo..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none" value={vehicleSearchTerm} onChange={(e) => setVehicleSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div className="border border-slate-200 rounded-lg flex-1 min-h-[400px] max-h-[600px] overflow-y-auto bg-slate-50 p-2">
                                     {vehicles.filter(v => {if (!vehicleSearchTerm) return true; const term = vehicleSearchTerm.toLowerCase(); return v.plate.toLowerCase().includes(term) || v.model?.toLowerCase().includes(term) || v.foreman?.toLowerCase().includes(term);}).map(v => {const isSelected = selectedVehiclesForUser.includes(v.id); return (<label key={v.id} className={`flex items-center gap-3 p-3 mb-1 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-200'}`}><div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>{isSelected && <Check size={14} className="text-white" />}</div><input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {if (e.target.checked) {setSelectedVehiclesForUser(prev => [...prev, v.id]);} else {setSelectedVehiclesForUser(prev => prev.filter(id => id !== v.id));}}} /><div className="flex-1"><div className="flex justify-between items-center"><span className={`font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{v.plate}</span><span className="text-[10px] uppercase font-bold text-slate-400 border px-1 rounded bg-white">{v.contract}</span></div><div className="flex items-center gap-2 text-xs text-slate-500 mt-1"><span className="font-medium">{v.model}</span><span className="text-slate-300">•</span><span>{v.foreman}</span></div></div></label>)})}
                                     {vehicles.length === 0 && <div className="text-center p-8 text-slate-400">Nenhum veículo cadastrado.</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- MODAL: NEW REQUISITION (CART SYSTEM) --- */}
        {showForm && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[95dvh] overflow-hidden">
                    <div className="bg-orange-600 p-4 flex justify-between items-center text-white flex-shrink-0 sticky top-0 z-20 shadow-md">
                        <h3 className="font-bold flex items-center gap-2"><FileText /> Nova Requisição (Carrinho)</h3>
                        <button onClick={() => setShowForm(false)} className="p-1 hover:bg-orange-700 rounded transition-colors"><X /></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1">
                        
                        {/* Vehicle Selection */}
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Veículo (Para todos os itens)</label>
                            <select 
                                required
                                value={selectedVehicleForCart}
                                onChange={(e) => {
                                    setSelectedVehicleForCart(e.target.value);
                                }}
                                className={`${inputClass} font-bold text-lg h-14`}
                            >
                                <option value="">Selecione...</option>
                                {getAvailableVehicles().map(v => (
                                    <option key={v.id} value={v.id}>{v.plate} - {v.model} ({v.contract})</option>
                                ))}
                                <option value="EXTERNAL">-- VEÍCULO NÃO CADASTRADO / EXTERNO --</option>
                            </select>

                            {/* NEW: Alternative Municipality Checkbox */}
                            {selectedVehicleForCart && selectedVehicleForCart !== 'EXTERNAL' && (
                                <div className="mt-2">
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={isAlternativeMunicipality}
                                            onChange={(e) => {
                                                setIsAlternativeMunicipality(e.target.checked);
                                                if(!e.target.checked) setManualMunicipality('');
                                            }}
                                            className="w-4 h-4 accent-orange-600"
                                        />
                                        Abastecimento em outro município?
                                    </label>
                                    {isAlternativeMunicipality && (
                                        <input 
                                            type="text" 
                                            placeholder="Digite o município do abastecimento"
                                            value={manualMunicipality}
                                            onChange={(e) => setManualMunicipality(e.target.value.toUpperCase())}
                                            className={`${inputClass} mt-2`}
                                        />
                                    )}
                                </div>
                            )}

                             {/* External Fields */}
                            {selectedVehicleForCart === 'EXTERNAL' && (
                                <div className="grid grid-cols-2 gap-4 mt-4 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                        <select 
                                            className={inputClass}
                                            required
                                            value={selectedExternalType}
                                            onChange={(e) => setSelectedExternalType(e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {EXTERNAL_EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Placa / Identificação</label>
                                        <input 
                                            type="text" 
                                            className={inputClass}
                                            placeholder="Ex: ABC-1234 ou Nº Série"
                                            value={selectedExternalPlate}
                                            onChange={(e) => setSelectedExternalPlate(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Município</label>
                                        <input 
                                            type="text" 
                                            required
                                            className={inputClass}
                                            value={selectedMunicipality}
                                            onChange={(e) => setSelectedMunicipality(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Add Item Form */}
                        <div className="mb-6 pb-6 border-b border-slate-200">
                             <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-lg border-b pb-2"><Plus size={20} /> Adicionar Item</h4>
                             
                             <div className="flex flex-col gap-5">
                                {/* 1. Produto / Insumo */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Produto / Insumo</label>
                                    <select 
                                        value={currentItem.fuelType || ''}
                                        onChange={(e) => setCurrentItem({...currentItem, fuelType: e.target.value as FuelType})}
                                        className={`${inputClass} font-medium h-14 text-base`}
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
                                
                                {/* 2. Quantity Logic */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantidade (Litros)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            disabled={currentItem.isFullTank}
                                            // Ensure it shows empty placeholder if 0
                                            value={currentItem.isFullTank ? '' : (currentItem.liters === 0 ? '' : currentItem.liters)}
                                            onChange={(e) => setCurrentItem({...currentItem, liters: Number(e.target.value)})}
                                            className={`${inputClass} h-14 text-lg font-bold ${currentItem.isFullTank ? 'bg-slate-100 text-transparent' : 'bg-white'}`}
                                            placeholder={currentItem.isFullTank ? '' : "0.0"}
                                        />
                                        {currentItem.isFullTank && (
                                            <div className="absolute inset-0 flex items-center px-3 text-sm font-bold text-blue-800 pointer-events-none">
                                                <Gauge size={16} className="mr-2" /> TANQUE CHEIO
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Full Tank Option - Explicitly below quantity */}
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="flex items-center gap-3 cursor-pointer w-full">
                                        <input 
                                            type="checkbox" 
                                            className="accent-blue-600 w-6 h-6"
                                            checked={currentItem.isFullTank || false}
                                            onChange={(e) => {
                                                setCurrentItem({
                                                    ...currentItem, 
                                                    isFullTank: e.target.checked,
                                                    liters: e.target.checked ? 0 : currentItem.liters
                                                });
                                            }}
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-slate-800 block">Quero completar o tanque</span>
                                            <span className="text-xs text-slate-500 block">Marque apenas se for encher até a capacidade máxima.</span>
                                        </div>
                                    </label>
                                </div>

                                {/* 4. Include Button - MOVED ABOVE OBSERVATION */}
                                <button 
                                    type="button" 
                                    onClick={handleAddItemToCart}
                                    className="bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 h-14 w-full shadow-md mt-2 transition-transform active:scale-[0.98]"
                                >
                                    <Plus size={22} /> INCLUIR ITEM NA LISTA
                                </button>
                            
                                {/* 5. Observation - MOVED BELOW BUTTON */}
                                <div className="mt-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Observação (Opcional)</label>
                                    <input 
                                        type="text" 
                                        className={`${inputClass} h-12`}
                                        placeholder="Ex: Óleo 15w40, Filtro..."
                                        value={currentItem.observation}
                                        onChange={(e) => setCurrentItem({...currentItem, observation: e.target.value.toUpperCase()})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Cart List */}
                        <div>
                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><ShoppingCart size={16} /> Itens na Requisição</h4>
                            {cartItems.length === 0 ? (
                                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm bg-slate-50">
                                    <div className="flex justify-center mb-2 opacity-50"><ShoppingCart size={32} /></div>
                                    <p>Nenhum item adicionado à lista.</p>
                                    <p className="text-xs mt-1">Preencha acima e clique em "INCLUIR ITEM"</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {cartItems.map((item, index) => (
                                        <div key={item.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-orange-200 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-orange-100 text-orange-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border border-orange-200">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-800 text-lg">{item.fuelType}</div>
                                                    <div className="text-sm text-slate-600 font-medium">
                                                        {item.isFullTank ? "TANQUE CHEIO" : `${item.liters} Litros`}
                                                        {item.observation && <span className="text-orange-600 ml-2 font-normal">({item.observation})</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveItemFromCart(item.id)}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                title="Remover item"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                    
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
                        <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-sm">CANCELAR</button>
                        <button 
                            type="button" 
                            onClick={handleSaveCart}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transform active:scale-95 transition-all text-sm"
                        >
                            <Send size={18} /> GERAR REQUISIÇÃO
                        </button>
                    </div>

                </div>
            </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedRequisition && (
             <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="bg-green-600 p-4 text-white">
                        <h3 className="font-bold">Aprovação de Requisição #{selectedRequisition.internalId}</h3>
                        <p className="text-xs opacity-80 mt-1">Solicitado por: {selectedRequisition.requesterName}</p>
                    </div>
                    <div className="p-6">
                        <div className="bg-slate-50 p-3 rounded mb-4 border border-slate-200 text-sm">
                             <p><strong>Veículo:</strong> {selectedRequisition.vehicleId === 'EXTERNAL' ? selectedRequisition.externalType : vehicles.find(v => v.id === selectedRequisition.vehicleId)?.plate}</p>
                             <p><strong>Pedido Original:</strong> {selectedRequisition.isFullTank ? 'COMPLETAR TANQUE' : `${selectedRequisition.liters} L`} - {selectedRequisition.fuelType}</p>
                        </div>

                        <div className="mb-4">
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selecione o Posto <span className="text-red-500">*</span></label>
                             <select 
                                className={inputClass}
                                value={approvalData.gasStationId}
                                onChange={(e) => setApprovalData({...approvalData, gasStationId: e.target.value})}
                             >
                                 <option value="">Selecione...</option>
                                 {stations.map(s => <option key={s.id} value={s.id}>{s.name} - {s.municipality}</option>)}
                             </select>
                        </div>
                        
                        <div className="mb-4">
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                Qtd. Abastecida (Litros) <span className="text-red-500">*</span>
                             </label>
                             <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.1"
                                    className={`${inputClass} font-bold text-lg text-green-700`}
                                    placeholder="0.0"
                                    value={approvalData.confirmedLiters || ''}
                                    onChange={(e) => setApprovalData({...approvalData, confirmedLiters: Number(e.target.value)})}
                                />
                                <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold">L</span>
                             </div>
                             {selectedRequisition.isFullTank && (
                                <p className="text-xs text-blue-600 mt-1 font-medium">
                                    ⚠️ Requisição de "Tanque Cheio". Informe a quantidade exata conforme nota.
                                </p>
                             )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Requisição Posto (Opcional)</label>
                                <input 
                                    type="text" 
                                    className={inputClass}
                                    placeholder="Talão"
                                    value={approvalData.externalId}
                                    onChange={(e) => setApprovalData({...approvalData, externalId: e.target.value.toUpperCase()})}
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nota Fiscal (Opcional)</label>
                                <input 
                                    type="text" 
                                    className={inputClass}
                                    placeholder="Nº da Nota"
                                    value={approvalData.invoiceNumber}
                                    onChange={(e) => setApprovalData({...approvalData, invoiceNumber: e.target.value.toUpperCase()})}
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contrato (Alocação) <span className="text-red-500">*</span></label>
                             <select 
                                className={inputClass}
                                value={approvalData.selectedContract}
                                onChange={(e) => setApprovalData({...approvalData, selectedContract: e.target.value})}
                             >
                                 <option value="">Selecione...</option>
                                 {Object.values(ContractType).map(ct => (
                                     <option key={ct} value={ct}>{ct}</option>
                                 ))}
                                 <option value="EXTERNO">EXTERNO</option>
                             </select>
                             <p className="text-[10px] text-slate-400 mt-1">Confirme o contrato para o lançamento financeiro.</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleApprove}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2"
                            >
                                <ThumbsUp size={18} /> Confirmar Aprovação
                            </button>
                            <button 
                                type="button"
                                onClick={handleReject}
                                className="w-full bg-red-100 hover:bg-red-200 text-red-600 py-2 rounded-lg font-bold flex justify-center items-center gap-2 border border-red-200"
                            >
                                <ThumbsDown size={18} /> Recusar
                            </button>
                            <button 
                                onClick={() => setShowApprovalModal(false)}
                                className="w-full text-slate-500 py-2 font-medium"
                            >
                                Fechar sem Salvar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Requisitions;
