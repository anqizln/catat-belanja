# Catat Belanja

App Android untuk mencatat pengeluaran dari foto struk, screenshot, atau chat.
AI-nya pakai Google Gemini (API key gratis). Hasilnya bisa langsung di-paste ke
sheet TRANSAKSI di Financial Tracker v2.

## Cara bikin APK (pilih salah satu)

### A. Android Studio (di laptop)
1. Install Android Studio: https://developer.android.com/studio
2. Extract zip ini, lalu di Android Studio: File > Open > pilih folder `CatatBelanja`.
3. Tunggu "Gradle sync" selesai (pertama kali agak lama, butuh internet).
   Kalau muncul tawaran "Upgrade Android Gradle Plugin", boleh di-skip.
4. Menu Build > Build App Bundle(s) / APK(s) > Build APK(s).
5. Klik "locate" di notifikasi, file APK ada di
   `app/build/outputs/apk/debug/app-debug.apk`.
6. Kirim APK ke HP (WhatsApp ke diri sendiri / Google Drive / kabel), buka, Install.
   Kalau HP menolak, izinkan "Install dari sumber tidak dikenal" untuk app yang dipakai membuka APK.

### B. Tanpa Android Studio (GitHub, bisa dari HP)
1. Buat repo baru (private) di github.com, upload semua isi folder ini.
2. Buka tab Actions, workflow "Build APK" jalan otomatis (sekitar 5 menit).
3. Setelah hijau, buka run-nya, download artifact `CatatBelanja-apk`, extract, install APK-nya.

## Pertama kali buka app
1. Buka https://aistudio.google.com/apikey, login Google, Create API key, salin.
2. Di app: Pengaturan > tempel API key > Simpan pengaturan (model dipilih otomatis).
3. Tekan "Tes koneksi". Kalau OK, siap dipakai.

## Cara pakai
- Tab Chat: foto struk (ikon kamera), pilih screenshot, atau ketik
  "cash 35rb makan bang day kemarin". AI membuat draf, cek, lalu "Simpan semua".
- Dari Galeri / app lain: Bagikan screenshot ke "Catat Belanja".
- Tab Tersimpan: "Salin untuk Excel", buka tracker > TRANSAKSI > klik kolom A di baris kosong
  pertama > Paste. Lalu "Tandai sudah dipindah".
- Daftar kategori, akun, dan kebiasaan bisa diubah di Pengaturan.

## Catatan
- Kuota gratis Gemini terbatas per hari. Kalau habis, tunggu atau ganti model "flash-lite".
- Di kuota gratis, Google boleh memakai data yang dikirim untuk meningkatkan layanannya.
  Jangan kirim foto yang memuat nomor kartu / data sensitif.
- Data tersimpan di HP. Pakai Pengaturan > Backup data sesekali.
