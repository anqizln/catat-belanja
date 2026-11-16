/* Catat Belanja v2 — pengaturan awal */
"use strict";

let ob = null;
function startOnboarding() {
  ob = { step: 0, restored: false, template: "umum", cycle: S.settings.cycleDay === 1 ? "first" : "payday",
    accts: [{ name: "Rekening utama", type: "bank", amt: 0, limit: 0 }, { name: "Tunai", type: "cash", amt: 0, limit: 0 }] };
  $("#tabs").classList.add("hidden");
  renderOb();
}
const OB_STEPS = 5;
function renderOb() {
  const scr = $("#screen"); scr.className = ""; scr.scrollTop = 0;
  const st = S.settings, s = ob.step;
  const bar = `<div class="steps">${Array.from({ length: OB_STEPS }, (_, i) => `<i class="${i <= s ? "on" : ""}"></i>`).join("")}</div>`;
  let body = "", next = "Lanjut", back = s > 0;
  if (s === 0) {
    body = `<h1>Catat uang masuk dan keluar tanpa ribet</h1>
      <p class="lead">Foto struk atau ketik singkat, sisanya dirapikan otomatis. Semua data tersimpan di HP ini.</p>
      <label class="f"><span>Mau dipanggil siapa?</span><input class="inp" id="oName" value="${esc(st.name)}" placeholder="Opsional"></label>
      <label class="f"><span>Tampilan</span></label>
      <div class="seg">${[["system", "Ikut HP"], ["light", "Terang"], ["dark", "Gelap"]].map(([k, l]) => `<button data-t="${k}" class="${st.theme === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
  } else if (s === 1) {
    body = `<h1>Pakai kategori yang mana?</h1>
      <p class="lead">Kategori dan budget bisa diubah kapan saja di Atur.</p>
      <button class="choice ${ob.template === "umum" ? "on" : ""}" data-tpl="umum"><b>Kategori umum</b><span>Makan & Minum, Transportasi, Tagihan, Belanja, Gaji, dan lainnya. Cocok untuk mulai.</span></button>
      <button class="choice ${ob.template === "restore" ? "on" : ""}" data-tpl="restore"><b>Pulihkan dari file</b><span>${ob.restored ? "File sudah dimuat. Kategori, akun, dan kebiasaan ikut dipulihkan." : "Pakai file backup atau preset (.json) yang sudah kamu punya."}</span></button>`;
    next = ob.template === "restore" && !ob.restored ? "Pilih file" : "Lanjut";
  } else if (s === 2) {
    const dayOpts = Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}" ${st.cycleDay === i + 1 ? "selected" : ""}>Tanggal ${i + 1}</option>`).join("");
    body = `<h1>Kapan periode keuanganmu dimulai?</h1>
      <p class="lead">Laporan dibuat tiap akhir periode. Kalau gajian tanggal 25, periodenya 25 sampai 24 bulan berikutnya.</p>
      <button class="choice ${ob.cycle === "first" ? "on" : ""}" data-cy="first"><b>Tanggal 1 setiap bulan</b><span>Ikut kalender biasa.</span></button>
      <button class="choice ${ob.cycle === "payday" ? "on" : ""}" data-cy="payday"><b>Tanggal gajian</b><span>Periode mulai di tanggal gaji masuk.</span></button>
      ${ob.cycle === "payday" ? `<label class="f" style="margin-top:6px"><span>Gajian tanggal</span><select class="inp" id="oDay">${dayOpts}</select></label>
      <div class="group"><label class="toggle"><span>Mulai lebih awal kalau gaji cair duluan<br><span class="muted" style="font-size:12.5px">Misal gaji masuk tanggal 23 karena tanggal 25 hari Minggu</span></span><input type="checkbox" id="oSal" ${st.cycleMode === "salary" ? "checked" : ""}></label></div>` : ""}`;
  } else if (s === 3) {
    body = `<h1>Uangmu ada di mana saja?</h1>
      <p class="lead">Isi saldo hari ini. Untuk kartu kredit, isi tagihan yang belum dibayar.</p>
      <div id="oAccts">${ob.accts.map((a, i) => `<div class="acc-edit" data-i="${i}">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><input class="inp" data-k="name" value="${esc(a.name)}" placeholder="Nama akun">
          <button class="xbtn" data-rm="${i}" aria-label="Hapus akun">${ICON.x}</button></div>
        <div class="two"><select class="inp" data-k="type">${Object.entries(ACCT_TYPES).map(([k, l]) => `<option value="${k}" ${a.type === k ? "selected" : ""}>${l}</option>`).join("")}</select>
          <input class="inp num" data-k="amt" inputmode="numeric" value="${a.amt || ""}" placeholder="${isCreditType(a.type) ? "Tagihan" : "Saldo"}"></div>
        ${isCreditType(a.type) ? `<input class="inp num" data-k="limit" inputmode="numeric" value="${a.limit || ""}" placeholder="Limit" style="margin-top:8px">` : ""}
      </div>`).join("")}</div>
      <button class="btn sec block" id="oAdd">${ICON.plus} Tambah akun</button>`;
  } else {
    body = `<h1>Biar bisa baca struk otomatis</h1>
      <p class="lead">App ini pakai AI Gemini dari Google yang gratis. Kamu perlu API key sendiri, cukup sekali.</p>
      <ol style="padding-left:20px;margin:0 0 16px;line-height:1.6"><li>Buka <a href="https://aistudio.google.com/apikey" style="color:var(--jade)">aistudio.google.com/apikey</a></li><li>Login akun Google, tekan <b>Create API key</b></li><li>Salin, lalu tempel di sini</li></ol>
      <label class="f"><span>API key</span><input class="inp" id="oKey" type="password" value="${esc(st.apiKey)}" autocomplete="off" placeholder="Tempel di sini"></label>
      <p class="hint">Tanpa API key tetap bisa catat manual. Bisa diisi nanti di Atur.</p>`;
    next = "Mulai pakai";
  }
  scr.innerHTML = `<div class="ob">${bar}<div class="grow">${body}</div>
    <div class="btnrow" style="margin-top:20px">${back ? `<button class="btn sec" id="oBack" style="flex:0 0 auto">Kembali</button>` : ""}<button class="btn" id="oNext">${next}</button></div></div>`;

  // pengikat
  $$("[data-t]", scr).forEach(b => b.onclick = () => { st.theme = b.dataset.t; applyTheme(); $$("[data-t]", scr).forEach(x => x.classList.toggle("on", x === b)); });
  $$("[data-tpl]", scr).forEach(b => b.onclick = () => { ob.template = b.dataset.tpl; if (ob.template === "restore" && !ob.restored) obPick(); else renderOb(); });
  $$("[data-cy]", scr).forEach(b => b.onclick = () => { ob.cycle = b.dataset.cy; if (ob.cycle === "first") { st.cycleDay = 1; st.cycleMode = "fixed"; } else if (st.cycleDay === 1) st.cycleDay = 25; renderOb(); });
  if (s === 3) {
    $$(".acc-edit", scr).forEach(box => {
      const a = ob.accts[+box.dataset.i];
      $$("[data-k]", box).forEach(inp => {
        if (inp.dataset.k === "amt" || inp.dataset.k === "limit") bindAmount(inp);
        inp.onchange = () => { const k = inp.dataset.k; a[k] = k === "amt" || k === "limit" ? amountVal(inp) : inp.value; if (k === "type") renderOb(); };
        inp.oninput = () => { const k = inp.dataset.k; if (k === "name") a.name = inp.value; if (k === "amt" || k === "limit") a[k] = amountVal(inp); };
      });
    });
    $$("[data-rm]", scr).forEach(b => b.onclick = () => { ob.accts.splice(+b.dataset.rm, 1); renderOb(); });
    $("#oAdd").onclick = () => { ob.accts.push({ name: "", type: "ewallet", amt: 0, limit: 0 }); renderOb(); };
  }
  const bk = $("#oBack"); if (bk) bk.onclick = () => { ob.step = obPrev(s); renderOb(); };
  $("#oNext").onclick = () => obNext(s);
}
function obPrev(s) { let p = s - 1; if (p === 3 && ob.restored) p = 2; return Math.max(0, p); }
function obPick() {
  pickJson(d => { restoreFrom(d); S.settings.onboarded = false; ob.restored = true; ob.template = "restore";
    ob.cycle = S.settings.cycleDay === 1 && S.settings.cycleMode === "fixed" ? "first" : "payday"; toast("File dimuat"); renderOb(); });
}
function obNext(s) {
  const st = S.settings;
  if (s === 0) { st.name = $("#oName").value.trim(); }
  if (s === 1) {
    if (ob.template === "restore" && !ob.restored) { obPick(); return; }
    if (ob.template === "umum" && !ob.restored && !S.cats.length) S.cats = makeCats(TEMPLATE_UMUM);
  }
  if (s === 2) {
    if (ob.cycle === "payday") { st.cycleDay = +$("#oDay").value; st.cycleMode = $("#oSal").checked ? "salary" : "fixed"; }
    else { st.cycleDay = 1; st.cycleMode = "fixed"; }
  }
  if (s === 3) {
    const list = ob.accts.filter(a => a.name.trim());
    if (!list.length) { toast("Tambah minimal satu akun"); return; }
    const names = list.map(a => a.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) { toast("Nama akun tidak boleh sama"); return; }
    S.startDate = today();
    S.accts = list.map(a => ({ id: uid(), name: a.name.trim(), type: a.type, opening: isCreditType(a.type) ? -(a.amt || 0) : (a.amt || 0), limit: isCreditType(a.type) ? (a.limit || 0) : 0 }));
  }
  if (s === 4) { st.apiKey = $("#oKey").value.trim(); finishOnboarding(); return; }
  let n = s + 1; if (n === 3 && ob.restored) n = 4;
  ob.step = n; save(); renderOb();
}
function finishOnboarding() {
  if (!S.cats.length) S.cats = makeCats(TEMPLATE_UMUM);
  importV1();
  S.settings.onboarded = true; curPeriod = null; saveNow();
  $("#tabs").classList.remove("hidden");
  go("home");
  toast("Siap. Tekan Catat untuk mulai. Panduan ada di tombol ? di Beranda.");
}

/* transaksi dari versi 1 */
function importV1() {
  const list = S._v1tx; delete S._v1tx; delete S._v1;
  if (!list || !list.length) return;
  const def = activeAccts().find(a => a.type === "bank") || S.accts[0];
  const fallbackOut = S.cats.find(c => /lain/i.test(c.name) && c.type === "out") || S.cats.find(c => c.type === "out");
  let n = 0;
  for (const t of list) {
    const nm = String(t.catName || "");
    let kind = "out";
    if (/^transfer/i.test(nm)) kind = "transfer";
    else if (/pinjamkan/i.test(nm)) kind = "lend"; else if (/pelunasan piutang/i.test(nm)) kind = "collect";
    else if (/pinjam uang dari/i.test(nm)) kind = "borrow"; else if (/bayar hutang/i.test(nm)) kind = "repay";
    const cat = catByName(nm);
    if (kind === "out" && cat && cat.type === "in") kind = "in";
    const o = normalizeTx({ date: t.date, kind, cat: cat ? cat.id : (kind === "out" ? fallbackOut && fallbackOut.id : (S.cats.find(c => c.type === "in") || {}).id),
      amount: t.amount, acct: (acctByName(t.acctName) || def || {}).id, to: (acctByName(t.toName) || {}).id, fee: t.fee, note: t.note, person: t.person });
    if (!txProblems(o).length && !isDuplicate(o)) { S.tx.push(o); n++; }
  }
  if (n) setTimeout(() => toast(n + " transaksi dari versi lama ikut dipindahkan"), 1500);
}
