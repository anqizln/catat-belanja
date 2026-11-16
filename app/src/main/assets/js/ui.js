/* Catat Belanja v2 — komponen UI umum, tema, router, sheet transaksi */
"use strict";

const ICON = {
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  outArr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  inArr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7 7 17M16 17H7V8"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
};

/* ---------- toast ---------- */
let toastT;
function toast(m) {
  const t = $("#toast"); t.textContent = m; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2800);
}

/* ---------- tema ---------- */
const mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
function applyTheme() {
  const pref = S.settings.theme;
  const dark = pref === "dark" || (pref === "system" && mq && mq.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || (dark ? "#0F1513" : "#F2F4F1");
  const nav = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || bg;
  $("#metaTheme").setAttribute("content", bg);
  if (window.AndroidBridge && AndroidBridge.setBars) { try { AndroidBridge.setBars(bg, nav, !dark); } catch (e) {} }
}
if (mq && mq.addEventListener) mq.addEventListener("change", () => S.settings.theme === "system" && applyTheme());

/* ---------- router ---------- */
let route = "home";
const ROUTES = {};
function go(r, opts) {
  route = r;
  $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.r === r));
  $("#tabs").classList.remove("hidden");
  const scr = $("#screen"); scr.className = ""; scr.style.paddingBottom = ""; scr.scrollTop = 0;
  ROUTES[r](scr, opts || {});
}
function rerender() { ROUTES[route]($("#screen"), { keepScroll: true }); }
$$("#tabs button").forEach(b => b.onclick = () => go(b.dataset.r));

/* tombol kembali Android */
const backStack = [];
window.onAndroidBack = function () {
  const sh = $$(".scrim"); if (sh.length) { closeSheet(sh[sh.length - 1]); return true; }
  if (backStack.length) { backStack.pop()(); return true; }
  if (route !== "home" && S.settings.onboarded) { go("home"); return true; }
  return false;
};

/* ---------- sheet ---------- */
function openSheet(title, bodyHtml, footHtml) {
  const el = document.createElement("div");
  el.className = "scrim";
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sh-head"><h3>${esc(title)}</h3><button class="xbtn" data-close aria-label="Tutup">${ICON.x}</button></div>
    <div class="sh-body">${bodyHtml}</div>${footHtml ? `<div class="sh-foot">${footHtml}</div>` : ""}</div>`;
  el.addEventListener("click", e => { if (e.target === el || e.target.closest("[data-close]")) closeSheet(el); });
  document.body.appendChild(el);
  return el;
}
function closeSheet(el) { if (el && el.parentNode) el.remove(); }
function confirmSheet(title, text, okLabel, danger) {
  return new Promise(res => {
    const el = openSheet(title, `<p style="margin:4px 0 8px">${text}</p>`,
      `<div class="btnrow"><button class="btn sec" data-no>Batal</button><button class="btn ${danger ? "danger" : ""}" data-ok>${esc(okLabel)}</button></div>`);
    el.querySelector("[data-ok]").onclick = () => { closeSheet(el); res(true); };
    el.querySelector("[data-no]").onclick = () => { closeSheet(el); res(false); };
    el.addEventListener("click", e => { if (e.target === el) res(false); });
  });
}

/* ---------- komponen periode ---------- */
let curPeriod = null;
function getPeriod() { if (!curPeriod) curPeriod = periodOf(today()); return curPeriod; }
function periodPicker(onChange) {
  const p = getPeriod(), isCur = p.start === periodOf(today()).start;
  const html = `<div class="period"><button data-pp="-1" aria-label="Periode sebelumnya">${ICON.left}</button>
    <span class="lbl num">${esc(periodLabel(p))}</span>
    <button data-pp="1" aria-label="Periode berikutnya" ${isCur ? "disabled" : ""}>${ICON.right}</button></div>`;
  return { html, bind(root) { $$("[data-pp]", root).forEach(b => b.onclick = () => { curPeriod = shiftPeriod(getPeriod(), +b.dataset.pp); onChange(); }); } };
}

/* ---------- format baris transaksi ---------- */
function txIcon(t) {
  if (t.kind === "in") return `<span class="dot in">${ICON.inArr}</span>`;
  if (t.kind === "transfer" || t.kind === "adjust") return `<span class="dot tr">${ICON.swap}</span>`;
  if (DEBT_KINDS.includes(t.kind)) return `<span class="dot tr">${ICON.person}</span>`;
  return `<span class="dot">${ICON.outArr}</span>`;
}
function txTitle(t) {
  if (t.note) return t.note;
  if (t.kind === "out" || t.kind === "in") return catName(t.cat);
  if (t.kind === "transfer") return "Transfer ke " + acctName(t.to);
  if (DEBT_KINDS.includes(t.kind)) return KINDS[t.kind].label + " · " + t.person;
  return KINDS[t.kind].label;
}
function txSub(t) {
  const parts = [];
  if (t.kind === "out" || t.kind === "in") parts.push(catName(t.cat));
  else parts.push(KINDS[t.kind].label);
  parts.push(t.kind === "transfer" ? acctName(t.acct) + " → " + acctName(t.to) : acctName(t.acct));
  if (t.fee) parts.push("admin " + rpShort(t.fee));
  return parts.join(" · ");
}
function txAmount(t) {
  const sign = t.kind === "adjust" ? (t.amount >= 0 ? 1 : -1) : KINDS[t.kind].sign;
  const cls = sign > 0 ? "in" : "";
  return `<span class="amt num ${cls}">${sign > 0 ? "+" : sign < 0 ? "−" : ""}${rp(Math.abs(t.amount)).replace("−", "")}</span>`;
}
function txRowHtml(t) {
  return `<button class="row" data-tx="${esc(t.id)}">${txIcon(t)}<span class="main"><span class="t1 d-block">${esc(txTitle(t))}</span>
    <span class="t2 d-block">${esc(txSub(t))}</span></span>${txAmount(t)}</button>`;
}

/* ---------- input nominal ---------- */
function bindAmount(inp) {
  const fmt = () => { const raw = inp.value.replace(/[^\d]/g, ""); inp.value = raw ? Number(raw).toLocaleString("id-ID") : ""; };
  inp.addEventListener("input", fmt); fmt();
}
const amountVal = inp => Number(String(inp.value).replace(/[^\d]/g, "")) || 0;

/* ---------- sheet tambah / ubah transaksi ---------- */
function openTxSheet(tx, opt) {
  opt = opt || {};
  const isNew = !tx || !tx.id || opt.draft;
  const t = Object.assign({ date: today(), kind: "out", amount: 0, acct: (activeAccts().find(a => a.type === "bank") || activeAccts()[0] || {}).id }, tx || {});
  let kind = t.kind === "adjust" ? "adjust" : t.kind;
  const people = [...new Set(S.tx.filter(x => x.person).map(x => x.person))];
  const title = opt.draft ? "Ubah draf" : (isNew ? "Catat transaksi" : "Ubah transaksi");

  const body = () => {
    const group = DEBT_KINDS.includes(kind) ? "debt" : kind;
    const cats = S.cats.filter(c => c.type === (kind === "in" ? "in" : "out"));
    const accOpts = sel => activeAccts().map(a => `<option value="${a.id}" ${a.id === sel ? "selected" : ""}>${esc(a.name)}</option>`).join("");
    return `
    ${kind === "adjust" ? "" : `<div class="seg" style="margin-bottom:14px">
      ${[["out", "Keluar"], ["in", "Masuk"], ["transfer", "Transfer"], ["debt", "Hutang"]].map(([k, l]) => `<button data-kind="${k}" class="${group === k ? "on" : ""}">${l}</button>`).join("")}</div>`}
    ${group === "debt" ? `<div class="chips" style="margin-bottom:14px">${DEBT_KINDS.map(k => `<button class="chip ${kind === k ? "on" : ""}" data-dk="${k}">${KINDS[k].label}</button>`).join("")}</div>` : ""}
    <div class="amount-inp"><span>Rp</span><input id="fAmt" inputmode="numeric" autocomplete="off" placeholder="0" value="${t.amount || ""}" aria-label="Nominal"></div>
    ${kind === "out" || kind === "in" ? `<label class="f"><span>Kategori</span><div class="chips" id="fCats">
      ${cats.map(c => `<button class="chip ${c.id === t.cat ? "on" : ""}" data-cat="${c.id}">${esc(c.name)}</button>`).join("")}</div></label>` : ""}
    <label class="f"><span>${kind === "transfer" ? "Dari akun" : "Akun"}</span><select class="inp" id="fAcct">${accOpts(t.acct)}</select></label>
    ${kind === "transfer" ? `<label class="f"><span>Ke akun</span><select class="inp" id="fTo"><option value="">Pilih akun tujuan</option>${accOpts(t.to)}</select></label>` : ""}
    ${group === "debt" ? `<label class="f"><span>Nama orang</span><input class="inp" id="fPerson" list="dlPeople" value="${esc(t.person || "")}" autocomplete="off">
      <datalist id="dlPeople">${people.map(p => `<option value="${esc(p)}">`).join("")}</datalist></label>` : ""}
    <label class="f"><span>Tanggal</span><input class="inp" type="date" id="fDate" value="${esc(t.date)}"></label>
    <label class="f"><span>Keterangan</span><input class="inp" id="fNote" value="${esc(t.note || "")}" placeholder="Misal: GRAS, grabfood, bensin" autocomplete="off"></label>
    ${kind !== "adjust" ? `<label class="f"><span>Biaya admin (kalau ada)</span><input class="inp" id="fFee" inputmode="numeric" value="${t.fee || ""}" placeholder="0"></label>` : ""}`;
  };
  const foot = `<div class="btnrow">${!isNew || opt.draft ? `<button class="btn danger" id="fDel">Hapus</button>` : ""}<button class="btn" id="fSave">${opt.draft ? "Simpan draf" : "Simpan"}</button></div>`;
  const el = openSheet(title, body(), foot);
  const bodyEl = el.querySelector(".sh-body");

  const collect = () => {
    const sel = bodyEl.querySelector(".chip.on[data-cat]");
    return Object.assign({}, t, {
      kind, amount: amountVal($("#fAmt", el)), cat: sel ? sel.dataset.cat : (kind === "out" || kind === "in" ? "" : t.cat),
      acct: $("#fAcct", el).value, to: $("#fTo", el) ? $("#fTo", el).value : "", person: $("#fPerson", el) ? $("#fPerson", el).value : "",
      date: $("#fDate", el).value || today(), note: $("#fNote", el).value, fee: $("#fFee", el) ? amountVal($("#fFee", el)) : 0
    });
  };
  const wire = () => {
    bindAmount($("#fAmt", el)); if ($("#fFee", el)) bindAmount($("#fFee", el));
    $$("[data-kind]", bodyEl).forEach(b => b.onclick = () => {
      Object.assign(t, collect()); const k = b.dataset.kind; kind = k === "debt" ? "lend" : k; t.cat = "";
      bodyEl.innerHTML = body(); wire();
    });
    $$("[data-dk]", bodyEl).forEach(b => b.onclick = () => { Object.assign(t, collect()); kind = b.dataset.dk; bodyEl.innerHTML = body(); wire(); });
    $$("[data-cat]", bodyEl).forEach(b => b.onclick = () => { $$("[data-cat]", bodyEl).forEach(x => x.classList.toggle("on", x === b)); });
  };
  wire();
  if (isNew && !t.amount) setTimeout(() => $("#fAmt", el).focus(), 150);

  $("#fSave", el).onclick = async () => {
    const n = normalizeTx(collect());
    if (kind === "adjust") n.amount = t.amount < 0 ? -Math.abs(amountVal($("#fAmt", el))) : amountVal($("#fAmt", el));
    const prob = txProblems(n);
    if (prob.length) { toast("Lengkapi dulu: " + prob.join(", ")); return; }
    if (opt.draft) { opt.onSave && opt.onSave(n); closeSheet(el); return; }
    if (isNew && isDuplicate(n) && !(await confirmSheet("Sepertinya sudah tercatat", `Ada transaksi lain di ${fmtDate(n.date)} dengan nominal ${rp(n.amount)} di ${esc(acctName(n.acct))}. Tetap simpan?`, "Tetap simpan"))) return;
    upsertTx(n); closeSheet(el); toast(n.date < S.startDate ? "Tersimpan. Saldo akun tidak berubah karena tanggalnya sebelum awal pencatatan (" + fmtDate(S.startDate) + ")." : isNew ? "Tersimpan" : "Perubahan disimpan"); opt.onSave ? opt.onSave(n) : rerender();
  };
  const del = $("#fDel", el);
  if (del) del.onclick = async () => {
    if (opt.draft) { opt.onDelete && opt.onDelete(); closeSheet(el); return; }
    if (await confirmSheet("Hapus transaksi?", `${esc(txTitle(t))} · ${rp(t.amount)}`, "Hapus", true)) { deleteTx(t.id); closeSheet(el); toast("Dihapus"); rerender(); }
  };
}
function openTxById(id) {
  if (String(id).startsWith("inst_")) { toast("Cicilan dicatat otomatis. Ubah di Atur > Cicilan."); return; }
  const t = S.tx.find(x => x.id === id); if (t) openTxSheet(t);
}
function bindTxRows(root) { $$("[data-tx]", root).forEach(b => b.onclick = () => openTxById(b.dataset.tx)); }

/* ---------- boot ---------- */
async function boot() {
  await loadState();
  applyTheme();
  if (!S.settings.onboarded) startOnboarding();
  else go("home");
}
