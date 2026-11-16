/* Catat Belanja v2 — data, perhitungan, periode */
"use strict";

/* ---------- util ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad2 = n => String(n).padStart(2, "0");
const fmtNum = n => Math.round(Number(n) || 0).toLocaleString("id-ID");
const rp = n => (n < 0 ? "−" : "") + "Rp " + fmtNum(Math.abs(n));
const rpShort = n => {
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e9) return s + (a / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(".", ",") + " M";
  if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",") + " jt";
  if (a >= 1e3) return s + Math.round(a / 1e3) + " rb";
  return s + Math.round(a);
};
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function ymd(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function parseD(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function today() { return ymd(new Date()); }
function addDays(s, n) { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); }
function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / 864e5); }
function monthDate(y, m, day) { // m bisa <0 / >11; tanggal di-clamp ke akhir bulan
  const d = new Date(y, m, 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return ymd(new Date(d.getFullYear(), d.getMonth(), Math.min(day, last)));
}
function addMonths(s, n) { const d = parseD(s); return monthDate(d.getFullYear(), d.getMonth() + n, d.getDate()); }
function fmtDate(s, long) {
  const d = parseD(s);
  return long ? HARI[d.getDay()] + ", " + d.getDate() + " " + BULAN_PANJANG[d.getMonth()] + " " + d.getFullYear()
              : d.getDate() + " " + BULAN[d.getMonth()];
}
function fmtRange(a, b) {
  const da = parseD(a), db = parseD(b);
  const sameY = da.getFullYear() === db.getFullYear();
  return da.getDate() + " " + BULAN[da.getMonth()] + (sameY ? "" : " " + da.getFullYear()) + " – " + db.getDate() + " " + BULAN[db.getMonth()] + " " + db.getFullYear();
}

/* ---------- jenis transaksi ---------- */
const KINDS = {
  out: { label: "Keluar", sign: -1 },
  in: { label: "Masuk", sign: 1 },
  transfer: { label: "Transfer", sign: 0 },
  lend: { label: "Pinjamkan", sign: -1, debt: "piutang", d: 1 },
  collect: { label: "Terima pelunasan", sign: 1, debt: "piutang", d: -1 },
  borrow: { label: "Pinjam", sign: 1, debt: "hutang", d: 1 },
  repay: { label: "Bayar hutang", sign: -1, debt: "hutang", d: -1 },
  adjust: { label: "Koreksi saldo", sign: 0 }
};
const DEBT_KINDS = ["lend", "collect", "borrow", "repay"];

const ACCT_TYPES = {
  bank: "Rekening bank", savings: "Tabungan", cash: "Tunai", ewallet: "E-wallet", emoney: "Uang elektronik",
  invest: "Investasi / Deposito", credit: "Kartu kredit", paylater: "Paylater"
};
const isCreditType = t => t === "credit" || t === "paylater";

/* ---------- template kategori umum ---------- */
const TEMPLATE_UMUM = [
  ["Makan & Minum", "out", "Kebutuhan"], ["Ngopi & Jajan", "out", "Gaya hidup"], ["Belanja Harian", "out", "Kebutuhan"],
  ["Transportasi", "out", "Kebutuhan"], ["Bensin", "out", "Kebutuhan"], ["Tagihan & Utilitas", "out", "Kebutuhan"],
  ["Pulsa & Internet", "out", "Kebutuhan"], ["Belanja Barang", "out", "Gaya hidup"], ["Hiburan & Hobi", "out", "Gaya hidup"],
  ["Langganan", "out", "Gaya hidup"], ["Kesehatan", "out", "Kesehatan"], ["Pendidikan", "out", "Keluarga"],
  ["Keluarga", "out", "Keluarga"], ["Cicilan", "out", "Kewajiban"], ["Biaya Admin & Bank", "out", "Kewajiban"],
  ["Donasi & Hadiah", "out", "Gaya hidup"], ["Lain-lain", "out", "Lainnya"],
  ["Gaji", "in", "Pendapatan", true], ["Bonus", "in", "Pendapatan"], ["Usaha / Freelance", "in", "Pendapatan"],
  ["Pemasukan Lain", "in", "Pendapatan"]
];
const RULES_UMUM = [
  "Bayar tunai / cash = akun tunai.",
  "Struk belanja dipisah per kategori; voucher atau diskon dikurangkan dari item yang didiskon."
].join("\n");

function makeCats(list) {
  return list.map(([name, type, group, salary]) => ({ id: uid(), name, type, group: group || "", budget: 0, salary: !!salary }));
}

/* ---------- state ---------- */
function defaultState() {
  return {
    v: 2,
    settings: {
      onboarded: false, name: "", theme: "system", cycleMode: "fixed", cycleDay: 1,
      apiKey: "", model: "", models: [], autoLite: true, splitReceipts: true, rules: RULES_UMUM
    },
    startDate: today(),
    cats: [], accts: [], inst: [], tx: [], chat: [], drafts: [],
    reports: { seen: {}, insight: {} }
  };
}
let S = defaultState();

/* ---------- penyimpanan (IndexedDB, cadangan localStorage) ---------- */
const DB = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open("catatbelanja", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("kv");
        r.onsuccess = () => { this.db = r.result; res(true); };
        r.onerror = () => res(false);
      } catch (e) { res(false); }
    });
  },
  get(k) {
    return new Promise(res => {
      if (!this.db) { try { res(JSON.parse(localStorage.getItem("cb2_" + k))); } catch (e) { res(null); } return; }
      const t = this.db.transaction("kv").objectStore("kv").get(k);
      t.onsuccess = () => res(t.result || null); t.onerror = () => res(null);
    });
  },
  set(k, v) {
    return new Promise(res => {
      if (!this.db) { try { localStorage.setItem("cb2_" + k, JSON.stringify(v)); } catch (e) {} res(); return; }
      const t = this.db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k);
      t.oncomplete = () => res(); t.onerror = () => res();
    });
  }
};
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => DB.set("state", S), 250); }
function saveNow() { clearTimeout(saveTimer); return DB.set("state", S); }

async function loadState() {
  await DB.open();
  const st = await DB.get("state");
  if (st && st.v === 2) {
    const d = defaultState();
    S = Object.assign(d, st);
    S.settings = Object.assign(d.settings, st.settings || {});
    S.reports = Object.assign(d.reports, st.reports || {});
  } else {
    S = defaultState();
    migrateV1();
  }
}

/* data dari versi 1 (localStorage) */
function migrateV1() {
  let old = null;
  try { old = JSON.parse(localStorage.getItem("catatbelanja_v1")); } catch (e) {}
  if (!old) return;
  const os = old.settings || {};
  S.settings.apiKey = os.apiKey || ""; S.settings.model = os.model || ""; S.settings.models = os.models || [];
  if (os.rules) S.settings.rules = os.rules;
  S._v1 = { accounts: os.accounts || [], categories: os.categories || [] };
  S._v1tx = (old.saved || []).concat(old.drafts || []).map(t => ({
    date: t.tanggal, catName: t.kategori, amount: Number(t.nominal) || 0, acctName: t.akun, toName: t.ke_akun,
    fee: Number(t.biaya_admin) || 0, note: t.keterangan || "", person: t.nama_hp || ""
  })).filter(t => t.amount > 0);
}

/* ---------- lookup ---------- */
const catById = id => S.cats.find(c => c.id === id);
const acctById = id => S.accts.find(a => a.id === id);
const catByName = n => S.cats.find(c => c.name.toLowerCase() === String(n || "").toLowerCase());
const acctByName = n => S.accts.find(a => a.name.toLowerCase() === String(n || "").toLowerCase());
const activeAccts = () => S.accts.filter(a => !a.archived);
function catName(id) { const c = catById(id); return c ? c.name : "Tanpa kategori"; }
function acctName(id) { const a = acctById(id); return a ? a.name : "?"; }
function feeCat() { return S.cats.find(c => c.type === "out" && /admin/i.test(c.name)); }

/* ---------- cicilan -> transaksi virtual ---------- */
function instSchedule(i) {
  const out = [];
  for (let k = 0; k < i.months; k++) out.push({ n: k + 1, date: addMonths(i.firstDate, k) });
  return out;
}
function installmentTx(upto) {
  const res = [];
  for (const i of S.inst) {
    const monthly = Number(i.monthly) || Math.round(i.total / i.months);
    for (const s of instSchedule(i)) {
      if (s.date < S.startDate || s.date > upto) continue;
      res.push({ id: "inst_" + i.id + "_" + s.n, virtual: true, date: s.date, kind: "out", cat: i.cat, amount: monthly,
        acct: i.acct, note: "Cicilan " + i.name + " (" + s.n + "/" + i.months + ")", fee: 0 });
    }
  }
  return res;
}
function instRemaining(acctId) { // pokok cicilan yang belum ditagih (mengurangi sisa limit)
  const t = today(); let sum = 0;
  for (const i of S.inst) {
    if (acctId && i.acct !== acctId) continue;
    const monthly = Number(i.monthly) || Math.round(i.total / i.months);
    for (const s of instSchedule(i)) if (s.date > t) sum += monthly;
  }
  return sum;
}
function allTx(upto) { return S.tx.concat(installmentTx(upto || today())); }

/* ---------- saldo ---------- */
function balances(upto) {
  const bal = {}; S.accts.forEach(a => bal[a.id] = Number(a.opening) || 0);
  const debt = {}; // per orang: {piutang, hutang}
  for (const t of allTx(upto)) {
    if (upto && t.date > upto) continue;
    if (t.date < S.startDate) continue;
    const amt = Number(t.amount) || 0, fee = Number(t.fee) || 0;
    switch (t.kind) {
      case "out": case "lend": case "repay": if (t.acct in bal) bal[t.acct] -= amt + fee; break;
      case "in": case "collect": case "borrow": if (t.acct in bal) bal[t.acct] += amt - fee; break;
      case "transfer": if (t.acct in bal) bal[t.acct] -= amt + fee; if (t.to in bal) bal[t.to] += amt; break;
      case "adjust": if (t.acct in bal) bal[t.acct] += amt; break;
    }
    const k = KINDS[t.kind];
    if (k && k.debt) {
      const p = (t.person || "Tanpa nama").trim();
      debt[p] = debt[p] || { piutang: 0, hutang: 0 };
      debt[p][k.debt] += k.d * amt;
    }
  }
  return { bal, debt };
}
function creditInfo(a, bal) {
  const owed = Math.max(0, -bal);
  const rem = instRemaining(a.id);
  return { owed, remInst: rem, avail: a.limit ? a.limit - owed - rem : null };
}

/* ---------- periode ---------- */
function salaryDates() {
  const ids = S.cats.filter(c => c.salary).map(c => c.id);
  return S.tx.filter(t => t.kind === "in" && ids.includes(t.cat)).map(t => t.date).sort();
}
function fixedStartFor(s) {
  const d = parseD(s), D = S.settings.cycleDay || 1;
  const thisStart = monthDate(d.getFullYear(), d.getMonth(), D);
  return s >= thisStart ? thisStart : monthDate(d.getFullYear(), d.getMonth() - 1, D);
}
function nextFixed(start) { const d = parseD(start); return monthDate(d.getFullYear(), d.getMonth() + 1, S.settings.cycleDay || 1); }
function adjustedStart(fixed) { // mode gaji: periode mulai saat gaji tercatat (maks 10 hari lebih awal)
  if (S.settings.cycleMode !== "salary") return fixed;
  const lo = addDays(fixed, -10);
  const hit = salaryDates().filter(x => x >= lo && x <= fixed);
  return hit.length ? hit[0] : fixed;
}
function periodOf(s) {
  let f = fixedStartFor(s);
  let start = adjustedStart(f);
  let nextF = nextFixed(f);
  let next = adjustedStart(nextF);
  if (s >= next) { start = next; f = nextF; nextF = nextFixed(nextF); next = adjustedStart(nextF); }
  else if (s < start) { const pf = fixedStartFor(addDays(f, -1)); start = adjustedStart(pf); next = adjustedStart(f); }
  return { start, end: addDays(next, -1), key: start };
}
function shiftPeriod(p, n) {
  return n < 0 ? periodOf(addDays(p.start, -1)) : periodOf(addDays(p.end, 1));
}
function periodLabel(p) { return fmtRange(p.start, p.end); }
function periodName(p) { // nama pendek: "Nov 2026" atau "25 Okt – 24 Nov"
  if (parseD(p.start).getDate() === 1 && parseD(addDays(p.end, 1)).getDate() === 1) {
    const d = parseD(p.start); return BULAN_PANJANG[d.getMonth()] + " " + d.getFullYear();
  }
  const e = parseD(p.end); return BULAN_PANJANG[e.getMonth()] + " " + e.getFullYear();
}

/* ---------- ringkasan periode ---------- */
function summarize(p) {
  const upto = p.end < today() ? p.end : today();
  const list = allTx(upto).filter(t => t.date >= p.start && t.date <= p.end);
  let inc = 0, out = 0;
  const byCat = {}, byDay = {}, byAcct = {}, byGroup = {};
  const fc = feeCat();
  const addOut = (catId, amt, date, acct) => {
    out += amt;
    byCat[catId || "_none"] = (byCat[catId || "_none"] || 0) + amt;
    byDay[date] = (byDay[date] || 0) + amt;
    byAcct[acct] = byAcct[acct] || { in: 0, out: 0 }; byAcct[acct].out += amt;
    const g = (catById(catId) || {}).group || "Lainnya"; byGroup[g] = (byGroup[g] || 0) + amt;
  };
  for (const t of list) {
    const amt = Number(t.amount) || 0, fee = Number(t.fee) || 0;
    if (t.kind === "out") addOut(t.cat, amt, t.date, t.acct);
    if (t.kind === "in") {
      inc += amt; byCat[t.cat || "_none"] = (byCat[t.cat || "_none"] || 0) + amt;
      byAcct[t.acct] = byAcct[t.acct] || { in: 0, out: 0 }; byAcct[t.acct].in += amt;
    }
    if (fee) addOut(fc ? fc.id : "_fee", fee, t.date, t.acct);
  }
  const outCats = Object.entries(byCat).filter(([id]) => { const c = catById(id); return !c || c.type === "out"; })
    .map(([id, v]) => ({ id, name: id === "_fee" ? "Biaya admin" : id === "_none" ? "Tanpa kategori" : catName(id), v })).sort((a, b) => b.v - a.v);
  const inCats = Object.entries(byCat).filter(([id]) => { const c = catById(id); return c && c.type === "in"; })
    .map(([id, v]) => ({ id, name: catName(id), v })).sort((a, b) => b.v - a.v);
  const top = list.filter(t => t.kind === "out").sort((a, b) => b.amount - a.amount).slice(0, 5);
  return { p, list, inc, out, net: inc - out, byDay, outCats, inCats, byAcct, byGroup, top };
}
function budgetStatus(sum) {
  return S.cats.filter(c => c.type === "out" && c.budget > 0).map(c => {
    const used = (sum.outCats.find(x => x.id === c.id) || { v: 0 }).v;
    return { cat: c, used, budget: c.budget, pct: used / c.budget };
  }).sort((a, b) => b.pct - a.pct);
}

/* ---------- validasi & simpan transaksi ---------- */
function normalizeTx(t) {
  const o = {
    id: t.id || uid(), date: t.date || today(), kind: t.kind || "out", cat: t.cat || "", amount: Math.round(Number(t.amount) || 0),
    acct: t.acct || "", to: t.to || "", fee: Math.round(Number(t.fee) || 0), note: (t.note || "").trim(), person: (t.person || "").trim(),
    created: t.created || Date.now()
  };
  if (o.kind !== "out" && o.kind !== "in") o.cat = "";
  if (o.kind !== "transfer") o.to = "";
  if (!DEBT_KINDS.includes(o.kind)) o.person = "";
  return o;
}
function txProblems(t) {
  const p = [];
  if (!(t.amount > 0) && t.kind !== "adjust") p.push("nominal");
  if (!acctById(t.acct)) p.push("akun");
  if ((t.kind === "out" || t.kind === "in") && !catById(t.cat)) p.push("kategori");
  if (t.kind === "transfer" && (!acctById(t.to) || t.to === t.acct)) p.push("akun tujuan");
  if (DEBT_KINDS.includes(t.kind) && !t.person) p.push("nama orang");
  return p;
}
function isDuplicate(t) {
  return S.tx.some(x => x.id !== t.id && x.date === t.date && x.amount === t.amount && x.acct === t.acct && x.kind === t.kind);
}
function upsertTx(t) {
  const o = normalizeTx(t);
  const i = S.tx.findIndex(x => x.id === o.id);
  if (i >= 0) S.tx[i] = o; else S.tx.push(o);
  save(); return o;
}
function deleteTx(id) { S.tx = S.tx.filter(x => x.id !== id); save(); }
