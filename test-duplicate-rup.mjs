import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const targetRup = 66473604;
  
  console.log("Checking api_paket_penyedia_terumumkan...");
  const { data: masterData, error: e1 } = await supabase
    .from('api_paket_penyedia_terumumkan')
    .select('kd_rup, nama_paket, pagu')
    .eq('kd_rup', targetRup);
  console.log("Master Data:", masterData);

  console.log("\nChecking paket_e_purchasing...");
  const { data: realisasiData, error: e2 } = await supabase
    .from('paket_e_purchasing')
    .select('rup_code, order_id, total, status')
    .eq('rup_code', String(targetRup));
  console.log("Realisasi Data:", realisasiData);
  
  console.log("\nChecking history_kaji_ulang...");
  const { data: historyData, error: e3 } = await supabase
    .from('history_kaji_ulang')
    .select('kd_rup_lama, kd_rup_baru, jenis_revisi')
    .or(`kd_rup_lama.eq.${targetRup},kd_rup_baru.eq.${targetRup}`);
  console.log("History Data:", historyData);
  
  console.log("\nChecking view_dashboard_epurchasing_v6...");
  const { data: viewData, error: e4 } = await supabase
    .from('view_dashboard_epurchasing_v6')
    .select('kd_rup, rup_name, order_id, total, status')
    .eq('kd_rup', targetRup);
  console.log("View Data:", viewData);
}

testFetch();
