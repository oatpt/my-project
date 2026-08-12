// File: scripts/quotations-to-pdf.mjs
//
// อ่านใบเสนอราคา .xlsx ใน quotations-source/ แล้วออกเป็น PDF ขนาด A4 ไฟล์ละ 1 ใบ
// ลงไว้ที่ public/files/_quotations/
//
// .xlsx คือต้นฉบับที่แก้ราคาได้ อยู่นอก public/ เพราะเป็นไฟล์ทำงาน ไม่ควรให้โหลดจากเว็บ
// ส่วน PDF คือไฟล์ที่ลูกค้าโหลดจากหน้าเว็บ
// แก้ราคาใน .xlsx แล้วสั่ง `npm run quotations` เพื่อสร้าง PDF ใหม่
//
// ใช้ Chrome ที่ติดตั้งอยู่ในเครื่องเป็นตัวพิมพ์ PDF (ไม่ต้องลง dependency เพิ่ม)
// ถ้าไม่มี Chrome สคริปต์จะข้ามการสร้าง PDF และเตือน แต่ไม่ทำให้ build พัง

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'quotations-source');
const outputDir = path.join(root, 'public', 'files', '_quotations');

// ---------------------------------------------------------------- อ่าน .xlsx

/**
 * แกะไฟล์ zip ด้วย Node ล้วน ๆ คืน Map ของ ชื่อไฟล์ -> เนื้อไฟล์
 *
 * ไม่เรียก tar/unzip ภายนอกเพราะชื่อไฟล์ภาษาไทยจะเพี้ยนตอนส่งผ่าน shell
 * (.xlsx คือ zip ที่ข้างในเป็นไฟล์ XML ชื่ออังกฤษล้วน จึงอ่านชื่อแบบ ASCII ได้)
 */
function unzip(buffer) {
    // End of Central Directory อยู่ท้ายไฟล์ ต้องไล่หาย้อนขึ้นมาเพราะมี comment ต่อท้ายได้
    let eocd = -1;
    for (let i = buffer.length - 22; i >= 0 && i > buffer.length - 22 - 0xffff; i--) {
        if (buffer.readUInt32LE(i) === 0x06054b50) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) throw new Error('ไม่ใช่ไฟล์ zip ที่อ่านได้');

    const count = buffer.readUInt16LE(eocd + 10);
    let pointer = buffer.readUInt32LE(eocd + 16);

    const entries = new Map();
    for (let i = 0; i < count; i++) {
        if (buffer.readUInt32LE(pointer) !== 0x02014b50) break;

        const method = buffer.readUInt16LE(pointer + 10);
        const compressedSize = buffer.readUInt32LE(pointer + 20);
        const nameLength = buffer.readUInt16LE(pointer + 28);
        const extraLength = buffer.readUInt16LE(pointer + 30);
        const commentLength = buffer.readUInt16LE(pointer + 32);
        const localOffset = buffer.readUInt32LE(pointer + 42);
        // สเปก zip กำหนดให้ใช้ "/" แต่บางตัวเขียนมาเป็น "\" — ปรับให้เหมือนกันก่อนใช้
        const name = buffer
            .toString('utf8', pointer + 46, pointer + 46 + nameLength)
            .replace(/\\/g, '/');

        // ความยาว extra ใน local header ต่างจากใน central directory ต้องอ่านซ้ำตรงนั้น
        const localNameLength = buffer.readUInt16LE(localOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localOffset + 28);
        const start = localOffset + 30 + localNameLength + localExtraLength;
        const raw = buffer.subarray(start, start + compressedSize);

        entries.set(name, method === 0 ? raw : inflateRawSync(raw));
        pointer += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}

const decodeEntities = (s) =>
    s
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');

/** อ่านชีตแรกของ .xlsx ออกมาเป็นตารางแถว โดยคีย์ของแต่ละแถวคือชื่อคอลัมน์ */
function readSheet(xlsxPath) {
    const zip = unzip(readFileSync(xlsxPath));

    // sharedStrings มีเฉพาะบางไฟล์; ถ้าไม่มีแปลว่าข้อความฝังอยู่ในเซลล์เลย
    const shared = [];
    const ss = zip.get('xl/sharedStrings.xml');
    if (ss) {
        for (const si of ss.toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
            const text = [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join('');
            shared.push(decodeEntities(text));
        }
    }

    const sheetName = [...zip.keys()]
        .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
        .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))[0];
    if (!sheetName) throw new Error(`ไม่พบชีตใน ${path.basename(xlsxPath)}`);
    const xml = zip.get(sheetName).toString('utf8');

    const rows = [];
    for (const row of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells = {};
        for (const c of row[2].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
            const column = /r="([A-Z]+)\d+"/.exec(c[1])?.[1];
            if (!column) continue;
            const type = /t="([^"]+)"/.exec(c[1])?.[1] ?? 'n';
            const v = /<v>([\s\S]*?)<\/v>/.exec(c[2])?.[1];
            const is = /<is>([\s\S]*?)<\/is>/.exec(c[2])?.[1];

            let value = '';
            if (type === 's' && v !== undefined) value = shared[+v] ?? '';
            else if (type === 'inlineStr' && is) value = decodeEntities(is.replace(/<[^>]+>/g, ''));
            else if (v !== undefined) value = decodeEntities(v);

            if (value !== '') cells[column] = value;
        }
        if (Object.keys(cells).length) rows.push(cells);
    }
    return rows;
}

// ---------------------------------------------------------------- สร้าง HTML

const escapeHtml = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const baht = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value;
};

/**
 * แปลงแถวจากชีตเป็นหน้ากระดาษ
 *
 * รูปแบบชีตคงที่: แถว 1-5 เป็นหัวใบเสนอราคา, แถวที่มีหัวตารางคือ "ลำดับ",
 * รายการคือแถวที่ช่อง A เป็นตัวเลข, แถวรวมยอดคือแถวที่มีช่อง F แต่ช่อง A ไม่ใช่ตัวเลข
 */
function toDocument(rows) {
    const head = [];
    const items = [];
    let total = null;
    const notes = [];

    let seenHeader = false;
    for (const row of rows) {
        const a = row.A ?? '';

        if (a === 'ลำดับ') {
            seenHeader = true;
            continue;
        }
        if (!seenHeader) {
            head.push(a);
            continue;
        }
        if (/^\d+$/.test(a.trim())) {
            items.push({ no: a, name: row.B ?? '', qty: row.C ?? '', unit: row.D ?? '', each: row.E ?? '', sum: row.F ?? '' });
        } else if (row.F !== undefined && total === null) {
            total = { label: a, amount: row.F };
        } else if (a) {
            notes.push(a);
        }
    }

    // แถว 1-2 คือ "ใบเสนอราคา" กับชื่อบริษัท ที่เหลือเป็นรายละเอียดหัวเอกสาร
    const [title = 'ใบเสนอราคา', company = '', ...details] = head;
    return { title, company, details, items, total, notes };
}

function renderHtml(doc) {
    // ใบที่รายการเยอะต้องย่อฟอนต์ลงเพื่อให้จบใน 1 หน้า A4
    const dense = doc.items.length > 8;

    return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 13mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Leelawadee UI", "TH Sarabun New", "Tahoma", sans-serif;
    font-size: ${dense ? '10.5px' : '12px'};
    line-height: 1.45;
    color: #111;
  }
  .doc-title { text-align: center; font-size: ${dense ? '20px' : '23px'}; font-weight: 700; letter-spacing: .04em; }
  .company   { text-align: center; font-size: ${dense ? '14px' : '16px'}; font-weight: 700; color: #1a4a7a; margin-top: 2px; }
  .rule      { height: 2px; background: #1a4a7a; margin: 8px 0 12px; }
  .detail    { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #9aa6b2; padding: ${dense ? '4px 6px' : '6px 8px'}; vertical-align: top; }
  thead th { background: #eef3f8; font-weight: 700; text-align: center; }
  .num  { text-align: right; white-space: nowrap; }
  .mid  { text-align: center; white-space: nowrap; }
  tfoot td { font-weight: 700; background: #f6f9fc; }
  .notes { margin-top: 12px; font-size: ${dense ? '9.5px' : '11px'}; color: #333; }
  .notes p { margin: 3px 0; }
</style>
</head>
<body>
  <div class="doc-title">${escapeHtml(doc.title)}</div>
  <div class="company">${escapeHtml(doc.company)}</div>
  <div class="rule"></div>
  ${doc.details.map((d) => `<p class="detail">${escapeHtml(d)}</p>`).join('\n  ')}

  <table>
    <colgroup>
      <col style="width:8%"><col><col style="width:8%">
      <col style="width:10%"><col style="width:15%"><col style="width:15%">
    </colgroup>
    <thead>
      <tr>
        <th>ลำดับ</th><th>รายการ</th><th>จำนวน</th>
        <th>หน่วย</th><th>ราคาต่อหน่วย (บาท)</th><th>ราคารวม (บาท)</th>
      </tr>
    </thead>
    <tbody>
      ${doc.items
          .map(
              (it) => `<tr>
        <td class="mid">${escapeHtml(it.no)}</td>
        <td>${escapeHtml(it.name)}</td>
        <td class="mid">${escapeHtml(it.qty)}</td>
        <td class="mid">${escapeHtml(it.unit)}</td>
        <td class="num">${escapeHtml(baht(it.each))}</td>
        <td class="num">${escapeHtml(baht(it.sum))}</td>
      </tr>`,
          )
          .join('\n      ')}
    </tbody>
    ${
        doc.total
            ? `<tfoot>
      <tr>
        <td colspan="5">${escapeHtml(doc.total.label)}</td>
        <td class="num">${escapeHtml(baht(doc.total.amount))}</td>
      </tr>
    </tfoot>`
            : ''
    }
  </table>

  <div class="notes">
    ${doc.notes.map((n) => `<p>${escapeHtml(n)}</p>`).join('\n    ')}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------- พิมพ์ PDF

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
    ].filter(Boolean);
    return candidates.find((c) => existsSync(c)) ?? null;
}

const chrome = findChrome();

let files;
try {
    files = readdirSync(sourceDir).filter((n) => n.toLowerCase().endsWith('.xlsx'));
} catch {
    console.log('[quotations] ไม่มีโฟลเดอร์ quotations-source/ — ข้าม');
    process.exit(0);
}

if (!files.length) {
    console.log('[quotations] ไม่มีไฟล์ .xlsx — ข้าม');
    process.exit(0);
}
if (!chrome) {
    console.warn('[quotations] ไม่พบ Chrome/Edge ในเครื่อง จึงสร้าง PDF ไม่ได้ (ตั้ง CHROME_PATH ได้)');
    process.exit(0);
}

const tmp = mkdtempSync(path.join(os.tmpdir(), 'quot-html-'));
try {
    mkdirSync(outputDir, { recursive: true });

    for (const file of files) {
        const doc = toDocument(readSheet(path.join(sourceDir, file)));
        const htmlPath = path.join(tmp, file.replace(/\.xlsx$/i, '.html'));
        const pdfPath = path.join(outputDir, file.replace(/\.xlsx$/i, '.pdf'));

        const html = renderHtml(doc);
        writeFileSync(htmlPath, html, 'utf8');
        // ไว้ตรวจหน้าตาก่อนพิมพ์: QUOTATION_HTML_DIR=... npm run quotations
        if (process.env.QUOTATION_HTML_DIR) {
            writeFileSync(path.join(process.env.QUOTATION_HTML_DIR, path.basename(htmlPath)), html, 'utf8');
        }
        execFileSync(
            chrome,
            [
                '--headless=new',
                '--disable-gpu',
                '--no-sandbox',
                '--no-pdf-header-footer',
                `--print-to-pdf=${pdfPath}`,
                `file:///${htmlPath.replace(/\\/g, '/')}`,
            ],
            { stdio: 'pipe' },
        );

        console.log(`[quotations] ${file} -> ${path.basename(pdfPath)}  (${doc.items.length} รายการ)`);
    }
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
