/* Export Excel (.xlsx) & CSV tanpa library */
"use strict";

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function zipStore(files) { // files: [{name, data(Uint8Array)}] -> Uint8Array (tanpa kompresi)
  const enc = new TextEncoder(); const chunks = []; const central = []; let offset = 0;
  const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0)]);
    chunks.push(local, name, f.data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += local.length + name.length + size;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = chunks.concat(central, [end]); const total = all.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total); let p = 0; for (const c of all) { out.set(c, p); p += c.length; } return out;
}

function xmlEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); }
function colName(i) { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function excelDate(s) { const d = parseD(s); return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 864e5); }

/* sheet: {name, rows:[[cell]], widths:[n]} ; cell: string | number | {v, t:'date'|'money'|'bold'|'pct'} */
function buildXlsx(sheets) {
  const enc = new TextEncoder();
  const styleOf = { date: 1, money: 2, bold: 3, pct: 4, boldmoney: 5 };
  const sheetXml = sh => {
    let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    x += '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
    if (sh.widths) x += "<cols>" + sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("") + "</cols>";
    x += "<sheetData>";
    sh.rows.forEach((row, r) => {
      x += `<row r="${r + 1}">`;
      row.forEach((cell, c) => {
        if (cell === null || cell === undefined || cell === "") return;
        const ref = colName(c) + (r + 1);
        let v = cell, t = null;
        if (typeof cell === "object") { v = cell.v; t = cell.t; }
        const s = t ? ` s="${styleOf[t]}"` : (r === 0 ? ' s="3"' : "");
        if (t === "date") x += `<c r="${ref}"${s}><v>${excelDate(v)}</v></c>`;
        else if (typeof v === "number") x += `<c r="${ref}"${s}><v>${v}</v></c>`;
        else x += `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
      });
      x += "</row>";
    });
    return x + "</sheetData></worksheet>";
  };
  const files = [];
  const add = (n, s) => files.push({ name: n, data: enc.encode(s) });
  add("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") + "</Types>");
  add("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  add("xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    sheets.map((s, i) => `<sheet name="${xmlEsc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") + "</sheets></workbook>");
  add("xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  add("xl/styles.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0"/><numFmt numFmtId="166" formatCode="0%"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs></styleSheet>');
  sheets.forEach((s, i) => add(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
  return zipStore(files);
}

/* ---------- isi laporan ---------- */
function txRow(t) {
  return [{ v: t.date, t: "date" }, KINDS[t.kind] ? KINDS[t.kind].label : t.kind, (t.kind === "out" || t.kind === "in") ? catName(t.cat) : "",
    { v: Number(t.amount) || 0, t: "money" }, acctName(t.acct), t.to ? acctName(t.to) : "", t.note || "", t.fee ? { v: t.fee, t: "money" } : "", t.person || ""];
}
const TX_HEAD = ["Tanggal", "Jenis", "Kategori", "Nominal", "Akun", "Ke akun", "Keterangan", "Biaya admin", "Orang"];

function reportSheets(periods) {
  const sheets = [];
  const ring = [["Periode", "Mulai", "Selesai", "Pemasukan", "Pengeluaran", "Selisih"]];
  const cats = S.cats.filter(c => c.type === "out");
  const catRows = [["Kategori", "Kelompok", "Budget"].concat(periods.map(p => periodName(p)))];
  const sums = periods.map(p => summarize(p));
  sums.forEach(s => ring.push([periodName(s.p), { v: s.p.start, t: "date" }, { v: s.p.end, t: "date" }, { v: s.inc, t: "money" }, { v: s.out, t: "money" }, { v: s.net, t: "money" }]));
  const extra = new Set(); sums.forEach(s => s.outCats.forEach(c => { if (!catById(c.id)) extra.add(c.id + "|" + c.name); }));
  cats.forEach(c => catRows.push([c.name, c.group || "", c.budget ? { v: c.budget, t: "money" } : ""].concat(sums.map(s => { const x = s.outCats.find(o => o.id === c.id); return { v: x ? x.v : 0, t: "money" }; }))));
  extra.forEach(e => { const [id, name] = e.split("|"); catRows.push([name, "", ""].concat(sums.map(s => { const x = s.outCats.find(o => o.id === id); return { v: x ? x.v : 0, t: "money" }; }))); });
  catRows.push([{ v: "Total", t: "bold" }, "", ""].concat(sums.map(s => ({ v: s.out, t: "boldmoney" }))));
  sheets.push({ name: "Ringkasan", rows: ring, widths: [24, 12, 12, 16, 16, 16] });
  sheets.push({ name: "Per Kategori", rows: catRows, widths: [30, 16, 14].concat(periods.map(() => 16)) });
  const rows = [TX_HEAD];
  sums.forEach(s => s.list.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created || 0) - (b.created || 0)).forEach(t => rows.push(txRow(t))));
  sheets.push({ name: "Transaksi", rows, widths: [12, 16, 26, 14, 18, 18, 36, 12, 16] });
  const { bal } = balances();
  const ak = [["Akun", "Jenis", "Saldo sekarang", "Limit", "Sisa limit"]];
  S.accts.forEach(a => { const b = bal[a.id] || 0; const ci = isCreditType(a.type) ? creditInfo(a, b) : null;
    ak.push([a.name, ACCT_TYPES[a.type] || a.type, { v: b, t: "money" }, a.limit ? { v: a.limit, t: "money" } : "", ci && ci.avail != null ? { v: ci.avail, t: "money" } : ""]); });
  sheets.push({ name: "Akun", rows: ak, widths: [26, 20, 16, 16, 16] });
  return sheets;
}

function csvOf(periods) {
  const q = v => { const s = String(v == null ? "" : v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = [TX_HEAD];
  periods.forEach(p => summarize(p).list.forEach(t => rows.push(txRow(t).map(c => c && typeof c === "object" ? c.v : c))));
  return "﻿" + rows.map(r => r.map(q).join(",")).join("\r\n");
}

function bytesToB64(u8) { let s = ""; const CH = 0x8000; for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); }

async function deliverFile(name, data, mime) { // data: string | Uint8Array
  const isBin = data instanceof Uint8Array;
  if (window.AndroidBridge) {
    if (isBin) {
      if (AndroidBridge.shareFileBase64) AndroidBridge.shareFileBase64(name, bytesToB64(data), mime);
      else toast("Perbarui app untuk export Excel. CSV tetap bisa.");
    } else AndroidBridge.shareFile(name, data, mime);
    return;
  }
  const blob = new Blob([data], { type: mime });
  try {
    const file = new File([blob], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

function exportXlsx(periods, label) {
  const data = buildXlsx(reportSheets(periods));
  deliverFile("CatatBelanja_" + label.replace(/[^\w-]+/g, "_") + ".xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
function exportCsv(periods, label) {
  deliverFile("CatatBelanja_" + label.replace(/[^\w-]+/g, "_") + ".csv", csvOf(periods), "text/csv");
}
function allPeriods() {
  const dates = allTx().map(t => t.date).sort();
  const first = dates[0] || S.startDate;
  const res = []; let p = periodOf(first); const cur = periodOf(today());
  while (p.start <= cur.start && res.length < 240) { res.push(p); p = shiftPeriod(p, 1); }
  return res;
}
