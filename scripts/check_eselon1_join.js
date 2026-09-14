const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function checkJoin() {
  const { data: afirmasi, error: err1 } = await supabase
    .from('data_afirmasi_pdn_perencanaan')
    .select('nama_satuan_kerja, total_rup');

  const { data: master, error: err2 } = await supabase
    .from('master_data')
    .select('"SATUAN KERJA", "SATKER", "KPA", "UNIT KERJA"');

  const results = [];
  
  for (const af of afirmasi) {
      if (!af.nama_satuan_kerja) continue;
      const afName = af.nama_satuan_kerja.trim().toUpperCase();
      
      // Simulate LEFT JOIN
      const matches = master.filter(m => {
          const satKerja = m['SATUAN KERJA'] ? m['SATUAN KERJA'].trim().toUpperCase() : '';
          const satker = m['SATKER'] ? m['SATKER'].trim().toUpperCase() : '';
          const kpa = m['KPA'] ? m['KPA'].trim().toUpperCase() : '';
          
          return satKerja === afName || satker === afName || kpa === afName;
      });
      
      if (matches.length === 0) {
          results.push({ name: af.nama_satuan_kerja, matches: 0, unit_kerja: null });
      } else {
          // Are there multiple matches?
          const uniqueUnits = [...new Set(matches.map(m => m['UNIT KERJA']).filter(Boolean))];
          results.push({ 
              name: af.nama_satuan_kerja, 
              matches: matches.length, 
              unit_kerja: uniqueUnits.join(', ') || null 
          });
      }
  }

  const noMatches = results.filter(r => r.matches === 0);
  const multiMatches = results.filter(r => r.matches > 1);
  const nullUnits = results.filter(r => r.unit_kerja === null);
  
  console.log(`No Matches: ${noMatches.length}`);
  if(noMatches.length > 0) console.log(noMatches);
  
  console.log(`Null Units: ${nullUnits.length}`);
  if(nullUnits.length > 0) console.log(nullUnits);
  
  console.log(`Multi Matches: ${multiMatches.length}`);
  if(multiMatches.length > 0) console.log("Example:", multiMatches[0]);
}

checkJoin();
