const fs = require('fs');

const csvPath = 'data/history-kaji-ulang_2026.csv';
const sqlPath = 'data/import_history_kaji_ulang.sql';

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n').filter(l => l.trim() !== '');

// Skip header
const header = lines.shift();

let sql = `CREATE TABLE IF NOT EXISTS history_kaji_ulang (
    id SERIAL PRIMARY KEY,
    jenis_klpd VARCHAR(255),
    jenis_revisi VARCHAR(255),
    kd_satker BIGINT,
    kd_satker_str VARCHAR(255),
    tahun_anggaran INTEGER,
    jenis_paket VARCHAR(255),
    kd_klpd VARCHAR(255),
    nama_klpd VARCHAR(255),
    nama_satker VARCHAR(255),
    tgl_kaji_ulang TIMESTAMPTZ,
    alasan_kajiulang TEXT,
    kd_rup_baru BIGINT,
    kd_rup_lama BIGINT,
    last_update_ref VARCHAR(255)
);

TRUNCATE TABLE history_kaji_ulang;

INSERT INTO history_kaji_ulang (
    jenis_klpd, jenis_revisi, kd_satker, kd_satker_str, tahun_anggaran, 
    jenis_paket, kd_klpd, nama_klpd, nama_satker, tgl_kaji_ulang, 
    alasan_kajiulang, kd_rup_baru, kd_rup_lama, last_update_ref
) VALUES
`;

const escapeSql = (val) => {
  if (!val) return 'NULL';
  return "'" + val.replace(/'/g, "''") + "'";
};

const values = lines.map(line => {
  // Split by semicolon
  const parts = line.split(';');
  if (parts.length < 14) return null;
  
  return `(${escapeSql(parts[0])}, ${escapeSql(parts[1])}, ${parts[2] ? parts[2] : 'NULL'}, ${escapeSql(parts[3])}, ${parts[4] ? parts[4] : 'NULL'}, ${escapeSql(parts[5])}, ${escapeSql(parts[6])}, ${escapeSql(parts[7])}, ${escapeSql(parts[8])}, ${escapeSql(parts[9])}, ${escapeSql(parts[10])}, ${parts[11] ? parts[11] : 'NULL'}, ${parts[12] ? parts[12] : 'NULL'}, ${escapeSql(parts[13])})`;
}).filter(Boolean);

// Chunk the inserts to prevent massive statements if needed, but for 5700 a single statement is often fine. 
// Let's do chunks of 1000 to be safe for Supabase.
const chunkSize = 1000;
let finalSql = sql.substring(0, sql.lastIndexOf('INSERT INTO'));

for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    finalSql += `INSERT INTO history_kaji_ulang (
    jenis_klpd, jenis_revisi, kd_satker, kd_satker_str, tahun_anggaran, 
    jenis_paket, kd_klpd, nama_klpd, nama_satker, tgl_kaji_ulang, 
    alasan_kajiulang, kd_rup_baru, kd_rup_lama, last_update_ref
) VALUES\n`;
    finalSql += chunk.join(',\n') + ';\n\n';
}

fs.writeFileSync(sqlPath, finalSql);
console.log(`Successfully generated ${sqlPath} with ${values.length} records.`);
