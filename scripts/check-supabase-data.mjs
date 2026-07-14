import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  console.log(`\n--- Checking ${tableName} ---`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error fetching ${tableName}:`, error.message);
  } else {
    console.log(`Success! Columns:`, data.length > 0 ? Object.keys(data[0]).join(', ') : 'No data in table');
    if (data.length > 0) {
      console.log('Sample data:', data[0]);
    }
  }
}

async function main() {
  await checkTable('master_data_ro');
  await checkTable('view_dashboard_swakelola_v1');
  await checkTable('view_dashboard_epurchasing_v6');
  await checkTable('view_dashboard_pengadaan_langsung');
  await checkTable('view_dashboard_penunjukan_langsung');
  await checkTable('api_rup_terumumkan');
  await checkTable('api_transaksional');
  await checkTable('api_pencatatan_non_spk');
}

main();
