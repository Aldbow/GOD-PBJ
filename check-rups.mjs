import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key is missing.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    console.log("Fetching RUPs from paket_e_purchasing...");
    let epurchasingRups = new Set();
    let offset = 0;
    const limit = 1000;
    
    while(true) {
      const { data: epurchasing, error: err1 } = await supabase
        .from('paket_e_purchasing')
        .select('rup_code')
        .not('rup_code', 'is', null)
        .range(offset, offset + limit - 1);

      if (err1) throw err1;
      if (!epurchasing || epurchasing.length === 0) break;
      
      epurchasing.forEach(r => epurchasingRups.add(String(r.rup_code)));
      offset += limit;
    }

    console.log(`Found ${epurchasingRups.size} unique RUPs in paket_e_purchasing.`);

    console.log("Fetching RUPs from api_paket_penyedia_terumumkan...");
    let penyediaRups = new Set();
    offset = 0;

    while(true) {
      const { data: penyedia, error: err2 } = await supabase
        .from('api_paket_penyedia_terumumkan')
        .select('kd_rup')
        .not('kd_rup', 'is', null)
        .range(offset, offset + limit - 1);

      if (err2) throw err2;
      if (!penyedia || penyedia.length === 0) break;

      penyedia.forEach(p => penyediaRups.add(String(p.kd_rup)));
      offset += limit;
    }

    console.log(`Found ${penyediaRups.size} unique RUPs in api_paket_penyedia.`);

    let missing = [];
    for (let rup of epurchasingRups) {
      if (!penyediaRups.has(rup)) {
        missing.push(rup);
      }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Found ${missing.length} RUPs in paket_e_purchasing that are missing from api_paket_penyedia.`);
    
    if (missing.length > 0) {
      console.log(`Missing RUPs (up to first 20):`);
      console.log(missing.slice(0, 20).join(', '));
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

check();
