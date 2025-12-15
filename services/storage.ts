
import { Vehicle, DailyLog, GasStation, RefuelingLog, Requisition, UserVehicle, UserProfile } from '../types';
import { supabase } from './supabaseClient';

// Mapeamento de tabelas
const TABLES = {
  VEHICLES: 'vehicles',
  LOGS: 'daily_logs',
  STATIONS: 'gas_stations',
  REFUELING: 'refueling_logs',
  REQUISITIONS: 'requisitions',
  USER_VEHICLES: 'user_vehicles',
  USER_ROLES: 'user_roles'
};

/**
 * Função auxiliar para buscar TODOS os registros de uma tabela,
 * contornando o limite de 1000 linhas da API do Supabase.
 * Ela busca em lotes (chunks) até que não haja mais dados.
 */
const fetchAll = async <T>(
  table: string, 
  orderBy: string = 'id', 
  ascending: boolean = false
): Promise<T[]> => {
  let allData: T[] = [];
  let page = 0;
  const pageSize = 1000; // Limite padrão seguro do Supabase
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending })
      .range(from, to);

    if (error) {
      console.error(`Erro ao buscar dados da tabela ${table}:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data] as T[];
      
      // Se vieram menos registros que o tamanho da página, chegamos ao fim
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
};

export const storageService = {
  // --- Vehicle Operations ---
  getVehicles: async (): Promise<Vehicle[]> => {
    return fetchAll<Vehicle>(TABLES.VEHICLES, 'plate', true);
  },

  saveVehicle: async (vehicle: Vehicle): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.VEHICLES)
      .upsert(vehicle);
      
    if (error) {
        console.error('Error saving vehicle:', error);
        throw error;
    }
  },

  deleteVehicle: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.VEHICLES)
      .delete()
      .eq('id', id);
      
    if (error) {
        console.error('Error deleting vehicle:', error);
        throw error;
    }
  },

  // --- Log Operations ---
  getLogs: async (): Promise<DailyLog[]> => {
    return fetchAll<DailyLog>(TABLES.LOGS, 'date', false);
  },

  saveLog: async (log: DailyLog): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.LOGS)
      .upsert(log);

    if (error) {
        console.error('Error saving log:', error);
        throw error;
    }
  },

  deleteLog: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.LOGS)
      .delete()
      .eq('id', id);
      
    if (error) {
        console.error('Error deleting log:', error);
        throw error;
    }
  },

  // --- Gas Station Operations ---
  getGasStations: async (): Promise<GasStation[]> => {
    return fetchAll<GasStation>(TABLES.STATIONS, 'name', true);
  },

  saveGasStation: async (station: GasStation): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.STATIONS)
      .upsert(station);

    if (error) {
        console.error('Error saving station:', error);
        throw error;
    }
  },

  deleteGasStation: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.STATIONS)
      .delete()
      .eq('id', id);

    if (error) {
        console.error('Error deleting station:', error);
        throw error;
    }
  },

  // --- Refueling Operations ---
  getRefuelings: async (): Promise<RefuelingLog[]> => {
    return fetchAll<RefuelingLog>(TABLES.REFUELING, 'date', false);
  },

  saveRefueling: async (log: RefuelingLog): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.REFUELING)
      .upsert(log);

    if (error) {
        console.error('Error saving refueling:', error);
        throw error;
    }
  },

  deleteRefueling: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.REFUELING)
      .delete()
      .eq('id', id);

    if (error) {
        console.error('Error deleting refueling:', error);
        throw error;
    }
  },

  // --- Requisition Operations ---
  getRequisitions: async (): Promise<Requisition[]> => {
    return fetchAll<Requisition>(TABLES.REQUISITIONS, 'internalId', false);
  },

  getNextInternalId: async (): Promise<number> => {
    // Para pegar o ID, não precisamos de fetchAll, apenas do último
    const { data, error } = await supabase
      .from(TABLES.REQUISITIONS)
      .select('internalId')
      .order('internalId', { ascending: false })
      .limit(1);

    if (error) {
       console.error("Error getting next ID", error);
       throw error;
    }

    if (data && data.length > 0) {
        return (data[0].internalId || 0) + 1;
    }
    return 1;
  },

  saveRequisition: async (requisition: Requisition): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.REQUISITIONS)
      .upsert(requisition);

    if (error) {
        console.error('Error saving requisition:', error);
        throw error;
    }
  },

  deleteRequisition: async (id: string): Promise<void> => {
    const { error } = await supabase
        .from(TABLES.REQUISITIONS)
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting requisition:', error);
        throw error;
    }
  },

  // --- User Vehicles Association ---
  getUserVehicles: async (): Promise<UserVehicle[]> => {
    return fetchAll<UserVehicle>(TABLES.USER_VEHICLES, 'id', true);
  },

  saveUserVehicle: async (link: UserVehicle): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.USER_VEHICLES)
      .upsert(link);
      
    if (error) {
        console.error('Error saving user vehicle:', error);
        throw error;
    }
  },

  deleteUserVehicle: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.USER_VEHICLES)
      .delete()
      .eq('id', id);
      
    if (error) {
        console.error('Error deleting user vehicle:', error);
        throw error;
    }
  },
  
  // --- User Profiles Helper ---
  getAllUsers: async (): Promise<UserProfile[]> => {
      // User roles não costuma ser gigante, mas aplicamos a lógica por segurança
      const allRoles = await fetchAll<any>(TABLES.USER_ROLES, 'id', true);
      
      return allRoles.map((u: any) => ({
          id: u.id,
          email: u.email || 'No Email',
          role: u.role
      }));
  }
};
