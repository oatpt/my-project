// File: scripts/lib/quotation-xlsx.mjs
//
// อ่านใบเสนอราคา .xlsx ออกมาเป็นโครงสร้างข้อมูล พร้อมรูปแบบการจัดหน้าที่ตั้งไว้ในไฟล์
// (ฟอนต์ ขนาด สีตัวอักษร สีพื้น การจัดชิด ความกว้างคอลัมน์ และรูปแบบตัวเลข)
// เพื่อให้ทั้งเว็บและ PDF พิมพ์ออกมาหน้าตาเหมือนไฟล์ excel ต้นฉบับ
//
// ไฟล์นี้ตั้งใจให้ import ได้เฉย ๆ ไม่มีอะไรทำงานตอน import — ใครจะเอาไปพิมพ์ PDF
// (scripts/quotations-to-pdf.mjs) หรือเอาไปฝังในเว็บ (scripts/extract-quotations.mjs) ก็ได้

import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';

/**
 * แกะไฟล์ zip ด้วย Node ล้วน ๆ คืน Map ของ ชื่อไฟล์ -> เนื้อไฟล์
 *
 * ไม่เรียก tar/unzip ภายนอกเพราะชื่อไฟล์ภาษาไทยจะเพี้ยนตอนส่งผ่าน shell
 * (.xlsx คือ zip ที่ข้างในเป็นไฟล์ XML ชื่ออังกฤษล้วน จึงอ่านชื่อแบบ ASCII ได้)
 */
export function unzip(buffer) {
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

// ---------------------------------------------------------------- รูปแบบเซลล์

/** excel เขียนสีเป็น ARGB เช่น "001F4E78" เอาเฉพาะ 6 หลักท้ายมาเป็นสี CSS */
const toColor = (argb) => (argb ? `#${argb.slice(-6)}` : '');

/** ตัดเนื้อในของแท็กใหญ่ ๆ ใน styles.xml ออกมา */
const section = (xml, name) =>
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml)?.[1] ?? '';

/** แบ่งเป็นก้อนละหนึ่ง element โดยไม่สนว่าปิดแท็กแบบไหน (excel เขียนมาทั้งสองแบบ) */
const chunks = (xml, tag) => xml.split(new RegExp(`<${tag}\\b`)).slice(1);

/**
 * รูปแบบตัวเลขที่ใช้จริงในไฟล์ชุดนี้
 * 3 = "#,##0" (มีลูกน้ำ ไม่มีทศนิยม), 4 = "#,##0.00"
 * นอกเหนือจากนี้ถือว่าไม่ได้จัดรูปแบบ พิมพ์ค่าตามที่กรอกไว้
 */
const decimalsOf = (numFmtId) => (numFmtId === 3 ? 0 : numFmtId === 4 ? 2 : null);

/** อ่าน styles.xml ออกมาเป็นตารางรูปแบบเซลล์ ให้ค้นด้วยเลข s= ของเซลล์ */
function readStyles(zip) {
    const xml = zip.get('xl/styles.xml')?.toString('utf8') ?? '';

    const fonts = chunks(section(xml, 'fonts'), 'font').map((font) => ({
        name: /<name val="([^"]+)"/.exec(font)?.[1] ?? '',
        size: Number(/<sz val="([\d.]+)"/.exec(font)?.[1] ?? 11),
        bold: /<b(?: val="1")?\s*\/?>/.test(font),
        italic: /<i(?: val="1")?\s*\/?>/.test(font),
        color: toColor(/<color rgb="([0-9A-Fa-f]+)"/.exec(font)?.[1]),
    }));

    const fills = chunks(section(xml, 'fills'), 'fill').map((fill) =>
        /patternType="solid"/.test(fill) ? toColor(/<fgColor rgb="([0-9A-Fa-f]+)"/.exec(fill)?.[1]) : '',
    );

    // สีเส้นตารางเอาจากขอบเส้นแรกที่กำหนดสีไว้ ทั้งไฟล์ใช้เส้นแบบเดียวกันหมด
    const borderColor =
        toColor(/<border>[\s\S]*?<color rgb="([0-9A-Fa-f]+)"/.exec(section(xml, 'borders'))?.[1]) || '#b0b0b0';

    const cellXfs = chunks(section(xml, 'cellXfs'), 'xf').map((xf) => {
        const attrs = xf.slice(0, xf.indexOf('>'));
        const font = fonts[Number(/fontId="(\d+)"/.exec(attrs)?.[1] ?? 0)] ?? {};
        return {
            fontFamily: font.name ?? '',
            size: font.size ?? 11,
            bold: !!font.bold,
            italic: !!font.italic,
            color: font.color ?? '',
            fill: fills[Number(/fillId="(\d+)"/.exec(attrs)?.[1] ?? 0)] ?? '',
            align: /horizontal="([^"]+)"/.exec(xf)?.[1] ?? '',
            wrap: /wrapText="1"/.test(xf),
            decimals: decimalsOf(Number(/numFmtId="(\d+)"/.exec(attrs)?.[1] ?? 0)),
        };
    });

    return { cellXfs, borderColor };
}

// ---------------------------------------------------------------- อ่านชีต

/**
 * อ่านชีตแรกของ .xlsx
 * คืนแถว (คีย์ของแต่ละแถวคือชื่อคอลัมน์ พร้อมเลขรูปแบบเซลล์) และความกว้างคอลัมน์
 */
function readSheet(zip) {
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
    if (!sheetName) throw new Error('ไม่พบชีตในไฟล์');
    const xml = zip.get(sheetName).toString('utf8');

    const columns = [...section(xml, 'cols').matchAll(/<col\b([^>]*)\/?>/g)]
        .map((m) => Number(/width="([\d.]+)"/.exec(m[1])?.[1] ?? 0))
        .filter((w) => w > 0);

    const rows = [];
    for (const row of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells = {};
        const styles = {};
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

            if (value !== '') {
                cells[column] = value;
                styles[column] = Number(/s="(\d+)"/.exec(c[1])?.[1] ?? 0);
            }
        }
        if (Object.keys(cells).length) rows.push({ cells, styles });
    }
    return { rows, columns };
}

// ---------------------------------------------------------------- ประกอบเป็นเอกสาร

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * แปลงแถวจากชีตเป็นหน้ากระดาษ
 *
 * รูปแบบชีตคงที่: แถวบนสุดเป็นหัวใบเสนอราคา, แถวที่ช่อง A เขียนว่า "ลำดับ" คือหัวตาราง,
 * รายการคือแถวที่ช่อง A เป็นตัวเลข, แถวรวมยอดคือแถวที่มีช่อง F แต่ช่อง A ไม่ใช่ตัวเลข
 */
function toDocument({ rows, columns }, { cellXfs, borderColor }) {
    const styleOf = (index) => cellXfs[index] ?? {};
    const line = (row, column = 'A') => ({
        text: row.cells[column] ?? '',
        style: styleOf(row.styles[column]),
    });

    const head = [];
    const items = [];
    let headers = [];
    let columnStyles = [];
    let total = null;
    const notes = [];

    let seenHeader = false;
    for (const row of rows) {
        const a = row.cells.A ?? '';

        if (a === 'ลำดับ') {
            seenHeader = true;
            headers = COLUMNS.map((column) => line(row, column));
            continue;
        }
        if (!seenHeader) {
            head.push(line(row));
            continue;
        }
        if (/^\d+$/.test(a.trim())) {
            // คอลัมน์ทุกคอลัมน์จัดรูปแบบเหมือนกันทุกแถว เก็บจากแถวแรกไว้ใช้ทั้งตาราง
            if (!columnStyles.length) columnStyles = COLUMNS.map((column) => styleOf(row.styles[column]));
            items.push({
                no: a,
                name: row.cells.B ?? '',
                qty: row.cells.C ?? '',
                unit: row.cells.D ?? '',
                each: row.cells.E ?? '',
                sum: row.cells.F ?? '',
                // แถวที่ระบายสีไว้ในไฟล์ต้นฉบับ (ชุดนี้ใช้กับรายการที่อิงราคากลาง ICT)
                fill: styleOf(row.styles.A).fill ?? '',
            });
        } else if (row.cells.F !== undefined && total === null) {
            total = {
                label: a,
                amount: row.cells.F,
                labelStyle: styleOf(row.styles.A),
                amountStyle: styleOf(row.styles.F),
            };
        } else if (a) {
            notes.push(line(row));
        }
    }

    // แถว 1-2 คือ "ใบเสนอราคา" กับชื่อบริษัท ที่เหลือเป็นรายละเอียดหัวเอกสาร
    const [title, company, ...details] = head;
    return {
        title: title ?? { text: 'ใบเสนอราคา', style: {} },
        company: company ?? { text: '', style: {} },
        details,
        headers,
        columns,
        columnStyles,
        items,
        total,
        notes,
        borderColor,
    };
}

/** อ่าน .xlsx หนึ่งไฟล์ออกมาเป็นใบเสนอราคาหนึ่งใบ */
export function readQuotation(xlsxPath) {
    let zip;
    try {
        zip = unzip(readFileSync(xlsxPath));
    } catch (error) {
        throw new Error(`อ่าน ${path.basename(xlsxPath)} ไม่ได้: ${error.message}`);
    }
    return toDocument(readSheet(zip), readStyles(zip));
}
