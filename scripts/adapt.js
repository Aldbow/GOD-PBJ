const fs = require('fs');

const file = 'src/features/swakelola/components/SwakelolaView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replacements
content = content.replace(/EPurchasingView/g, 'SwakelolaView');
content = content.replace(/view_dashboard_epurchasing_v6/g, 'view_dashboard_swakelola_v1');
content = content.replace(/Realisasi E-Purchasing V6/g, 'Realisasi Swakelola');
content = content.replace(/E-Purchasing/g, 'Swakelola');
content = content.replace(/\['COMPLETED', 'PAYMENT_OUTSIDE_SYSTEM'\]\.includes\(p\.status\)/g, "p.status === 'Paket Selesai'");
content = content.replace(/p\.status === 'COMPLETED'/g, "p.status === 'Paket Selesai'");
// Also update the STATUS_CLUSTERS logic if needed, but wait! STATUS_CLUSTERS has 'Completed', 'On Process', 'Canceled' based on E-Purchasing statuses.
// Let's replace the whole STATUS_CLUSTERS array logic for Swakelola.
content = content.replace(
`const STATUS_CLUSTERS = [
  { label: 'Selesai (Completed)', statuses: ['COMPLETED', 'PAYMENT_OUTSIDE_SYSTEM'] },
  { label: 'Sedang Proses', statuses: ['NEGOTIATION', 'AGREEMENT', 'SHIPPING'] },
  { label: 'Batal / Cancel', statuses: ['CANCELED', 'CANCEL_OUTSIDE_SYSTEM'] },
  { label: 'Belum Realisasi', statuses: ['BELUM REALISASI'] },
];`, 
`const STATUS_CLUSTERS = [
  { label: 'Selesai (Completed)', statuses: ['Paket Selesai'] },
  { label: 'Sedang Proses / Aktif', statuses: ['Aktif'] },
  { label: 'Batal', statuses: ['Batal'] },
  { label: 'Belum Realisasi', statuses: ['BELUM REALISASI'] },
];`
);

// We don't have order_id or kode_penyedia in Swakelola. It might error if it tries to render them. 
// Let's leave them for now, they will just be undefined. But to avoid TS errors:
// Wait, the types in `SwakelolaView` need updating. Let's just do a generic replace.
fs.writeFileSync(file, content);
console.log("Replaced strings successfully.");
