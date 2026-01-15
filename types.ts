
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

export enum UserRole {
  ADMIN = 'ADMIN',       
  GESTOR = 'GESTOR',     
  OPERADOR = 'OPERADOR', 
  FINANCEIRO = 'FINANCEIRO', 
  RH = 'RH',              
  GERENCIA = 'GERENCIA',   
  ENCARREGADO = 'ENCARREGADO' 
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name?: string; 
}

export interface Vehicle {
  id: string;
  contract: ContractType;
  plate: string;
  model?: string; 
  year?: string;  
  driverName: string;
  municipality: string;
  foreman: string; 
  type: VehicleType;
  status?: 'ATIVO' | 'INATIVO';
}

export interface DailyLog {
  id: string;
  date: string;
  vehicleId: string;
  firstIgnition: string; 
  startTime: string; 
  lunchStart: string; 
  lunchEnd: string; 
  endTime: string; 
  kmDriven: number;
  maxSpeed: number;
  speedingCount: number; 
  observations: string;
  extraTimeStart: string; 
  extraTimeEnd: string; 
  historicalPlate?: string; 
  historicalModel?: string; 
  historicalDriver?: string;
  historicalMunicipality?: string;
  historicalContract?: string;
  nonOperatingReason?: string; 
  kmBeforeRefueling?: number; 
}

export interface DailyLogReport extends DailyLog {
  vehicle: Vehicle;
  calculatedHours: string;
  lastRefuelingInfo?: {
    date: string;
    liters: number;
    kmSince: number;
  };
}

export interface GasStation {
  id: string;
  name: string;
  cnpj: string;
  municipality: string;
  phone?: string;
  address?: string; 
}

export enum FuelType {
  GASOLINA = 'GASOLINA',
  DIESEL = 'DIESEL',
  DIESEL_S10 = 'DIESEL S10',
  ETANOL = 'ETANOL',
  ARLA_32 = 'ARLA 32',
  OLEO_MOTOR = 'ÓLEO MOTOR',
  OLEO_HIDRAULICO = 'ÓLEO HIDRÁULICO',
  OLEO_TRANSMISSAO = 'ÓLEO TRANSMISSÃO',
  OLEO_2T = 'ÓLEO 2T',
  GRAXA = 'GRAXA',
  ADITIVO = 'ADITIVO RADIADOR',
  OUTROS = 'OUTROS'
}

export const FUEL_TYPES_LIST = [
  FuelType.GASOLINA,
  FuelType.DIESEL,
  FuelType.DIESEL_S10,
  FuelType.ETANOL
];

export const SUPPLY_TYPES_LIST = Object.values(FuelType).filter(t => !FUEL_TYPES_LIST.includes(t));

export interface RefuelingItem {
    fuelType: FuelType;
    liters: number;
    totalCost: number;
}

export interface RefuelingLog {
  id: string;
  date: string;
  vehicleId: string;
  gasStationId: string;
  fuelType: FuelType;
  liters: number;
  totalCost: number;
  items?: RefuelingItem[];
  invoiceNumber?: string; 
  requisitionNumber?: string; 
  plateSnapshot: string;
  modelSnapshot: string;
  foremanSnapshot: string; 
  contractSnapshot: string;
  municipalitySnapshot: string;
  observation?: string; 
  time?: string; 
}

export enum RequisitionStatus {
  PENDING = 'PENDENTE',
  APPROVED = 'APROVADA',
  REJECTED = 'RECUSADA'
}

export interface UserVehicle {
  id: string;
  userId: string;
  vehicleId: string;
}

export interface Requisition {
  id: string;
  internalId: number; 
  externalId?: string; 
  date: string; 
  requestTime: string; 
  requesterId: string;
  requesterName?: string; 
  vehicleId: string; 
  externalType?: string; 
  externalPlate?: string;
  fuelType: FuelType;
  liters: number;
  isFullTank?: boolean; 
  observation?: string;
  municipality: string; 
  status: RequisitionStatus;
  approvedBy?: string; 
  approvalDate?: string;
  gasStationId?: string;
}
