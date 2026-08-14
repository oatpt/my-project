// File: src/components/QuotationDialog.tsx
//
// ฟอร์ม "ขอใบเสนอราคา" — เปิดจากหน้ารายละเอียดสินค้า
//
// หน้าตาบนจอคือหน้ากระดาษจริงที่จะพิมพ์ออกมา สี ขนาดตัวอักษร ความกว้างคอลัมน์
// และรูปแบบตัวเลข อ่านมาจากไฟล์ .xlsx ต้นฉบับทั้งหมด กระดาษที่ได้จึงเหมือนใบเสนอราคาเดิม
// ช่องกรอกจะหายไปตอนพิมพ์ เหลือแต่ข้อความ

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
    /** คีย์สำหรับ React เท่านั้น ไม่ได้พิมพ์ออกมา — ลำดับที่แสดงนับใหม่จากตำแหน่งแถวเสมอ */
    key: number;
    name: string;
    qty: string;
    unit: string;
    each: string;
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
const format = (value: number, style: QuotationCellStyle): string => {
    const decimals = style.decimals ?? null;
    if (decimals === null) return String(value);
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

/** แปลงรูปแบบช่องจากไฟล์ excel เป็น style ของ CSS */
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

/**
 * ช่องข้อความที่ยาวได้หลายบรรทัด คู่กับข้อความที่จะโผล่มาแทนตอนพิมพ์
 * printValue ใช้เมื่อสิ่งที่พิมพ์ต่างจากสิ่งที่กรอก เช่นราคาที่ต้องใส่ลูกน้ำตามรูปแบบในไฟล์ excel
 */
const Field = ({
    value,
    onChange,
    label,
    printValue,
}: {
    value: string;
    onChange: (value: string) => void;
    label: string;
    printValue?: string;
}) => (
    <>
        <textarea
            className="q-edit"
            rows={1}
            value={value}
            aria-label={label}
            ref={autoSize}
            onChange={(e) => {
                autoSize(e.currentTarget);
                onChange(e.currentTarget.value);
            }}
        />
        <span className="q-print">{printValue ?? value}</span>
    </>
);

const QuotationDialog = ({ quotation, onClose }: QuotationDialogProps) => {
    const [draft, setDraft] = useState<Draft>(() => makeDraft(quotation));
    const closeRef = useRef<HTMLButtonElement>(null);

    const columnStyles = quotation.columnStyles;
    const totalStyle = quotation.total;

    const rows = useMemo(
        () =>
            draft.items.map((item) => ({
                ...item,
                sum: toNumber(item.qty) * toNumber(item.each),
            })),
        [draft.items],
    );
    const total = rows.reduce((sum, row) => sum + row.sum, 0);

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

    // แขวนไว้ใต้ body ไม่ใช่ใต้ #root เพราะตอนพิมพ์เราซ่อน #root ทั้งก้อนเพื่อให้เหลือแต่กระดาษ
    return createPortal(
        <div
            className="quotation-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="quotation-panel" role="dialog" aria-modal="true" aria-label="ขอใบเสนอราคา">
                <div className="quotation-toolbar q-only-screen">
                    <p className="quotation-hint">
                        แก้ไขข้อมูลในกระดาษได้เลย จำนวนตั้งไว้ที่ 1 ทุกรายการ วันที่เป็นวันที่วันนี้
                    </p>
                    <div className="quotation-actions">
                        <button type="button" className="q-button" onClick={addItem}>
                            เพิ่มรายการ
                        </button>
                        <button type="button" className="q-button" onClick={() => setDraft(makeDraft(quotation))}>
                            เริ่มใหม่
                        </button>
                        <button type="button" className="q-button q-button-primary" onClick={() => window.print()}>
                            พิมพ์ / บันทึกเป็น PDF
                        </button>
                        <button type="button" className="q-button" ref={closeRef} onClick={onClose}>
                            ปิด
                        </button>
                    </div>
                </div>

                <div className="quotation-scroll">
                    <div
                        className="q-sheet quotation-sheet"
                        style={{ '--q-border': quotation.borderColor } as CSSProperties}
                    >
                        <p className="q-line" style={cellStyle(quotation.title.style)}>
                            {quotation.title.text}
                        </p>
                        <p className="q-line" style={cellStyle(quotation.company.style)}>
                            {quotation.company.text}
                        </p>

                        {draft.details.map((line, index) => (
                            <p
                                className="q-line"
                                key={index}
                                style={cellStyle(quotation.details[index]?.style)}
                            >
                                <Field
                                    value={line}
                                    label={`รายละเอียดบรรทัดที่ ${index + 1}`}
                                    onChange={(value) => patchLine('details', index, value)}
                                />
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
                                {rows.map((row, index) => (
                                    <tr key={row.key}>
                                        {/* columnStyles เก็บรูปแบบของคอลัมน์ ส่วนสีพื้นใช้ของแถวนั้น ๆ */}
                                        <td className="no-cell" style={cellStyle(columnStyles[0], row.fill)}>
                                            {index + 1}
                                            <button
                                                type="button"
                                                className="q-remove q-only-screen"
                                                onClick={() => removeItem(row.key)}
                                                aria-label={`ลบรายการที่ ${index + 1}`}
                                                title="ลบรายการนี้"
                                            >
                                                ×
                                            </button>
                                        </td>
                                        <td style={cellStyle(columnStyles[1], row.fill)}>
                                            <Field
                                                value={row.name}
                                                label={`รายการที่ ${index + 1}`}
                                                onChange={(value) => patchItem(row.key, { name: value })}
                                            />
                                        </td>
                                        <td style={cellStyle(columnStyles[2], row.fill)}>
                                            <Field
                                                value={row.qty}
                                                label={`จำนวนของรายการที่ ${index + 1}`}
                                                onChange={(value) => patchItem(row.key, { qty: value })}
                                            />
                                        </td>
                                        <td style={cellStyle(columnStyles[3], row.fill)}>
                                            <Field
                                                value={row.unit}
                                                label={`หน่วยของรายการที่ ${index + 1}`}
                                                onChange={(value) => patchItem(row.key, { unit: value })}
                                            />
                                        </td>
                                        <td style={cellStyle(columnStyles[4], row.fill)}>
                                            <Field
                                                value={row.each}
                                                label={`ราคาต่อหน่วยของรายการที่ ${index + 1}`}
                                                onChange={(value) => patchItem(row.key, { each: value })}
                                                printValue={format(toNumber(row.each), columnStyles[4] ?? {})}
                                            />
                                        </td>
                                        <td style={cellStyle(columnStyles[5], row.fill)}>
                                            {format(row.sum, columnStyles[5] ?? {})}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {totalStyle && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={5} style={cellStyle(totalStyle.labelStyle)}>
                                            {totalStyle.label}
                                        </td>
                                        <td style={cellStyle(totalStyle.amountStyle)}>
                                            {format(total, totalStyle.amountStyle)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>

                        <div className="q-notes">
                            {draft.notes.map((note, index) => (
                                <p className="q-note" key={index} style={cellStyle(quotation.notes[index]?.style)}>
                                    <Field
                                        value={note}
                                        label={`หมายเหตุบรรทัดที่ ${index + 1}`}
                                        onChange={(value) => patchLine('notes', index, value)}
                                    />
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default QuotationDialog;
