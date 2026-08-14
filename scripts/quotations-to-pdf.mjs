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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readQuotation } from './lib/quotation-xlsx.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'quotations-source');
const outputDir = path.join(root, 'public', 'files', '_quotations');

// ---------------------------------------------------------------- สร้าง HTML

const escapeHtml = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** จัดรูปแบบตัวเลขตามที่ตั้งไว้ในช่องนั้นของไฟล์ excel เช่น #,##0 -> "36,000" */
const format = (value, style = {}) => {
    const decimals = style.decimals ?? null;
    const n = Number(String(value).replace(/[,\s]/g, ''));
    if (decimals === null || !Number.isFinite(n)) return String(value);
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

/** แปลงรูปแบบช่องจากไฟล์ excel เป็น inline style ของ CSS */
const css = (style = {}, fill) => {
    const background = fill ?? style.fill;
    return [
        style.size ? `font-size:${style.size}pt` : '',
        style.bold ? 'font-weight:700' : '',
        style.italic ? 'font-style:italic' : '',
        style.color ? `color:${style.color}` : '',
        background ? `background-color:${background}` : '',
        style.align ? `text-align:${style.align}` : '',
        style.wrap === false ? 'white-space:nowrap' : '',
    ]
        .filter(Boolean)
        .join(';');
};

/** บรรทัดหัวเอกสาร: ความสูงแถวจากไฟล์ทำเป็นความสูงขั้นต่ำ จัดกึ่งกลางแนวตั้งแบบ excel */
const line = (item, className) => {
    let style = css(item.style);
    if (item.ht) {
        const justify =
            item.style?.align === 'right' ? 'flex-end' : item.style?.align === 'center' ? 'center' : '';
        style += `;min-height:${item.ht}pt;display:flex;align-items:center${justify ? `;justify-content:${justify}` : ''}`;
    }
    return `<p class="${className}" style="${style}">${escapeHtml(item.text)}</p>`;
};

const rowHt = (ht) => (ht ? ` style="height:${ht}pt"` : '');

/**
 * หน้ากระดาษใช้คลาสและไฟล์ CSS ชุดเดียวกับฟอร์มขอใบเสนอราคาในเว็บ
 * (src/components/QuotationSheet.css) PDF กับหน้าเว็บจึงหน้าตาเหมือนกันเสมอ
 */
function renderHtml(doc) {
    const sheetCss = readFileSync(path.join(root, 'src', 'components', 'QuotationSheet.css'), 'utf8');
    const totalWidth = doc.columns.reduce((a, b) => a + b, 0) || 1;

    return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.title.text)}</title>
<style>
/* ขนาดกระดาษตามไฟล์ต้นฉบับ: Letter แนวนอน ขอบซ้ายขวา 0.75" บนล่าง 1"
   (ค่าเดียวกับ pageMargins ในไฟล์ .xlsx และเท่ากับ PDF ที่ export จาก Excel) */
@page { size: letter landscape; margin: 1in 0.75in; }
body { margin: 0; }
${sheetCss}
</style>
</head>
<body>
  <div class="q-sheet" style="--q-border:${doc.borderColor}">
    ${line(doc.title, 'q-line')}
    ${line(doc.company, 'q-line')}
    ${doc.details.map((d) => line(d, 'q-line')).join('\n    ')}

    <table class="q-table">
      <colgroup>
        ${doc.columns.map((w) => `<col style="width:${((w / totalWidth) * 100).toFixed(3)}%">`).join('')}
      </colgroup>
      <thead>
        <tr${rowHt(doc.headerHt)}>${doc.headers.map((h) => `<th style="${css(h.style)}">${escapeHtml(h.text)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${doc.items
            .map((item, index) => {
                const cell = (value, column) =>
                    `<td style="${css(doc.columnStyles[column], item.fill)}">${escapeHtml(value)}</td>`;
                return `<tr${rowHt(item.ht)}>
          ${cell(String(index + 1), 0)}
          ${cell(item.name, 1)}
          ${cell(item.qty, 2)}
          ${cell(item.unit, 3)}
          ${cell(format(item.each, doc.columnStyles[4]), 4)}
          ${cell(format(item.sum, doc.columnStyles[5]), 5)}
        </tr>`;
            })
            .join('\n        ')}
      </tbody>
      ${
          doc.total
              ? `<tfoot>
        <tr${rowHt(doc.total.ht)}>
          <td colspan="5" style="${css(doc.total.labelStyle)}">${escapeHtml(doc.total.label)}</td>
          <td style="${css(doc.total.amountStyle)}">${escapeHtml(format(doc.total.amount, doc.total.amountStyle))}</td>
        </tr>
      </tfoot>`
              : ''
      }
    </table>

    <div class="q-notes">
      ${doc.notes.map((n) => line(n, 'q-note')).join('\n      ')}
    </div>
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
        const doc = readQuotation(path.join(sourceDir, file));
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
