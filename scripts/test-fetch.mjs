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
  console.log("Fetching history...");
  
  let allHistory = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('history_kaji_ulang')
      .select('kd_rup_lama, kd_rup_baru')
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error(error);
      break;
    }
    
    if (!data || data.length === 0) break;
    allHistory = [...allHistory, ...data];
    offset += limit;
  }
  
  console.log(`Fetched ${allHistory.length} records.`);
  
  // Check for cycles
  const graph = new Map();
  allHistory.forEach(h => {
    if (!graph.has(h.kd_rup_lama)) graph.set(h.kd_rup_lama, []);
    graph.get(h.kd_rup_lama).push(h.kd_rup_baru);
  });
  
  let cycles = 0;
  for (let node of graph.keys()) {
    let visited = new Set();
    let curr = node;
    while(curr) {
      if (visited.has(curr)) {
        console.log("CYCLE DETECTED AT:", curr);
        cycles++;
        break;
      }
      visited.add(curr);
      const nexts = graph.get(curr);
      if (!nexts || nexts.length === 0) break;
      curr = nexts[0]; // just check first path
    }
  }
  
  console.log(`Found ${cycles} cycles.`);
}

testFetch();
