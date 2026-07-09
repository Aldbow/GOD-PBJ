import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('view_paket_penyedia_master_data')
    .select('"UNIT KERJA", "SATUAN KERJA", "MASTER_NAMA_PPK", kd_rup')
    .limit(10);
  
  if (error) console.error("Error fetching view:", error);
  else console.log("View data:", data);
}

test();
