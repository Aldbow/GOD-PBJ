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
  const { data, error } = await supabase.from(tableName).select('*').limit(5);
  if (error) {
    console.error(`Error fetching ${tableName}:`, error.message);
  } else {
    if (data.length > 0) {
      // get all unique keys from all 5 rows to ensure we don't miss null columns in the first row
      const keys = new Set();
      data.forEach(row => Object.keys(row).forEach(k => keys.add(k)));
      console.log(`Success! Columns:`, Array.from(keys).join(', '));
    } else {
      console.log('No data in table');
    }
  }
}

async function main() {
  await checkTable('master_data_ro');
  await checkTable('master_ppk');
  await checkTable('master_data_ppk');
  await checkTable('api_ppk');
}

main();
