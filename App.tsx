
import React, { useState, useEffect } from 'react';
import Vehicles from './components/Vehicles';
import DailyLogs from './components/DailyLogs';
import Reports from './components/Reports';
import FuelManagement from './components/FuelManagement';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';
import { LayoutDashboard, Truck, FileSpreadsheet, Menu, X, Home, ChevronRight, Fuel, LogOut, UserCircle, ShieldCheck, AlertTriangle, DollarSign } from 'lucide-react';
import { UserRole } from './types';

enum Tab {
  HOME = 'home',
  LOGS = 'logs',
  VEHICLES = 'vehicles',
  REPORTS = 'reports',
  FUEL = 'fuel'
}

// --- Logo Component ---
const ParisLogo = ({ variant = 'dark', size = 'normal' }: { variant?: 'dark' | 'light', size?: 'normal' | 'large' }) => {
  const isLarge = size === 'large';
  const textColor = variant === 'dark' ? 'text-slate-900' : 'text-white';
  const subColor = variant === 'dark' ? 'text-blue-700' : 'text-blue-200';
  const circleBorder = variant === 'dark' ? 'border-blue-900' : 'border-white/30';
  const towerColor = variant === 'dark' ? 'text-blue-900' : 'text-white';

  // Dimensions
  const circleSize = isLarge ? 'w-28 h-28' : 'w-10 h-10';
  const titleSize = isLarge ? 'text-6xl' : 'text-2xl';
  const subSize = isLarge ? 'text-sm' : 'text-[10px]';
  // Adjust icon size to fit well within the circle without touching borders
  const iconSize = isLarge ? 'h-20 w-auto' : 'h-7 w-auto'; 
  const strokeWidth = isLarge ? 8 : 10; // Relative to viewBox 0 0 100 200

  return (
    <div className="flex items-center gap-4 select-none">
      {/* Symbol */}
      <div className={`${circleSize} rounded-full border-2 ${circleBorder} flex items-center justify-center bg-transparent flex-shrink-0`}>
        <svg 
          viewBox="0 0 100 200" 
          className={`${towerColor} ${iconSize}`}
          fill="none" 
          stroke="currentColor" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {/* Top Spire */}
          <path d="M50 10 L50 40" strokeWidth={strokeWidth} />
          
          {/* Main Body Legs - using quadratic curves for the iconic slope */}
          <path d="M50 40 Q 45 100 20 190" strokeWidth={strokeWidth} />
          <path d="M50 40 Q 55 100 80 190" strokeWidth={strokeWidth} />
          
          {/* Top Platform */}
          <path d="M38 85 L62 85" strokeWidth={strokeWidth} />
          
          {/* Middle Platform */}
          <path d="M30 135 L70 135" strokeWidth={strokeWidth} />
          
          {/* Base Arch */}
          <path d="M25 185 Q 50 160 75 185" strokeWidth={strokeWidth * 0.8} />
        </svg>
      </div>
      
      {/* Text */}
      <div className="flex flex-col justify-center">
        <span className={`font-black ${titleSize} leading-none tracking-tighter ${textColor} font-sans`} style={{ fontFamily: "'Roboto', sans-serif" }}>
          CRV-PARIS
        </span>
        <span className={`${subSize} font-bold tracking-[0.15em] ${subColor} uppercase ml-1`}>
          Controle de Frota
        </span>
      </div>
    </div>
  );
};

// --- Home Menu Component ---
interface HomeMenuProps {
  onNavigate: (tab: Tab) => void;
  role: UserRole;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ onNavigate, role }) => {
  // Define access logic based on Roles
  const showLogs = role === UserRole.ADMIN || role === UserRole.GESTOR || role === UserRole.OPERADOR || role === UserRole.GERENCIA;
  const showVehicles = true; // Todos veem veículos (RH e GERENCIA read-only)
  const showFuel = role === UserRole.ADMIN || role === UserRole.GESTOR || role === UserRole.FINANCEIRO || role === UserRole.GERENCIA;
  const showReports = role === UserRole.ADMIN || role === UserRole.GESTOR || role === UserRole.RH || role === UserRole.OPERADOR || role === UserRole.GERENCIA;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* Sophisticated Background */}
      <div className="absolute inset-0 bg-slate-50 pointer-events-none">
         {/* Grid Pattern */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
         {/* Ambient Glows */}
         <div className="absolute left-0 top-0 -z-10 m-auto h-[400px] w-[400px] rounded-full bg-blue-400 opacity-10 blur-[100px]"></div>
         <div className="absolute right-0 bottom-0 -z-10 h-[400px] w-[400px] rounded-full bg-indigo-400 opacity-10 blur-[100px]"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-6xl px-6">
        
        {/* Hero Section */}
        <div className="text-center mb-20">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm mb-8 animate-in fade-in zoom-in duration-700">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Paris Engenharia</span>
           </div>

           <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tight mb-6 drop-shadow-sm animate-in slide-in-from-bottom-4 fade-in duration-1000">
             CRV<span className="text-blue-600">PARIS</span>
           </h1>
           
           <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto animate-in slide-in-from-bottom-4 fade-in duration-1000 delay-100 leading-relaxed">
             Plataforma integrada de <span className="text-slate-900 font-bold">Controle de Frota</span> e Gestão Operacional.
           </p>
        </div>
        
        {/* Modern Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-200 justify-center">
           {showLogs && (
             <HomeCard 
               icon={LayoutDashboard} 
               title="Diário de Bordo" 
               subtitle="Registros operacionais diários" 
               theme="blue"
               onClick={() => onNavigate(Tab.LOGS)} 
             />
           )}
           {showVehicles && (
            <HomeCard 
              icon={Truck} 
              title="Minha Frota" 
              subtitle={(role === UserRole.FINANCEIRO || role === UserRole.RH || role === UserRole.GERENCIA) ? "Visualização e Histórico" : "Gestão de veículos e condutores"} 
              theme="indigo"
              onClick={() => onNavigate(Tab.VEHICLES)} 
            />
           )}
           {showFuel && (
             <HomeCard 
               icon={Fuel} 
               title="Abastecimento" 
               subtitle="Controle de combustível" 
               theme="orange"
               onClick={() => onNavigate(Tab.FUEL)} 
             />
           )}
           {showReports && (
             <HomeCard 
               icon={FileSpreadsheet} 
               title="Relatórios" 
               subtitle="Análise de dados e métricas" 
               theme="emerald"
               onClick={() => onNavigate(Tab.REPORTS)} 
             />
           )}
        </div>
        
        <div className="mt-24 text-center animate-in fade-in duration-1000 delay-500">
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">Sistema de Gestão v2.0</p>
        </div>
      </div>
    </div>
  );
}

// --- Helper Component for Home Cards ---
interface HomeCardProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  theme: 'blue' | 'indigo' | 'orange' | 'emerald';
  onClick: () => void;
}

const HomeCard: React.FC<HomeCardProps> = ({ icon: Icon, title, subtitle, theme, onClick }) => {
  const themes = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", hoverBorder: "hover:border-blue-300", hoverShadow: "hover:shadow-blue-100" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", hoverBorder: "hover:border-indigo-300", hoverShadow: "hover:shadow-indigo-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", hoverBorder: "hover:border-orange-300", hoverShadow: "hover:shadow-orange-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", hoverBorder: "hover:border-emerald-300", hoverShadow: "hover:shadow-emerald-100" },
  };
  
  const t = themes[theme];

  return (
    <button 
      onClick={onClick}
      className={`group bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 text-left flex flex-col h-auto min-h-[220px] hover:-translate-y-1 hover:shadow-xl ${t.hoverBorder} ${t.hoverShadow}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${t.bg} ${t.text}`}>
        <Icon size={28} strokeWidth={1.5} />
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">{title}</h3>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">{subtitle}</p>
      </div>

      <div className="mt-auto flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-800 transition-colors">
        Acessar <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
};

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showReset, setShowReset] = useState(false);

  // Timer para mostrar botão de reset se o loading demorar muito
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) {
      timer = setTimeout(() => {
        setShowReset(true);
      }, 5000); // 5 segundos
    } else {
      setShowReset(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-6 bg-white p-8 rounded-xl shadow-lg border border-slate-100 max-w-sm w-full">
           <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium animate-pulse text-center">Carregando sistema...</p>
           </div>
           
           {showReset && (
             <div className="w-full animate-in fade-in slide-in-from-top-2">
               <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-800 flex items-start gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <p>O sistema está demorando para responder. Se travou, tente reiniciar sua sessão.</p>
               </div>
               <button 
                 onClick={signOut}
                 className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors"
               >
                 Reiniciar / Sair
               </button>
             </div>
           )}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // ACCESS CONTROL FLAGS
  const isFinanceiro = user.role === UserRole.FINANCEIRO;
  const isOperador = user.role === UserRole.OPERADOR;
  const isRH = user.role === UserRole.RH;
  const isGerencia = user.role === UserRole.GERENCIA;
  const isGestorOrAdmin = user.role === UserRole.ADMIN || user.role === UserRole.GESTOR;

  // Access Logic Maps
  const canAccessLogs = isGestorOrAdmin || isOperador || isGerencia;
  const canAccessVehicles = true; // Everyone has access (some read-only)
  const canAccessFuel = isGestorOrAdmin || isFinanceiro || isGerencia;
  const canAccessReports = isGestorOrAdmin || isRH || isOperador || isGerencia;

  const renderContent = () => {
    switch (activeTab) {
      case Tab.HOME:
        return <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} />;
      case Tab.VEHICLES:
        if (!canAccessVehicles) return <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} />;
        return <Vehicles />;
      case Tab.LOGS:
        if (!canAccessLogs) return <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} />;
        return <DailyLogs />;
      case Tab.REPORTS:
        if (!canAccessReports) return <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} />;
        return <Reports />;
      case Tab.FUEL:
        if (!canAccessFuel) return <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} />;
        return <FuelManagement />;
      default:
        return <HomeMenu onNavigate={(tab) => setActiveTab(tab)} role={user.role} />;
    }
  };

  const NavItem = ({ tab, label, icon: Icon }: { tab: Tab; label: string; icon: any }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full mb-1 ${
        activeTab === tab
          ? 'bg-blue-800 text-white shadow-md ring-1 ring-blue-700'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} className={activeTab === tab ? 'text-blue-200' : ''} />
      <span className="font-medium">{label}</span>
    </button>
  );

  const getRoleBadge = (role: UserRole) => {
    switch(role) {
      case UserRole.ADMIN: return 'bg-red-500 text-white';
      case UserRole.GESTOR: return 'bg-blue-500 text-white';
      case UserRole.FINANCEIRO: return 'bg-emerald-600 text-white';
      case UserRole.RH: return 'bg-purple-600 text-white';
      case UserRole.GERENCIA: return 'bg-orange-600 text-white';
      default: return 'bg-slate-600 text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex print:hidden flex-col w-72 bg-slate-900 text-slate-300 h-screen sticky top-0 shadow-xl z-50">
        <div 
          className="p-8 border-b border-slate-800 flex justify-center cursor-pointer hover:bg-slate-800/50 transition-colors"
          onClick={() => setActiveTab(Tab.HOME)}
        >
           <ParisLogo variant="light" />
        </div>
        
        <nav className="flex-1 p-4 mt-6">
          <NavItem tab={Tab.HOME} label="Início" icon={Home} />
          <div className="my-4 border-t border-slate-800/50 mx-2"></div>
          <p className="px-4 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Módulos</p>
          
          {/* Conditional Menu Items based on Role */}
          {canAccessLogs && <NavItem tab={Tab.LOGS} label="Lançamento Diário" icon={LayoutDashboard} />}
          {canAccessVehicles && <NavItem tab={Tab.VEHICLES} label="Gestão de Frota" icon={Truck} />}
          {canAccessFuel && <NavItem tab={Tab.FUEL} label="Abastecimento" icon={Fuel} />}
          {canAccessReports && <NavItem tab={Tab.REPORTS} label="Relatórios" icon={FileSpreadsheet} />}
        
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <UserCircle size={20} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-white truncate" title={user.email}>{user.email.split('@')[0]}</p>
                 <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={10} className={user.role === UserRole.ADMIN ? 'text-red-400' : (user.role === UserRole.FINANCEIRO ? 'text-emerald-400' : 'text-blue-400')} />
                    <span className={`text-[10px] uppercase font-bold tracking-wider rounded px-1 ${getRoleBadge(user.role)}`}>{user.role}</span>
                 </div>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-red-900/30 hover:text-red-400 text-slate-400 py-2 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-red-900/50"
            >
              <LogOut size={14} /> SAIR DO SISTEMA
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden print:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <div onClick={() => setActiveTab(Tab.HOME)} className="cursor-pointer">
          <ParisLogo variant="light" />
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-slate-800 rounded-lg">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900 z-30 pt-24 px-4 pb-8 animate-in slide-in-from-top-10 duration-200 flex flex-col h-full overflow-y-auto">
           <nav className="space-y-2">
             <NavItem tab={Tab.HOME} label="Menu Inicial" icon={Home} />
             <div className="my-4 border-t border-slate-800"></div>
             {canAccessLogs && <NavItem tab={Tab.LOGS} label="Lançamento Diário" icon={LayoutDashboard} />}
             {canAccessVehicles && <NavItem tab={Tab.VEHICLES} label="Gestão de Frota" icon={Truck} />}
             {canAccessFuel && <NavItem tab={Tab.FUEL} label="Abastecimento" icon={Fuel} />}
             {canAccessReports && <NavItem tab={Tab.REPORTS} label="Relatórios" icon={FileSpreadsheet} />}
           </nav>
           
           <div className="mt-auto pt-8 border-t border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                    <UserCircle size={24} className="text-slate-400" />
                 </div>
                 <div>
                    <p className="text-white font-bold text-sm">{user.email}</p>
                    <p className="text-xs px-1 rounded w-fit mt-1 font-bold uppercase" style={{backgroundColor: user.role === UserRole.FINANCEIRO ? '#059669' : '#475569'}}>{user.role}</p>
                 </div>
              </div>
              <button onClick={signOut} className="w-full bg-red-900/20 text-red-400 py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                <LogOut size={18} /> Sair
              </button>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-full relative print:p-0 print:overflow-visible">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none z-0 print:hidden" 
             style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto print:max-w-none print:w-full">
           {renderContent()}
        </div>
      </main>

    </div>
  );
};

export default App;
