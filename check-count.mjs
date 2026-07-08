import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  console.log('Fetching stats from Supabase...');

  // 1. Total records in view_dashboard_epurchasing_v6
  const { count: countTotal, error: e1 } = await supabase
    .from('view_dashboard_epurchasing_v6')
    .select('*', { count: 'exact', head: true });

  // 2. Count of E-purchasing realisasi only (from paket_e_purchasing)
  const { count: countEPurchasing, error: e2 } = await supabase
    .from('paket_e_purchasing')
    .select('*', { count: 'exact', head: true });
    
  // 3. Count of Master Data (E-purchasing only)
  const { count: countMaster, error: e3 } = await supabase
    .from('view_paket_penyedia_master_data')
    .select('*', { count: 'exact', head: true })
    .eq('metode_pengadaan', 'E-Purchasing');

  console.log({
    countTotal,
    countEPurchasing,
    countMaster,
    errors: [e1, e2, e3].filter(Boolean)
  });
}

investigate();
