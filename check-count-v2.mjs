import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  // Packages with realization > 0
  const { count: c1 } = await supabase.from('view_dashboard_epurchasing_v6')
    .select('*', { count: 'exact', head: true }).gt('total', 0);
    
  // Packages with pagu > 0
  const { count: c2 } = await supabase.from('view_dashboard_epurchasing_v6')
    .select('*', { count: 'exact', head: true }).gt('pagu', 0);

  // Packages with status != 'BELUM REALISASI'
  const { count: c3 } = await supabase.from('view_dashboard_epurchasing_v6')
    .select('*', { count: 'exact', head: true }).neq('status', 'BELUM REALISASI');
    
  // Packages with status == 'SUDAH REALISASI' or similar
  const { count: c4 } = await supabase.from('view_dashboard_epurchasing_v6')
    .select('*', { count: 'exact', head: true }).in('status', ['COMPLETED', 'PAYMENT_OUTSIDE_SYSTEM']);
    
  // Packages with no master data
  const { count: c5 } = await supabase.from('view_dashboard_epurchasing_v6')
    .select('*', { count: 'exact', head: true }).eq('nama_ppk', 'Tidak Diketahui');

  console.log({
    realisasi_gt_0: c1,
    pagu_gt_0: c2,
    status_not_belum_realisasi: c3,
    status_completed: c4,
    no_master_data: c5
  });
}

investigate();
