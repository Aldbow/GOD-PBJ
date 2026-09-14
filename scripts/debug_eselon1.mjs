import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: afirmasi, error: err1 } = await supabase
    .from('data_afirmasi_pdn_perencanaan')
    .select('nama_satuan_kerja')
    .limit(15);
    
  if(err1) console.error("Error 1:", err1);
  console.log("Afirmasi sample:");
  console.log(afirmasi);

  const { data: master, error: err2 } = await supabase
    .from('master_data')
    .select('"SATUAN KERJA", "SATKER", "UNIT KERJA"')
    .limit(15);
    
  if(err2) console.error("Error 2:", err2);
  console.log("\nMaster sample:");
  console.log(master);
  
  // Try to find a match specifically for one of the afirmasi
  if (afirmasi && afirmasi.length > 0) {
      const sampleName = afirmasi[0].nama_satuan_kerja;
      const { data: searchMaster } = await supabase
        .from('master_data')
        .select('"SATUAN KERJA", "SATKER", "UNIT KERJA"')
        .ilike('SATUAN KERJA', `%${sampleName.substring(0, 10)}%`)
        .limit(5);
      console.log("\nSearch master for", sampleName, ":", searchMaster);
  }
}

main();
