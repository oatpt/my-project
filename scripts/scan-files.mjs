// File: scripts/scan-files.mjs
//
// อ่านไฟล์ทั้งหมดใน public/files/ แล้วเขียนเป็น src/data/attachments.json
//
// เว็บนี้เป็น static site (Vite + nginx) ไม่มี server ให้ไล่อ่านโฟลเดอร์ตอนผู้ใช้เปิดหน้า
// จึงต้องสำรวจโฟลเดอร์ตอน build แล้วเก็บผลไว้เป็นไฟล์ให้ฝั่งเบราว์เซอร์อ่านแทน
// สคริปต์นี้ถูกเรียกอัตโนมัติจาก `npm run dev` และ `npm run build` (hook prebuild/predev)
//
// โครงสร้างที่ได้:
//   {
//     "mediasphere": [
//       { "group": "",         "files": [{ "file": "/files/mediasphere/a.pdf", "name": "a.pdf", "size": 123 }] },
//       { "group": "โบรชัวร์", "files": [ ... ] }
//     ]
//   }

import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filesDir = path.join(root, 'public', 'files');
const outFile = path.join(root, 'src', 'data', 'attachments.json');

/** ไฟล์ที่อยู่ในโฟลเดอร์เพื่อการจัดการ repo ไม่ใช่เนื้อหาที่จะให้โหลด */
const IGNORED = new Set(['.gitkeep', 'thumbs.db', 'desktop.ini']);

const collator = new Intl.Collator(['th', 'en'], { numeric: true });

/** ไล่อ่านโฟลเดอร์ย่อยทั้งหมด คืนรายการไฟล์พร้อมชื่อโฟลเดอร์ย่อยที่มันอยู่ */
function walk(dir, group, out) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return out; // ยังไม่มีโฟลเดอร์นี้ ถือว่าไม่มีไฟล์
    }

    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (IGNORED.has(entry.name.toLowerCase())) continue;

        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, group ? `${group}/${entry.name}` : entry.name, out);
            continue;
        }
        if (!entry.isFile()) continue;

        out.push({
            file: '/' + path.relative(path.join(root, 'public'), full).split(path.sep).join('/'),
            group,
            name: entry.name,
            size: statSync(full).size,
        });
    }
    return out;
}

let productFolders;
try {
    productFolders = readdirSync(filesDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
} catch {
    console.warn('[scan-files] ไม่พบ public/files/ — เขียนไฟล์เปล่าไว้ก่อน');
    productFolders = [];
}

const index = {};
let total = 0;

for (const folder of productFolders.sort(collator.compare)) {
    const found = walk(path.join(filesDir, folder), '', []);
    if (!found.length) continue;

    // จัดเข้ากลุ่มตามโฟลเดอร์ย่อย: ไฟล์ที่วางไว้ชั้นบนสุดขึ้นก่อน แล้วตามด้วยโฟลเดอร์ย่อยเรียงตามชื่อ
    const groups = new Map();
    for (const item of found) {
        const bucket = groups.get(item.group);
        const entry = { file: item.file, name: item.name, size: item.size };
        if (bucket) bucket.push(entry);
        else groups.set(item.group, [entry]);
    }

    index[folder] = [...groups.entries()]
        .sort(([a], [b]) => (!a ? -1 : !b ? 1 : collator.compare(a, b)))
        .map(([group, files]) => ({
            group,
            files: files.sort((a, b) => collator.compare(a.name, b.name)),
        }));

    total += found.length;
}

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(index, null, 2) + '\n', 'utf8');

console.log(
    `[scan-files] พบ ${total} ไฟล์ ใน ${Object.keys(index).length} โฟลเดอร์ -> src/data/attachments.json`,
);
