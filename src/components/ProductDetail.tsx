// File: src/components/ProductDetail.tsx
import { useParams, Link } from 'react-router-dom';
import { AttachmentGroup, AttachmentIndex, Product } from '../types';
import attachmentsData from '../data/attachments.json';
import './ProductDetail.css';

interface ProductDetailProps {
    products: Product[];
    loading: boolean;
}

/**
 * ผลการสำรวจ public/files/ ที่สคริปต์ scripts/scan-files.mjs เขียนไว้ตอน build
 * เว็บนี้ไม่มี server จึงอ่านโฟลเดอร์ตอนผู้ใช้เปิดหน้าไม่ได้ ต้องอ่านไว้ก่อนแล้วฝังมากับหน้าเว็บ
 */
const attachmentIndex = attachmentsData as AttachmentIndex;

/**
 * ขนาดของทุกไฟล์ที่สแกนเจอ ไม่ว่าจะอยู่โฟลเดอร์ไหน
 * ใช้กับไฟล์ที่ products.json ชี้ข้ามโฟลเดอร์มา เช่นใบเสนอราคาที่ใช้ร่วมกันหลายสินค้า
 */
const sizeByPath = new Map<string, number>(
    Object.values(attachmentIndex)
        .flat()
        .flatMap((group) => group.files.map((file) => [file.file.toLowerCase(), file.size])),
);

/** ขนาดไฟล์ที่ชี้มาจาก products.json; 0 = ไม่รู้ (ลิงก์ภายนอก หรือยังไม่มีไฟล์) */
const sizeOf = (file: string): number => sizeByPath.get(file.toLowerCase()) ?? 0;

/** ดึงนามสกุลไฟล์มาแสดงเป็นป้ายบนปุ่ม เช่น "/files/a/quotation.pdf" -> "PDF" */
const fileExtension = (path: string): string => {
    const name = path.split('/').pop() ?? '';
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toUpperCase() : 'FILE';
};

/** "รายงานประจำปี.pdf" -> "รายงานประจำปี" เพราะป้ายข้างปุ่มบอกชนิดไฟล์อยู่แล้ว */
const withoutExtension = (name: string): string => {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
};

/** ชื่อไฟล์ภาษาไทยหรือมีเว้นวรรค ต้อง encode ก่อนใส่ใน href ไม่งั้นลิงก์พัง */
const hrefFor = (file: string): string =>
    /%[0-9a-f]{2}/i.test(file) ? file : encodeURI(file);

const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

/**
 * รวมไฟล์ที่จะให้โหลดของสินค้าหนึ่งชิ้น
 *
 * หลักคือไฟล์ที่วางไว้ใน public/files/<folder>/ ขึ้นเองทั้งหมด โดยชื่อโฟลเดอร์ย่อย
 * กลายเป็นหัวข้อ ส่วน attachments ใน products.json มีไว้เฉพาะ 2 กรณีที่โฟลเดอร์บอกไม่ได้
 * คือ อยากตั้งชื่อปุ่มเอง กับ ลิงก์ไปไฟล์ที่ไม่ได้อยู่ในเครื่องเรา
 */
const buildAttachmentGroups = (product: Product): AttachmentGroup[] => {
    const scanned = attachmentIndex[product.folder] ?? [];
    const labels = new Map(
        (product.attachments ?? []).map((a) => [a.file.toLowerCase(), a.name]),
    );

    const groups: AttachmentGroup[] = scanned.map((entry) => ({
        group: entry.group,
        files: entry.files.map((file) => ({
            ...file,
            name: labels.get(file.file.toLowerCase()) ?? withoutExtension(file.name),
        })),
    }));

    // รายการที่เขียนไว้เองแต่ไม่ได้อยู่ในโฟลเดอร์ของสินค้านี้ เช่นไฟล์ที่ใช้ร่วมกันหลายสินค้า
    // หรือลิงก์ภายนอก ให้เพิ่มเข้าไปในกลุ่มที่ระบุไว้ (ไม่ระบุ = กลุ่มบนสุด)
    const onDisk = new Set(
        scanned.flatMap((entry) => entry.files.map((f) => f.file.toLowerCase())),
    );

    for (const item of product.attachments ?? []) {
        if (onDisk.has(item.file.toLowerCase())) continue;
        const key = item.group ?? '';
        const file = { file: item.file, name: item.name, size: sizeOf(item.file) };
        const bucket = groups.find((g) => g.group === key);
        if (bucket) bucket.files.push(file);
        else if (key) groups.push({ group: key, files: [file] });
        else groups.unshift({ group: '', files: [file] });
    }

    return groups;
};

const ProductDetail = ({ products, loading }: ProductDetailProps) => {
    const { productId } = useParams<{ productId: string }>();

    if (loading) {
        return (
            <section className="section product-detail">
                <div className="loading">กำลังโหลด...</div>
            </section>
        );
    }

    // Find the product with the matching ID
    const product = products.find(p => p.id === String(productId));

    // If product not found
    if (!product) {
        return (
            <section className="section product-detail">
                <h2 className="section-title">ไม่พบสินค้า</h2>
                <p>ขออภัย ไม่พบสินค้าที่คุณกำลังค้นหา</p>
                <Link to="/" className="back-link">
                    <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
                </Link>
            </section>
        );
    }

    const attachmentGroups = buildAttachmentGroups(product);
    // ถ้ามีกลุ่มเดียวและไม่ได้แยกโฟลเดอร์ย่อย หัวข้อย่อยจะซ้ำกับ "เอกสารดาวน์โหลด" ข้างบน
    const showGroupTitles =
        attachmentGroups.length > 1 || attachmentGroups[0]?.group !== '';

    return (
        <section className="section product-detail">



            <h2 className="section-title">
                <span>รายละเอียดผลิตภัณฑ์</span><br />
                {product.name}
            </h2>

            {attachmentGroups.length > 0 && (
                <div className="attachments">
                    <h3 className="attachments-title">เอกสารดาวน์โหลด</h3>
                    {attachmentGroups.map((group) => (
                        <div className="attachment-group" key={group.group || '_root'}>
                            {showGroupTitles && (
                                <h4 className="attachment-group-title">
                                    {group.group ? group.group.split('/').join(' / ') : 'ไฟล์ทั่วไป'}
                                </h4>
                            )}
                            <ul className="attachment-list">
                                {group.files.map((file) => (
                                    <li key={file.file}>
                                        <a
                                            className="attachment-link"
                                            href={hrefFor(file.file)}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <span className="attachment-ext">{fileExtension(file.file)}</span>
                                            <span className="attachment-name">{file.name}</span>
                                            {file.size > 0 && (
                                                <span className="attachment-size">{formatSize(file.size)}</span>
                                            )}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            <p className="product-description">
                {product.description}
            </p>
            <div className="detail-section">
                {product.feature.map((feature, index) => (
                    <div key={index}>
                        <p className='name'>{feature.name}</p>
                        <ul>
                            {feature.list.map((item, index2) => (
                                <li key={index2}>{item}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="additional-content">
                {product.technical.map((section, index) => (
                    <div key={index}>
                        <p className='name'>{section.name}</p>
                        <ul>
                            {section.list.map((item, index2) => (
                                <li key={index2}>{item}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <Link to="/" className="back-link">
                <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
            </Link>
        </section>
    );
};

export default ProductDetail;