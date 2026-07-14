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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  console.log(`\n--- Checking ${tableName} ---`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error fetching ${tableName}:`, error.message);
  } else {
    console.log(`Success! Columns:`, data.length > 0 ? Object.keys(data[0]).join(', ') : 'No data in table');
    if (data.length > 0) {
      console.log('Sample data keys:', Object.keys(data[0]).filter(k => k.toLowerCase().includes('eselon') || k.toLowerCase().includes('satker') || k.toLowerCase().includes('ppk') || k.toLowerCase().includes('rup')));
    }
  }
}

async function main() {
  await checkTable('api_paket_penyedia_terumumkan');
  await checkTable('api_paket_swakelola_terumumkan');
}

main();
