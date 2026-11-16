/* ---------- Bantuan & panduan ---------- */
const APP_VERSION = "2.2";
const IS_ANDROID_APP = !!window.AndroidBridge;
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_STANDALONE = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;

function helpTopics() {
  const where = IS_ANDROID_APP
    ? `<p>Semua data tersimpan <b>di dalam app ini, di HP ini saja</b>. Tidak ada server dan tidak ada akun. Yang dikirim ke internet cuma pesan, foto, dan daftar kategori yang kamu minta dibaca AI (ke Google Gemini, pakai API key-mu sendiri).</p>
       <p>Data hilang kalau app di-uninstall atau di-<i>Clear data</i>. Update app lewat link APK yang sama <b>tidak</b> menghapus data.</p>`
    : `<p>Semua data tersimpan <b>di browser HP ini</b> (penyimpanan Safari/Chrome untuk alamat app ini). Tidak ada server dan tidak ada akun. Yang dikirim ke internet cuma pesan, foto, dan daftar kategori yang kamu minta dibaca AI (ke Google Gemini, pakai API key-mu sendiri).</p>
       <p><b>Di iPhone</b>, data ikut ikon di layar utama. Data bisa hilang kalau:</p>
       <ul><li>ikon Catat Belanja dihapus dari layar utama,</li><li>kamu menghapus data situs di <i>Pengaturan › Safari › Hapus Riwayat dan Data Situs</i>,</li><li>app dibuka lewat tab Safari biasa (itu tempat penyimpanan yang berbeda, isinya bisa kosong).</li></ul>
       <p>Selalu buka dari ikon di layar utama, dan rutin backup.</p>`;
  const install = IS_ANDROID_APP ? "" : `
    <details><summary>Pasang di iPhone</summary><div class="hb">
      <ol><li>Buka alamat app ini di <b>Safari</b> (bukan Chrome).</li>
      <li>Tekan tombol <b>Share</b> (kotak dengan panah ke atas).</li>
      <li>Pilih <b>Add to Home Screen</b>, lalu <b>Add</b>.</li>
      <li>Mulai sekarang buka dari ikon itu. Tampilannya full layar seperti app biasa.</li></ol>
      ${IS_IOS && !IS_STANDALONE ? `<p class="hnote">Kamu sedang membuka lewat Safari biasa. Pasang ke layar utama dulu supaya datamu tersimpan di tempat yang benar.</p>` : ""}
    </div></details>`;
  return `
  <details open><summary>Mulai cepat</summary><div class="hb">
    <ol><li>Tekan <b>Catat</b> di tengah bawah.</li>
    <li>Ketik apa yang kamu beli, kirim foto struk, atau screenshot belanja online.</li>
    <li>AI menyiapkan draf. Cek kategori, nominal, dan akun, lalu tekan <b>Simpan</b>.</li></ol>
    <p>Bisa juga tanpa AI: di tab <b>Transaksi</b>, tekan <b>Tambah</b> lalu isi manual.</p>
  </div></details>

  <details><summary>Contoh kalimat untuk dicatat</summary><div class="hb">
    <ul class="ex">
      <li>beli kopi 25rb cash</li>
      <li>makan siang grabfood 86rb pakai BCA</li>
      <li>bensin 150rb kemarin</li>
      <li>gaji masuk 8,5jt</li>
      <li>tarik tunai 200rb dari BCA</li>
      <li>topup gopay 100rb dari BCA, admin 1rb</li>
      <li>pinjemin Andi 200rb</li>
      <li>Andi bayar utang 100rb</li>
      <li>bayar kartu kredit 1,5jt dari BCA</li>
    </ul>
    <p>Tekan salah satu contoh untuk langsung mencobanya. Satu pesan boleh berisi beberapa transaksi sekaligus. Kalau tanggal tidak disebut, dianggap hari ini. Kata seperti "kemarin" atau "tgl 12" juga dimengerti.</p>
  </div></details>

  <details><summary>Foto struk & screenshot</summary><div class="hb">
    <ul><li>Tekan ikon klip di samping kolom chat, lalu pilih kamera atau galeri. Bisa beberapa foto sekaligus.</li>
    ${IS_ANDROID_APP ? `<li>Dari app lain (galeri, Astro, Tokopedia, m-banking): tekan <b>Share</b>, lalu pilih <b>Catat Belanja</b>.</li>` : ""}
    <li>Struk campuran (misal Indomaret: rokok + minuman) otomatis dipisah per kategori. Atur di <b>Atur › AI › Pisah struk per kategori</b>.</li>
    <li>Foto yang lurus dan terang lebih cepat dibaca.</li></ul>
  </div></details>

  <details><summary>Jenis transaksi</summary><div class="hb">
    <dl>
      <dt>Keluar / Masuk</dt><dd>Belanja dan pemasukan biasa.</dd>
      <dt>Transfer</dt><dd>Pindah uang antar akunmu sendiri: tarik tunai, top up e-wallet, bayar kartu kredit. Tidak dihitung sebagai pengeluaran.</dd>
      <dt>Pinjamkan / Terima piutang</dt><dd>Uangmu dipinjam orang, lalu dikembalikan.</dd>
      <dt>Pinjam / Bayar hutang</dt><dd>Kamu pinjam uang orang, lalu kamu kembalikan.</dd>
      <dt>Koreksi saldo</dt><dd>Menyamakan saldo app dengan saldo asli kalau ada selisih yang tidak ketemu.</dd>
    </dl>
  </div></details>

  <details><summary>Saldo akun & koreksi</summary><div class="hb">
    <ul><li>Saldo dihitung dari saldo awal ditambah semua transaksi.</li>
    <li>Kalau beda dengan m-banking: buka akunnya di Beranda, tekan <b>Samakan dengan saldo asli</b>, isi saldo yang benar. App membuat transaksi koreksi sebesar selisihnya.</li>
    <li>Kartu kredit dan paylater: saldo minus berarti tagihan. Sisa limit = limit − tagihan − sisa cicilan.</li></ul>
  </div></details>

  <details><summary>Cicilan</summary><div class="hb">
    <p>Daftarkan sekali di <b>Atur › Cicilan</b>. Setiap tanggal tagihan, cicilan otomatis tercatat sebagai pengeluaran di kartunya. Jangan dicatat manual lagi supaya tidak dobel.</p>
  </div></details>

  <details><summary>Periode, budget & laporan</summary><div class="hb">
    <ul><li>Periode bisa mulai tanggal 1 atau tanggal gajian. Atur di <b>Atur › Periode keuangan</b>.</li>
    <li>Kalau "mulai lebih awal kalau gaji masuk duluan" aktif, periode baru dimulai di hari gaji masuk.</li>
    <li>Isi budget per kategori di <b>Atur › Kategori</b>. Beranda menunjukkan sisa budget dan batas aman per hari.</li>
    <li>Setiap periode selesai, laporannya muncul di tab <b>Laporan</b>, lengkap dengan perbandingan periode sebelumnya.</li></ul>
  </div></details>

  <details><summary>Export ke Excel / CSV</summary><div class="hb">
    <p>Di tab <b>Laporan</b>, buka satu periode lalu tekan <b>Excel</b> atau <b>CSV</b>. Untuk semua data sekaligus, pakai <b>Export semua data</b>. File berisi ringkasan, per kategori, daftar transaksi, dan saldo akun.</p>
  </div></details>

  <details><summary>Backup & pindah HP</summary><div class="hb">
    <ol><li>Di HP lama: <b>Atur › Data › Backup data</b>, lalu simpan atau kirim filenya (WhatsApp ke diri sendiri, email, Drive).</li>
    <li>Di HP baru: pasang app, lalu di langkah awal pilih <b>Pulihkan dari file</b>. Atau lewat <b>Atur › Data › Pulihkan dari backup</b>.</li></ol>
    <p>Android dan iPhone bisa saling pakai file backup yang sama. Data tidak sinkron otomatis, jadi pakai satu HP sebagai catatan utama.</p>
  </div></details>

  <details><summary>Data saya disimpan di mana?</summary><div class="hb">${where}</div></details>
  ${install}

  <details><summary>AI lambat atau error</summary><div class="hb">
    <ul><li><b>Lambat:</b> ganti model di <b>Atur › AI › Model</b> ke <code>gemini-2.5-flash-lite</code>. Biasanya paling cepat.</li>
    <li><b>Kuota habis (429):</b> paket gratis punya batas per menit dan per hari. Tunggu sebentar, atau aktifkan <i>Pindah ke model lite kalau kuota habis</i>.</li>
    <li><b>API key salah:</b> buat ulang di aistudio.google.com/apikey, tempel lagi, lalu tekan <b>Tes koneksi</b>.</li>
    <li><b>Kategori sering salah:</b> tambahkan kebiasaan di <b>Atur › AI › Kebiasaan</b>, misal <code>GRAS = Ngopi &amp; Nongkrong</code>.</li></ul>
  </div></details>`;
}

ROUTES.help = function (scr) {
  scr.innerHTML = `<div class="topbar"><button class="xbtn" id="back" aria-label="Kembali">${ICON.left}</button><h1 style="font-size:19px">Bantuan & panduan</h1></div>
  <div class="page help">${helpTopics()}
    <p class="muted" style="font-size:12px;text-align:center;margin:22px 0 0">Catat Belanja ${APP_VERSION}</p></div>`;
  $("#back").onclick = () => go(helpFrom);
  $$(".ex li", scr).forEach(li => { li.setAttribute("role", "button"); li.tabIndex = 0; li.onclick = () => { go("chat"); const i = $("#inp"); if (i) { i.value = li.textContent; i.focus(); i.dispatchEvent(new Event("input")); } }; });
};
let helpFrom = "home";
function openHelp() { helpFrom = route === "help" ? "home" : route; go("help"); $$("#tabs button").forEach(b => b.classList.remove("on")); }
