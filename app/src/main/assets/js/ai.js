/* AI (Gemini) — baca struk / screenshot / chat jadi draf transaksi */
"use strict";

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/";
const JENIS_MAP = { keluar: "out", masuk: "in", transfer: "transfer", pinjamkan: "lend", terima_piutang: "collect", pinjam: "borrow", bayar_hutang: "repay" };
const JENIS_REV = Object.fromEntries(Object.entries(JENIS_MAP).map(([a, b]) => [b, a]));

function scoreModel(n, wantLite) {
  let s = 0;
  if (/flash/.test(n)) s += 10;
  if (/lite/.test(n)) s += wantLite ? 8 : -6;
  if (/(image|tts|audio|live|embed|thinking|native|robotics|computer|learnlm|gemma)/.test(n)) s -= 100;
  if (/preview|exp/.test(n)) s -= 2;
  const v = n.match(/gemini-(\d+(?:\.\d+)?)/); if (v) s += parseFloat(v[1]) * 2;
  return s;
}
function pickModel(list, wantLite) { return list.slice().sort((a, b) => scoreModel(b, wantLite) - scoreModel(a, wantLite))[0] || ""; }

async function loadModels(key) {
  let all = [], tok = "";
  do {
    const r = await fetch(GEMINI.replace(/models\/$/, "models") + "?pageSize=200" + (tok ? "&pageToken=" + tok : ""), { headers: { "x-goog-api-key": key } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || "HTTP " + r.status);
    all = all.concat(j.models || []); tok = j.nextPageToken || "";
  } while (tok);
  return all.filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map(m => m.name.replace(/^models\//, "")).filter(n => /gemini/.test(n) && scoreModel(n) > -50);
}

async function ensureModel() {
  const st = S.settings;
  if (st.model && st.models.length) return;
  st.models = await loadModels(st.apiKey);
  if (!st.model || !st.models.includes(st.model)) st.model = pickModel(st.models, false);
  save();
}

/* matikan / kecilkan "berpikir" supaya jawaban cepat */
function thinkingFor(model) {
  if (/gemini-2\.5-(flash|flash-lite)/.test(model)) return { thinkingBudget: 0 };
  if (/pro/.test(model)) return null;
  if (/gemini-(\d+)/.test(model) && +model.match(/gemini-(\d+)/)[1] >= 3) return { thinkingLevel: "minimal" };
  if (/latest/.test(model)) return { thinkingBudget: 0 };
  return null;
}
const noThink = {};
async function gemini(body, model) {
  const st = S.settings;
  const tc = !noThink[model] && thinkingFor(model);
  const b = tc ? Object.assign({}, body, { generationConfig: Object.assign({}, body.generationConfig || {}, { thinkingConfig: tc }) }) : body;
  let r;
  try {
    r = await fetch(GEMINI + encodeURIComponent(model) + ":generateContent", {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": st.apiKey }, body: JSON.stringify(b)
    });
  } catch (e) { const err = new Error("Tidak tersambung ke internet. Cek koneksi lalu kirim ulang."); err.code = "net"; throw err; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok && tc && r.status === 400 && /think/i.test((j.error && j.error.message) || "")) { noThink[model] = true; return gemini(body, model); }
  if (!r.ok) {
    const msg = (j.error && j.error.message) || "HTTP " + r.status;
    const err = new Error(msg); err.status = r.status; throw err;
  }
  const c = j.candidates && j.candidates[0];
  const txt = c && c.content && c.content.parts ? c.content.parts.map(p => p.text || "").join("") : "";
  if (!txt) { const err = new Error("AI tidak memberi jawaban" + (c && c.finishReason ? " (" + c.finishReason + ")" : "") + ". Kirim ulang."); throw err; }
  return txt;
}

/* panggil dengan cadangan otomatis ke model lite kalau kuota habis */
async function geminiSmart(body) {
  const st = S.settings;
  await ensureModel();
  try { return await gemini(body, st.model); }
  catch (e) {
    if (e.status === 429 && st.autoLite) {
      const lite = pickModel(st.models.filter(m => m !== st.model && /lite/.test(m)), true);
      if (lite) { try { const t = await gemini(body, lite); toast("Kuota model utama habis, dipakai " + lite); return t; } catch (e2) { e = e2; } }
    }
    if (e.status === 429) throw new Error("Kuota gratis AI hari ini habis. Coba lagi nanti, atau catat manual lewat tombol +.");
    if (e.status === 400 && /API key/i.test(e.message)) throw new Error("API key tidak valid. Periksa di Atur > AI.");
    if (e.status === 404) { st.models = []; save(); throw new Error("Model AI tidak ditemukan. Buka Atur > AI lalu muat ulang daftar model."); }
    throw e;
  }
}

function parseJson(raw) {
  const t = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch (e) {
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e2) {} }
    return { reply: raw, drafts: null, questions: [] };
  }
}

function systemPrompt() {
  const st = S.settings, d = new Date();
  const recent = S.tx.filter(t => t.date >= addDays(today(), -10)).slice(-60)
    .map(t => `${t.date} | ${JENIS_REV[t.kind] || t.kind} | ${t.kind === "out" || t.kind === "in" ? catName(t.cat) : ""} | ${t.amount} | ${acctName(t.acct)} | ${t.note}`).join("\n");
  const cash = S.accts.find(a => a.type === "cash");
  return `Kamu asisten pencatat keuangan pribadi${st.name ? " milik " + st.name : ""}. Ubah input (foto struk, screenshot aplikasi belanja/ojol/mutasi bank/notifikasi kartu kredit, atau chat) menjadi draf transaksi.

Hari ini ${HARI[d.getDay()]}, ${today()}. "kemarin" = ${addDays(today(), -1)}. Tanggal tanpa bulan/tahun = bulan berjalan (kalau jadi di masa depan, pakai bulan sebelumnya).

KATEGORI PENGELUARAN (tulis persis):
${S.cats.filter(c => c.type === "out").map(c => c.name).join("\n")}

KATEGORI PEMASUKAN (tulis persis):
${S.cats.filter(c => c.type === "in").map(c => c.name).join("\n")}

AKUN (tulis persis):
${activeAccts().map(a => a.name + " (" + (ACCT_TYPES[a.type] || a.type) + ")").join("\n")}
Akun default kalau tidak disebut: ${(activeAccts().find(a => a.type === "bank") || activeAccts()[0] || {}).name || "-"}.${cash ? "\nBayar tunai / cash = akun " + cash.name + "." : ""}

JENIS transaksi: keluar, masuk, transfer (pindah uang antar akun sendiri, termasuk bayar tagihan kartu kredit, top up e-wallet, tarik tunai), pinjamkan (memberi pinjaman ke orang), terima_piutang (orang mengembalikan pinjaman), pinjam (meminjam uang dari orang), bayar_hutang.

KEBIASAAN PENGGUNA:
${st.rules || "-"}

ATURAN:
- ${st.splitReceipts ? "Struk belanja DIPISAH per kategori: item berkategori sama digabung jadi 1 transaksi, voucher/diskon dikurangkan dari item yang didiskon, jumlah semua transaksi dari satu struk harus sama dengan total yang dibayar." : "Struk belanja dicatat 1 transaksi dengan total yang dibayar."} Keterangan = nama toko + item singkat.
- Screenshot daftar transaksi/mutasi: 1 transaksi per baris; abaikan yang gagal/dibatalkan.
- Nominal Rupiah, angka bulat. Mata uang asing tanpa nilai Rupiah: nominal null lalu tanyakan.
- Cicilan kartu kredit yang tercatat otomatis di app JANGAN dibuat draf.
- Kalau tebakan (kategori/akun/tanggal), ragu=true dan tanyakan di questions dengan menyebut nomor draf (mulai 1).
- Jangan buat draf untuk transaksi yang sudah ada di daftar TERSIMPAN (tanggal, nominal, akun sama); sebut singkat di reply.
- Kalau pengguna menjawab atau minta ubah, perbarui draf yang ada. Draf lama hanya dihapus kalau diminta.
- Kalau bukan transaksi (ngobrol/tanya soal keuangannya), jawab singkat di reply, drafts tetap.

JAWAB HANYA JSON:
{"reply":"singkat, bahasa Indonesia santai, tanpa emoji","drafts":[{"tanggal":"YYYY-MM-DD","jenis":"keluar","kategori":"...","nominal":12345,"akun":"...","ke_akun":null,"biaya_admin":null,"orang":null,"keterangan":"...","ragu":false}],"questions":["..."]}
"drafts" = daftar LENGKAP draf terbaru.

TERSIMPAN 10 hari terakhir (tanggal | jenis | kategori | nominal | akun | keterangan):
${recent || "(kosong)"}`;
}

function draftToJson(d) {
  return { tanggal: d.date, jenis: JENIS_REV[d.kind] || "keluar", kategori: d.cat ? catName(d.cat) : null, nominal: d.amount || null,
    akun: d.acct ? acctName(d.acct) : null, ke_akun: d.to ? acctName(d.to) : null, biaya_admin: d.fee || null, orang: d.person || null, keterangan: d.note, ragu: !!d.unsure };
}
function draftFromJson(x) {
  const kind = JENIS_MAP[x.jenis] || "out";
  let amt = x.nominal; if (typeof amt === "string") amt = Number(amt.replace(/[^\d]/g, ""));
  let date = String(x.tanggal || today()).slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today();
  const cat = catByName(x.kategori), acct = acctByName(x.akun) || activeAccts().find(a => a.type === "bank") || activeAccts()[0];
  const d = normalizeTx({ date, kind, cat: cat ? cat.id : "", amount: amt || 0, acct: acct ? acct.id : "", to: (acctByName(x.ke_akun) || {}).id || "",
    fee: x.biaya_admin || 0, person: x.orang || "", note: x.keterangan || "" });
  d.unsure = !!x.ragu || txProblems(d).length > 0;
  return d;
}

async function aiSend(text, imgs) {
  const hist = [];
  for (const c of S.chat.slice(0, -1).filter(c => c.role !== "err").slice(-6)) {
    const role = c.role === "me" ? "user" : "model";
    const t = (c.text || "") + (c.questions && c.questions.length ? "\nPertanyaan: " + c.questions.map((q, i) => (i + 1) + ". " + q).join(" ") : "");
    if (!hist.length && role !== "user") continue;
    if (hist.length && hist[hist.length - 1].role === role) hist[hist.length - 1].parts[0].text += "\n" + t;
    else hist.push({ role, parts: [{ text: t }] });
  }
  if (hist.length && hist[hist.length - 1].role === "user") hist.push({ role: "model", parts: [{ text: "(ok)" }] });
  const parts = imgs.map(a => ({ inline_data: { mime_type: a.mime, data: a.b64 } }));
  parts.push({ text: "DRAF SAAT INI:\n" + JSON.stringify(S.drafts.map(draftToJson)) + "\n\nPESAN BARU:\n" + (text || "(tanpa teks, baca gambar terlampir)") });
  const raw = await geminiSmart({
    systemInstruction: { parts: [{ text: systemPrompt() }] },
    contents: hist.concat([{ role: "user", parts }]),
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
  });
  const o = parseJson(raw);
  if (Array.isArray(o.drafts)) S.drafts = o.drafts.map(draftFromJson);
  S.chat.push({ role: "bot", text: o.reply || "Oke.", questions: Array.isArray(o.questions) ? o.questions : [] });
}

async function aiInsight(sum, prev) {
  const pack = s => ({ periode: periodLabel(s.p), pemasukan: s.inc, pengeluaran: s.out,
    per_kategori: s.outCats.slice(0, 12).map(c => [c.name, c.v]), terbesar: s.top.map(t => [t.note || catName(t.cat), t.amount]) });
  const budgets = budgetStatus(sum).map(b => [b.cat.name, b.used, b.budget]);
  const raw = await geminiSmart({
    contents: [{ role: "user", parts: [{ text: "Kamu penasihat keuangan pribadi yang lugas. Dari data ini, tulis 3 sampai 5 poin singkat bahasa Indonesia santai tanpa emoji: apa yang menonjol, perbandingan dengan periode sebelumnya, budget yang jebol, dan satu saran konkret. Pakai angka Rupiah. Balas JSON {\"poin\":[\"...\"]}.\n\nPERIODE INI: " + JSON.stringify(pack(sum)) + "\nPERIODE SEBELUMNYA: " + JSON.stringify(prev ? pack(prev) : null) + "\nBUDGET [kategori, terpakai, budget]: " + JSON.stringify(budgets) }] }],
    generationConfig: { temperature: 0.4, responseMimeType: "application/json" }
  });
  const o = parseJson(raw);
  return Array.isArray(o.poin) ? o.poin : [String(o.reply || raw)];
}

/* gambar */
function shrinkImage(dataUrl) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const max = 1280; let w = img.width, h = img.height;
      if (Math.max(w, h) > max) { const r = max / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      const out = c.toDataURL("image/jpeg", 0.8);
      const t = document.createElement("canvas"); const s = 120 / Math.max(w, h); t.width = Math.round(w * s); t.height = Math.round(h * s);
      t.getContext("2d").drawImage(c, 0, 0, t.width, t.height);
      res({ dataUrl: out, b64: out.split(",")[1], mime: "image/jpeg", thumb: t.toDataURL("image/jpeg", 0.6) });
    };
    img.onerror = () => res(null);
    img.src = dataUrl;
  });
}
function readFileAsDataUrl(f) { return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(f); }); }
