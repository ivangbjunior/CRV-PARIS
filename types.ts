
export enum ContractType {
  MANUTENCAO = 'MANUTENÇÃO',
  LINHA_VIVA = 'LINHA VIVA',
  PLPT = 'PLPT',
  ADM_MANAUS = 'ADM_MANAUS',
  ADM_PIN = 'ADM_PIN',
  CTRNOVO = 'CTRNOVO',
  AME = 'AME',
  OFICINA = 'OFICINA',
  TRAVESSIA_SUBAQUATICA = 'TRAVESSIA SUBAQUÁTICA'
}

export enum VehicleType {
  CAMINHAO = 'CAMINHÃO',
  LINHA_VIVA = 'LINHA VIVA',
  STRADA_CABINE_SIMPLES = 'STRADA CABINE SIMPLES',
  STRADA_CABINE_DUPLA = 'STRADA CABINE DUPLA',
  PICK_UP = 'PICK-UP'
}

// --- NOVOS TIPOS DE AUTH ---
export enum UserRole {
  ADMIN = 'ADMIN',       // Acesso total
  GESTOR = 'GESTOR',     // Pode editar, ver relatórios, mas não pode excluir
  OPERADOR = 'OPERADOR', // Apenas lança dados
  FINANCEIRO = 'FINANCEIRO', // Apenas Abastecimento (Total) e Veículos (Leitura)
  RH = 'RH',              // Apenas Relatórios e Veículos (Leitura)
  GERENCIA = 'GERENCIA'   // Acesso total a menus, mas SOMENTE LEITURA (sem cadastro/edição/exclusão)
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}
// ---------------------------

export interface Vehicle {
  id: string;
  contract: ContractType;
  plate: string;
  model?: string; // Novo campo: Modelo
  year?: string;  // Novo campo: Ano
  driverName: string;
  municipality: string;
  foreman: string; // Equipe
  type: VehicleType;
  status?: 'ATIVO' | 'INATIVO';
}

export interface DailyLog {
  id: string;
  date: string;
  vehicleId: string;
  firstIgnition: string; // HH:MM
  startTime: string; // HH:MM
  lunchStart: string; // HH:MM
  lunchEnd: string; // HH:MM
  endTime: string; // HH:MM
  kmDriven: number;
  maxSpeed: number;
  speedingCount: number; // Quantas vezes passou de 90
  observations: string;
  extraTimeStart: string; // HH:MM
  extraTimeEnd: string; // HH:MM
  
  // Snapshots for history
  historicalPlate?: string; // Novo: Para manter histórico se veiculo for excluido
  historicalModel?: string; // Novo
  historicalDriver?: string;
  historicalMunicipality?: string;
  historicalContract?: string;

  // New field for non-operating status
  nonOperatingReason?: string; // 'OFICINA' | 'GARAGEM' | 'SEM SINAL' | 'EM MANUTENÇÃO' | 'NÃO LIGOU'
  
  // Novo campo solicitado
  kmBeforeRefueling?: number; 
}

// Helper to combine Log with Vehicle details for reporting
export interface DailyLogReport extends DailyLog {
  vehicle: Vehicle;
  calculatedHours: string;
  // Campo calculado para o relatório: Último Abastecimento
  lastRefuelingInfo?: {
    date: string;
    liters: number;
    kmSince: number;
  };
}

// --- NOVAS ENTIDADES DE ABASTECIMENTO ---

export interface GasStation {
  id: string;
  name: string;
  cnpj: string;
  municipality: string;
  phone?: string;
  address?: string; // Endereço do posto
}

export enum FuelType {
  GASOLINA = 'GASOLINA',
  DIESEL = 'DIESEL',
  DIESEL_S10 = 'DIESEL S10',
  ETANOL = 'ETANOL'
}

export interface RefuelingLog {
  id: string;
  date: string;
  vehicleId: string;
  gasStationId: string;
  
  // Dados do abastecimento
  fuelType: FuelType;
  liters: number;
  totalCost: number;
  invoiceNumber?: string; // Nota Fiscal
  requisitionNumber?: string; // Requisição
  
  // Snapshots dos dados do veículo no momento do abastecimento
  plateSnapshot: string;
  modelSnapshot: string;
  foremanSnapshot: string; // Equipe
  contractSnapshot: string;
  municipalitySnapshot: string;
  observation?: string; // Novo campo: Observação/Descrição
  time?: string; // Hora do abastecimento
}
