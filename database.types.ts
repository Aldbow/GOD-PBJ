export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_kurasi_paket: {
        Row: {
          catatan_kurasi: string | null
          created_at: string | null
          kd_rup: number
          rekomendasi_kurasi: string | null
          status_kurasi: string | null
          updated_at: string | null
        }
        Insert: {
          catatan_kurasi?: string | null
          created_at?: string | null
          kd_rup: number
          rekomendasi_kurasi?: string | null
          status_kurasi?: string | null
          updated_at?: string | null
        }
        Update: {
          catatan_kurasi?: string | null
          created_at?: string | null
          kd_rup?: number
          rekomendasi_kurasi?: string | null
          status_kurasi?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_paket_penyedia_terumumkan: {
        Row: {
          alasan_dikecualikan: string | null
          alasan_non_ukm: string | null
          jenis_klpd: string | null
          jenis_pengadaan: string | null
          kd_jenis_pengadaan: string | null
          kd_klpd: string | null
          kd_metode_pengadaan: number | null
          kd_rup: number
          kd_rup_lokal: string | null
          kd_rup_swakelola: number | null
          kd_satker: number | null
          kd_satker_str: number | null
          kode_rup_tahun_pertama: number | null
          last_update_ref: string | null
          metode_pengadaan: string | null
          nama_klpd: string | null
          nama_paket: string | null
          nama_ppk: string | null
          nama_satker: string | null
          nip_ppk: string | null
          nomor_kontrak: string | null
          pagu: number | null
          spesifikasi_pekerjaan: string | null
          spp_aspek_ekonomi: boolean | null
          spp_aspek_lingkungan: boolean | null
          spp_aspek_sosial: boolean | null
          status_aktif_rup: boolean | null
          status_delete_rup: boolean | null
          status_dikecualikan: boolean | null
          status_konsolidasi: string | null
          status_pdn: string | null
          status_pradipa: string | null
          status_ukm: string | null
          status_umumkan_rup: string | null
          tahun_anggaran: number | null
          tahun_pertama: number | null
          tgl_akhir_kontrak: string | null
          tgl_akhir_pemanfaatan: string | null
          tgl_akhir_pemilihan: string | null
          tgl_awal_kontrak: string | null
          tgl_awal_pemanfaatan: string | null
          tgl_awal_pemilihan: string | null
          tgl_buat_paket: string | null
          tgl_pengumuman_paket: string | null
          tipe_paket: string | null
          urarian_pekerjaan: string | null
          username_ppk: string | null
          volume_pekerjaan: string | null
        }
        Insert: {
          alasan_dikecualikan?: string | null
          alasan_non_ukm?: string | null
          jenis_klpd?: string | null
          jenis_pengadaan?: string | null
          kd_jenis_pengadaan?: string | null
          kd_klpd?: string | null
          kd_metode_pengadaan?: number | null
          kd_rup: number
          kd_rup_lokal?: string | null
          kd_rup_swakelola?: number | null
          kd_satker?: number | null
          kd_satker_str?: number | null
          kode_rup_tahun_pertama?: number | null
          last_update_ref?: string | null
          metode_pengadaan?: string | null
          nama_klpd?: string | null
          nama_paket?: string | null
          nama_ppk?: string | null
          nama_satker?: string | null
          nip_ppk?: string | null
          nomor_kontrak?: string | null
          pagu?: number | null
          spesifikasi_pekerjaan?: string | null
          spp_aspek_ekonomi?: boolean | null
          spp_aspek_lingkungan?: boolean | null
          spp_aspek_sosial?: boolean | null
          status_aktif_rup?: boolean | null
          status_delete_rup?: boolean | null
          status_dikecualikan?: boolean | null
          status_konsolidasi?: string | null
          status_pdn?: string | null
          status_pradipa?: string | null
          status_ukm?: string | null
          status_umumkan_rup?: string | null
          tahun_anggaran?: number | null
          tahun_pertama?: number | null
          tgl_akhir_kontrak?: string | null
          tgl_akhir_pemanfaatan?: string | null
          tgl_akhir_pemilihan?: string | null
          tgl_awal_kontrak?: string | null
          tgl_awal_pemanfaatan?: string | null
          tgl_awal_pemilihan?: string | null
          tgl_buat_paket?: string | null
          tgl_pengumuman_paket?: string | null
          tipe_paket?: string | null
          urarian_pekerjaan?: string | null
          username_ppk?: string | null
          volume_pekerjaan?: string | null
        }
        Update: {
          alasan_dikecualikan?: string | null
          alasan_non_ukm?: string | null
          jenis_klpd?: string | null
          jenis_pengadaan?: string | null
          kd_jenis_pengadaan?: string | null
          kd_klpd?: string | null
          kd_metode_pengadaan?: number | null
          kd_rup?: number
          kd_rup_lokal?: string | null
          kd_rup_swakelola?: number | null
          kd_satker?: number | null
          kd_satker_str?: number | null
          kode_rup_tahun_pertama?: number | null
          last_update_ref?: string | null
          metode_pengadaan?: string | null
          nama_klpd?: string | null
          nama_paket?: string | null
          nama_ppk?: string | null
          nama_satker?: string | null
          nip_ppk?: string | null
          nomor_kontrak?: string | null
          pagu?: number | null
          spesifikasi_pekerjaan?: string | null
          spp_aspek_ekonomi?: boolean | null
          spp_aspek_lingkungan?: boolean | null
          spp_aspek_sosial?: boolean | null
          status_aktif_rup?: boolean | null
          status_delete_rup?: boolean | null
          status_dikecualikan?: boolean | null
          status_konsolidasi?: string | null
          status_pdn?: string | null
          status_pradipa?: string | null
          status_ukm?: string | null
          status_umumkan_rup?: string | null
          tahun_anggaran?: number | null
          tahun_pertama?: number | null
          tgl_akhir_kontrak?: string | null
          tgl_akhir_pemanfaatan?: string | null
          tgl_akhir_pemilihan?: string | null
          tgl_awal_kontrak?: string | null
          tgl_awal_pemanfaatan?: string | null
          tgl_awal_pemilihan?: string | null
          tgl_buat_paket?: string | null
          tgl_pengumuman_paket?: string | null
          tipe_paket?: string | null
          urarian_pekerjaan?: string | null
          username_ppk?: string | null
          volume_pekerjaan?: string | null
        }
        Relationships: []
      }
      api_paket_swakelola_terumumkan: {
        Row: {
          jenis_klpd: string | null
          kd_klpd: string | null
          kd_klpd_penyelenggara: string | null
          kd_rup: number
          kd_rup_lokal: string | null
          kd_satker: number | null
          kd_satker_str: string | null
          last_update_ref: string | null
          nama_klpd: string | null
          nama_klpd_penyelenggara: string | null
          nama_paket: string | null
          nama_ppk: string | null
          nama_satker: string | null
          nama_satker_penyelenggara: string | null
          nip_ppk: string | null
          pagu: number | null
          status_aktif_rup: boolean | null
          status_delete_rup: boolean | null
          status_umumkan_rup: string | null
          tahun_anggaran: number | null
          tgl_akhir_pelaksanaan_kontrak: string | null
          tgl_awal_pelaksanaan_kontrak: string | null
          tgl_buat_paket: string | null
          tgl_pengumuman_paket: string | null
          tipe_swakelola: number | null
          uraian_pekerjaan: string | null
          username_ppk: string | null
          volume_pekerjaan: string | null
        }
        Insert: {
          jenis_klpd?: string | null
          kd_klpd?: string | null
          kd_klpd_penyelenggara?: string | null
          kd_rup: number
          kd_rup_lokal?: string | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          last_update_ref?: string | null
          nama_klpd?: string | null
          nama_klpd_penyelenggara?: string | null
          nama_paket?: string | null
          nama_ppk?: string | null
          nama_satker?: string | null
          nama_satker_penyelenggara?: string | null
          nip_ppk?: string | null
          pagu?: number | null
          status_aktif_rup?: boolean | null
          status_delete_rup?: boolean | null
          status_umumkan_rup?: string | null
          tahun_anggaran?: number | null
          tgl_akhir_pelaksanaan_kontrak?: string | null
          tgl_awal_pelaksanaan_kontrak?: string | null
          tgl_buat_paket?: string | null
          tgl_pengumuman_paket?: string | null
          tipe_swakelola?: number | null
          uraian_pekerjaan?: string | null
          username_ppk?: string | null
          volume_pekerjaan?: string | null
        }
        Update: {
          jenis_klpd?: string | null
          kd_klpd?: string | null
          kd_klpd_penyelenggara?: string | null
          kd_rup?: number
          kd_rup_lokal?: string | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          last_update_ref?: string | null
          nama_klpd?: string | null
          nama_klpd_penyelenggara?: string | null
          nama_paket?: string | null
          nama_ppk?: string | null
          nama_satker?: string | null
          nama_satker_penyelenggara?: string | null
          nip_ppk?: string | null
          pagu?: number | null
          status_aktif_rup?: boolean | null
          status_delete_rup?: boolean | null
          status_umumkan_rup?: string | null
          tahun_anggaran?: number | null
          tgl_akhir_pelaksanaan_kontrak?: string | null
          tgl_awal_pelaksanaan_kontrak?: string | null
          tgl_buat_paket?: string | null
          tgl_pengumuman_paket?: string | null
          tipe_swakelola?: number | null
          uraian_pekerjaan?: string | null
          username_ppk?: string | null
          volume_pekerjaan?: string | null
        }
        Relationships: []
      }
      api_pencatatan_swakelola: {
        Row: {
          alasan_pembatalan: string | null
          informasi_lainnya: string | null
          jenis_klpd: string | null
          kd_klpd: string | null
          kd_lpse: number | null
          kd_pkt_dce: number | null
          kd_rup: number | null
          kd_satker: number | null
          kd_satker_str: string | null
          kd_swakelola_pct: number
          last_update_ref: string | null
          nama_klpd: string | null
          nama_paket: string | null
          nama_ppk: string | null
          nama_satker: string | null
          nilai_pdn_pct: number | null
          nilai_umk_pct: number | null
          nip_ppk: string | null
          pagu: number | null
          status_swakelola_pct: string | null
          status_swakelola_pct_ket: string | null
          sumber_dana: string | null
          tahun_anggaran: number | null
          tgl_buat_paket: string | null
          tgl_mulai_paket: string | null
          tgl_selesai_paket: string | null
          tipe_swakelola: string | null
          tipe_swakelola_nama: string | null
          total_realisasi: number | null
          uraian_pekerjaan: string | null
        }
        Insert: {
          alasan_pembatalan?: string | null
          informasi_lainnya?: string | null
          jenis_klpd?: string | null
          kd_klpd?: string | null
          kd_lpse?: number | null
          kd_pkt_dce?: number | null
          kd_rup?: number | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          kd_swakelola_pct: number
          last_update_ref?: string | null
          nama_klpd?: string | null
          nama_paket?: string | null
          nama_ppk?: string | null
          nama_satker?: string | null
          nilai_pdn_pct?: number | null
          nilai_umk_pct?: number | null
          nip_ppk?: string | null
          pagu?: number | null
          status_swakelola_pct?: string | null
          status_swakelola_pct_ket?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: number | null
          tgl_buat_paket?: string | null
          tgl_mulai_paket?: string | null
          tgl_selesai_paket?: string | null
          tipe_swakelola?: string | null
          tipe_swakelola_nama?: string | null
          total_realisasi?: number | null
          uraian_pekerjaan?: string | null
        }
        Update: {
          alasan_pembatalan?: string | null
          informasi_lainnya?: string | null
          jenis_klpd?: string | null
          kd_klpd?: string | null
          kd_lpse?: number | null
          kd_pkt_dce?: number | null
          kd_rup?: number | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          kd_swakelola_pct?: number
          last_update_ref?: string | null
          nama_klpd?: string | null
          nama_paket?: string | null
          nama_ppk?: string | null
          nama_satker?: string | null
          nilai_pdn_pct?: number | null
          nilai_umk_pct?: number | null
          nip_ppk?: string | null
          pagu?: number | null
          status_swakelola_pct?: string | null
          status_swakelola_pct_ket?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: number | null
          tgl_buat_paket?: string | null
          tgl_mulai_paket?: string | null
          tgl_selesai_paket?: string | null
          tipe_swakelola?: string | null
          tipe_swakelola_nama?: string | null
          total_realisasi?: number | null
          uraian_pekerjaan?: string | null
        }
        Relationships: []
      }
      data_afirmasi_pdn_perencanaan: {
        Row: {
          barang: number | null
          belanja_pengadaan: number | null
          created_at: string | null
          epurchasing: number | null
          id: number
          jasa_konsultasi: number | null
          jasa_lainnya: number | null
          metode_lainnya: number | null
          nama_satuan_kerja: string | null
          pekerjaan_konstruksi: number | null
          pengadaan_langsung: number | null
          penunjukan_langsung: number | null
          rup_terhadap_belanja_pengadaan: number | null
          tender_seleksi: number | null
          terintegrasi_gabungan: number | null
          total_perencanaan_penyedia: number | null
          total_perencanaan_swakelola: number | null
          total_rup: number | null
        }
        Insert: {
          barang?: number | null
          belanja_pengadaan?: number | null
          created_at?: string | null
          epurchasing?: number | null
          id?: number
          jasa_konsultasi?: number | null
          jasa_lainnya?: number | null
          metode_lainnya?: number | null
          nama_satuan_kerja?: string | null
          pekerjaan_konstruksi?: number | null
          pengadaan_langsung?: number | null
          penunjukan_langsung?: number | null
          rup_terhadap_belanja_pengadaan?: number | null
          tender_seleksi?: number | null
          terintegrasi_gabungan?: number | null
          total_perencanaan_penyedia?: number | null
          total_perencanaan_swakelola?: number | null
          total_rup?: number | null
        }
        Update: {
          barang?: number | null
          belanja_pengadaan?: number | null
          created_at?: string | null
          epurchasing?: number | null
          id?: number
          jasa_konsultasi?: number | null
          jasa_lainnya?: number | null
          metode_lainnya?: number | null
          nama_satuan_kerja?: string | null
          pekerjaan_konstruksi?: number | null
          pengadaan_langsung?: number | null
          penunjukan_langsung?: number | null
          rup_terhadap_belanja_pengadaan?: number | null
          tender_seleksi?: number | null
          terintegrasi_gabungan?: number | null
          total_perencanaan_penyedia?: number | null
          total_perencanaan_swakelola?: number | null
          total_rup?: number | null
        }
        Relationships: []
      }
      data_jf_kemnaker: {
        Row: {
          created_at: string
          id: string
          Jenjang: string | null
          Nama: string | null
          NIP: string | null
          No: string | null
          Penugasan: string | null
          "Unit Kerja": string | null
        }
        Insert: {
          created_at?: string
          id?: string
          Jenjang?: string | null
          Nama?: string | null
          NIP?: string | null
          No?: string | null
          Penugasan?: string | null
          "Unit Kerja"?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          Jenjang?: string | null
          Nama?: string | null
          NIP?: string | null
          No?: string | null
          Penugasan?: string | null
          "Unit Kerja"?: string | null
        }
        Relationships: []
      }
      data_renaksi: {
        Row: {
          created_at: string
          id: number
          No: number | null
          "Pelaku Pengadaan": string | null
          Renaksi: string | null
          Tahun: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          No?: number | null
          "Pelaku Pengadaan"?: string | null
          Renaksi?: string | null
          Tahun?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          No?: number | null
          "Pelaku Pengadaan"?: string | null
          Renaksi?: string | null
          Tahun?: number | null
        }
        Relationships: []
      }
      formasi_jf_ukpbj: {
        Row: {
          created_at: string
          "Formasi Kebutuhan": number | null
          "Formasi Terpenuhi": number | null
          id: string
          Jenjang: string | null
          Kekurangan: number | null
          No: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          "Formasi Kebutuhan"?: number | null
          "Formasi Terpenuhi"?: number | null
          id?: string
          Jenjang?: string | null
          Kekurangan?: number | null
          No?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          "Formasi Kebutuhan"?: number | null
          "Formasi Terpenuhi"?: number | null
          id?: string
          Jenjang?: string | null
          Kekurangan?: number | null
          No?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      history_kaji_ulang: {
        Row: {
          alasan_kajiulang: string | null
          id: number
          jenis_klpd: string | null
          jenis_paket: string | null
          jenis_revisi: string | null
          kd_klpd: string | null
          kd_rup_baru: number | null
          kd_rup_lama: number | null
          kd_satker: number | null
          kd_satker_str: string | null
          last_update_ref: string | null
          nama_klpd: string | null
          nama_satker: string | null
          tahun_anggaran: number | null
          tgl_kaji_ulang: string | null
        }
        Insert: {
          alasan_kajiulang?: string | null
          id?: number
          jenis_klpd?: string | null
          jenis_paket?: string | null
          jenis_revisi?: string | null
          kd_klpd?: string | null
          kd_rup_baru?: number | null
          kd_rup_lama?: number | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          last_update_ref?: string | null
          nama_klpd?: string | null
          nama_satker?: string | null
          tahun_anggaran?: number | null
          tgl_kaji_ulang?: string | null
        }
        Update: {
          alasan_kajiulang?: string | null
          id?: number
          jenis_klpd?: string | null
          jenis_paket?: string | null
          jenis_revisi?: string | null
          kd_klpd?: string | null
          kd_rup_baru?: number | null
          kd_rup_lama?: number | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          last_update_ref?: string | null
          nama_klpd?: string | null
          nama_satker?: string | null
          tahun_anggaran?: number | null
          tgl_kaji_ulang?: string | null
        }
        Relationships: []
      }
      master_data: {
        Row: {
          "KODE PPK": string | null
          "KODE SATKER_str": string | null
          "KODE UNIT": number | null
          KPA: string | null
          "NAMA PPK": string | null
          "NIP PPK": string | null
          NO: number
          SATKER: string | null
          "SATUAN KERJA": string | null
          "UNIT KERJA": string | null
          WILAYAH: string | null
        }
        Insert: {
          "KODE PPK"?: string | null
          "KODE SATKER_str"?: string | null
          "KODE UNIT"?: number | null
          KPA?: string | null
          "NAMA PPK"?: string | null
          "NIP PPK"?: string | null
          NO: number
          SATKER?: string | null
          "SATUAN KERJA"?: string | null
          "UNIT KERJA"?: string | null
          WILAYAH?: string | null
        }
        Update: {
          "KODE PPK"?: string | null
          "KODE SATKER_str"?: string | null
          "KODE UNIT"?: number | null
          KPA?: string | null
          "NAMA PPK"?: string | null
          "NIP PPK"?: string | null
          NO?: number
          SATKER?: string | null
          "SATUAN KERJA"?: string | null
          "UNIT KERJA"?: string | null
          WILAYAH?: string | null
        }
        Relationships: []
      }
      master_data_pn: {
        Row: {
          capaian_anggaran_pct: string | null
          capaian_fisik_pct: string | null
          created_at: string
          id: string
          kode_ro: string | null
          nama_ro: string | null
          no: string | null
          pagu: string | null
          realisasi_anggaran: string | null
          realisasi_volume: string | null
          satuan: string | null
          selisih_pagu: string | null
          status: string | null
          target_volume: string | null
          unit: string | null
        }
        Insert: {
          capaian_anggaran_pct?: string | null
          capaian_fisik_pct?: string | null
          created_at?: string
          id?: string
          kode_ro?: string | null
          nama_ro?: string | null
          no?: string | null
          pagu?: string | null
          realisasi_anggaran?: string | null
          realisasi_volume?: string | null
          satuan?: string | null
          selisih_pagu?: string | null
          status?: string | null
          target_volume?: string | null
          unit?: string | null
        }
        Update: {
          capaian_anggaran_pct?: string | null
          capaian_fisik_pct?: string | null
          created_at?: string
          id?: string
          kode_ro?: string | null
          nama_ro?: string | null
          no?: string | null
          pagu?: string | null
          realisasi_anggaran?: string | null
          realisasi_volume?: string | null
          satuan?: string | null
          selisih_pagu?: string | null
          status?: string | null
          target_volume?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      master_data_ro: {
        Row: {
          created_at: string
          id: string
          kd_rup: string | null
          nama_paket: string | null
          nama_ro: string | null
          nilai_paket: string | null
          no: string | null
          skema: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kd_rup?: string | null
          nama_paket?: string | null
          nama_ro?: string | null
          nilai_paket?: string | null
          no?: string | null
          skema?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kd_rup?: string | null
          nama_paket?: string | null
          nama_ro?: string | null
          nilai_paket?: string | null
          no?: string | null
          skema?: string | null
        }
        Relationships: []
      }
      non_tender_selesai: {
        Row: {
          created_at: string
          hps: string | null
          id: string
          jenis_klpd: string | null
          jenis_pengadaan: string | null
          kabkota: string | null
          kd_klpd: string | null
          kd_lpse: string | null
          kd_nontender: string | null
          kd_penyedia: string | null
          kd_pkt_dce: string | null
          kd_rup: string | null
          kd_satker: string | null
          kd_satker_str: string | null
          kontrak_id: string | null
          kontrak_pembayaran: string | null
          kualifikasi_paket: string | null
          last_update_ref: string | null
          lls_id: string | null
          lokasi_pekerjaan: string | null
          lpse_id: string | null
          mak: string | null
          mtd_pemilihan: string | null
          nama_klpd: string | null
          nama_lpse: string | null
          nama_paket: string | null
          nama_penyedia: string | null
          nama_satker: string | null
          nilai_kontrak: string | null
          nilai_negosiasi: string | null
          nilai_pdn_kontrak: string | null
          nilai_penawaran: string | null
          nilai_terkoreksi: string | null
          nilai_umk_kontrak: string | null
          npwp_penyedia: string | null
          npwp16_penyedia: string | null
          pagu: string | null
          provinsi: string | null
          status_nontender: string | null
          sumber_dana: string | null
          tahun_anggaran: string | null
          tgl_pengumuman_nontender: string | null
          tgl_selesai_nontender: string | null
          url_lpse: string | null
        }
        Insert: {
          created_at?: string
          hps?: string | null
          id?: string
          jenis_klpd?: string | null
          jenis_pengadaan?: string | null
          kabkota?: string | null
          kd_klpd?: string | null
          kd_lpse?: string | null
          kd_nontender?: string | null
          kd_penyedia?: string | null
          kd_pkt_dce?: string | null
          kd_rup?: string | null
          kd_satker?: string | null
          kd_satker_str?: string | null
          kontrak_id?: string | null
          kontrak_pembayaran?: string | null
          kualifikasi_paket?: string | null
          last_update_ref?: string | null
          lls_id?: string | null
          lokasi_pekerjaan?: string | null
          lpse_id?: string | null
          mak?: string | null
          mtd_pemilihan?: string | null
          nama_klpd?: string | null
          nama_lpse?: string | null
          nama_paket?: string | null
          nama_penyedia?: string | null
          nama_satker?: string | null
          nilai_kontrak?: string | null
          nilai_negosiasi?: string | null
          nilai_pdn_kontrak?: string | null
          nilai_penawaran?: string | null
          nilai_terkoreksi?: string | null
          nilai_umk_kontrak?: string | null
          npwp_penyedia?: string | null
          npwp16_penyedia?: string | null
          pagu?: string | null
          provinsi?: string | null
          status_nontender?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: string | null
          tgl_pengumuman_nontender?: string | null
          tgl_selesai_nontender?: string | null
          url_lpse?: string | null
        }
        Update: {
          created_at?: string
          hps?: string | null
          id?: string
          jenis_klpd?: string | null
          jenis_pengadaan?: string | null
          kabkota?: string | null
          kd_klpd?: string | null
          kd_lpse?: string | null
          kd_nontender?: string | null
          kd_penyedia?: string | null
          kd_pkt_dce?: string | null
          kd_rup?: string | null
          kd_satker?: string | null
          kd_satker_str?: string | null
          kontrak_id?: string | null
          kontrak_pembayaran?: string | null
          kualifikasi_paket?: string | null
          last_update_ref?: string | null
          lls_id?: string | null
          lokasi_pekerjaan?: string | null
          lpse_id?: string | null
          mak?: string | null
          mtd_pemilihan?: string | null
          nama_klpd?: string | null
          nama_lpse?: string | null
          nama_paket?: string | null
          nama_penyedia?: string | null
          nama_satker?: string | null
          nilai_kontrak?: string | null
          nilai_negosiasi?: string | null
          nilai_pdn_kontrak?: string | null
          nilai_penawaran?: string | null
          nilai_terkoreksi?: string | null
          nilai_umk_kontrak?: string | null
          npwp_penyedia?: string | null
          npwp16_penyedia?: string | null
          pagu?: string | null
          provinsi?: string | null
          status_nontender?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: string | null
          tgl_pengumuman_nontender?: string | null
          tgl_selesai_nontender?: string | null
          url_lpse?: string | null
        }
        Relationships: []
      }
      paket_anggaran_penyedia: {
        Row: {
          asal_dana: string | null
          asal_dana_klpd: string | null
          asal_dana_satker: string | null
          id_paket_anggaran_penyedia: number
          jenis_dana_apbn: string | null
          jenis_klpd: string | null
          kd_kegiatan: string | null
          kd_klpd: string | null
          kd_komponen: string | null
          kd_rup: number | null
          kd_rup_lokal: string | null
          kd_satker: number | null
          kd_satker_str: string | null
          kd_subkegiatan: string | null
          last_update_ref: string | null
          mak: string | null
          nama_klpd: string | null
          nama_satker: string | null
          pagu: number | null
          status_aktif_rup: string | null
          status_delete_rup: string | null
          status_umumkan_rup: string | null
          sumber_dana: string | null
          tahun_anggaran: string | null
          tahun_anggaran_dana: string | null
        }
        Insert: {
          asal_dana?: string | null
          asal_dana_klpd?: string | null
          asal_dana_satker?: string | null
          id_paket_anggaran_penyedia: number
          jenis_dana_apbn?: string | null
          jenis_klpd?: string | null
          kd_kegiatan?: string | null
          kd_klpd?: string | null
          kd_komponen?: string | null
          kd_rup?: number | null
          kd_rup_lokal?: string | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          kd_subkegiatan?: string | null
          last_update_ref?: string | null
          mak?: string | null
          nama_klpd?: string | null
          nama_satker?: string | null
          pagu?: number | null
          status_aktif_rup?: string | null
          status_delete_rup?: string | null
          status_umumkan_rup?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: string | null
          tahun_anggaran_dana?: string | null
        }
        Update: {
          asal_dana?: string | null
          asal_dana_klpd?: string | null
          asal_dana_satker?: string | null
          id_paket_anggaran_penyedia?: number
          jenis_dana_apbn?: string | null
          jenis_klpd?: string | null
          kd_kegiatan?: string | null
          kd_klpd?: string | null
          kd_komponen?: string | null
          kd_rup?: number | null
          kd_rup_lokal?: string | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          kd_subkegiatan?: string | null
          last_update_ref?: string | null
          mak?: string | null
          nama_klpd?: string | null
          nama_satker?: string | null
          pagu?: number | null
          status_aktif_rup?: string | null
          status_delete_rup?: string | null
          status_umumkan_rup?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: string | null
          tahun_anggaran_dana?: string | null
        }
        Relationships: []
      }
      paket_anggaran_swakelola: {
        Row: {
          asal_dana: string | null
          asal_dana_klpd: string | null
          asal_dana_satker: string | null
          id_paket_anggaran_swakelola: number
          jenis_dana_apbn: string | null
          jenis_klpd: string | null
          kd_kegiatan: string | null
          kd_klpd: string | null
          kd_komponen: string | null
          kd_rup: number | null
          kd_rup_lokal: string | null
          kd_satker: number | null
          kd_satker_str: string | null
          kd_subkegiatan: string | null
          last_update_ref: string | null
          mak: string | null
          nama_klpd: string | null
          nama_satker: string | null
          pagu: number | null
          status_aktif_rup: string | null
          status_delete_rup: string | null
          status_umumkan_rup: string | null
          sumber_dana: string | null
          tahun_anggaran: string | null
          tahun_anggaran_dana: string | null
        }
        Insert: {
          asal_dana?: string | null
          asal_dana_klpd?: string | null
          asal_dana_satker?: string | null
          id_paket_anggaran_swakelola: number
          jenis_dana_apbn?: string | null
          jenis_klpd?: string | null
          kd_kegiatan?: string | null
          kd_klpd?: string | null
          kd_komponen?: string | null
          kd_rup?: number | null
          kd_rup_lokal?: string | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          kd_subkegiatan?: string | null
          last_update_ref?: string | null
          mak?: string | null
          nama_klpd?: string | null
          nama_satker?: string | null
          pagu?: number | null
          status_aktif_rup?: string | null
          status_delete_rup?: string | null
          status_umumkan_rup?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: string | null
          tahun_anggaran_dana?: string | null
        }
        Update: {
          asal_dana?: string | null
          asal_dana_klpd?: string | null
          asal_dana_satker?: string | null
          id_paket_anggaran_swakelola?: number
          jenis_dana_apbn?: string | null
          jenis_klpd?: string | null
          kd_kegiatan?: string | null
          kd_klpd?: string | null
          kd_komponen?: string | null
          kd_rup?: number | null
          kd_rup_lokal?: string | null
          kd_satker?: number | null
          kd_satker_str?: string | null
          kd_subkegiatan?: string | null
          last_update_ref?: string | null
          mak?: string | null
          nama_klpd?: string | null
          nama_satker?: string | null
          pagu?: number | null
          status_aktif_rup?: string | null
          status_delete_rup?: string | null
          status_umumkan_rup?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: string | null
          tahun_anggaran_dana?: string | null
        }
        Relationships: []
      }
      paket_e_purchasing: {
        Row: {
          count_product: number | null
          fiscal_year: number | null
          flag_minikom: string | null
          funding_source: string | null
          kode_klpd: string | null
          kode_penyedia: string | null
          kode_satker: string | null
          last_update_ref: string | null
          mak: string | null
          nama_satker: string | null
          order_date: string | null
          order_id: string
          product_id: string | null
          rekan_id: string | null
          rup_code: string | null
          rup_desc: string | null
          rup_name: string | null
          shipment_status: string | null
          shipping_fee: number | null
          status: string | null
          total: number | null
          total_qty: number | null
        }
        Insert: {
          count_product?: number | null
          fiscal_year?: number | null
          flag_minikom?: string | null
          funding_source?: string | null
          kode_klpd?: string | null
          kode_penyedia?: string | null
          kode_satker?: string | null
          last_update_ref?: string | null
          mak?: string | null
          nama_satker?: string | null
          order_date?: string | null
          order_id: string
          product_id?: string | null
          rekan_id?: string | null
          rup_code?: string | null
          rup_desc?: string | null
          rup_name?: string | null
          shipment_status?: string | null
          shipping_fee?: number | null
          status?: string | null
          total?: number | null
          total_qty?: number | null
        }
        Update: {
          count_product?: number | null
          fiscal_year?: number | null
          flag_minikom?: string | null
          funding_source?: string | null
          kode_klpd?: string | null
          kode_penyedia?: string | null
          kode_satker?: string | null
          last_update_ref?: string | null
          mak?: string | null
          nama_satker?: string | null
          order_date?: string | null
          order_id?: string
          product_id?: string | null
          rekan_id?: string | null
          rup_code?: string | null
          rup_desc?: string | null
          rup_name?: string | null
          shipment_status?: string | null
          shipping_fee?: number | null
          status?: string | null
          total?: number | null
          total_qty?: number | null
        }
        Relationships: []
      }
      pencatatan_non_tender_realisasi: {
        Row: {
          created_at: string | null
          dok_realisasi: string | null
          id: string
          jenis_klpd: string | null
          jenis_realisasi: string | null
          kd_klpd: string | null
          kd_lpse: string | null
          kd_nontender_pct: string | null
          kd_paket_dce: string | null
          kd_rup_paket: string | null
          kd_satker: string | null
          kd_satker_str: string | null
          ket_realisasi: string | null
          last_update_ref: string | null
          nama_klpd: string | null
          nama_lpse: string | null
          nama_paket: string | null
          nama_penyedia: string | null
          nama_ppk: string | null
          nama_satker: string | null
          nilai_realisasi: string | null
          nip_ppk: string | null
          no_realisasi: string | null
          npwp_penyedia: string | null
          pagu: string | null
          tahun_anggaran: string | null
          tgl_realisasi: string | null
        }
        Insert: {
          created_at?: string | null
          dok_realisasi?: string | null
          id?: string
          jenis_klpd?: string | null
          jenis_realisasi?: string | null
          kd_klpd?: string | null
          kd_lpse?: string | null
          kd_nontender_pct?: string | null
          kd_paket_dce?: string | null
          kd_rup_paket?: string | null
          kd_satker?: string | null
          kd_satker_str?: string | null
          ket_realisasi?: string | null
          last_update_ref?: string | null
          nama_klpd?: string | null
          nama_lpse?: string | null
          nama_paket?: string | null
          nama_penyedia?: string | null
          nama_ppk?: string | null
          nama_satker?: string | null
          nilai_realisasi?: string | null
          nip_ppk?: string | null
          no_realisasi?: string | null
          npwp_penyedia?: string | null
          pagu?: string | null
          tahun_anggaran?: string | null
          tgl_realisasi?: string | null
        }
        Update: {
          created_at?: string | null
          dok_realisasi?: string | null
          id?: string
          jenis_klpd?: string | null
          jenis_realisasi?: string | null
          kd_klpd?: string | null
          kd_lpse?: string | null
          kd_nontender_pct?: string | null
          kd_paket_dce?: string | null
          kd_rup_paket?: string | null
          kd_satker?: string | null
          kd_satker_str?: string | null
          ket_realisasi?: string | null
          last_update_ref?: string | null
          nama_klpd?: string | null
          nama_lpse?: string | null
          nama_paket?: string | null
          nama_penyedia?: string | null
          nama_ppk?: string | null
          nama_satker?: string | null
          nilai_realisasi?: string | null
          nip_ppk?: string | null
          no_realisasi?: string | null
          npwp_penyedia?: string | null
          pagu?: string | null
          tahun_anggaran?: string | null
          tgl_realisasi?: string | null
        }
        Relationships: []
      }
      pencatatan_swakelola_realisasi: {
        Row: {
          created_at: string | null
          dok_realisasi: string | null
          id: number
          jenis_realisasi: string | null
          kd_klpd: string | null
          kd_lpse: string | null
          kd_satker: string | null
          kd_swakelola_pct: string | null
          ket_realisasi: string | null
          last_update_ref: string | null
          nama_pelaksana: string | null
          nama_ppk: string | null
          nilai_realisasi: number | null
          nip_ppk: string | null
          no_realisasi: string | null
          npwp_pelaksana: string | null
          rn_id: string | null
          rsk_id: string | null
          tahun_anggaran: number | null
          tgl_realisasi: string | null
        }
        Insert: {
          created_at?: string | null
          dok_realisasi?: string | null
          id?: number
          jenis_realisasi?: string | null
          kd_klpd?: string | null
          kd_lpse?: string | null
          kd_satker?: string | null
          kd_swakelola_pct?: string | null
          ket_realisasi?: string | null
          last_update_ref?: string | null
          nama_pelaksana?: string | null
          nama_ppk?: string | null
          nilai_realisasi?: number | null
          nip_ppk?: string | null
          no_realisasi?: string | null
          npwp_pelaksana?: string | null
          rn_id?: string | null
          rsk_id?: string | null
          tahun_anggaran?: number | null
          tgl_realisasi?: string | null
        }
        Update: {
          created_at?: string | null
          dok_realisasi?: string | null
          id?: number
          jenis_realisasi?: string | null
          kd_klpd?: string | null
          kd_lpse?: string | null
          kd_satker?: string | null
          kd_swakelola_pct?: string | null
          ket_realisasi?: string | null
          last_update_ref?: string | null
          nama_pelaksana?: string | null
          nama_ppk?: string | null
          nilai_realisasi?: number | null
          nip_ppk?: string | null
          no_realisasi?: string | null
          npwp_pelaksana?: string | null
          rn_id?: string | null
          rsk_id?: string | null
          tahun_anggaran?: number | null
          tgl_realisasi?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          eselon1: string | null
          full_name: string
          id: string
          is_active: boolean
          ppk_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          satker: string | null
        }
        Insert: {
          created_at?: string
          eselon1?: string | null
          full_name: string
          id: string
          is_active?: boolean
          ppk_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          satker?: string | null
        }
        Update: {
          created_at?: string
          eselon1?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          ppk_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          satker?: string | null
        }
        Relationships: []
      }
      risiko_pengadaan: {
        Row: {
          calculated_at: string | null
          components_json: Json | null
          created_at: string | null
          data_quality_flags: string[]
          eselon1: string | null
          execution_evidence_date: string | null
          execution_evidence_source: string | null
          execution_status: string | null
          jenis_paket: string
          jenis_pengadaan: string | null
          jumlah_revisi: number | null
          kategori: string
          kd_rup: string
          main_risk_driver: string | null
          max_score: number
          metode_pengadaan: string | null
          nama_paket: string | null
          nama_ppk: string | null
          pagu: number | null
          revision_chain_json: Json | null
          rules_version: string
          satker: string | null
          sumber_dana: string | null
          tahun_anggaran: number | null
          tipe_swakelola: string | null
          total_score: number | null
          transaction_refs_json: Json | null
          updated_at: string | null
        }
        Insert: {
          calculated_at?: string | null
          components_json?: Json | null
          created_at?: string | null
          data_quality_flags?: string[]
          eselon1?: string | null
          execution_evidence_date?: string | null
          execution_evidence_source?: string | null
          execution_status?: string | null
          jenis_paket: string
          jenis_pengadaan?: string | null
          jumlah_revisi?: number | null
          kategori: string
          kd_rup: string
          main_risk_driver?: string | null
          max_score: number
          metode_pengadaan?: string | null
          nama_paket?: string | null
          nama_ppk?: string | null
          pagu?: number | null
          revision_chain_json?: Json | null
          rules_version: string
          satker?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: number | null
          tipe_swakelola?: string | null
          total_score?: number | null
          transaction_refs_json?: Json | null
          updated_at?: string | null
        }
        Update: {
          calculated_at?: string | null
          components_json?: Json | null
          created_at?: string | null
          data_quality_flags?: string[]
          eselon1?: string | null
          execution_evidence_date?: string | null
          execution_evidence_source?: string | null
          execution_status?: string | null
          jenis_paket?: string
          jenis_pengadaan?: string | null
          jumlah_revisi?: number | null
          kategori?: string
          kd_rup?: string
          main_risk_driver?: string | null
          max_score?: number
          metode_pengadaan?: string | null
          nama_paket?: string | null
          nama_ppk?: string | null
          pagu?: number | null
          revision_chain_json?: Json | null
          rules_version?: string
          satker?: string | null
          sumber_dana?: string | null
          tahun_anggaran?: number | null
          tipe_swakelola?: string | null
          total_score?: number | null
          transaction_refs_json?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      satker_kode_alias: {
        Row: {
          keterangan: string | null
          kode_alias: string
          kode_master: string
          satuan_kerja: string | null
        }
        Insert: {
          keterangan?: string | null
          kode_alias: string
          kode_master: string
          satuan_kerja?: string | null
        }
        Update: {
          keterangan?: string | null
          kode_alias?: string
          kode_master?: string
          satuan_kerja?: string | null
        }
        Relationships: []
      }
      tender_selesai_nilai: {
        Row: {
          hps: number | null
          jenis_klpd: string | null
          kabkota: string | null
          kd_klpd: string | null
          kd_lpse: string | null
          kd_paket: string | null
          kd_penyedia: string | null
          kd_rup_paket: string | null
          kd_satker: string | null
          kd_tender: string
          last_update_ref: string | null
          lokasi_pekerjaan: string | null
          nama_klpd: string | null
          nama_penyedia: string | null
          nama_satker: string | null
          nilai_kontrak: number | null
          nilai_negosiasi: number | null
          nilai_pdn_kontrak: number | null
          nilai_penawaran: number | null
          nilai_terkoreksi: number | null
          nilai_umk_kontrak: number | null
          npwp_16_penyedia: string | null
          npwp_penyedia: string | null
          pagu: number | null
          provinsi: string | null
          psr_id: string | null
          tahun_anggaran: string | null
          tgl_penetapan_pemenang: string | null
          tgl_pengumuman_tender: string | null
        }
        Insert: {
          hps?: number | null
          jenis_klpd?: string | null
          kabkota?: string | null
          kd_klpd?: string | null
          kd_lpse?: string | null
          kd_paket?: string | null
          kd_penyedia?: string | null
          kd_rup_paket?: string | null
          kd_satker?: string | null
          kd_tender: string
          last_update_ref?: string | null
          lokasi_pekerjaan?: string | null
          nama_klpd?: string | null
          nama_penyedia?: string | null
          nama_satker?: string | null
          nilai_kontrak?: number | null
          nilai_negosiasi?: number | null
          nilai_pdn_kontrak?: number | null
          nilai_penawaran?: number | null
          nilai_terkoreksi?: number | null
          nilai_umk_kontrak?: number | null
          npwp_16_penyedia?: string | null
          npwp_penyedia?: string | null
          pagu?: number | null
          provinsi?: string | null
          psr_id?: string | null
          tahun_anggaran?: string | null
          tgl_penetapan_pemenang?: string | null
          tgl_pengumuman_tender?: string | null
        }
        Update: {
          hps?: number | null
          jenis_klpd?: string | null
          kabkota?: string | null
          kd_klpd?: string | null
          kd_lpse?: string | null
          kd_paket?: string | null
          kd_penyedia?: string | null
          kd_rup_paket?: string | null
          kd_satker?: string | null
          kd_tender?: string
          last_update_ref?: string | null
          lokasi_pekerjaan?: string | null
          nama_klpd?: string | null
          nama_penyedia?: string | null
          nama_satker?: string | null
          nilai_kontrak?: number | null
          nilai_negosiasi?: number | null
          nilai_pdn_kontrak?: number | null
          nilai_penawaran?: number | null
          nilai_terkoreksi?: number | null
          nilai_umk_kontrak?: number | null
          npwp_16_penyedia?: string | null
          npwp_penyedia?: string | null
          pagu?: number | null
          provinsi?: string | null
          psr_id?: string | null
          tahun_anggaran?: string | null
          tgl_penetapan_pemenang?: string | null
          tgl_pengumuman_tender?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      view_dashboard_epurchasing_v6: {
        Row: {
          catatan_kurasi: string | null
          eselon1: string | null
          is_from_sirup: boolean | null
          jenis_pengadaan: string | null
          kd_rup: number | null
          kode_klpd: string | null
          kode_penyedia: string | null
          nama_ppk: string | null
          order_id: string | null
          pagu: number | null
          rekomendasi_kurasi: string | null
          rup_name: string | null
          satker: string | null
          status: string | null
          status_aktif_rup: boolean | null
          status_kurasi: string | null
          tgl_pengumuman_paket: string | null
          total: number | null
        }
        Relationships: []
      }
      view_dashboard_gabungan_satker: {
        Row: {
          catatan_kurasi: string | null
          is_from_sirup: boolean | null
          jenis_pengadaan: string | null
          kd_rup: string | null
          metode_pengadaan: string | null
          nama_ppk: string | null
          pagu: number | null
          rekomendasi_kurasi: string | null
          rup_name: string | null
          satker: string | null
          status: string | null
          status_aktif_rup: boolean | null
          status_kurasi: string | null
          total: number | null
        }
        Relationships: []
      }
      view_dashboard_keterisian_sirup_eselon1: {
        Row: {
          barang: number | null
          belanja_pengadaan: number | null
          epurchasing: number | null
          jasa_konsultasi: number | null
          jasa_lainnya: number | null
          metode_lainnya: number | null
          nama_eselon1: string | null
          pekerjaan_konstruksi: number | null
          pengadaan_langsung: number | null
          penunjukan_langsung: number | null
          tender_seleksi: number | null
          terintegrasi_gabungan: number | null
          total_perencanaan_penyedia: number | null
          total_perencanaan_swakelola: number | null
          total_rup: number | null
        }
        Relationships: []
      }
      view_dashboard_pengadaan_langsung: {
        Row: {
          catatan_kurasi: string | null
          eselon1: string | null
          is_from_sirup: boolean | null
          is_multiple_rup: boolean | null
          jenis_pengadaan: string | null
          kd_rup: string | null
          kode_penyedia: string | null
          metode_pengadaan: string | null
          nama_ppk: string | null
          pagu: number | null
          rekomendasi_kurasi: string | null
          rup_name: string | null
          satker: string | null
          status: string | null
          status_aktif_rup: boolean | null
          status_kurasi: string | null
          total: number | null
          total_pencatatan: number | null
          total_transaksional: number | null
        }
        Relationships: []
      }
      view_dashboard_penunjukan_langsung: {
        Row: {
          catatan_kurasi: string | null
          eselon1: string | null
          is_from_sirup: boolean | null
          is_multiple_rup: boolean | null
          jenis_pengadaan: string | null
          kd_rup: string | null
          kode_penyedia: string | null
          nama_ppk: string | null
          pagu: number | null
          rekomendasi_kurasi: string | null
          rup_name: string | null
          satker: string | null
          status: string | null
          status_aktif_rup: boolean | null
          status_kurasi: string | null
          total: number | null
          total_pencatatan: number | null
          total_transaksional: number | null
        }
        Relationships: []
      }
      view_dashboard_swakelola_v1: {
        Row: {
          catatan_kurasi: string | null
          eselon1: string | null
          is_from_sirup: boolean | null
          kd_klpd_penyelenggara: string | null
          kd_rup: number | null
          kode_klpd: string | null
          kode_penyedia: string | null
          nama_klpd_penyelenggara: string | null
          nama_ppk: string | null
          nama_satker_penyelenggara: string | null
          order_id: number | null
          pagu: number | null
          rekomendasi_kurasi: string | null
          rup_name: string | null
          satker: string | null
          status: string | null
          status_aktif_rup: boolean | null
          status_kurasi: string | null
          tgl_pengumuman_paket: string | null
          tipe_swakelola: string | null
          total: number | null
        }
        Relationships: []
      }
      view_dashboard_tender: {
        Row: {
          catatan_kurasi: string | null
          eselon1: string | null
          is_from_sirup: boolean | null
          is_multiple_rup: boolean | null
          jenis_pengadaan: string | null
          kd_rup: string | null
          kode_penyedia: string | null
          metode_pengadaan: string | null
          nama_ppk: string | null
          pagu: number | null
          rekomendasi_kurasi: string | null
          rup_name: string | null
          satker: string | null
          status: string | null
          status_aktif_rup: boolean | null
          status_kurasi: string | null
          total: number | null
        }
        Relationships: []
      }
      view_paket_penyedia_master_data: {
        Row: {
          alasan_dikecualikan: string | null
          alasan_non_ukm: string | null
          catatan_kurasi: string | null
          jenis_klpd: string | null
          jenis_pengadaan: string | null
          kd_jenis_pengadaan: string | null
          kd_klpd: string | null
          kd_metode_pengadaan: number | null
          kd_rup: number | null
          kd_rup_lokal: string | null
          kd_rup_swakelola: number | null
          kd_satker: number | null
          kd_satker_str: number | null
          "KODE PPK": string | null
          "KODE UNIT": number | null
          kode_rup_tahun_pertama: number | null
          KPA: string | null
          last_update_ref: string | null
          MASTER_NAMA_PPK: string | null
          MASTER_NIP_PPK: string | null
          metode_pengadaan: string | null
          nama_klpd: string | null
          nama_paket: string | null
          nama_ppk: string | null
          nama_satker: string | null
          nip_ppk: string | null
          NO: number | null
          nomor_kontrak: string | null
          pagu: number | null
          rekomendasi_kurasi: string | null
          SATKER: string | null
          "SATUAN KERJA": string | null
          spesifikasi_pekerjaan: string | null
          spp_aspek_ekonomi: boolean | null
          spp_aspek_lingkungan: boolean | null
          spp_aspek_sosial: boolean | null
          status_aktif_rup: boolean | null
          status_delete_rup: boolean | null
          status_dikecualikan: boolean | null
          status_konsolidasi: string | null
          status_kurasi: string | null
          status_pdn: string | null
          status_pradipa: string | null
          status_ukm: string | null
          status_umumkan_rup: string | null
          tahun_anggaran: number | null
          tahun_pertama: number | null
          tgl_akhir_kontrak: string | null
          tgl_akhir_pemanfaatan: string | null
          tgl_akhir_pemilihan: string | null
          tgl_awal_kontrak: string | null
          tgl_awal_pemanfaatan: string | null
          tgl_awal_pemilihan: string | null
          tgl_buat_paket: string | null
          tgl_pengumuman_paket: string | null
          tipe_paket: string | null
          "UNIT KERJA": string | null
          urarian_pekerjaan: string | null
          username_ppk: string | null
          volume_pekerjaan: string | null
          WILAYAH: string | null
        }
        Relationships: []
      }
      view_paket_swakelola_master_data: {
        Row: {
          catatan_kurasi: string | null
          jenis_klpd: string | null
          kd_klpd: string | null
          kd_klpd_penyelenggara: string | null
          kd_rup: number | null
          kd_rup_lokal: string | null
          kd_satker: number | null
          kd_satker_str: string | null
          "KODE PPK": string | null
          "KODE UNIT": number | null
          KPA: string | null
          last_update_ref: string | null
          MASTER_NAMA_PPK: string | null
          MASTER_NIP_PPK: string | null
          nama_klpd: string | null
          nama_klpd_penyelenggara: string | null
          nama_paket: string | null
          nama_ppk: string | null
          nama_satker: string | null
          nama_satker_penyelenggara: string | null
          nip_ppk: string | null
          NO: number | null
          pagu: number | null
          rekomendasi_kurasi: string | null
          SATKER: string | null
          "SATUAN KERJA": string | null
          status_aktif_rup: boolean | null
          status_delete_rup: boolean | null
          status_kurasi: string | null
          status_umumkan_rup: string | null
          tahun_anggaran: number | null
          tgl_akhir_pelaksanaan_kontrak: string | null
          tgl_awal_pelaksanaan_kontrak: string | null
          tgl_buat_paket: string | null
          tgl_pengumuman_paket: string | null
          tipe_swakelola: number | null
          "UNIT KERJA": string | null
          uraian_pekerjaan: string | null
          username_ppk: string | null
          volume_pekerjaan: string | null
          WILAYAH: string | null
        }
        Relationships: []
      }
      view_rup_final: {
        Row: {
          final_rup: number | null
          origin_rup: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_rup_history: {
        Args: { target_rup: number }
        Returns: {
          alasan_kajiulang: string
          jenis_revisi: string
          kd_rup_baru: number
          kd_rup_lama: number
          step: number
          tgl_kaji_ulang: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      seed_user: {
        Args: { p_email: string; p_meta: Json; p_password: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "sekjend" | "ppk"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "sekjend", "ppk"],
    },
  },
} as const
