import { Vehicle, DailyLog, GasStation, RefuelingLog } from '../types';
import { supabase } from './supabaseClient';

// Mapeamento de tabelas
const TABLES = {
  VEHICLES: 'vehicles',
  LOGS: 'daily_logs',
  STATIONS: 'gas_stations',
  REFUELING: 'refueling_logs'
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
      
    if (error) console.error('Error saving vehicle:', error);
  },

  deleteVehicle: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.VEHICLES)
      .delete()
      .eq('id', id);
      
    if (error) console.error('Error deleting vehicle:', error);
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

    if (error) console.error('Error saving log:', error);
  },

  deleteLog: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.LOGS)
      .delete()
      .eq('id', id);
      
    if (error) console.error('Error deleting log:', error);
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

    if (error) console.error('Error saving station:', error);
  },

  deleteGasStation: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.STATIONS)
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting station:', error);
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

    if (error) console.error('Error saving refueling:', error);
  },

  deleteRefueling: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from(TABLES.REFUELING)
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting refueling:', error);
  }
};
