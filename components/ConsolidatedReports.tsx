import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storage';
import { DailyLog, RefuelingLog, Vehicle, ContractType, GasStation, FUEL_TYPES_LIST } from '../types';
import { PrintHeader } from './PrintHeader';
import MultiSelect, { MultiSelectOption } from './MultiSelect';
import { BarChart3, Filter, Loader2, Printer, X, Search, Fuel, Gauge, TrendingUp, DollarSign, ArrowUpRight, ArrowUpDown, ChevronUp, ChevronDown, Building2, Truck, ClipboardList, ArrowLeft, Eye, Receipt, Calendar } from 'lucide-react';

interface ConsolidatedItem {
    plate: string;
    model: string;
    contract: string;
    foreman: string;
    kmTotal: number;
    minutesTotal: number;
    hoursTotal: string;
    litersTotal: number;
    costTotal: number;
    averageKmPerL: number;
}

interface StationConsolidated {
    stationId: string;
    name: string;
    municipality: string;
    count: number;
    liters: number;
    cost: number;
}

interface VehicleFuelConsolidated {
    plate: string;
    foreman: string;
    count: number;
    liters: number;
    cost: number;
}

type MainTab = 'PERFORMANCE' | 'FUEL_ANALYSIS';
type FuelSubTab = 'BY_STATION' | 'BY_VEHICLE';
type DetailMode = 'RECORDS' | 'BY_VEHICLE';

type SortKey = string;
type SortOrder = 'asc' | 'desc';

const ConsolidatedReports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<MainTab>('PERFORMANCE');
    const [fuelSubTab, setFuelSubTab] = useState<FuelSubTab>('BY_STATION');
    
    // Drill-down states
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
    const [detailViewMode, setDetailViewMode] = useState<DetailMode>('RECORDS');
    
    // Raw Data
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [refuelings, setRefuelings] = useState<RefuelingLog[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [stations, setStations] = useState<GasStation[]>([]);

    // Filter States
    const [filterContracts, setFilterContracts] = useState<string[]>([]);
    const [filterForeman, setFilterForeman] = useState<string[]>([]);
    const [uniqueForemen, setUniqueForemen] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({ 
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ 
        key: 'kmTotal', 
        order: 'desc' 
    });

    useEffect(() => {
        loadAllData();
    }, [dateRange.start, dateRange.end]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [lData, rData, vData, sData] = await Promise.all([
                storageService.getLogs(),
                storageService.getRefuelings(),
                storageService.getVehicles(),
                storageService.getGasStations()
            ]);

            setLogs(lData);
            setRefuelings(rData);
            setVehicles(vData);
            setStations(sData);
            setUniqueForemen(Array.from(new Set(vData.map(v => v.foreman).filter(f => f && f !== '-'))).sort());
        } catch (error) {
            console.error("Erro ao carregar dados consolidados:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- CALCULATIONS: PERFORMANCE TAB ---
    const performanceData = useMemo(() => {
        const periodLogs = logs.filter(l => l.date >= dateRange.start && l.date <= dateRange.end);
        const periodRefuelings = refuelings.filter(r => r.date >= dateRange.start && r.date <= dateRange.end);

        const plates = Array.from(new Set([
            ...vehicles.map(v => v.plate),
            ...periodLogs.map(l => l.historicalPlate || ''),
            ...periodRefuelings.map(r => r.plateSnapshot || '')
        ])).filter(p => p !== '');

        return plates.map(plate => {
            const vehicle = vehicles.find(v => v.plate === plate);
            const vLogs = periodLogs.filter(l => (l.historicalPlate || '') === plate || (vehicle && l.vehicleId === vehicle.id));
            const vRefuelings = periodRefuelings.filter(r => (r.plateSnapshot || '') === plate || (vehicle && r.vehicleId === vehicle.id));

            const kmTotal = vLogs.reduce((acc, log) => acc + (log.kmDriven || 0), 0);
            let totalMin = 0;
            vLogs.forEach(log => {
                if (log.startTime && log.endTime) {
                    const [sH, sM] = log.startTime.split(':').map(Number);
                    const [eH, eM] = log.endTime.split(':').map(Number);
                    totalMin += (eH * 60 + eM) - (sH * 60 + sM);
                }
            });

            const litersTotal = vRefuelings.reduce((acc, r) => acc + (r.liters || 0), 0);
            const costTotal = vRefuelings.reduce((acc, r) => acc + (r.totalCost || 0), 0);
            const averageKmPerL = litersTotal > 0 ? kmTotal / litersTotal : 0;

            return {
                plate,
                model: vehicle?.model || vLogs[0]?.historicalModel || '-',
                contract: vehicle?.contract || vLogs[0]?.historicalContract || '-',
                foreman: vehicle?.foreman || vLogs[0]?.historicalDriver || '-',
                kmTotal,
                minutesTotal: totalMin,
                hoursTotal: `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`,
                litersTotal,
                costTotal,
                averageKmPerL
            };
        }).filter(item => {
            const matchesContract = filterContracts.length === 0 || filterContracts.includes(item.contract);
            const matchesForeman = filterForeman.length === 0 || filterForeman.includes(item.foreman);
            return matchesContract && matchesForeman;
        }).sort((a: any, b: any) => {
            const aVal = a[sortConfig.key] || 0;
            const bVal = b[sortConfig.key] || 0;
            return sortConfig.order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
    }, [logs, refuelings, vehicles, dateRange, filterContracts, filterForeman, sortConfig, activeTab]);

    // --- CALCULATIONS: FUEL BY STATION ---
    const stationData = useMemo(() => {
        const periodRefuelings = refuelings.filter(r => 
            r.date >= dateRange.start && 
            r.date <= dateRange.end &&
            (filterContracts.length === 0 || filterContracts.includes(r.contractSnapshot))
        );
        const map: Record<string, StationConsolidated> = {};

        periodRefuelings.forEach(r => {
            const station = stations.find(s => s.id === r.gasStationId);
            const sId = r.gasStationId;
            if (!map[sId]) {
                map[sId] = {
                    stationId: sId,
                    name: station?.name || 'POSTO NÃO IDENTIFICADO',
                    municipality: station?.municipality || r.municipalitySnapshot || 'N/A',
                    count: 0,
                    liters: 0,
                    cost: 0
                };
            }
            map[sId].count += 1;
            map[sId].liters += (r.liters || 0);
            map[sId].cost += (r.totalCost || 0);
        });

        return Object.values(map).sort((a: any, b: any) => {
            const aVal = a[sortConfig.key] || 0;
            const bVal = b[sortConfig.key] || 0;
            return sortConfig.order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
    }, [refuelings, stations, dateRange, filterContracts, sortConfig, activeTab, fuelSubTab]);

    // --- CALCULATIONS: FUEL BY VEHICLE ---
    const vehicleFuelData = useMemo(() => {
        const periodRefuelings = refuelings.filter(r => 
            r.date >= dateRange.start && 
            r.date <= dateRange.end &&
            (filterContracts.length === 0 || filterContracts.includes(r.contractSnapshot))
        );
        const map: Record<string, VehicleFuelConsolidated> = {};

        periodRefuelings.forEach(r => {
            const plate = r.plateSnapshot;
            if (!map[plate]) {
                map[plate] = {
                    plate: plate,
                    foreman: r.foremanSnapshot || '-',
                    count: 0,
                    liters: 0,
                    cost: 0
                };
            }
            map[plate].count += 1;
            map[plate].liters += (r.liters || 0);
            map[plate].cost += (r.totalCost || 0);
        });

        return Object.values(map).filter(item => {
            const matchesForeman = filterForeman.length === 0 || filterForeman.includes(item.foreman);
            return matchesForeman;
        }).sort((a: any, b: any) => {
            const aVal = a[sortConfig.key] || 0;
            const bVal = b[sortConfig.key] || 0;
            return sortConfig.order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
    }, [refuelings, dateRange, filterContracts, filterForeman, sortConfig, activeTab, fuelSubTab]);

    // --- CALCULATIONS: STATION DETAIL DATA ---
    const stationDetailData = useMemo(() => {
        if (!selectedStationId) return { records: [], byVehicle: [] };

        const stationRefuelings = refuelings
            .filter(r => 
                r.gasStationId === selectedStationId && 
                r.date >= dateRange.start && 
                r.date <= dateRange.end &&
                (filterContracts.length === 0 || filterContracts.includes(r.contractSnapshot))
            )
            .sort((a, b) => b.date.localeCompare(a.date));

        const vehicleMap: Record<string, VehicleFuelConsolidated> = {};
        stationRefuelings.forEach(r => {
            const plate = r.plateSnapshot;
            if (!vehicleMap[plate]) {
                vehicleMap[plate] = {
                    plate,
                    foreman: r.foremanSnapshot || '-',
                    count: 0,
                    liters: 0,
                    cost: 0
                };
            }
            vehicleMap[plate].count += 1;
            vehicleMap[plate].liters += (r.liters || 0);
            vehicleMap[plate].cost += (r.totalCost || 0);
        });

        return {
            records: stationRefuelings,
            byVehicle: Object.values(vehicleMap).sort((a, b) => b.cost - a.cost)
        };
    }, [selectedStationId, refuelings, dateRange, filterContracts]);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc'
        }));
    };

    const totals = useMemo(() => {
        const dataToSum = activeTab === 'PERFORMANCE' ? performanceData : (fuelSubTab === 'BY_STATION' ? stationData : vehicleFuelData);
        return dataToSum.reduce((acc, curr: any) => ({
            km: acc.km + (curr.kmTotal || 0),
            liters: acc.liters + (curr.litersTotal || curr.liters || 0),
            cost: acc.cost + (curr.costTotal || curr.cost || 0)
        }), { km: 0, liters: 0, cost: 0 });
    }, [performanceData, stationData, vehicleFuelData, activeTab, fuelSubTab]);

    const contractOptions: MultiSelectOption[] = Object.values(ContractType).map(c => ({ value: c, label: c }));
    const foremanOptions: MultiSelectOption[] = uniqueForemen.map(f => ({ value: f, label: f }));

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const SortableHeader: React.FC<{ label: string; sortKey: string; align?: 'left' | 'right' | 'center' }> = ({ label, sortKey, align = 'left' }) => {
        const isActive = sortConfig.key === sortKey;
        return (
            <th 
                className={`px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors group ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
                onClick={() => handleSort(sortKey)}
            >
                <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{label}</span>
                    {isActive ? (
                        sortConfig.order === 'desc' ? <ChevronDown size={14} className="text-rose-600" /> : <ChevronUp size={14} className="text-rose-600" />
                    ) : (
                        <ArrowUpDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                </div>
            </th>
        );
    };

    const handleTabChange = (tab: MainTab) => {
        setActiveTab(tab);
        setSelectedStationId(null);
        if (tab === 'PERFORMANCE') setSortConfig({ key: 'kmTotal', order: 'desc' });
        else setSortConfig({ key: 'cost', order: 'desc' });
    };

    const currentStationName = stations.find(s => s.id === selectedStationId)?.name || 'Detalhamento do Posto';

    const dateInputClass = "w-full rounded-lg border border-slate-300 bg-white p-2 pr-10 text-sm text-slate-800 focus:ring-2 focus:ring-rose-100 outline-none transition-colors cursor-pointer";

    if (selectedStationId) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedStationId(null)}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors border border-slate-200 shadow-sm"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{currentStationName}</h2>
                            <p className="text-slate-500 text-sm">Conferência de abastecimentos no período de {dateRange.start} a {dateRange.end}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-200 p-1 rounded-lg">
                            <button 
                                onClick={() => setDetailViewMode('RECORDS')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${detailViewMode === 'RECORDS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <Receipt size={14} className="inline mr-1" /> Registros
                            </button>
                            <button 
                                onClick={() => setDetailViewMode('BY_VEHICLE')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${detailViewMode === 'BY_VEHICLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <Truck size={14} className="inline mr-1" /> Consolidado Veículo
                            </button>
                        </div>
                        <button onClick={() => window.print()} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                            <Printer size={18} /> Imprimir
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            {detailViewMode === 'RECORDS' ? (
                                <>
                                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] print:bg-slate-200 print:text-black">
                                        <tr>
                                            <th className="px-6 py-4">Data / Hora</th>
                                            <th className="px-6 py-4">Veículo</th>
                                            <th className="px-6 py-4">Produto</th>
                                            <th className="px-6 py-4 text-right">Lançado (L)</th>
                                            <th className="px-6 py-4 text-right">Preço Unit.</th>
                                            <th className="px-6 py-4 text-right">Valor (R$)</th>
                                            <th className="px-6 py-4">Nota Fiscal / Req.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {stationDetailData.records.length === 0 ? (
                                            <tr><td colSpan={7} className="py-20 text-center text-slate-400 italic">Nenhum registro encontrado.</td></tr>
                                        ) : (
                                            stationDetailData.records.map(r => (
                                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-900">
                                                        {r.date} <span className="text-[10px] text-slate-400 font-normal ml-1">{r.time}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-800">{r.plateSnapshot}</div>
                                                        <div className="text-[10px] text-slate-400 uppercase">{r.foremanSnapshot}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-black border-2 border-blue-100 px-2 py-0.5 rounded text-blue-700 bg-blue-50">{r.fuelType}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{r.liters.toFixed(2)} L</td>
                                                    <td className="px-6 py-4 text-right font-mono text-slate-500 font-medium text-xs">
                                                        {r.liters > 0 ? formatCurrency(r.totalCost / r.liters) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">{formatCurrency(r.totalCost)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-[10px] font-bold text-slate-500">NF: {r.invoiceNumber || '-'}</div>
                                                        <div className="text-[10px] text-slate-400">REQ: {r.requisitionNumber || '-'}</div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </>
                            ) : (
                                <>
                                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] print:bg-slate-200 print:text-black">
                                        <tr>
                                            <th className="px-6 py-4">Veículo / Placa</th>
                                            <th className="px-6 py-4 text-center">Abastecimentos</th>
                                            <th className="px-6 py-4 text-right">Volume Total (L)</th>
                                            <th className="px-6 py-4 text-right">Investimento Total (R$)</th>
                                            <th className="px-6 py-4 text-right">Média Valor (R$/Abast)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {stationDetailData.byVehicle.length === 0 ? (
                                            <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">Nenhum dado encontrado.</td></tr>
                                        ) : (
                                            stationDetailData.byVehicle.map(item => (
                                                <tr key={item.plate} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900">{item.plate}</div>
                                                        <div className="text-[10px] text-slate-400 uppercase">{item.foreman}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-600">{item.count}x</td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-blue-700">{item.liters.toFixed(2)} L</td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">{formatCurrency(item.cost)}</td>
                                                    <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs">
                                                        {formatCurrency(item.cost / item.count)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </>
                            )}
                            <tfoot className="bg-slate-900 text-white font-bold">
                                 <tr>
                                     <td colSpan={detailViewMode === 'RECORDS' ? 3 : 2} className="px-6 py-4 text-right uppercase text-xs tracking-widest">Totais Conferidos:</td>
                                     <td className="px-6 py-4 text-right font-mono">{stationDetailData.records.reduce((acc, r) => acc + r.liters, 0).toFixed(2)} L</td>
                                     {detailViewMode === 'RECORDS' && <td className="px-6 py-4"></td>}
                                     <td className="px-6 py-4 text-right font-mono">{formatCurrency(stationDetailData.records.reduce((acc, r) => acc + r.totalCost, 0))}</td>
                                     <td className="px-6 py-4"></td>
                                 </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PrintHeader 
                title={activeTab === 'PERFORMANCE' ? "Relatório Consolidado de Performance" : "Análise Consolidada de Abastecimento"}
                subtitle={activeTab === 'FUEL_ANALYSIS' ? (fuelSubTab === 'BY_STATION' ? 'Agrupado por Posto' : 'Agrupado por Veículo') : 'Rodagem e Consumo'}
                details={
                    <>
                        <span>Período: {dateRange.start} até {dateRange.end}</span>
                        <span>Total Litros: {totals.liters.toFixed(1)} L</span>
                        <span>Custo Total: {formatCurrency(totals.cost)}</span>
                    </>
                }
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <BarChart3 className="text-rose-600" size={32} />
                        Relatórios Analíticos
                    </h1>
                    <p className="text-slate-500">Inteligência de dados para gestão de frota.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadAllData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Atualizar Dados">
                         <Loader2 className={`${loading ? 'animate-spin' : ''}`} size={20} />
                    </button>
                    <button onClick={() => window.print()} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                        <Printer size={20} /> Imprimir Relatório
                    </button>
                </div>
            </div>

            {/* ABAS PRINCIPAIS */}
            <div className="flex border-b border-slate-200 print:hidden">
                <button 
                    onClick={() => handleTabChange('PERFORMANCE')}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'PERFORMANCE' ? 'border-rose-600 text-rose-600 bg-rose-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Gauge size={18} /> Performance Geral
                </button>
                <button 
                    onClick={() => handleTabChange('FUEL_ANALYSIS')}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'FUEL_ANALYSIS' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Fuel size={18} /> Abastecimento
                </button>
            </div>

            {/* Filtros Analíticos */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Início</label>
                        <div className="relative">
                            <input type="date" value={dateRange.start} onClick={(e) => e.currentTarget.showPicker()} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className={dateInputClass} />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                <Calendar size={18} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fim</label>
                        <div className="relative">
                            <input type="date" value={dateRange.end} onClick={(e) => e.currentTarget.showPicker()} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className={dateInputClass} />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                <Calendar size={18} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <MultiSelect label="Contratos" options={contractOptions} selected={filterContracts} onChange={setFilterContracts} placeholder="Todos" />
                    </div>
                    <div>
                        <MultiSelect label="Equipes" options={foremanOptions} selected={filterForeman} onChange={setFilterForeman} placeholder="Todas" />
                    </div>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
                {activeTab === 'PERFORMANCE' && (
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl text-white shadow-lg">
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Rodagem Total</p>
                        <p className="text-3xl font-black">{totals.km.toLocaleString()} <span className="text-lg font-normal">km</span></p>
                    </div>
                )}
                <div className={`${activeTab === 'PERFORMANCE' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gradient-to-br from-blue-600 to-blue-700'} p-5 rounded-2xl text-white shadow-lg`}>
                    <p className="opacity-80 text-xs font-bold uppercase tracking-wider mb-1">Combustível Total</p>
                    <p className="text-3xl font-black">{totals.liters.toFixed(1)} <span className="text-lg font-normal">L</span></p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 rounded-2xl text-white shadow-lg">
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Investimento Total</p>
                    <p className="text-3xl font-black">{formatCurrency(totals.cost)}</p>
                </div>
            </div>

            {/* CONTEÚDO DA ABA: ABASTECIMENTO */}
            {activeTab === 'FUEL_ANALYSIS' && (
                <div className="space-y-4">
                    {/* Sub-abas de Abastecimento */}
                    <div className="flex gap-2 print:hidden">
                        <button 
                            onClick={() => { setFuelSubTab('BY_STATION'); setSortConfig({ key: 'cost', order: 'desc' }); }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${fuelSubTab === 'BY_STATION' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Building2 size={14} /> Consolidação por Posto
                        </button>
                        <button 
                            onClick={() => { setFuelSubTab('BY_VEHICLE'); setSortConfig({ key: 'cost', order: 'desc' }); }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${fuelSubTab === 'BY_VEHICLE' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Truck size={14} /> Consolidação por Veículo
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center print:hidden">
                            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                                {fuelSubTab === 'BY_STATION' ? 'Lista de Postos Conveniados' : 'Consumo por Placa'}
                            </h3>
                            {fuelSubTab === 'BY_STATION' && <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-1 border rounded">CLIQUE EM UM POSTO PARA CONFERÊNCIA DETALHADA</span>}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] print:bg-slate-200 print:text-black">
                                    {fuelSubTab === 'BY_STATION' ? (
                                        <tr>
                                            <SortableHeader label="Posto" sortKey="name" />
                                            <SortableHeader label="Município" sortKey="municipality" />
                                            <SortableHeader label="Qtd. Abast." sortKey="count" align="center" />
                                            <SortableHeader label="Total Litros" sortKey="liters" align="right" />
                                            <SortableHeader label="Total Valor (R$)" sortKey="cost" align="right" />
                                            <th className="px-6 py-4 text-center print:hidden">Ações</th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <SortableHeader label="Veículo" sortKey="plate" />
                                            <SortableHeader label="Equipe" sortKey="foreman" />
                                            <SortableHeader label="Qtd. Abast." sortKey="count" align="center" />
                                            <SortableHeader label="Total Litros" sortKey="liters" align="right" />
                                            <SortableHeader label="Total Valor (R$)" sortKey="cost" align="right" />
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {fuelSubTab === 'BY_STATION' ? (
                                        stationData.map(item => (
                                            <tr 
                                                key={item.stationId} 
                                                className="hover:bg-blue-50 cursor-pointer transition-colors group"
                                                onClick={() => setSelectedStationId(item.stationId)}
                                            >
                                                <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-700">{item.name}</td>
                                                <td className="px-6 py-4 text-slate-500">{item.municipality}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-600">{item.count}</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-blue-700">{item.liters.toFixed(1)} L</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">{formatCurrency(item.cost)}</td>
                                                <td className="px-6 py-4 text-center print:hidden">
                                                    <div className="flex justify-center">
                                                        <div className="p-1.5 bg-white border border-slate-200 rounded text-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Eye size={16} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        vehicleFuelData.map(item => (
                                            <tr key={item.plate} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900">{item.plate}</td>
                                                <td className="px-6 py-4 text-slate-500 uppercase">{item.foreman}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-600">{item.count}x</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-blue-700">{item.liters.toFixed(1)} L</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">{formatCurrency(item.cost)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-900 text-white font-bold">
                                     <tr>
                                         <td colSpan={2} className="px-6 py-4 text-right uppercase text-xs">Totais do Período:</td>
                                         <td className="px-6 py-4 text-center"></td>
                                         <td className="px-6 py-4 text-right font-mono">{totals.liters.toFixed(1)} L</td>
                                         <td className="px-6 py-4 text-right font-mono">{formatCurrency(totals.cost)}</td>
                                         {fuelSubTab === 'BY_STATION' && <td className="print:hidden"></td>}
                                     </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTEÚDO DA ABA: PERFORMANCE GERAL */}
            {activeTab === 'PERFORMANCE' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center print:hidden">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Search size={18} className="text-slate-400" /> Tabela de Performance por Veículo
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] print:bg-slate-200 print:text-black">
                                <tr>
                                    <SortableHeader label="Veículo" sortKey="plate" />
                                    <SortableHeader label="Equipe" sortKey="foreman" />
                                    <th>Contrato</th>
                                    <SortableHeader label="KM Rodados" sortKey="kmTotal" align="right" />
                                    <SortableHeader label="Horas Oper." sortKey="minutesTotal" align="right" />
                                    <SortableHeader label="Litros (L)" sortKey="litersTotal" align="right" />
                                    <SortableHeader label="Custo (R$)" sortKey="costTotal" align="right" />
                                    <SortableHeader label="Média (KM/L)" sortKey="averageKmPerL" align="center" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-rose-600" size={32} /></td></tr>
                                ) : performanceData.length === 0 ? (
                                    <tr><td colSpan={8} className="py-20 text-center text-slate-400 italic">Nenhum dado encontrado para os filtros aplicados.</td></tr>
                                ) : (
                                    performanceData.map(item => (
                                        <tr key={item.plate} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{item.plate}</div>
                                                <div className="text-[10px] text-slate-400 uppercase">{item.model}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold text-slate-700 uppercase">{item.foreman}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded border">{item.contract}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{item.kmTotal.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-slate-500 font-medium">{item.hoursTotal}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-orange-700 bg-orange-50/30 print:bg-transparent">{item.litersTotal.toFixed(1)}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30 print:bg-transparent">{formatCurrency(item.costTotal)}</td>
                                            <td className="px-6 py-4 text-center">
                                                {item.averageKmPerL > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-black ${item.averageKmPerL > 8 ? 'text-emerald-700 bg-emerald-100' : item.averageKmPerL > 4 ? 'text-blue-700 bg-blue-100' : 'text-red-700 bg-red-100'}`}>
                                                            {item.averageKmPerL.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-slate-900 text-white font-bold">
                                 <tr>
                                     <td colSpan={3} className="px-6 py-4 text-right uppercase text-xs">Totais Consolidados:</td>
                                     <td className="px-6 py-4 text-right font-mono">{totals.km.toLocaleString()} km</td>
                                     <td className="px-6 py-4"></td>
                                     <td className="px-6 py-4 text-right font-mono">{totals.liters.toFixed(1)} L</td>
                                     <td className="px-6 py-4 text-right font-mono">{formatCurrency(totals.cost)}</td>
                                     <td className="px-6 py-4"></td>
                                 </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            <div className="print:hidden text-center text-slate-400 text-xs pb-10">
                * As consolidações consideram apenas registros contidos no intervalo de datas selecionado.
            </div>
        </div>
    );
};

export default ConsolidatedReports;