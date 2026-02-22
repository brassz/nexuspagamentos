import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { CityKey } from './cities';

export type { CityKey } from './cities';
export { CITY_LABELS } from './cities';

function getCityConfig(city: Exclude<CityKey, 'outro'>) {
  const configs: Record<Exclude<CityKey, 'outro'>, { url: string; key: string }> = {
    franca: {
      url: process.env.SUPABASE_FRANCA_URL || 'https://mhtxyxizfnxupwmilith.supabase.co',
      key: process.env.SUPABASE_FRANCA_SERVICE_ROLE || '',
    },
    praia_grande: {
      url: process.env.SUPABASE_LITORAL_URL || process.env.SUPABASE_A_URL || 'https://eemfnpefgojllvzzaimu.supabase.co',
      key: process.env.SUPABASE_LITORAL_SERVICE_ROLE || process.env.SUPABASE_A_SERVICE_ROLE || '',
    },
    mogiana: {
      url: process.env.SUPABASE_MOGIANA_URL || process.env.SUPABASE_A_URL || 'https://eemfnpefgojllvzzaimu.supabase.co',
      key: process.env.SUPABASE_MOGIANA_SERVICE_ROLE || process.env.SUPABASE_A_SERVICE_ROLE || '',
    },
    imperatriz: {
      url: process.env.SUPABASE_IMPERATRIZ_URL || 'https://eppzphzwwpvpoocospxy.supabase.co',
      key: process.env.SUPABASE_IMPERATRIZ_SERVICE_ROLE || '',
    },
  };
  return configs[city];
}

export function getSupabaseCore(city: CityKey): SupabaseClient {
  if (city === 'outro') throw new Error('Cidade não atendida');
  const config = getCityConfig(city);
  if (!config?.url || !config?.key) throw new Error(`Configuração do Supabase para ${city} não encontrada`);
  return createClient(config.url, config.key);
}

export function hasCityConfig(city: CityKey): boolean {
  if (city === 'outro') return false;
  const config = getCityConfig(city);
  return !!(config?.url && config?.key);
}

