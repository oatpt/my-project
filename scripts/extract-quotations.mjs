// File: scripts/extract-quotations.mjs
//
// อ่านใบเสนอราคา .xlsx ใน quotations-source/ แล้วเขียนเป็น src/data/quotations.json
// เพื่อให้หน้าเว็บเอาไปตั้งเป็นค่าเริ่มต้นของฟอร์ม "ขอใบเสนอราคา" ได้
//
// เว็บนี้เป็น static site อ่านไฟล์ .xlsx ตอนผู้ใช้เปิดหน้าไม่ได้ จึงต้องแปลงไว้ก่อนตอน build
// (เรียกเองจาก npm run dev / npm run build — ไม่ต้องสั่งเอง)

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readQuotation } from './lib/quotation-xlsx.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'quotations-source');
const outputFile = path.join(root, 'src', 'data', 'quotations.json');

let files;
try {
    files = readdirSync(sourceDir).filter((n) => n.toLowerCase().endsWith('.xlsx'));
} catch {
    files = [];
}

const quotations = {};
for (const file of files.sort()) {
    // คีย์คือชื่อไฟล์ที่ตัดนามสกุลออก ตรงกับค่า "quotation" ของสินค้าใน products.json
    quotations[file.replace(/\.xlsx$/i, '')] = readQuotation(path.join(sourceDir, file));
}

mkdirSync(path.dirname(outputFile), { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(quotations, null, 2)}\n`, 'utf8');

const count = Object.values(quotations).reduce((n, q) => n + q.items.length, 0);
console.log(
    `[extract-quotations] ${Object.keys(quotations).length} ใบ / ${count} รายการ -> src/data/quotations.json`,
);
