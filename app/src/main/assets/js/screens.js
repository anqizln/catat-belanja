/* Catat Belanja v2 — layar: Beranda, Transaksi, Catat (chat), Laporan, Atur */
"use strict";

/* ================= BERANDA ================= */
function ribbonSvg(sum) {
  const p = sum.p, n = daysBetween(p.start, p.end) + 1, t = today();
  const vals = []; let max = 0;
  for (let i = 0; i < n; i++) { const d = addDays(p.start, i); const v = sum.byDay[d] || 0; vals.push({ d, v }); if (v > max) max = v; }
  const W = 320, H = 74, gap = n > 40 ? 1 : 2, bw = (W - gap * (n - 1)) / n;
  let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Pengeluaran per hari">`;
  vals.forEach((x, i) => {
    const xPos = i * (bw + gap), future = x.d > t;
    if (future) { s += `<rect x="${xPos.toFixed(2)}" y="${H - 3}" width="${bw.toFixed(2)}" height="3" rx="1.5" fill="#FFFFFF" opacity=".18"/>`; return; }
    const h = max ? Math.max(3, (x.v / max) * (H - 8)) : 3;
    const r = Math.min(4, bw / 2);
    s += `<rect class="rb" data-i="${i}" x="${xPos.toFixed(2)}" y="${(H - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="${r}" fill="${x.d === t ? "#FFFFFF" : "var(--ribbon)"}" opacity="${x.v ? 1 : .35}"/>`;
  });
  return { svg: s + "</svg>", vals };
}

ROUTES.home = function (scr) {
  const p = getPeriod(), cur = periodOf(today()), isCur = p.start === cur.start;
  const sum = summarize(p), prev = summarize(shiftPeriod(p, -1));
  const n = daysBetween(p.start, p.end) + 1;
  const dayIdx = isCur ? daysBetween(p.start, today()) + 1 : n;
  const daysLeft = isCur ? n - dayIdx + 1 : 0;
  const totBudget = S.cats.filter(c => c.type === "out").reduce((a, c) => a + (c.budget || 0), 0);
  const { bal, debt } = balances();
  const rib = ribbonSvg(sum);
  const avg = dayIdx ? sum.out / dayIdx : 0;
  const pp = periodPicker(() => ROUTES.home(scr));

  // kartu "aman per hari"
  let safe = "";
  if (isCur) {
    const bs = budgetStatus(sum);
    const base = totBudget > 0 ? totBudget : sum.inc;
    if (base > 0) {
      const left = totBudget > 0 ? bs.reduce((a, b) => a + b.budget - b.used, 0) : sum.inc - sum.out;
      safe = left >= 0
        ? `<div class="callout"><div class="t"><b class="num">${rp(left / Math.max(1, daysLeft))} per hari</b>Batas aman untuk ${daysLeft} hari sampai ${fmtDate(p.end)}, dari sisa ${totBudget > 0 ? "budget" : "pemasukan"} ${rp(left)}.</div></div>`
        : `<div class="callout" style="border-color:var(--bad)"><div class="t"><b class="num" style="color:var(--bad)">Lewat ${rp(-left)}</b>Pengeluaran sudah melebihi ${totBudget > 0 ? "total budget kategori" : "pemasukan"} periode ini.</div></div>`;
    }
  }
  // laporan periode lalu siap
  const prevP = shiftPeriod(cur, -1);
  const ready = isCur && !S.reports.seen[prevP.key] && prevP.end >= S.startDate && summarize(prevP).list.length
    ? `<div class="callout jade"><div class="t"><b>Laporan ${esc(periodName(prevP))} sudah siap</b>Lihat ringkasan dan export ke Excel.</div><button class="btn sm" id="openPrev">Buka</button></div>` : "";

  const budgets = budgetStatus(sum);
  const budgetHtml = budgets.length ? `<div class="sect"><h2>Budget</h2><span class="muted num" style="font-size:13px">${rpShort(budgets.reduce((a, b) => a + b.used, 0))} dari ${rpShort(totBudget)}</span></div>
    <div class="group bars">${budgets.map(b => {
      const cls = b.pct >= 1 ? "bad" : b.pct >= .8 ? "warn" : "";
      const tag = b.pct >= 1 ? `<span class="tag bad">Lewat ${rpShort(b.used - b.budget)}</span>` : b.pct >= .8 ? `<span class="tag warn">Hampir habis</span>` : `<span>sisa ${rpShort(b.budget - b.used)}</span>`;
      return `<div class="b"><div class="top"><span class="n">${esc(b.cat.name)}</span><span class="v num">${rp(b.used)}</span></div>
        <div class="track"><div class="fill ${cls}" style="width:${Math.min(100, b.pct * 100).toFixed(1)}%"></div></div>
        <div class="meta"><span class="num">dari ${rp(b.budget)}</span>${tag}</div></div>`;
    }).join("")}</div>` : "";

  const top = sum.outCats.slice(0, 6), maxC = top.length ? top[0].v : 1;
  const catHtml = top.length ? `<div class="sect"><h2>Paling banyak keluar</h2><button class="link" id="seeRep">Lihat laporan</button></div>
    <div class="group bars">${top.map(c => {
      const pv = (prev.outCats.find(x => x.id === c.id) || { v: 0 }).v;
      const d = pv ? (c.v - pv) / pv : null;
      const dh = d === null ? `<span>baru periode ini</span>` : `<span class="delta ${d > 0.05 ? "up" : d < -0.05 ? "down" : ""}">${d > 0 ? "naik" : "turun"} ${Math.abs(Math.round(d * 100))}% dari periode lalu</span>`;
      return `<div class="b"><div class="top"><span class="n">${esc(c.name)}</span><span class="v num">${rp(c.v)}</span></div>
        <div class="track"><div class="fill" style="width:${(c.v / maxC * 100).toFixed(1)}%"></div></div><div class="meta">${dh}<span class="num">${Math.round(c.v / Math.max(1, sum.out) * 100)}%</span></div></div>`;
    }).join("")}</div>` : `<div class="empty"><b>Belum ada pengeluaran di periode ini</b>Tekan tombol Catat di bawah untuk mulai, bisa dari foto struk atau ketik saja.</div>`;

  const groups = [["Dana siap pakai", a => !isCreditType(a.type) && a.type !== "invest"], ["Investasi", a => a.type === "invest"], ["Kartu kredit & paylater", a => isCreditType(a.type)]];
  let net = 0; S.accts.forEach(a => net += bal[a.id] || 0);
  const debtRows = Object.entries(debt).filter(([, v]) => Math.round(v.piutang) !== 0 || Math.round(v.hutang) !== 0);
  debtRows.forEach(([, v]) => net += v.piutang - v.hutang);
  const acctHtml = `<div class="sect"><h2>Akun</h2><span class="muted num" style="font-size:13px">bersih ${rp(net)}</span></div>` + groups.map(([g, f]) => {
    const list = activeAccts().filter(f); if (!list.length) return "";
    return `<div class="dayhead"><span>${g}</span><span class="num">${rp(list.reduce((s, a) => s + (bal[a.id] || 0), 0))}</span></div><div class="group">` + list.map(a => {
      const b = bal[a.id] || 0;
      if (isCreditType(a.type)) { const ci = creditInfo(a, b);
        return `<button class="row" data-acct="${a.id}"><span class="main"><span class="t1 d-block">${esc(a.name)}</span><span class="t2 d-block num">${ci.avail != null ? "sisa limit " + rp(ci.avail) : ACCT_TYPES[a.type]}</span></span><span class="amt num">${rp(ci.owed)}<small>tagihan</small></span></button>`; }
      return `<button class="row" data-acct="${a.id}"><span class="main"><span class="t1 d-block">${esc(a.name)}</span><span class="t2 d-block">${ACCT_TYPES[a.type] || ""}</span></span><span class="amt num">${rp(b)}</span></button>`;
    }).join("") + "</div>";
  }).join("");
  const debtHtml = debtRows.length ? `<div class="sect"><h2>Hutang & piutang</h2></div><div class="group">${debtRows.map(([p, v]) => {
    const net = v.piutang - v.hutang;
    return `<div class="row"><span class="dot tr">${ICON.person}</span><span class="main"><span class="t1 d-block">${esc(p)}</span><span class="t2 d-block">${net >= 0 ? "berhutang ke kamu" : "kamu berhutang"}</span></span><span class="amt num ${net >= 0 ? "in" : ""}">${rp(Math.abs(net))}</span></div>`;
  }).join("")}</div>` : "";

  scr.innerHTML = `<div class="topbar"><h1>${S.settings.name ? "Halo, " + esc(S.settings.name) : "Beranda"}</h1></div>
  <div class="page">
    <div style="display:flex;justify-content:center;margin-bottom:10px">${pp.html}</div>
    <section class="hero" aria-label="Ringkasan periode">
      <div class="k">${isCur ? "Keluar sejauh ini" : "Total keluar"}</div>
      <div class="big num"><small>Rp</small>${fmtNum(sum.out)}</div>
      <div class="sub">${isCur ? `Hari ke-${dayIdx} dari ${n} · ${daysLeft - 1 > 0 ? `${daysLeft - 1} hari lagi ke periode baru` : "periode berakhir hari ini"}` : esc(periodLabel(p))}</div>
      <div class="ribbon" id="ribbon">${rib.svg}<div class="axis"><span>${fmtDate(p.start)}</span><span>${fmtDate(p.end)}</span></div></div>
      <div class="hero-stats">
        <div><div class="l">Masuk</div><div class="v num">${rpShort(sum.inc)}</div></div>
        <div><div class="l">Selisih</div><div class="v num">${sum.net >= 0 ? "+" : ""}${rpShort(sum.net)}</div></div>
        <div><div class="l">Rata-rata/hari</div><div class="v num">${rpShort(avg)}</div></div>
      </div>
    </section>
    ${ready}${safe}${budgetHtml}${catHtml}${acctHtml}${debtHtml}
  </div>`;
  pp.bind(scr);
  // tooltip pita
  const rb = $("#ribbon");
  const showTip = el => {
    const i = +el.dataset.i, x = rib.vals[i]; $$(".tip", rb).forEach(e => e.remove());
    const box = rb.getBoundingClientRect(), r = el.getBoundingClientRect();
    const tip = document.createElement("div"); tip.className = "tip num";
    tip.textContent = fmtDate(x.d) + " · " + rp(x.v);
    tip.style.left = Math.min(box.width - 50, Math.max(50, r.left - box.left + r.width / 2)) + "px";
    rb.appendChild(tip);
  };
  $$(".rb", rb).forEach(el => { el.addEventListener("click", () => showTip(el)); el.addEventListener("mouseenter", () => showTip(el)); });
  rb.addEventListener("mouseleave", () => $$(".tip", rb).forEach(e => e.remove()));
  const op = $("#openPrev"); if (op) op.onclick = () => go("report", { period: prevP });
  const sr = $("#seeRep"); if (sr) sr.onclick = () => go("report", { period: p });
  $$("[data-acct]", scr).forEach(b => b.onclick = () => openAcctDetail(b.dataset.acct));
};

function openAcctDetail(id) {
  const a = acctById(id); if (!a) return;
  const b = balances().bal[id] || 0;
  const list = allTx().filter(t => (t.acct === id || t.to === id)).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 30);
  const ci = isCreditType(a.type) ? creditInfo(a, b) : null;
  const el = openSheet(a.name, `
    <div class="kv" style="margin-bottom:14px">
      <span>${ci ? "Tagihan berjalan" : "Saldo"}</span><span class="v num">${rp(ci ? ci.owed : b)}</span>
      ${ci && a.limit ? `<span>Limit</span><span class="v num">${rp(a.limit)}</span><span>Cicilan belum ditagih</span><span class="v num">${rp(ci.remInst)}</span><span>Sisa limit</span><span class="v num">${rp(ci.avail)}</span>` : ""}
    </div>
    <button class="btn sec block" id="adjBtn">${ci ? "Samakan dengan tagihan di aplikasi bank" : "Samakan dengan saldo asli"}</button>
    <div class="sect"><h2>Transaksi terakhir</h2></div>
    ${list.length ? `<div class="group">${list.map(txRowHtml).join("")}</div>` : `<p class="muted">Belum ada transaksi.</p>`}`,
    `<button class="btn sec block" id="editAcct">Ubah akun</button>`);
  bindTxRows(el);
  $("#editAcct", el).onclick = () => { closeSheet(el); openAcctSheet(a); };
  $("#adjBtn", el).onclick = () => {
    closeSheet(el);
    const s2 = openSheet("Koreksi saldo " + a.name, `<p class="hint" style="margin:0 0 12px">Isi ${ci ? "tagihan" : "saldo"} sesuai aplikasi bank atau dompetmu sekarang. Selisihnya dicatat sebagai koreksi saldo, tidak masuk laporan pengeluaran.</p>
      <div class="amount-inp"><span>Rp</span><input id="adjAmt" inputmode="numeric" value="${Math.round(ci ? ci.owed : b)}"></div>`,
      `<button class="btn block" id="adjSave">Simpan koreksi</button>`);
    bindAmount($("#adjAmt", s2));
    $("#adjSave", s2).onclick = () => {
      const target = ci ? -amountVal($("#adjAmt", s2)) : amountVal($("#adjAmt", s2));
      const diff = Math.round(target - b);
      if (!diff) { toast("Saldo sudah cocok"); closeSheet(s2); return; }
      upsertTx({ kind: "adjust", acct: a.id, amount: diff, date: today(), note: "Koreksi saldo" });
      closeSheet(s2); toast("Saldo disamakan (selisih " + rp(diff) + ")"); rerender();
    };
  };
}

/* ================= TRANSAKSI ================= */
let txFilter = "all", txSearch = "";
ROUTES.tx = function (scr) {
  const p = getPeriod(); const pp = periodPicker(() => ROUTES.tx(scr));
  const q = txSearch.trim().toLowerCase();
  let list = q ? allTx() : allTx(p.end).filter(t => t.date >= p.start && t.date <= p.end);
  if (txFilter === "out") list = list.filter(t => t.kind === "out");
  if (txFilter === "in") list = list.filter(t => t.kind === "in");
  if (txFilter === "other") list = list.filter(t => !["out", "in"].includes(t.kind));
  if (q) list = list.filter(t => [t.note, catName(t.cat), acctName(t.acct), t.person, String(t.amount)].join(" ").toLowerCase().includes(q));
  list.sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0));
  const days = {}; list.forEach(t => (days[t.date] = days[t.date] || []).push(t));
  scr.innerHTML = `<div class="topbar"><h1>Transaksi</h1><button class="btn sm" id="addTx">${ICON.plus} Tambah</button></div>
  <div class="page">
    <input class="inp" id="txQ" type="search" placeholder="Cari keterangan, kategori, nominal" value="${esc(txSearch)}" style="margin-bottom:10px">
    ${q ? `<p class="muted" style="font-size:13px;margin:0 0 8px">Hasil dari semua periode</p>` : `<div style="display:flex;justify-content:center;margin-bottom:10px">${pp.html}</div>`}
    <div class="seg">${[["all", "Semua"], ["out", "Keluar"], ["in", "Masuk"], ["other", "Lainnya"]].map(([k, l]) => `<button data-f="${k}" class="${txFilter === k ? "on" : ""}">${l}</button>`).join("")}</div>
    ${Object.keys(days).length ? Object.entries(days).map(([d, arr]) => {
      const tot = arr.filter(t => t.kind === "out").reduce((s, t) => s + t.amount + (t.fee || 0), 0);
      return `<div class="dayhead"><span>${fmtDate(d, true)}</span><span class="num">${tot ? "−" + rp(tot).replace("Rp ", "Rp ") : ""}</span></div><div class="group">${arr.map(txRowHtml).join("")}</div>`;
    }).join("") : `<div class="empty"><b>${q ? "Tidak ada yang cocok" : "Belum ada transaksi"}</b>${q ? "Coba kata lain." : "Tekan Tambah untuk catat manual, atau Catat di bawah untuk pakai foto struk."}</div>`}
  </div>`;
  if (!q) pp.bind(scr);
  const qi = $("#txQ"); qi.oninput = () => { txSearch = qi.value; clearTimeout(qi._t); qi._t = setTimeout(() => { ROUTES.tx(scr); const n = $("#txQ"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  $$("[data-f]", scr).forEach(b => b.onclick = () => { txFilter = b.dataset.f; ROUTES.tx(scr); });
  $("#addTx").onclick = () => openTxSheet(null);
  bindTxRows(scr);
};

/* ================= CATAT (CHAT AI) ================= */
let attach = [], busy = false;
ROUTES.chat = function (scr) {
  scr.innerHTML = `<div id="chatWrap">
    <div class="topbar"><h1>Catat</h1><button class="btn sec sm" id="manual">Isi manual</button></div>
    <div id="msgs"></div><div id="drafts" class="hidden"></div><div id="attach"></div>
    <div id="composer">
      <button class="round sec" id="btnAtt" aria-label="Foto struk atau screenshot">${ICON.cam}</button>
      <textarea id="inp" rows="1" placeholder="Contoh: cash 35rb makan kemarin"></textarea>
      <button class="round pri" id="btnSend" aria-label="Kirim">${ICON.send}</button>
    </div></div>`;
  scr.classList.add("chat");
  $("#manual").onclick = () => openTxSheet(null);
  $("#btnAtt").onclick = () => $("#filePick").click();
  $("#btnSend").onclick = sendChat;
  const inp = $("#inp");
  inp.addEventListener("input", () => { inp.style.height = "auto"; inp.style.height = Math.min(inp.scrollHeight, 120) + "px"; });
  renderMsgs(); renderDrafts(); renderAttach();
};
function chatAlive() { return route === "chat" && $("#msgs"); }
function renderMsgs() {
  if (!chatAlive()) return;
  const m = $("#msgs");
  if (!S.chat.length) {
    m.innerHTML = `<div class="empty"><b>Foto struk, kirim screenshot, atau ketik</b>Contoh: "grabfood 69rb tadi siang", "bayar kartu kredit 1,8 juta dari BCA", "pinjamkan Putri 200rb".<br><br>Dari galeri juga bisa: pilih screenshot, Bagikan, lalu pilih Catat Belanja.${S.settings.apiKey ? "" : `<br><br><button class="btn sm" id="goAi">Pasang API key AI dulu</button>`}</div>`;
    const g = $("#goAi"); if (g) g.onclick = () => go("set", { focus: "ai" });
  } else {
    m.innerHTML = S.chat.map(c => {
      if (c.role === "me") return `<div class="msg me">${c.thumbs && c.thumbs.length ? `<div class="imgs">${c.thumbs.map(t => `<img src="${t}" alt="">`).join("")}</div>` : ""}${esc(c.text)}</div>`;
      if (c.role === "err") return `<div class="msg err">${esc(c.text)}</div>`;
      return `<div class="msg bot">${esc(c.text)}${c.questions && c.questions.length ? `<ol>${c.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ol>` : ""}</div>`;
    }).join("");
  }
  if (busy) m.insertAdjacentHTML("beforeend", `<div class="msg bot"><span class="typing"><i></i><i></i><i></i></span></div>`);
  m.scrollTop = m.scrollHeight;
}
let draftsOpen = true;
function renderDrafts() {
  if (!chatAlive()) return;
  const box = $("#drafts");
  box.classList.toggle("hidden", !S.drafts.length);
  if (!S.drafts.length) return;
  const total = S.drafts.reduce((s, d) => s + (d.kind === "out" ? d.amount + (d.fee || 0) : 0), 0);
  box.innerHTML = `<div class="dh"><b>Draf (${S.drafts.length})${total ? ` · <span class="num">${rp(total)}</span>` : ""}</b>
    <button class="btn ghost sm" id="dTog">${draftsOpen ? "Tutup" : "Lihat"}</button><button class="btn sm" id="dSave">Simpan semua</button></div>
    <div class="dl ${draftsOpen ? "" : "hidden"}">${S.drafts.map((d, i) => `<button class="draft ${d.unsure ? "unsure" : ""}" data-d="${i}">
      <span class="no num" style="font-weight:700;color:var(--muted)">${i + 1}</span>
      <span class="main"><span class="t1 d-block">${esc(txTitle(d))}</span><span class="t2 d-block">${esc(fmtDate(d.date))} · ${esc(txSub(d))}${d.unsure ? " · perlu dicek" : ""}</span></span>${txAmount(d)}</button>`).join("")}</div>`;
  $("#dTog").onclick = () => { draftsOpen = !draftsOpen; renderDrafts(); };
  $$("[data-d]", box).forEach(b => b.onclick = () => {
    const i = +b.dataset.d;
    openTxSheet(S.drafts[i], { draft: true, onSave: n => { n.unsure = false; S.drafts[i] = n; save(); renderDrafts(); }, onDelete: () => { S.drafts.splice(i, 1); save(); renderDrafts(); } });
  });
  $("#dSave").onclick = saveDrafts;
}
async function saveDrafts() {
  const bad = S.drafts.map((d, i) => [i + 1, txProblems(normalizeTx(d))]).filter(x => x[1].length);
  if (bad.length) { toast("Draf " + bad.map(x => x[0]).join(", ") + " belum lengkap (" + bad[0][1].join(", ") + "). Ketuk untuk melengkapi."); return; }
  const dup = S.drafts.filter(d => isDuplicate(normalizeTx(d)));
  if (dup.length && !(await confirmSheet("Mungkin sudah tercatat", `${dup.length} draf punya tanggal, nominal, dan akun yang sama dengan transaksi tersimpan:<br><br>${dup.map(d => `${fmtDate(d.date)} · ${rp(d.amount)} · ${esc(txTitle(d))}`).join("<br>")}`, "Tetap simpan semua"))) return;
  const n = S.drafts.length;
  S.drafts.forEach(d => { const o = normalizeTx(d); S.tx.push(o); });
  S.drafts = []; S.chat.push({ role: "bot", text: n + " transaksi tersimpan." }); save();
  toast(n + " transaksi tersimpan"); renderDrafts(); renderMsgs();
}
function renderAttach() {
  if (!chatAlive()) return;
  $("#attach").innerHTML = attach.map((a, i) => `<div class="thumb"><img src="${a.thumb}" alt=""><button data-ai="${i}" aria-label="Hapus gambar">×</button></div>`).join("");
  $$("[data-ai]").forEach(b => b.onclick = () => { attach.splice(+b.dataset.ai, 1); renderAttach(); });
}
$("#filePick").onchange = async e => {
  for (const f of e.target.files) { const d = await readFileAsDataUrl(f); if (!d) continue; const s = await shrinkImage(d); if (s) attach.push(s); }
  e.target.value = ""; renderAttach();
};
window.onSharedImage = async dataUrl => { if (!S.settings.onboarded) return; go("chat"); const s = await shrinkImage(dataUrl); if (s) { attach.push(s); renderAttach(); toast("Gambar masuk. Tambah catatan kalau perlu, lalu kirim."); } };
window.onSharedText = t => { if (!S.settings.onboarded) return; go("chat"); const i = $("#inp"); i.value = (i.value ? i.value + "\n" : "") + t; };

async function sendChat() {
  if (busy) return;
  const inp = $("#inp"), text = inp.value.trim();
  if (!text && !attach.length) return;
  if (!S.settings.apiKey) { toast("Pasang API key AI dulu di Atur > AI"); go("set", { focus: "ai" }); return; }
  const imgs = attach.slice();
  S.chat.push({ role: "me", text: text || "(gambar)", thumbs: imgs.map(a => a.thumb) });
  if (S.chat.length > 80) S.chat = S.chat.slice(-80);
  inp.value = ""; inp.style.height = "auto"; attach = []; renderAttach();
  busy = true; renderMsgs(); save();
  try { await aiSend(text, imgs); draftsOpen = true; }
  catch (e) { S.chat.push({ role: "err", text: e.message || String(e) }); }
  busy = false; save(); renderMsgs(); renderDrafts();
}

/* ================= LAPORAN ================= */
ROUTES.report = function (scr, opts) {
  if (opts.period) return renderReport(scr, opts.period);
  const ps = allPeriods().reverse(), cur = periodOf(today());
  scr.innerHTML = `<div class="topbar"><h1>Laporan</h1></div><div class="page">
    <p class="muted" style="margin:0 0 12px;font-size:14px">Periode ${S.settings.cycleDay === 1 ? "tiap tanggal 1" : "mulai tanggal " + S.settings.cycleDay}${S.settings.cycleMode === "salary" ? ", atau saat gaji masuk" : ""}. Ubah di Atur.</p>
    <div class="group">${ps.map(p => { const s = summarize(p);
      return `<button class="row" data-p="${p.start}"><span class="main"><span class="t1 d-block">${esc(periodName(p))}${p.start === cur.start ? ` <span class="tag good">berjalan</span>` : !S.reports.seen[p.key] && s.list.length ? ` <span class="tag warn">baru</span>` : ""}</span>
      <span class="t2 d-block num">${esc(periodLabel(p))} · masuk ${rpShort(s.inc)}</span></span><span class="amt num">${rp(s.out)}<small>keluar</small></span></button>`; }).join("")}</div>
    <div class="sect"><h2>Export semua data</h2></div>
    <div class="btnrow"><button class="btn sec" id="xAll">Excel semua periode</button><button class="btn sec" id="cAll">CSV semua</button></div>
  </div>`;
  $$("[data-p]", scr).forEach(b => b.onclick = () => renderReport(scr, periodOf(b.dataset.p)));
  $("#xAll").onclick = () => exportXlsx(allPeriods(), "semua_" + today());
  $("#cAll").onclick = () => exportCsv(allPeriods(), "semua_" + today());
};
function renderReport(scr, p) {
  S.reports.seen[p.key] = true; save();
  backStack.push(() => ROUTES.report($("#screen"), {}));
  const sum = summarize(p), prevP = shiftPeriod(p, -1), prev = summarize(prevP);
  const pct = (a, b) => b ? Math.round((a - b) / b * 100) : null;
  const dOut = pct(sum.out, prev.out);
  const groups = Object.entries(sum.byGroup).sort((a, b) => b[1] - a[1]);
  const ins = S.reports.insight[p.key];
  const accRows = Object.entries(sum.byAcct).map(([id, v]) => ({ name: acctName(id), ...v })).sort((a, b) => b.out - a.out);
  scr.innerHTML = `<div class="topbar"><button class="xbtn" id="back" aria-label="Kembali">${ICON.left}</button><h1 style="font-size:19px">${esc(periodName(p))}</h1></div>
  <div class="page">
    <p class="muted num" style="margin:0 0 12px">${esc(periodLabel(p))}</p>
    <div class="group" style="padding:14px"><div class="kv num">
      <span>Pemasukan</span><span class="v in">${rp(sum.inc)}</span>
      <span>Pengeluaran</span><span class="v">${rp(sum.out)}</span>
      <span>Selisih</span><span class="v">${sum.net >= 0 ? "+" : ""}${rp(sum.net)}</span>
      <span>Dibanding ${esc(periodName(prevP))}</span><span class="v delta ${dOut > 0 ? "up" : dOut < 0 ? "down" : ""}">${dOut === null ? "–" : (dOut > 0 ? "naik " : "turun ") + Math.abs(dOut) + "%"}</span>
      <span>Jumlah transaksi</span><span class="v">${sum.list.length}</span>
    </div></div>
    <div class="sect"><h2>Ringkasan AI</h2>${S.settings.apiKey ? `<button class="link" id="mkIns">${ins ? "Buat ulang" : "Buat"}</button>` : ""}</div>
    <div class="group insight" style="padding:14px" id="insBox">${ins ? `<ul>${ins.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<span class="muted">${S.settings.apiKey ? "Tekan Buat untuk ringkasan otomatis dari angka periode ini." : "Pasang API key AI di Atur untuk ringkasan otomatis."}</span>`}</div>
    <div class="sect"><h2>Per kategori</h2></div>
    ${sum.outCats.length ? `<div class="group"><table class="t"><thead><tr><th>Kategori</th><th class="r">Nominal</th><th class="r">vs lalu</th></tr></thead><tbody>
      ${sum.outCats.map(c => { const pv = (prev.outCats.find(x => x.id === c.id) || { v: 0 }).v; const d = pct(c.v, pv);
        const cat = catById(c.id); const over = cat && cat.budget && c.v > cat.budget;
        return `<tr><td>${esc(c.name)}${over ? ` <span class="tag bad">lewat budget</span>` : ""}</td><td class="r num">${rp(c.v)}</td><td class="r num delta ${d > 0 ? "up" : d < 0 ? "down" : ""}">${d === null ? "baru" : (d > 0 ? "+" : "") + d + "%"}</td></tr>`; }).join("")}
    </tbody></table></div>` : `<p class="muted">Tidak ada pengeluaran.</p>`}
    ${groups.length > 1 ? `<div class="sect"><h2>Per kelompok</h2></div><div class="group"><table class="t"><tbody>${groups.map(([g, v]) => `<tr><td>${esc(g)}</td><td class="r num">${rp(v)}</td><td class="r num muted">${Math.round(v / Math.max(1, sum.out) * 100)}%</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${sum.inCats.length ? `<div class="sect"><h2>Pemasukan</h2></div><div class="group"><table class="t"><tbody>${sum.inCats.map(c => `<tr><td>${esc(c.name)}</td><td class="r num in">${rp(c.v)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${accRows.length ? `<div class="sect"><h2>Per akun</h2></div><div class="group"><table class="t"><thead><tr><th>Akun</th><th class="r">Masuk</th><th class="r">Keluar</th></tr></thead><tbody>${accRows.map(a => `<tr><td>${esc(a.name)}</td><td class="r num in">${a.in ? rp(a.in) : "–"}</td><td class="r num">${a.out ? rp(a.out) : "–"}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${sum.top.length ? `<div class="sect"><h2>Pengeluaran terbesar</h2></div><div class="group">${sum.top.map(txRowHtml).join("")}</div>` : ""}
    <div class="sect"><h2>Export periode ini</h2></div>
    <div class="btnrow"><button class="btn" id="xP">Excel</button><button class="btn sec" id="cP">CSV</button></div>
  </div>`;
  $("#back").onclick = () => { backStack.pop(); ROUTES.report(scr, {}); };
  bindTxRows(scr);
  $("#xP").onclick = () => exportXlsx([p], p.start);
  $("#cP").onclick = () => exportCsv([p], p.start);
  const mk = $("#mkIns");
  if (mk) mk.onclick = async () => {
    $("#insBox").innerHTML = `<span class="typing"><i></i><i></i><i></i></span>`;
    try { S.reports.insight[p.key] = await aiInsight(sum, prev.list.length ? prev : null); save(); renderReport(scr, p); backStack.pop(); }
    catch (e) { $("#insBox").innerHTML = `<span style="color:var(--bad)">${esc(e.message)}</span>`; }
  };
}

/* ================= ATUR ================= */
ROUTES.set = function (scr, opts) {
  const st = S.settings;
  const { bal } = balances();
  const dayOpts = Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}" ${st.cycleDay === i + 1 ? "selected" : ""}>Tanggal ${i + 1}</option>`).join("");
  const outCats = S.cats.filter(c => c.type === "out"), inCats = S.cats.filter(c => c.type === "in");
  const catRow = c => `<button class="row" data-cat="${c.id}"><span class="main"><span class="t1 d-block">${esc(c.name)}${c.salary ? ` <span class="tag good">gaji</span>` : ""}</span><span class="t2 d-block">${esc(c.group || "Tanpa kelompok")}</span></span><span class="amt num">${c.budget ? rpShort(c.budget) : ""}${c.budget ? "<small>budget</small>" : ""}</span></button>`;
  scr.innerHTML = `<div class="topbar"><h1>Atur</h1></div><div class="page">
    <div class="sect"><h2>Tampilan</h2></div>
    <div class="seg" id="theme">${[["system", "Ikut HP"], ["light", "Terang"], ["dark", "Gelap"]].map(([k, l]) => `<button data-t="${k}" class="${st.theme === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <label class="f" style="margin-top:12px"><span>Nama panggilan</span><input class="inp" id="sName" value="${esc(st.name)}" placeholder="Opsional"></label>

    <div class="sect"><h2>Periode keuangan</h2></div>
    <label class="f"><span>Periode baru dimulai</span><select class="inp" id="sDay">${dayOpts}</select></label>
    <div class="group"><label class="toggle"><span>Mulai lebih awal kalau gaji masuk duluan<br><span class="muted" style="font-size:12.5px">Butuh kategori pemasukan yang ditandai gaji</span></span><input type="checkbox" id="sSal" ${st.cycleMode === "salary" ? "checked" : ""}></label></div>

    <div class="sect"><h2>Kategori pengeluaran</h2><button class="link" data-newcat="out">Tambah</button></div>
    <div class="group">${outCats.map(catRow).join("") || `<div class="row muted">Belum ada</div>`}</div>
    <div class="sect"><h2>Kategori pemasukan</h2><button class="link" data-newcat="in">Tambah</button></div>
    <div class="group">${inCats.map(catRow).join("") || `<div class="row muted">Belum ada</div>`}</div>

    <div class="sect"><h2>Akun</h2><button class="link" id="newAcct">Tambah</button></div>
    <div class="group">${S.accts.map(a => `<button class="row" data-acc="${a.id}"><span class="main"><span class="t1 d-block">${esc(a.name)}${a.archived ? ` <span class="tag warn">diarsip</span>` : ""}</span><span class="t2 d-block">${ACCT_TYPES[a.type] || ""}</span></span><span class="amt num">${rp(bal[a.id] || 0)}</span></button>`).join("") || `<div class="row muted">Belum ada</div>`}</div>

    <div class="sect"><h2>Cicilan kartu kredit / paylater</h2><button class="link" id="newInst">Tambah</button></div>
    <p class="hint" style="margin:0 0 8px">Cicilan otomatis tercatat sebagai pengeluaran setiap tanggal tagihannya. Jangan dicatat manual lagi.</p>
    <div class="group">${S.inst.map(i => { const done = instSchedule(i).filter(s => s.date <= today()).length;
      return `<button class="row" data-inst="${i.id}"><span class="main"><span class="t1 d-block">${esc(i.name)}</span><span class="t2 d-block">${esc(acctName(i.acct))} · ${done}/${i.months} ditagih</span></span><span class="amt num">${rp(i.monthly || Math.round(i.total / i.months))}<small>per bulan</small></span></button>`; }).join("") || `<div class="row muted">Belum ada cicilan</div>`}</div>

    <div class="sect" id="aiSec"><h2>AI pembaca struk</h2></div>
    <label class="f"><span>API key Gemini (gratis)</span><input class="inp" id="sKey" type="password" value="${esc(st.apiKey)}" autocomplete="off" placeholder="Tempel API key"></label>
    <p class="hint">Buat di <a href="https://aistudio.google.com/apikey" style="color:var(--jade)">aistudio.google.com/apikey</a>: login Google, Create API key, lalu salin.</p>
    <label class="f"><span>Model</span><select class="inp" id="sModel">${(st.models.length ? st.models : st.model ? [st.model] : []).map(m => `<option ${m === st.model ? "selected" : ""}>${esc(m)}</option>`).join("") || `<option value="">Isi API key lalu muat daftar model</option>`}</select></label>
    <div class="btnrow" style="margin-bottom:12px"><button class="btn sec sm" id="loadM">Muat daftar model</button><button class="btn sec sm" id="testM">Tes koneksi</button></div>
    <div class="group">
      <label class="toggle"><span>Pindah ke model lite kalau kuota habis</span><input type="checkbox" id="sLite" ${st.autoLite ? "checked" : ""}></label>
      <label class="toggle" style="border-top:1px solid var(--line)"><span>Pisah struk per kategori</span><input type="checkbox" id="sSplit" ${st.splitReceipts ? "checked" : ""}></label>
    </div>
    <label class="f" style="margin-top:12px"><span>Kebiasaan untuk AI (satu per baris)</span><textarea class="inp" id="sRules" rows="8">${esc(st.rules)}</textarea></label>
    <p class="hint">Contoh: "GRAS = Ngopi & Nongkrong", "Bluebird = Transportasi".</p>

    <div class="sect"><h2>Data</h2></div>
    <div class="group">
      <button class="row" id="dBackup"><span class="main"><span class="t1 d-block">Backup data</span><span class="t2 d-block">Simpan file cadangan, bisa dipulihkan di HP lain</span></span></button>
      <button class="row" id="dRestore"><span class="main"><span class="t1 d-block">Pulihkan dari backup</span><span class="t2 d-block">Data sekarang akan diganti</span></span></button>
      <button class="row" id="dChat"><span class="main"><span class="t1 d-block">Hapus riwayat chat</span><span class="t2 d-block">Transaksi tidak ikut terhapus</span></span></button>
      <button class="row" id="dReset"><span class="main"><span class="t1 d-block" style="color:var(--bad)">Hapus semua data</span><span class="t2 d-block">Mulai dari awal</span></span></button>
    </div>
    <p class="muted" style="font-size:12px;text-align:center;margin:22px 0 0">Catat Belanja 2.0 · data tersimpan di HP ini</p>
  </div>`;
  if (opts.focus === "ai") setTimeout(() => $("#aiSec").scrollIntoView(), 50);
  $$("[data-t]", scr).forEach(b => b.onclick = () => { st.theme = b.dataset.t; save(); applyTheme(); ROUTES.set(scr, {}); });
  $("#sName").onchange = e => { st.name = e.target.value.trim(); save(); };
  $("#sDay").onchange = e => { st.cycleDay = +e.target.value; curPeriod = null; save(); toast("Periode diubah"); };
  $("#sSal").onchange = e => {
    st.cycleMode = e.target.checked ? "salary" : "fixed"; curPeriod = null; save();
    if (e.target.checked && !S.cats.some(c => c.salary)) toast("Tandai kategori Gaji dulu: buka kategori pemasukan, aktifkan Ini gaji");
  };
  $$("[data-cat]", scr).forEach(b => b.onclick = () => openCatSheet(catById(b.dataset.cat)));
  $$("[data-newcat]", scr).forEach(b => b.onclick = () => openCatSheet(null, b.dataset.newcat));
  $$("[data-acc]", scr).forEach(b => b.onclick = () => openAcctSheet(acctById(b.dataset.acc)));
  $("#newAcct").onclick = () => openAcctSheet(null);
  $$("[data-inst]", scr).forEach(b => b.onclick = () => openInstSheet(S.inst.find(i => i.id === b.dataset.inst)));
  $("#newInst").onclick = () => openInstSheet(null);
  $("#sKey").onchange = e => { st.apiKey = e.target.value.trim(); st.models = []; save(); };
  $("#sModel").onchange = e => { st.model = e.target.value; save(); };
  $("#sLite").onchange = e => { st.autoLite = e.target.checked; save(); };
  $("#sSplit").onchange = e => { st.splitReceipts = e.target.checked; save(); };
  $("#sRules").onchange = e => { st.rules = e.target.value.trim(); save(); };
  $("#loadM").onclick = async () => {
    st.apiKey = $("#sKey").value.trim(); if (!st.apiKey) { toast("Isi API key dulu"); return; }
    try { st.models = await loadModels(st.apiKey); if (!st.models.includes(st.model)) st.model = pickModel(st.models, false); save(); ROUTES.set(scr, { focus: "ai" }); toast(st.models.length + " model. Dipilih: " + st.model); }
    catch (e) { toast("Gagal: " + e.message); }
  };
  $("#testM").onclick = async () => {
    st.apiKey = $("#sKey").value.trim(); save();
    try { await gemini({ contents: [{ role: "user", parts: [{ text: "Balas: siap" }] }] }, (await ensureModel(), st.model)); toast("Koneksi OK (" + st.model + ")"); }
    catch (e) { toast("Gagal: " + e.message); }
  };
  $("#dBackup").onclick = () => {
    const data = JSON.stringify({ app: "catatbelanja", v: 2, at: new Date().toISOString(), state: Object.assign({}, S, { chat: [], settings: Object.assign({}, S.settings, { apiKey: "" }) }) });
    deliverFile("backup_catatbelanja_" + today() + ".json", data, "application/json");
  };
  $("#dRestore").onclick = () => pickJson(async d => {
    if (!(await confirmSheet("Pulihkan backup?", "Semua data di HP ini akan diganti dengan isi file backup.", "Pulihkan", true))) return;
    restoreFrom(d); toast("Data dipulihkan"); go("home");
  });
  $("#dChat").onclick = async () => { if (await confirmSheet("Hapus riwayat chat?", "Draf dan transaksi tersimpan tidak ikut terhapus.", "Hapus", true)) { S.chat = []; save(); toast("Riwayat chat dihapus"); } };
  $("#dReset").onclick = async () => {
    if (!(await confirmSheet("Hapus semua data?", "Semua transaksi, akun, dan pengaturan akan hilang dan tidak bisa dikembalikan. Backup dulu kalau perlu.", "Hapus semua", true))) return;
    const key = st.apiKey; S = defaultState(); S.settings.apiKey = key; await saveNow(); curPeriod = null; startOnboarding();
  };
};

function pickJson(cb) {
  const f = $("#fileJson");
  f.onchange = () => {
    const file = f.files[0]; f.value = ""; if (!file) return;
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (d.app !== "catatbelanja" || !d.state) throw new Error("Bukan file backup Catat Belanja"); cb(d); } catch (e) { toast("File tidak bisa dibaca: " + e.message); } };
    r.readAsText(file);
  };
  f.click();
}
function restoreFrom(d) {
  const keep = { apiKey: S.settings.apiKey, theme: S.settings.theme };
  const base = defaultState();
  S = Object.assign(base, d.state);
  S.settings = Object.assign(base.settings, d.state.settings || {});
  if (!S.settings.apiKey) S.settings.apiKey = keep.apiKey;
  S.reports = Object.assign({ seen: {}, insight: {} }, d.state.reports || {});
  S.v = 2; curPeriod = null; saveNow(); applyTheme();
}

/* ---------- sheet kategori ---------- */
function openCatSheet(c, type) {
  const isNew = !c; c = c || { name: "", type: type || "out", group: "", budget: 0, salary: false };
  const groups = [...new Set(S.cats.map(x => x.group).filter(Boolean))];
  const used = c.id ? S.tx.filter(t => t.cat === c.id).length + S.inst.filter(i => i.cat === c.id).length : 0;
  const el = openSheet(isNew ? "Kategori baru" : "Ubah kategori", `
    <label class="f"><span>Nama</span><input class="inp" id="cName" value="${esc(c.name)}"></label>
    <div class="seg" style="margin-bottom:12px" id="cType">${[["out", "Pengeluaran"], ["in", "Pemasukan"]].map(([k, l]) => `<button data-ct="${k}" class="${c.type === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <label class="f"><span>Kelompok (untuk laporan)</span><input class="inp" id="cGroup" list="dlG" value="${esc(c.group)}" placeholder="Misal: Kebutuhan, Gaya hidup"><datalist id="dlG">${groups.map(g => `<option value="${esc(g)}">`).join("")}</datalist></label>
    <label class="f" id="cBudWrap"><span>Budget per periode (kosongkan kalau tidak pakai)</span><input class="inp" id="cBud" inputmode="numeric" value="${c.budget || ""}"></label>
    <div class="group" id="cSalWrap"><label class="toggle"><span>Ini gaji (penanda awal periode)</span><input type="checkbox" id="cSal" ${c.salary ? "checked" : ""}></label></div>`,
    `<div class="btnrow">${!isNew ? `<button class="btn danger" id="cDel">Hapus</button>` : ""}<button class="btn" id="cSave">Simpan</button></div>`);
  let ty = c.type;
  const vis = () => { $("#cBudWrap", el).classList.toggle("hidden", ty !== "out"); $("#cSalWrap", el).classList.toggle("hidden", ty !== "in"); };
  vis(); bindAmount($("#cBud", el));
  $$("[data-ct]", el).forEach(b => b.onclick = () => { ty = b.dataset.ct; $$("[data-ct]", el).forEach(x => x.classList.toggle("on", x === b)); vis(); });
  $("#cSave", el).onclick = () => {
    const name = $("#cName", el).value.trim(); if (!name) { toast("Isi nama kategori"); return; }
    const dupe = S.cats.find(x => x.name.toLowerCase() === name.toLowerCase() && x.id !== c.id); if (dupe) { toast("Nama kategori sudah ada"); return; }
    Object.assign(c, { name, type: ty, group: $("#cGroup", el).value.trim(), budget: ty === "out" ? amountVal($("#cBud", el)) : 0, salary: ty === "in" && $("#cSal", el).checked });
    if (isNew) { c.id = uid(); S.cats.push(c); }
    save(); closeSheet(el); rerender();
  };
  const del = $("#cDel", el);
  if (del) del.onclick = async () => {
    if (used) { toast("Kategori dipakai di " + used + " transaksi/cicilan. Ganti dulu kategorinya, atau ubah nama saja."); return; }
    if (await confirmSheet("Hapus kategori?", esc(c.name), "Hapus", true)) { S.cats = S.cats.filter(x => x.id !== c.id); save(); closeSheet(el); rerender(); }
  };
}

/* ---------- sheet akun ---------- */
function openAcctSheet(a) {
  const isNew = !a; a = a || { name: "", type: "bank", opening: 0, limit: 0 };
  const credit = () => isCreditType($("#aType", el).value);
  const el = openSheet(isNew ? "Akun baru" : "Ubah akun", `
    <label class="f"><span>Nama akun</span><input class="inp" id="aName" value="${esc(a.name)}" placeholder="Misal: BCA, Gopay, Dompet"></label>
    <label class="f"><span>Jenis</span><select class="inp" id="aType">${Object.entries(ACCT_TYPES).map(([k, l]) => `<option value="${k}" ${a.type === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="f"><span id="aOpLbl">Saldo awal (per ${fmtDate(S.startDate, true)})</span><input class="inp" id="aOpen" inputmode="numeric" value="${Math.abs(Math.round(a.opening || 0)) || ""}"></label>
    <label class="f" id="aLimWrap"><span>Limit</span><input class="inp" id="aLim" inputmode="numeric" value="${a.limit || ""}"></label>
    ${!isNew ? `<div class="group"><label class="toggle"><span>Arsipkan (sembunyikan dari pilihan)</span><input type="checkbox" id="aArc" ${a.archived ? "checked" : ""}></label></div>` : ""}`,
    `<div class="btnrow">${!isNew ? `<button class="btn danger" id="aDel">Hapus</button>` : ""}<button class="btn" id="aSave">Simpan</button></div>`);
  const vis = () => { $("#aLimWrap", el).classList.toggle("hidden", !credit()); $("#aOpLbl", el).textContent = (credit() ? "Tagihan awal" : "Saldo awal") + " (per " + fmtDate(S.startDate, true) + ")"; };
  vis(); $("#aType", el).onchange = vis; bindAmount($("#aOpen", el)); bindAmount($("#aLim", el));
  $("#aSave", el).onclick = () => {
    const name = $("#aName", el).value.trim(); if (!name) { toast("Isi nama akun"); return; }
    if (S.accts.find(x => x.name.toLowerCase() === name.toLowerCase() && x.id !== a.id)) { toast("Nama akun sudah ada"); return; }
    const type = $("#aType", el).value, open = amountVal($("#aOpen", el));
    Object.assign(a, { name, type, opening: isCreditType(type) ? -open : open, limit: isCreditType(type) ? amountVal($("#aLim", el)) : 0, archived: $("#aArc", el) ? $("#aArc", el).checked : false });
    if (isNew) { a.id = uid(); S.accts.push(a); }
    save(); closeSheet(el); rerender();
  };
  const del = $("#aDel", el);
  if (del) del.onclick = async () => {
    const used = S.tx.filter(t => t.acct === a.id || t.to === a.id).length;
    if (used) { toast("Akun dipakai di " + used + " transaksi. Arsipkan saja supaya riwayat tetap utuh."); return; }
    if (await confirmSheet("Hapus akun?", esc(a.name), "Hapus", true)) { S.accts = S.accts.filter(x => x.id !== a.id); save(); closeSheet(el); rerender(); }
  };
}

/* ---------- sheet cicilan ---------- */
function openInstSheet(i) {
  const isNew = !i;
  const credits = S.accts.filter(a => isCreditType(a.type));
  if (isNew && !credits.length) { toast("Tambah akun kartu kredit atau paylater dulu"); return; }
  i = i || { name: "", acct: credits[0].id, total: 0, months: 12, firstDate: today(), monthly: 0, cat: (S.cats.find(c => /cicilan/i.test(c.name) && c.type === "out") || S.cats.find(c => c.type === "out") || {}).id };
  const el = openSheet(isNew ? "Cicilan baru" : "Ubah cicilan", `
    <label class="f"><span>Nama barang</span><input class="inp" id="iName" value="${esc(i.name)}"></label>
    <label class="f"><span>Kartu / paylater</span><select class="inp" id="iAcct">${credits.map(a => `<option value="${a.id}" ${a.id === i.acct ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label>
    <label class="f"><span>Total cicilan</span><input class="inp" id="iTot" inputmode="numeric" value="${i.total || ""}"></label>
    <label class="f"><span>Tenor (bulan)</span><input class="inp" id="iMon" type="number" min="1" max="60" value="${i.months}"></label>
    <label class="f"><span>Tanggal tagihan pertama</span><input class="inp" type="date" id="iFirst" value="${esc(i.firstDate)}"></label>
    <label class="f"><span>Cicilan per bulan (kosongkan = total ÷ tenor)</span><input class="inp" id="iMonthly" inputmode="numeric" value="${i.monthly || ""}"></label>
    <label class="f"><span>Kategori di laporan</span><select class="inp" id="iCat">${S.cats.filter(c => c.type === "out").map(c => `<option value="${c.id}" ${c.id === i.cat ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>`,
    `<div class="btnrow">${!isNew ? `<button class="btn danger" id="iDel">Hapus</button>` : ""}<button class="btn" id="iSave">Simpan</button></div>`);
  ["#iTot", "#iMonthly"].forEach(s => bindAmount($(s, el)));
  $("#iSave", el).onclick = () => {
    const o = { name: $("#iName", el).value.trim(), acct: $("#iAcct", el).value, total: amountVal($("#iTot", el)), months: Math.max(1, +$("#iMon", el).value || 1),
      firstDate: $("#iFirst", el).value || today(), monthly: amountVal($("#iMonthly", el)), cat: $("#iCat", el).value };
    if (!o.name || !o.total) { toast("Isi nama dan total cicilan"); return; }
    Object.assign(i, o); if (isNew) { i.id = uid(); S.inst.push(i); }
    save(); closeSheet(el); rerender();
  };
  const del = $("#iDel", el);
  if (del) del.onclick = async () => { if (await confirmSheet("Hapus cicilan?", esc(i.name) + ". Tagihan cicilan yang sudah lewat juga hilang dari laporan.", "Hapus", true)) { S.inst = S.inst.filter(x => x.id !== i.id); save(); closeSheet(el); rerender(); } };
}
