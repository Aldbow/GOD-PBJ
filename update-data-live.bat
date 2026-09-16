@echo off
rem Tarik langsung dari INAPROC ke data/data_update/, lalu update Supabase.
rem Butuh JWT_TOKEN (dan opsional INAPROC_KODE_KLPD) terisi di .env.local --
rem lihat .env.example. data_afirmasi_pdn_perencanaan TIDAK ditarik script ini,
rem taruh manual sebelum menjalankan.
cd /d "%~dp0"
call npm run update-data-live
echo.
pause
