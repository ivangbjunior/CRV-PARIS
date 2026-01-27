import React, { useState, useEffect, useMemo } from 'react';
import Vehicles from './components/Vehicles';
import DailyLogs from './components/DailyLogs';
import Reports from './components/Reports';
import FuelManagement from './components/FuelManagement';
import Requisitions from './components/Requisitions';
import ConsolidatedReports from './components/ConsolidatedReports';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';
import { LayoutDashboard, Truck, FileSpreadsheet, Menu, X, Home, ChevronRight, Fuel, LogOut, UserCircle, ShieldCheck, AlertTriangle, DollarSign, FileText, Bell, Gauge, Clock, WifiOff, CheckCircle2, Loader2, Activity, CalendarDays, MapPin, Zap, TrendingUp, TrendingDown, Trophy, Droplet, Clock3, ArrowRightLeft, Users, BarChart3 } from 'lucide-react';
import { UserRole, DailyLog, Vehicle, RefuelingLog, RequisitionStatus } from './types';
import { storageService } from './services/storage';
import { calculateDuration, formatMinutesToTime } from './utils/timeUtils';
import { ParisLogo } from './components/ParisLogo';
import SelectWithSearch from './components/SelectWithSearch';

enum Tab {
  HOME = 'home',
  LOGS = 'logs',
  VEHICLES = 'vehicles',
  REPORTS = 'reports',
  FUEL = 'fuel',
  REQUISITIONS = 'requisitions',
  ANALYTICS = 'analytics'
}

// --- Dashboard Rankings Component ---
const DashboardRankings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'KM' | 'FUEL' | 'SPEED'>('KM');
  const [loading, setLoading] = useState(true);
  const [selectedForeman, setSelectedForeman] = useState<string>('');
  const [uniqueForemen, setUniqueForemen] = useState<string[]>([]);
  
  const [rankings, setRankings] = useState({
    km: [] as { id: string; value: number; plate: string; municipality: string; driver: string }[],
    fuel: [] as { id: string; value: number; plate: string; municipality: string; driver: string }[],
    speed: [] as { id: string; value: number; plate: string; municipality: string; driver: string }[]
  });
  const [financials, setFinancials] = useState({
    currentMonthCost: 0,
    currentMonthLiters: 0,
    lastMonthCost: 0,
    diffPercent: 0,
    isIncrease: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logs, refuelings, vehicles] = await Promise.all([
        storageService.getLogs(),
        storageService.getRefuelings(),
        storageService.getVehicles()
      ]);

      const foremen = Array.from(new Set(vehicles.map(v => v.foreman).filter(f => f && f !== '-'))).sort();
      setUniqueForemen(foremen);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const currentDay = now.getDate();

      const isVehicleInSelectedTeam = (vId: string) => {
        if (!selectedForeman) return true;
        const v = vehicles.find(veh => veh.id === vId);
        return v?.foreman === selectedForeman;
      };

      let currentCost = 0;
      let currentLiters = 0;
      let lastCost = 0;

      refuelings.forEach(r => {
        if (!isVehicleInSelectedTeam(r.vehicleId)) return;

        const rDate = new Date(r.date + 'T12:00:00'); 
        const rMonth = rDate.getMonth();
        const rYear = rDate.getFullYear();
        const rDay = rDate.getDate();

        if (rYear === currentYear && rMonth === currentMonth) {
          currentCost += (r.totalCost || 0);
          currentLiters += (r.liters || 0);
        }

        const lastMonthDate = new Date();
        lastMonthDate.setMonth(now.getMonth() - 1);
        
        if (rYear === lastMonthDate.getFullYear() && rMonth === lastMonthDate.getMonth() && rDay <= currentDay) {
          lastCost += (r.totalCost || 0);
        }
      });

      let diff = 0;
      if (lastCost > 0) {
          diff = ((currentCost - lastCost) / lastCost) * 100;
      } else if (currentCost > 0) {
          diff = 100;
      }

      setFinancials({
        currentMonthCost: currentCost,
        currentMonthLiters: currentLiters,
        lastMonthCost: lastCost,
        diffPercent: Math.abs(diff),
        isIncrease: diff >= 0
      });

      const kmMap: Record<string, number> = {};
      const fuelMap: Record<string, number> = {};
      const speedMap: Record<string, number> = {};

      const getVDetails = (id: string) => {
           const v = vehicles.find(v => v.id === id);
           return v ? { 
             plate: v.plate, 
             municipality: v.municipality, 
             driver: v.driverName 
           } : { 
             plate: '?', 
             municipality: '?', 
             driver: '?' 
           };
      };

      logs.forEach(log => {
        const lDate = new Date(log.date + 'T12:00:00');
        if (lDate.getMonth() === currentMonth && lDate.getFullYear() === currentYear) {
           kmMap[log.vehicleId] = (kmMap[log.vehicleId] || 0) + (log.kmDriven || 0);
           if (log.maxSpeed > 90) {
              const count = log.speedingCount > 0 ? log.speedingCount : 1;
              speedMap[log.vehicleId] = (speedMap[log.vehicleId] || 0) + count;
           }
        }
      });

      refuelings.forEach(ref => {
        const rDate = new Date(ref.date + 'T12:00:00');
        if (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear) {
           fuelMap[ref.vehicleId] = (fuelMap[ref.vehicleId] || 0) + ref.liters;
        }
      });

      const sortAndMap = (map: Record<string, number>) => {
         return Object.entries(map)
           .sort(([, a], [, b]) => b - a)
           .slice(0, 3)
           .map(([id, val]) => ({ id, ...getVDetails(id), value: val }));
      };

      setRankings({
         km: sortAndMap(kmMap),
         fuel: sortAndMap(fuelMap),
         speed: sortAndMap(speedMap)
      });

    } catch (error) {
      console.error("Error loading dashboard metrics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedForeman]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getCardStyle = () => {
    switch(activeTab) {
        case 'FUEL': return 'bg-orange-50 border-orange-200';
        case 'SPEED': return 'bg-red-50 border-red-200';
        default: return 'bg-blue-50 border-blue-200';
    }
  };

  const foremanOptions = [
    { value: '', label: 'TODAS AS EQUIPES' },
    ...uniqueForemen.map(f => ({ value: f, label: f }))
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-stretch">
      <div className="flex flex-col gap-2">
        <div className="w-[220px] relative z-[110]">
          <SelectWithSearch 
            label="EQUIPE (FILTRO)"
            options={foremanOptions}
            value={selectedForeman}
            onChange={setSelectedForeman}
            placeholder="TODAS..."
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 min-w-[200px] w-[220px] flex flex-col justify-between h-[290px] shadow-sm hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <div className="p-1.5 bg-white rounded-lg shadow-sm text-blue-600">
                <Fuel size={14} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Abastecimento</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-2">
              <div>
                <div className="text-3xl font-black text-blue-900 tracking-tight leading-none">
                  {formatCurrency(financials.currentMonthCost)}
                </div>
                <p className="text-[9px] font-bold text-blue-400 uppercase mt-0.5">Valor Acumulado</p>
              </div>
              
              <div className="bg-white/40 border border-blue-100 rounded-lg p-2 flex items-center gap-2">
                 <Droplet size={14} className="text-blue-500" />
                 <div>
                    <span className="text-sm font-black text-blue-800">{financials.currentMonthLiters.toFixed(1)} L</span>
                    <p className="text-[8px] font-bold text-blue-400 uppercase leading-none">Volume Total</p>
                 </div>
              </div>
            </div>
            
            <div className="mt-auto pt-3 border-t border-blue-200/60">
              <span className="text-[9px] font-bold text-blue-800/60 uppercase tracking-widest block mb-1">Mês Ant. (Período)</span>
              <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-blue-900">{formatCurrency(financials.lastMonthCost)}</span>
                  <div className={`flex items-center gap-0.5 text-[10px] font-bold ${financials.isIncrease ? 'text-red-600' : 'text-emerald-600'}`}>
                        {financials.isIncrease ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        <span>{financials.diffPercent.toFixed(0)}%</span>
                  </div>
              </div>
            </div>
        </div>
      </div>

      <div className="flex flex-col justify-end">
        <div className={`rounded-xl shadow-md border overflow-hidden w-full sm:w-[400px] flex flex-col h-[290px] transition-all duration-300 ${getCardStyle()}`}>
            <div className="flex border-b border-slate-200/60 bg-white/70 backdrop-blur-sm">
              <button 
                  onClick={() => setActiveTab('KM')}
                  className={`flex-1 py-2.5 flex justify-center items-center gap-2 transition-all ${activeTab === 'KM' ? 'bg-blue-600 text-white shadow-inner' : 'text-slate-400 hover:bg-white/50'}`}
                  title="Rodagem (KM)"
              >
                  <Gauge size={16} />
                  <span className="text-[10px] font-black uppercase hidden sm:inline">KM</span>
              </button>
              <button 
                  onClick={() => setActiveTab('FUEL')}
                  className={`flex-1 py-2.5 flex justify-center items-center gap-2 transition-all ${activeTab === 'FUEL' ? 'bg-orange-600 text-white shadow-inner' : 'text-slate-400 hover:bg-white/50'}`}
                  title="Consumo (Litros)"
              >
                  <Droplet size={16} />
                  <span className="text-[10px] font-black uppercase hidden sm:inline">Consumo</span>
              </button>
              <button 
                  onClick={() => setActiveTab('SPEED')}
                  className={`flex-1 py-2.5 flex justify-center items-center gap-2 transition-all ${activeTab === 'SPEED' ? 'bg-red-600 text-white shadow-inner' : 'text-slate-400 hover:bg-white/50'}`}
                  title="Infrações"
              >
                  <AlertTriangle size={16} />
                  <span className="text-[10px] font-black uppercase hidden sm:inline">Veloc.</span>
              </button>
            </div>

            <div className="p-3 flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                      {activeTab === 'KM' ? 'Top 3 Rodagem (Mensal)' : 
                      activeTab === 'FUEL' ? 'Top 3 Consumo (Mensal)' : 
                      'Top 3 Infrações (Mensal)'}
                  </span>
                  <Trophy size={12} className={activeTab === 'FUEL' ? "text-orange-500" : activeTab === 'SPEED' ? "text-red-500" : "text-blue-500"} />
              </div>
              
              <div className="space-y-1.5">
                  {(() => {
                    const list = activeTab === 'KM' ? rankings.km : activeTab === 'FUEL' ? rankings.fuel : rankings.speed;
                    
                    if (list.length === 0) return (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Activity size={32} className="opacity-20 mb-2" />
                        <span className="text-[10px] italic">Sem registros no mês.</span>
                      </div>
                    );

                    return list.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white/40 p-2 rounded-lg border border-white/60 shadow-sm transition-transform hover:scale-[1.01]">
                            <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-black text-base shadow-sm border-2 ${
                                activeTab === 'FUEL' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                activeTab === 'SPEED' ? 'bg-red-50 text-red-700 border-red-100' : 
                                'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {idx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-slate-900 text-[13px] tracking-tight truncate" title={item.plate}>
                                    {item.plate}
                                  </span>
                                  <span className={`font-mono font-black px-2 py-0.5 rounded text-sm shadow-sm ${
                                      activeTab === 'FUEL' ? 'text-orange-700 bg-orange-100/50' : 
                                      activeTab === 'SPEED' ? 'text-red-700 bg-red-100/50' : 
                                      'text-blue-700 bg-blue-100/50'
                                  }`}>
                                      {activeTab === 'KM' ? `${item.value.toLocaleString()} km` : 
                                      activeTab === 'FUEL' ? `${item.value.toFixed(0)} L` : 
                                      `${item.value}x`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase truncate" title={item.driver}>
                                      {item.driver || '?'}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-[9px] font-medium text-slate-400 truncate" title={item.municipality}>
                                      {item.municipality}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ));
                  })()}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Home Menu Component ---
interface HomeMenuProps {
  onNavigate: (tab: Tab) => void;
  role: UserRole;
  userName: string;
}

interface AlertItem {
  id: string;
  type: 'SPEEDING' | 'EXTRA_TIME' | 'NO_SIGNAL' | 'PENDING_PAYMENT' | 'LATE_APPROVAL' | 'MISSING_LOG' | 'MOVEMENT';
  date: string;
  title: string;
  details: React.ReactNode;
  severity: 'high' | 'medium' | 'low';
}

const HomeMenu: React.FC<HomeMenuProps> = ({ onNavigate, role, userName }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [viewedAlertsCount, setViewedAlertsCount] = useState(0);

  const showLogs = (role === UserRole.ADMIN || role === UserRole.GESTOR || role === UserRole.OPERADOR);
  const showVehicles = role !== UserRole.ENCARREGADO;
  const showFuel = role === UserRole.ADMIN || role === UserRole.GESTOR || role === UserRole.FINANCEIRO || role === UserRole.GERENCIA;
  const showRecords = role === UserRole.ADMIN || role === UserRole.GESTOR || role === UserRole.RH || role === UserRole.OPERADOR || role === UserRole.GERENCIA;
  const showRequisitions = role === UserRole.ADMIN || role === UserRole.GESTOR || role === UserRole.FINANCEIRO || role === UserRole.GERENCIA || role === UserRole.ENCARREGADO;
  const showAnalytics = role === UserRole.ADMIN || role === UserRole.GERENCIA || role === UserRole.FINANCEIRO;

  const canSeeNotifications = true; 
  const canSeeDashboard = role === UserRole.ADMIN || role === UserRole.GERENCIA;

  useEffect(() => {
    fetchAlerts();
  }, [role]);

  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const generatedAlerts: AlertItem[] = [];
      const cutOffDate = new Date();
      cutOffDate.setDate(cutOffDate.getDate() - 5); 
      const cutOffStr = cutOffDate.toISOString().split('T')[0];

      if (role === UserRole.ADMIN || role === UserRole.GESTOR || role === UserRole.GERENCIA || role === UserRole.OPERADOR || role === UserRole.RH) {
         const [logs, vehicles] = await Promise.all([
            storageService.getLogs(),
            storageService.getVehicles()
         ]);
         
         const recentLogs = logs.filter(l => l.date >= cutOffStr).sort((a,b) => b.date.localeCompare(a.date));

         recentLogs.forEach(log => {
             const v = vehicles.find(vh => vh.id === log.vehicleId);
             const plate = log.historicalPlate || v?.plate || '???';
             const driver = log.historicalDriver || v?.driverName || '???';

             if (Number(log.maxSpeed) > 90) {
                 generatedAlerts.push({
                     id: `speed-${log.id}`, type: 'SPEEDING', date: log.date, severity: 'high',
                     title: `Excesso: ${log.maxSpeed} km/h`,
                     details: <span className="text-xs text-slate-600">{plate} - {driver} ({log.speedingCount}x)</span>
                 });
             }
         });
         
         const vehicleLogs: Record<string, DailyLog[]> = {};
         logs.forEach(log => {
            if (!vehicleLogs[log.vehicleId]) vehicleLogs[log.vehicleId] = [];
            vehicleLogs[log.vehicleId].push(log);
         });
         
         if (role === UserRole.ADMIN || role === UserRole.GERENCIA || role === UserRole.RH) {
             const normalize = (s?: string) => s ? s.trim().toUpperCase() : '';

             Object.keys(vehicleLogs).forEach(vId => {
                 const vLogs = vehicleLogs[vId].sort((a, b) => b.date.localeCompare(a.date));
                 
                 for(let i = 0; i < vLogs.length - 1; i++) {
                     const currentLog = vLogs[i];
                     if (currentLog.date < cutOffStr) break;

                     const previousLog = vLogs[i+1];
                     const changes: string[] = [];
                     
                     if (normalize(currentLog.historicalDriver) !== normalize(previousLog.historicalDriver)) changes.push('Motorista');
                     if (normalize(currentLog.historicalMunicipality) !== normalize(previousLog.historicalMunicipality)) changes.push('Município');
                     if (normalize(currentLog.historicalContract) !== normalize(previousLog.historicalContract)) changes.push('Contrato');

                     if (changes.length > 0) {
                         const v = vehicles.find(vh => vh.id === vId);
                         generatedAlerts.push({
                             id: `move-${currentLog.id}`, 
                             type: 'MOVEMENT', 
                             date: currentLog.date, 
                             severity: 'medium',
                             title: 'Movimentação de Frota',
                             details: (
                                 <div className="flex flex-col gap-1">
                                     <span className="text-xs font-bold text-slate-700">{v?.plate || currentLog.historicalPlate}</span>
                                     <span className="text-xs text-slate-500">Alterado: {changes.join(', ')}</span>
                                 </div>
                             )
                         });
                     }
                 }
             });
         }

         Object.keys(vehicleLogs).forEach(vId => {
             const vLogs = vehicleLogs[vId].sort((a, b) => b.date.localeCompare(a.date));
             let consecutive = 0;
             for (const l of vLogs) {
                 if (l.nonOperatingReason === 'SEM SINAL') consecutive++;
                 else break;
             }
             if (consecutive > 2) {
                 const v = vehicles.find(vh => vh.id === vId);
                 generatedAlerts.push({
                     id: `nosignal-${vId}`, type: 'NO_SIGNAL', date: vLogs[0].date, severity: 'high',
                     title: `Sem Sinal (${consecutive} dias)`,
                     details: <span className="text-xs text-slate-600">{v?.plate} - {v?.municipality}</span>
                 });
             }
         });

         if (role === UserRole.OPERADOR || role === UserRole.ADMIN) {
             const yesterday = new Date();
             yesterday.setDate(yesterday.getDate() - 1);
             const yStr = yesterday.toLocaleDateString('pt-BR').split('/').reverse().join('-'); 
             const activeVehicles = vehicles.filter(v => v.status !== 'INATIVO');
             
             activeVehicles.forEach(v => {
                 const hasLogYesterday = logs.some(l => l.vehicleId === v.id && l.date === yStr);
                 if (!hasLogYesterday) {
                     generatedAlerts.push({
                         id: `missing-${v.id}-${yStr}`, type: 'MISSING_LOG', date: yStr, severity: 'medium',
                         title: 'Diário Pendente (Ontem)',
                         details: <span className="text-xs text-slate-600">Veículo <b>{v.plate}</b> sem registro em {yStr}.</span>
                     });
                 }
             });
         }
      }

      if (role === UserRole.FINANCEIRO || role === UserRole.ADMIN || role === UserRole.GERENCIA) {
          const [refuelings, requisitions] = await Promise.all([
             storageService.getRefuelings(),
             storageService.getRequisitions()
          ]);

          const pendingRefuelings = refuelings.filter(r => r.totalCost === 0 && r.date >= cutOffStr);
          pendingRefuelings.forEach(r => {
               generatedAlerts.push({
                   id: `fuel-pend-${r.id}`, type: 'PENDING_PAYMENT', date: r.date, severity: 'high',
                   title: 'Pendência em Abastecimento',
                   details: <span className="text-xs text-slate-600">Placa {r.plateSnapshot}: Valor R$ 0,00 registrado (Falta NF ou Valor).</span>
               });
          });

          const pendingReqs = requisitions.filter(r => r.status === RequisitionStatus.PENDING);
          const msPerDay = 24 * 60 * 60 * 1000;
          const now = new Date();
          
          pendingReqs.forEach(r => {
               const reqDateTimeStr = r.requestTime ? `${r.date}T${r.requestTime}:00` : `${r.date}T00:00:00`;
               const reqTime = new Date(reqDateTimeStr).getTime();
               const diff = now.getTime() - reqTime;
               if (diff > msPerDay) {
                   generatedAlerts.push({
                       id: `req-late-${r.id}`, type: 'LATE_APPROVAL', date: r.date, severity: 'high',
                       title: 'Análise Pendente > 24h',
                       details: <span className="text-xs text-slate-600">Req #{r.internalId} de {r.requesterName} aguarda análise há mais de 1 dia.</span>
                   });
               }
          });
      }

      generatedAlerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAlerts(generatedAlerts);

    } catch (error) {
      console.error("Error fetching alerts", error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true);
    setViewedAlertsCount(alerts.length);
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };

  const getAlertIcon = (type: string) => {
      switch(type) {
          case 'SPEEDING': return <Gauge size={18} />;
          case 'NO_SIGNAL': return <WifiOff size={18} />;
          case 'EXTRA_TIME': return <Clock size={18} />;
          case 'PENDING_PAYMENT': return <DollarSign size={18} />;
          case 'LATE_APPROVAL': return <Clock3 size={18} />;
          case 'MISSING_LOG': return <FileText size={18} />;
          case 'MOVEMENT': return <ArrowRightLeft size={18} />;
          default: return <AlertTriangle size={18} />;
      }
  };

  const getAlertColor = (type: string) => {
      switch(type) {
          case 'SPEEDING': return 'bg-red-100 text-red-700 border-red-200';
          case 'NO_SIGNAL': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'EXTRA_TIME': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'PENDING_PAYMENT': return 'bg-rose-100 text-rose-700 border-rose-200';
          case 'LATE_APPROVAL': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'MISSING_LOG': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'MOVEMENT': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  const hasNewNotifications = alerts.length > viewedAlertsCount;

  return (
    <div className="relative min-h-full w-full p-6 lg:p-8 font-sans flex flex-col print:p-0 print:block">
      <div className="fixed inset-0 pointer-events-none z-0 h-screen w-screen overflow-hidden bg-slate-50 print:hidden">
          <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-blue-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-20 w-[800px] h-[800px] bg-slate-200/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
          <div className="absolute inset-0 opacity-[0.4]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E")`}}></div>
      </div>

      {isNotificationsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end print:hidden">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsNotificationsOpen(false)}></div>
              <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                      <div className="flex items-center gap-3">
                          <Bell size={20} className="text-indigo-600" />
                          <div>
                              <h3 className="font-bold text-slate-800">Central de Alertas</h3>
                              <p className="text-xs text-slate-500">Últimos 5 dias</p>
                          </div>
                      </div>
                      <button onClick={() => setIsNotificationsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                        {loadingAlerts ? (
                           <div className="py-12 text-center flex flex-col items-center gap-3">
                              <Loader2 className="animate-spin text-blue-500" size={24} />
                              <span className="text-xs font-medium text-slate-400">Atualizando...</span>
                           </div>
                        ) : alerts.length === 0 ? (
                           <div className="py-20 px-4 text-center flex flex-col items-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm"><ShieldCheck size={32} className="text-emerald-500" /></div>
                              <div><p className="text-slate-800 font-bold">Tudo Tranquilo!</p><p className="text-slate-500 text-sm mt-1">Nenhuma ocorrência pendente.</p></div>
                           </div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.type === 'SPEEDING' || alert.type === 'PENDING_PAYMENT' || alert.type === 'LATE_APPROVAL' ? 'bg-red-500' : alert.type === 'NO_SIGNAL' || alert.type === 'MISSING_LOG' ? 'bg-orange-500' : alert.type === 'MOVEMENT' ? 'bg-indigo-500' : 'bg-blue-500'}`}></div>
                                    <div className="pl-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold border ${getAlertColor(alert.type)}`}>
                                                {getAlertIcon(alert.type)}<span>{alert.title}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{formatDate(alert.date)}</span>
                                        </div>
                                        <div className="text-sm">{alert.details}</div>
                                    </div>
                                </div>
                            ))
                        )}
                  </div>
              </div>
          </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 print:max-w-none print:w-full">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 animate-in slide-in-from-top-4 duration-700 print:hidden">
            <div className="flex items-start gap-4">
                {canSeeNotifications && (
                    <button onClick={handleOpenNotifications} className={`relative p-3 rounded-2xl transition-all group mt-1 border flex-shrink-0 ${hasNewNotifications ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-500 hover:text-indigo-600 hover:border-indigo-100 shadow-sm'}`}>
                        <Bell size={24} className={hasNewNotifications ? "animate-[swing_1s_ease-in-out_infinite]" : ""} />
                        {hasNewNotifications && (
                            <span className="absolute top-2.5 right-3 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span></span>
                        )}
                    </button>
                )}
                <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-1"><CalendarDays size={14} /><span className="text-xl font-bold uppercase tracking-wide text-blue-900">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Olá, <span className="text-indigo-600">{userName}</span></h1>
                    <p className="text-slate-500 text-base mt-1 font-medium">Bem-vindo ao seu painel.</p>
                </div>
            </div>
            {canSeeDashboard && <div className="w-full lg:w-auto self-end lg:self-center"><DashboardRankings /></div>}
        </div>

        <div className="w-full animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-200 print:animate-none">
            <div className="mb-4 flex items-center gap-3 print:hidden">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                <div className="flex items-center gap-2 text-slate-400 bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20 shadow-sm"><Zap size={14} className="text-yellow-500" fill="currentColor" /><h2 className="text-[10px] font-bold uppercase tracking-widest">Acesso Rápido</h2></div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8 print:hidden">
                {showLogs && <HomeCard icon={LayoutDashboard} title="Diário de Bordo" subtitle="Lançar atividades" theme="blue" onClick={() => onNavigate(Tab.LOGS)} />}
                {showVehicles && <HomeCard icon={Truck} title="Minha Frota" subtitle="Veículos e condutores" theme="indigo" onClick={() => onNavigate(Tab.VEHICLES)} />}
                {showRecords && <HomeCard icon={FileSpreadsheet} title="Registros" subtitle="Histórico de atividades" theme="emerald" onClick={() => onNavigate(Tab.REPORTS)} />}
                {showAnalytics && <HomeCard icon={BarChart3} title="Relatórios" subtitle="Consolidado e Performance" theme="rose" onClick={() => onNavigate(Tab.ANALYTICS)} />}
                {showFuel && <HomeCard icon={Fuel} title="Abastecimento" subtitle="Controle de postos" theme="blue" onClick={() => onNavigate(Tab.FUEL)} />}
                {showRequisitions && <HomeCard icon={FileText} title="Requisições" subtitle="Solicitar combustível" theme="orange" onClick={() => onNavigate(Tab.REQUISITIONS)} highlight />}
            </div>
        </div>
      </div>
    </div>
  );
}

interface HomeCardProps { icon: React.ElementType; title: string; subtitle: string; theme: 'blue' | 'indigo' | 'orange' | 'emerald' | 'rose'; onClick: () => void; highlight?: boolean; }
const HomeCard: React.FC<HomeCardProps> = ({ icon: Icon, title, subtitle, theme, onClick }) => {
  const themes = {
    blue: { gradient: "from-blue-500 to-blue-600", bgLight: "bg-blue-50", text: "text-blue-900", border: "border-blue-100 hover:border-blue-300", shadow: "shadow-blue-500/20" },
    indigo: { gradient: "from-indigo-500 to-indigo-600", bgLight: "bg-indigo-50", text: "text-indigo-900", border: "border-indigo-100 hover:border-indigo-300", shadow: "shadow-indigo-500/20" },
    orange: { gradient: "from-orange-500 to-orange-600", bgLight: "bg-orange-50", text: "text-orange-900", border: "border-orange-100 hover:border-orange-300", shadow: "shadow-orange-500/20" },
    emerald: { gradient: "from-emerald-500 to-emerald-600", bgLight: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-100 hover:border-emerald-300", shadow: "shadow-emerald-500/20" },
    rose: { gradient: "from-rose-500 to-rose-600", bgLight: "bg-rose-50", text: "text-rose-900", border: "border-rose-100 hover:border-rose-300", shadow: "shadow-rose-500/20" },
  };
  const t = themes[theme];
  return (
    <button onClick={onClick} className={`group relative bg-white overflow-hidden rounded-2xl border transition-all duration-500 text-left h-[200px] hover:-translate-y-2 hover:shadow-xl ${t.border} ${t.shadow}`}>
      <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${t.gradient} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-500`}></div>
      <Icon className={`absolute -right-6 -bottom-6 text-slate-100 transform -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0 opacity-50`} size={130} strokeWidth={1} />
      <div className="absolute inset-0 p-5 flex flex-col justify-between h-full z-10">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br ${t.gradient} text-white transform group-hover:scale-110 transition-transform duration-300`}><Icon size={28} strokeWidth={1.5} /></div>
          <div className="w-full relative">
             <div className="flex justify-between items-end">
                <div><h3 className={`text-xl font-bold ${t.text} mb-0.5 tracking-tight`}>{title}</h3><p className="text-xs text-slate-500 font-medium leading-snug">{subtitle}</p></div>
                <div className={`p-2 rounded-full bg-white text-slate-300 border border-slate-100 shadow-sm group-hover:text-white group-hover:bg-gradient-to-r ${t.gradient} transition-all duration-300`}><ChevronRight size={18} /></div>
             </div>
          </div>
      </div>
    </button>
  );
};

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => { if (user) setActiveTab(Tab.HOME); }, [user]);
  useEffect(() => { let timer: ReturnType<typeof setTimeout>; if (loading) { timer = setTimeout(() => setShowReset(true), 5000); } else { setShowReset(false); } return () => clearTimeout(timer); }, [loading]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 bg-white p-8 rounded-xl shadow-lg border border-slate-100 max-w-sm w-full">
         <div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div><p className="text-slate-500 font-medium animate-pulse text-center">Carregando sistema...</p></div>
         {showReset && <div className="w-full animate-in fade-in slide-in-from-top-2"><div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-800 flex items-start gap-2"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /><p>O sistema está demorando para responder. Se travou, tente reiniciar sua sessão.</p></div><button onClick={signOut} className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors">Reiniciar / Sair</button></div>}
      </div>
    </div>
  );

  if (!user) return <Login />;

  const isFinanceiro = user.role === UserRole.FINANCEIRO;
  const isOperador = user.role === UserRole.OPERADOR;
  const isRH = user.role === UserRole.RH;
  const isGerencia = user.role === UserRole.GERENCIA;
  const isEncarregado = user.role === UserRole.ENCARREGADO;
  const isGestorOrAdmin = user.role === UserRole.ADMIN || user.role === UserRole.GESTOR;
  const isAdmin = user.role === UserRole.ADMIN;

  const canAccessLogs = (isGestorOrAdmin || isOperador) && !isGerencia;
  const canAccessVehicles = !isEncarregado; 
  const canAccessFuel = isGestorOrAdmin || isFinanceiro || isGerencia;
  const canAccessReports = isGestorOrAdmin || isRH || isOperador || isGerencia;
  const canAccessAnalytics = isAdmin || isGerencia || isFinanceiro;
  const canAccessRequisitions = isGestorOrAdmin || isFinanceiro || isGerencia || isEncarregado;

  const getUserName = () => (user.name || user.email.split('@')[0]).replace(/\./g, ' ').split(' ')[0].toUpperCase();

  const renderContent = () => {
    switch (activeTab) {
      case Tab.HOME: return <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} userName={getUserName()} />;
      case Tab.VEHICLES: return canAccessVehicles ? <Vehicles /> : <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} userName={getUserName()} />;
      case Tab.LOGS: return canAccessLogs ? <DailyLogs /> : <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} userName={getUserName()} />;
      case Tab.REPORTS: return canAccessReports ? <Reports /> : <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} userName={getUserName()} />;
      case Tab.FUEL: return canAccessFuel ? <FuelManagement /> : <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} userName={getUserName()} />;
      case Tab.REQUISITIONS: return canAccessRequisitions ? <Requisitions /> : <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} userName={getUserName()} />;
      case Tab.ANALYTICS: return canAccessAnalytics ? <ConsolidatedReports /> : <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} userName={getUserName()} />;
      default: return <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} userName={getUserName()} />;
    }
  };

  const NavItem = ({ tab, label, icon: Icon }: { tab: Tab; label: string; icon: any }) => (
    <button onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }} className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all w-full mb-1 relative overflow-hidden ${activeTab === tab ? 'bg-blue-600/10 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
      {activeTab === tab && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full"></div>}
      <Icon size={20} className={`transition-colors relative z-10 ${activeTab === tab ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
      <span className={`font-medium relative z-10 tracking-wide ${activeTab === tab ? 'font-bold' : ''}`}>{label}</span>
      {activeTab === tab && <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent pointer-events-none"></div>}
    </button>
  );

  const getRoleBadge = (role: UserRole) => {
    switch(role) {
      case UserRole.ADMIN: return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case UserRole.GESTOR: return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case UserRole.FINANCEIRO: return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case UserRole.RH: return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case UserRole.GERENCIA: return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case UserRole.ENCARREGADO: return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      default: return 'bg-slate-600 text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans print:block print:h-auto print:overflow-visible">
      <aside className="hidden md:flex print:hidden flex-col w-72 h-screen sticky top-0 shadow-2xl z-50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/50">
        <div className="p-4 flex justify-center cursor-pointer hover:bg-white/5 transition-colors border-b border-slate-800/50 relative overflow-hidden" onClick={() => setActiveTab(Tab.HOME)}>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
           <div className="relative z-10"><ParisLogo variant="light" size="normal" /></div>
        </div>
        <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar">
          <NavItem tab={Tab.HOME} label="Visão Geral" icon={Home} />
          <div className="my-6 flex items-center gap-3 px-2"><div className="h-px flex-1 bg-slate-800"></div><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Módulos</span><div className="h-px flex-1 bg-slate-800"></div></div>
          <div className="space-y-1">
            {canAccessLogs && <NavItem tab={Tab.LOGS} label="Diário de Bordo" icon={LayoutDashboard} />}
            {canAccessVehicles && <NavItem tab={Tab.VEHICLES} label="Gestão de Frota" icon={Truck} />}
            {canAccessReports && <NavItem tab={Tab.REPORTS} label="Registros" icon={FileSpreadsheet} />}
            {canAccessAnalytics && <NavItem tab={Tab.ANALYTICS} label="Relatórios" icon={BarChart3} />}
            {canAccessFuel && <NavItem tab={Tab.FUEL} label="Abastecimento" icon={Fuel} />}
            {canAccessRequisitions && <NavItem tab={Tab.REQUISITIONS} label="Requisições" icon={FileText} />}
          </div>
        </nav>
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 backdrop-blur-sm">
          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 shadow-inner">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-slate-600 shadow-sm"><UserCircle size={22} className="text-slate-300" /></div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-white truncate">{user.email.split('@')[0]}</p><div className="flex items-center gap-1.5 mt-1"><span className={`text-[9px] uppercase font-bold tracking-wider rounded px-1.5 py-0.5 ${getRoleBadge(user.role)}`}>{user.role}</span></div></div></div>
            <button onClick={signOut} className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 py-2 rounded-lg text-xs font-bold transition-all border border-slate-700 group"><LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> FINALIZAR SESSÃO</button>
          </div>
        </div>
      </aside>
      <header className="md:hidden print:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md border-b border-slate-800"><div onClick={() => setActiveTab(Tab.HOME)} className="cursor-pointer"><ParisLogo variant="light" size="normal" /></div><button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-slate-800 rounded-lg">{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button></header>
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900 z-30 pt-24 px-4 pb-8 animate-in slide-in-from-top-10 duration-200 flex flex-col h-full overflow-y-auto">
           <nav className="space-y-2">
             <NavItem tab={Tab.HOME} label="Menu Inicial" icon={Home} />
             <div className="my-4 border-t border-slate-800"></div>
             {canAccessLogs && <NavItem tab={Tab.LOGS} label="Lançamento Diário" icon={LayoutDashboard} />}
             {canAccessVehicles && <NavItem tab={Tab.VEHICLES} label="Gestão de Frota" icon={Truck} />}
             {canAccessReports && <NavItem tab={Tab.REPORTS} label="Registros" icon={FileSpreadsheet} />}
             {canAccessAnalytics && <NavItem tab={Tab.ANALYTICS} label="Relatórios" icon={BarChart3} />}
             {canAccessFuel && <NavItem tab={Tab.FUEL} label="Abastecimento" icon={Fuel} />}
             {canAccessRequisitions && <NavItem tab={Tab.REQUISITIONS} label="Requisições" icon={FileText} />}
           </nav>
           <div className="mt-auto pt-8 border-t border-slate-800"><div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700"><UserCircle size={24} className="text-slate-400" /></div><div><p className="text-white font-bold text-sm">{user.email}</p><p className="text-xs px-2 py-0.5 rounded w-fit mt-1 font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">{user.role}</p></div></div><button onClick={signOut} className="w-full bg-red-900/20 text-red-400 py-3 rounded-lg font-bold flex items-center justify-center gap-2 border border-red-900/30"><LogOut size={18} /> Finalizar Sessão</button></div>
        </div>
      )}
      <main className="flex-1 p-0 md:p-0 overflow-y-auto h-full relative print:p-0 print:overflow-visible print:h-auto"><div className="absolute inset-0 opacity-[0.015] pointer-events-none z-0 print:hidden" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div><div className="relative z-10 h-full flex flex-col print:h-auto print:block">{renderContent()}</div></main>
    </div>
  );
}

export default App;