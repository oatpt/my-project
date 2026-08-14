// File: src/components/QuotationDialog.tsx
//
// ฟอร์ม "ขอใบเสนอราคา" — เปิดจากหน้ารายละเอียดสินค้า
//
// บนจอเป็นฟอร์มกรอกธรรมดา สูงไม่เกินหน้าจอ เลื่อนดูข้างในได้
// รายการแยกเป็นสองกลุ่ม: ตามราคากลาง ICT กับนอกราคากลาง
//
// ส่วน "เอกสาร" มีเฉพาะตอนสั่งพิมพ์ — แผ่นกระดาษถูกซ่อนไว้ในหน้า พอสั่งพิมพ์
// ฟอร์มจะหายไปเหลือแต่กระดาษ ซึ่งจัดหน้าตามรูปแบบที่อ่านมาจากไฟล์ .xlsx ต้นฉบับ
// (สี ฟอนต์ ความกว้างคอลัมน์ รูปแบบตัวเลข — ดู scripts/lib/quotation-xlsx.mjs)

import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Quotation, QuotationCellStyle } from '../types';
import './QuotationSheet.css';
import './QuotationDialog.css';

interface QuotationDialogProps {
    quotation: Quotation;
    onClose: () => void;
}

interface DraftItem {
    /** คีย์สำหรับ React เท่านั้น — ลำดับที่แสดงนับใหม่จากตำแหน่งแถวเสมอ */
    key: number;
    name: string;
    qty: string;
    unit: string;
    each: string;
    /** สีพื้นของแถวในไฟล์ต้นฉบับ ใช้เป็นตัวบอกด้วยว่าเป็นรายการตามราคากลาง ICT */
    fill: string;
}

interface Draft {
    details: string[];
    items: DraftItem[];
    notes: string[];
}

/** "14 สิงหาคม 2569" — th-TH ให้ปีพุทธศักราชอยู่แล้ว */
const todayLine = (): string =>
    `วันที่ ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`;

const isDateLine = (line: string): boolean => /^\s*วันที่/.test(line);

/** ตัวเลขในช่องกรอกอาจมีลูกน้ำหรือช่องว่างติดมา เอาออกก่อนคำนวณ */
const toNumber = (value: string): number => {
    const n = Number(String(value).replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
};

/** จัดรูปแบบตัวเลขตามที่ตั้งไว้ในช่องนั้นของไฟล์ excel เช่น #,##0 -> "36,000" */
const format = (value: number, style: QuotationCellStyle = {}): string => {
    const decimals = style.decimals ?? 0;
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

/** แปลงรูปแบบช่องจากไฟล์ excel เป็น style ของ CSS (ใช้กับแผ่นกระดาษตอนพิมพ์) */
const cellStyle = (style: QuotationCellStyle | undefined, fill?: string): CSSProperties => {
    const s = style ?? {};
    return {
        fontSize: s.size ? `${s.size}pt` : undefined,
        fontWeight: s.bold ? 700 : undefined,
        fontStyle: s.italic ? 'italic' : undefined,
        color: s.color || undefined,
        backgroundColor: fill ?? s.fill ?? undefined,
        textAlign: (s.align || undefined) as CSSProperties['textAlign'],
        whiteSpace: s.wrap === false ? 'nowrap' : undefined,
    };
};

/**
 * ตั้งต้นฟอร์มจากใบเสนอราคาของโครงการ โดย
 * - จำนวนตั้งเป็น 1 ทุกรายการ ตารางที่เห็นตอนเปิดจึงเป็นราคาต่อหน่วยล้วน ๆ
 * - วันที่เปลี่ยนเป็นวันที่วันนี้ ไม่ใช่วันที่ในไฟล์ต้นฉบับ
 */
const makeDraft = (quotation: Quotation): Draft => {
    const details = quotation.details.map((line) => (isDateLine(line.text) ? todayLine() : line.text));
    if (!details.some(isDateLine)) details.push(todayLine());

    return {
        details,
        items: quotation.items.map((item, index) => ({
            key: index,
            name: item.name,
            qty: '1',
            unit: item.unit,
            each: item.each,
            fill: item.fill,
        })),
        notes: quotation.notes.map((note) => note.text),
    };
};

/** ขยายความสูงช่องกรอกตามข้อความ ไม่ให้ต้องเลื่อนอ่านในช่องแคบ ๆ */
const autoSize = (el: HTMLTextAreaElement | null): void => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
};

const TextInput = ({
    value,
    onChange,
    label,
    multiline = false,
    align,
}: {
    value: string;
    onChange: (value: string) => void;
    label: string;
    multiline?: boolean;
    align?: 'right' | 'center';
}) =>
    multiline ? (
        <textarea
            className="qf-input"
            rows={1}
            value={value}
            aria-label={label}
            ref={autoSize}
            onChange={(e) => {
                autoSize(e.currentTarget);
                onChange(e.currentTarget.value);
            }}
        />
    ) : (
        <input
            className="qf-input"
            style={align ? { textAlign: align } : undefined}
            type="text"
            inputMode={align === 'right' ? 'decimal' : undefined}
            value={value}
            aria-label={label}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );

const QuotationDialog = ({ quotation, onClose }: QuotationDialogProps) => {
    const [draft, setDraft] = useState<Draft>(() => makeDraft(quotation));
    const closeRef = useRef<HTMLButtonElement>(null);

    const columnStyles = quotation.columnStyles;

    // ลำดับและราคารวมคิดจากตำแหน่งในรายการเต็ม (ลำดับเดียวกับที่จะพิมพ์ลงกระดาษ)
    const rows = useMemo(
        () =>
            draft.items.map((item, index) => ({
                ...item,
                no: index + 1,
                sum: toNumber(item.qty) * toNumber(item.each),
            })),
        [draft.items],
    );
    const total = rows.reduce((sum, row) => sum + row.sum, 0);

    // "ราคากลาง" ดูจากสีพื้นที่ระบายไว้ในไฟล์ต้นฉบับ (แถวราคากลาง ICT ถูกระบายสีทุกแถว)
    const standardRows = rows.filter((row) => row.fill);
    const customRows = rows.filter((row) => !row.fill);

    useEffect(() => {
        document.body.classList.add('quotation-open');
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.classList.remove('quotation-open');
            document.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    const patchItem = (key: number, patch: Partial<DraftItem>) =>
        setDraft((d) => ({
            ...d,
            items: d.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
        }));

    const addItem = () =>
        setDraft((d) => ({
            ...d,
            items: [
                ...d.items,
                {
                    key: Math.max(0, ...d.items.map((i) => i.key)) + 1,
                    name: '',
                    qty: '1',
                    unit: '',
                    each: '',
                    fill: '',
                },
            ],
        }));

    const removeItem = (key: number) =>
        setDraft((d) => ({ ...d, items: d.items.filter((item) => item.key !== key) }));

    const patchLine = (field: 'details' | 'notes', index: number, value: string) =>
        setDraft((d) => ({
            ...d,
            [field]: d[field].map((line, i) => (i === index ? value : line)),
        }));

    const itemRow = (row: (typeof rows)[number]) => (
        <div className="qf-row" key={row.key}>
            <span className="qf-no">{row.no}</span>
            <div className="qf-cell qf-cell-name">
                <TextInput
                    multiline
                    value={row.name}
                    label={`รายการที่ ${row.no}`}
                    onChange={(value) => patchItem(row.key, { name: value })}
                />
            </div>
            <div className="qf-cell qf-cell-qty">
                <TextInput
                    align="center"
                    value={row.qty}
                    label={`จำนวนของรายการที่ ${row.no}`}
                    onChange={(value) => patchItem(row.key, { qty: value })}
                />
            </div>
            <div className="qf-cell qf-cell-unit">
                <TextInput
                    align="center"
                    value={row.unit}
                    label={`หน่วยของรายการที่ ${row.no}`}
                    onChange={(value) => patchItem(row.key, { unit: value })}
                />
            </div>
            <div className="qf-cell qf-cell-price">
                <TextInput
                    align="right"
                    value={row.each}
                    label={`ราคาต่อหน่วยของรายการที่ ${row.no}`}
                    onChange={(value) => patchItem(row.key, { each: value })}
                />
            </div>
            <span className="qf-sum">{format(row.sum, columnStyles[5])}</span>
            <button
                type="button"
                className="qf-remove"
                onClick={() => removeItem(row.key)}
                aria-label={`ลบรายการที่ ${row.no}`}
                title="ลบรายการนี้"
            >
                ×
            </button>
        </div>
    );

    const columnHeadings = (
        <div className="qf-row qf-headings" aria-hidden="true">
            <span className="qf-no">ลำดับ</span>
            <span className="qf-cell-name">รายการ</span>
            <span className="qf-cell-qty">จำนวน</span>
            <span className="qf-cell-unit">หน่วย</span>
            <span className="qf-cell-price">ราคาต่อหน่วย</span>
            <span className="qf-sum">ราคารวม</span>
            <span className="qf-remove-space"></span>
        </div>
    );

    // แขวนไว้ใต้ body ไม่ใช่ใต้ #root เพราะตอนพิมพ์เราซ่อน #root ทั้งก้อนเพื่อให้เหลือแต่กระดาษ
    return createPortal(
        <div
            className="quotation-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* ---------------- ฟอร์มบนจอ ---------------- */}
            <div className="quotation-panel q-only-screen" role="dialog" aria-modal="true" aria-label="ขอใบเสนอราคา">
                <header className="quotation-toolbar">
                    <div>
                        <h3 className="quotation-title">ขอใบเสนอราคา</h3>
                        <p className="quotation-hint">
                            จำนวนตั้งไว้ที่ 1 ทุกรายการ (ราคาต่อหน่วย) วันที่เป็นวันที่วันนี้ แก้ได้ทุกช่อง
                        </p>
                    </div>
                    <button type="button" className="q-button" ref={closeRef} onClick={onClose}>
                        ปิด
                    </button>
                </header>

                <div className="qf-body">
                    <section className="qf-section">
                        <h4 className="qf-section-title">หัวเอกสาร</h4>
                        {draft.details.map((line, index) => (
                            <div className="qf-detail" key={index}>
                                <TextInput
                                    multiline
                                    value={line}
                                    label={`รายละเอียดบรรทัดที่ ${index + 1}`}
                                    onChange={(value) => patchLine('details', index, value)}
                                />
                            </div>
                        ))}
                    </section>

                    {standardRows.length > 0 && (
                        <section className="qf-section">
                            <h4 className="qf-section-title">
                                รายการตามราคากลาง ICT
                                <span className="qf-badge qf-badge-standard">ราคากลาง</span>
                            </h4>
                            {columnHeadings}
                            {standardRows.map(itemRow)}
                        </section>
                    )}

                    <section className="qf-section">
                        <h4 className="qf-section-title">
                            รายการนอกราคากลาง
                            <span className="qf-badge">กำหนดราคาเอง</span>
                        </h4>
                        {customRows.length > 0 ? (
                            <>
                                {columnHeadings}
                                {customRows.map(itemRow)}
                            </>
                        ) : (
                            <p className="qf-empty">ยังไม่มีรายการ</p>
                        )}
                        <button type="button" className="qf-add" onClick={addItem}>
                            + เพิ่มรายการ
                        </button>
                    </section>

                    <section className="qf-section">
                        <h4 className="qf-section-title">หมายเหตุ</h4>
                        {draft.notes.map((note, index) => (
                            <div className="qf-detail" key={index}>
                                <TextInput
                                    multiline
                                    value={note}
                                    label={`หมายเหตุบรรทัดที่ ${index + 1}`}
                                    onChange={(value) => patchLine('notes', index, value)}
                                />
                            </div>
                        ))}
                    </section>
                </div>

                <footer className="quotation-footer">
                    <div className="qf-total">
                        <span>{quotation.total?.label ?? 'รวมเป็นเงินทั้งสิ้น'}</span>
                        <strong>{format(total, quotation.total?.amountStyle)} บาท</strong>
                    </div>
                    <div className="quotation-actions">
                        <button type="button" className="q-button" onClick={() => setDraft(makeDraft(quotation))}>
                            เริ่มใหม่
                        </button>
                        <button type="button" className="q-button q-button-primary" onClick={() => window.print()}>
                            พิมพ์ / บันทึกเป็น PDF
                        </button>
                    </div>
                </footer>
            </div>

            {/* ---------------- แผ่นกระดาษ โผล่เฉพาะตอนพิมพ์ ---------------- */}
            <div
                className="q-sheet q-print-sheet"
                style={{ '--q-border': quotation.borderColor } as CSSProperties}
            >
                <p className="q-line" style={cellStyle(quotation.title.style)}>
                    {quotation.title.text}
                </p>
                <p className="q-line" style={cellStyle(quotation.company.style)}>
                    {quotation.company.text}
                </p>
                {draft.details.map((line, index) => (
                    <p className="q-line" key={index} style={cellStyle(quotation.details[index]?.style)}>
                        {line}
                    </p>
                ))}

                <table className="q-table">
                    <colgroup>
                        {quotation.columns.map((width, index) => (
                            <col
                                key={index}
                                style={{
                                    width: `${(width / quotation.columns.reduce((a, b) => a + b, 0)) * 100}%`,
                                }}
                            />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            {quotation.headers.map((header, index) => (
                                <th key={index} style={cellStyle(header.style)}>
                                    {header.text}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.key}>
                                <td style={cellStyle(columnStyles[0], row.fill)}>{row.no}</td>
                                <td style={cellStyle(columnStyles[1], row.fill)}>{row.name}</td>
                                <td style={cellStyle(columnStyles[2], row.fill)}>{row.qty}</td>
                                <td style={cellStyle(columnStyles[3], row.fill)}>{row.unit}</td>
                                <td style={cellStyle(columnStyles[4], row.fill)}>
                                    {format(toNumber(row.each), columnStyles[4])}
                                </td>
                                <td style={cellStyle(columnStyles[5], row.fill)}>
                                    {format(row.sum, columnStyles[5])}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {quotation.total && (
                        <tfoot>
                            <tr>
                                <td colSpan={5} style={cellStyle(quotation.total.labelStyle)}>
                                    {quotation.total.label}
                                </td>
                                <td style={cellStyle(quotation.total.amountStyle)}>
                                    {format(total, quotation.total.amountStyle)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>

                <div className="q-notes">
                    {draft.notes.map((note, index) => (
                        <p className="q-note" key={index} style={cellStyle(quotation.notes[index]?.style)}>
                            {note}
                        </p>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default QuotationDialog;
