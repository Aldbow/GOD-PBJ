const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkData() {
  console.log('Fetching master_data_ro...');
  const { data, error, count } = await supabase.from('master_data_ro').select('*', { count: 'exact', head: false });
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  console.log('Total rows:', count);
  if (data && data.length > 0) {
    console.log('Sample data (first 3 rows):', data.slice(0, 3));
    
    // Check for duplicate Kode/ID paket
    const idCounts = {};
    let duplicates = 0;
    data.forEach(row => {
      const id = row['Kode/ID paket'];
      if (idCounts[id]) {
        idCounts[id]++;
        if (idCounts[id] === 2) duplicates++; // Count unique duplicated IDs
      } else {
        idCounts[id] = 1;
      }
    });
    
    console.log('Number of duplicated Kode/ID paket:', duplicates);
    if (duplicates > 0) {
      console.log('Some duplicated IDs:');
      let i = 0;
      for (const [id, c] of Object.entries(idCounts)) {
        if (c > 1 && i < 5) {
          console.log('- ID:', id, 'Count:', c);
          console.log('  Rows:', data.filter(r => r['Kode/ID paket'] == id).map(r => r['RO']).join(' | '));
          i++;
        }
      }
    }
  } else {
    console.log('Table is empty.');
  }
}
checkData();
