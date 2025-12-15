
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

export const storageService = {
  // --- Vehicle Operations ---
  getVehicles: async (): Promise<Vehicle[]> => {
    const { data, error } = await supabase
      .from(TABLES.VEHICLES)
      .select('*');
    
    if (error) {
      console.error('Error fetching vehicles:', error);
      return [];
    }
    return data || [];
  },

  saveVehicle: async (vehicle: Vehicle): Promise<void> => {
    // Supabase aceita upsert baseando-se na Primary Key (id)
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
    // Em produção, idealmente adicionaríamos paginação ou filtro de data aqui
    const { data, error } = await supabase
      .from(TABLES.LOGS)
      .select('*');

    if (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
    return data || [];
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
    const { data, error } = await supabase
      .from(TABLES.STATIONS)
      .select('*');

    if (error) {
      console.error('Error fetching stations:', error);
      return [];
    }
    return data || [];
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
    const { data, error } = await supabase
      .from(TABLES.REFUELING)
      .select('*');

    if (error) {
      console.error('Error fetching refuelings:', error);
      return [];
    }
    return data || [];
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
    const { data, error } = await supabase
      .from(TABLES.REQUISITIONS)
      .select('*')
      .order('internalId', { ascending: false }); // Order by most recent ID

    if (error) {
      console.error('Error fetching requisitions:', error);
      return [];
    }
    return data || [];
  },

  getNextInternalId: async (): Promise<number> => {
    // Simula auto-increment global buscando o maior ID atual
    const { data, error } = await supabase
      .from(TABLES.REQUISITIONS)
      .select('internalId')
      .order('internalId', { ascending: false })
      .limit(1);

    if (error) {
       console.error("Error getting next ID", error);
       // Em caso de erro de permissão aqui, retornamos 1, mas o save subsequente falhará
       return 1;
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
    const { data, error } = await supabase
      .from(TABLES.USER_VEHICLES)
      .select('*');

    if (error) {
        console.error('Error fetching user vehicles:', error);
        return [];
    }
    return data || [];
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
  
  // --- User Profiles Helper (For Gerencia) ---
  getAllUsers: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
          .from(TABLES.USER_ROLES)
          .select('*');
          
      if (error) {
          console.error('Error fetching users:', error);
          return [];
      }
      return data?.map((u: any) => ({
          id: u.id,
          email: u.email || 'No Email',
          role: u.role
      })) || [];
  }
};
