import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

// 1. Baca konfigurasi dari .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Tentukan file CSV dan nama tabel
const csvFilePath = process.argv[2];
const tableName = process.argv[3] || 'api_paket_penyedia_terumumkan';

if (!csvFilePath) {
  console.error("❌ Mohon masukkan nama file CSV. Contoh: node import-csv.mjs data.csv");
  process.exit(1);
}

console.log(`⏳ Membaca file CSV: ${csvFilePath}...`);

const fileContent = fs.readFileSync(csvFilePath, 'utf8');

Papa.parse(fileContent, {
  header: true,
  skipEmptyLines: true,
  complete: async function(results) {
    const data = results.data;
    console.log(`✅ Berhasil membaca ${data.length} baris dari CSV.`);
    
    // Pecah data menjadi potongan kecil (chunk) agar tidak memberatkan server
    const chunkSize = 500;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      console.log(`🚀 Mengunggah baris ${i + 1} hingga ${Math.min(i + chunkSize, data.length)}...`);
      
      // UPSERT: Akan meng-update data jika kd_rup sudah ada, atau menambah jika belum ada
      const { error } = await supabase
        .from(tableName)
        .upsert(chunk, { onConflict: 'kd_rup' }); 
        
      if (error) {
        console.error("❌ Gagal mengunggah chunk:", error.message);
      }
    }
    
    console.log(`🎉 Proses pembaruan data ke tabel '${tableName}' selesai!`);
  }
});
