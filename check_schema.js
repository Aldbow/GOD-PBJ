import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  const { data: viewData, error: viewError } = await supabase.from('view_prioritas_nasional').select('*').limit(1);
  console.log("Columns in view_prioritas_nasional:", viewData ? Object.keys(viewData[0]) : viewError);

  const { data: masterData, error: masterError } = await supabase.from('master_data_ro').select('*').limit(1);
  console.log("Columns in master_data_ro:", masterData ? Object.keys(masterData[0]) : masterError);
  if (masterData && masterData.length > 0) {
     console.log("Sample master_data_ro:", masterData[0]);
  }
}

investigate();
