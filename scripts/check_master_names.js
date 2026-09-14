const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function getMasterData() {
  const { data: master, error } = await supabase
    .from('master_data')
    .select('"SATUAN KERJA", "SATKER", "UNIT KERJA"');
    
  if(error) {
    console.error("Error:", error);
    return;
  }

  // extract unique names
  const uniqueNames = new Set();
  master.forEach(m => {
      if (m['SATUAN KERJA']) uniqueNames.add(m['SATUAN KERJA']);
      if (m['SATKER']) uniqueNames.add(m['SATKER']);
  });
  
  console.log("Daftar SATUAN KERJA di master_data:");
  Array.from(uniqueNames).slice(0, 50).forEach(n => console.log(n));
}

getMasterData();
