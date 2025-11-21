import { createClient } from '@supabase/supabase-js';

// Configuração do projeto CRV-PARIS
const supabaseUrl = 'https://dptgafntckraibizlydb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdGdhZm50Y2tyYWliaXpseWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2OTQ0MTIsImV4cCI6MjA3OTI3MDQxMn0.TaIZPFpCkzWHLK5MPSTmqHsDDeaE0MpWqwAAorkVcFo';

export const supabase = createClient(supabaseUrl, supabaseKey);
