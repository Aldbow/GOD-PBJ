const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function getUnitKerja() {
  const { data: master, error } = await supabase
    .from('master_data')
    .select('"UNIT KERJA"');
    
  if(error) {
    console.error("Error:", error);
    return;
  }

  const uniqueNames = new Set();
  master.forEach(m => {
      if (m['UNIT KERJA']) uniqueNames.add(m['UNIT KERJA']);
  });
  
  console.log("Daftar UNIT KERJA di master_data:");
  Array.from(uniqueNames).forEach(n => console.log(n));
}

getUnitKerja();
