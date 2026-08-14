// File: src/components/PriceList.tsx
//
// หน้า "ราคาผลิตภัณฑ์" — ตารางเดียวรวมทุกรายการของทั้งเว็บ
//
// เอาเฉพาะรายการพื้นขาวในไฟล์ excel (รายการนอกเกณฑ์ราคากลาง — แถวราคากลาง ICT
// ที่ระบายสีเขียวไว้ถูกข้าม) รายการไหนเป็นระบบที่มีหน้าของตัวเอง ใช้ชื่ออังกฤษจาก
// เอกสาร word เป็นชื่อหลัก มีชื่อไทยกำกับ และกดไปหน้ารายละเอียดได้
// คอลัมน์มีแค่ ลำดับ / รายการ / ราคาต่อหน่วย

import { Link } from 'react-router-dom';
import { Product, QuotationIndex } from '../types';
import quotationsData from '../data/quotations.json';
import './PriceList.css';

interface PriceListProps {
    products: Product[];
    loading: boolean;
}

const quotationIndex = quotationsData as QuotationIndex;

interface PriceRow {
    /** ชื่อหลัก — ชื่ออังกฤษของระบบ หรือชื่อรายการตามใบเสนอราคา */
    name: string;
    /** ชื่อไทยกำกับใต้ชื่อหลัก (เฉพาะรายการที่เป็นระบบ) */
    thaiName?: string;
    /** ลิงก์ไปหน้ารายละเอียด (เฉพาะรายการที่เป็นระบบ) */
    link?: string;
    /** ราคาต่อหน่วย (บาท) */
    price: number;
}

const money = (value: number): string => value.toLocaleString('en-US');

/**
 * รวมรายการพื้นขาวจากใบเสนอราคาทุกโครงการเป็นรายการเดียว เรียงตามลำดับในไฟล์
 * รายการที่ map กับสินค้า (quotationItem) ใช้ชื่อจากเว็บและลิงก์ไปหน้าสินค้า
 */
const buildRows = (products: Product[]): PriceRow[] => {
    const productOfItem = new Map(
        products
            .filter((p) => p.quotation && p.quotationItem)
            .map((p) => [`${p.quotation}::${p.quotationItem}`, p]),
    );

    const rows: PriceRow[] = [];
    for (const [key, quotation] of Object.entries(quotationIndex)) {
        for (const item of quotation.items) {
            if (item.fill) continue; // แถวราคากลาง ICT (พื้นเขียว) ไม่เอา

            const product = productOfItem.get(`${key}::${item.name}`);
            rows.push(
                product
                    ? {
                          name: product.name,
                          thaiName: product.thaiName,
                          link: `/product-details/${product.id}`,
                          price: Number(item.each),
                      }
                    : { name: item.name, price: Number(item.each) },
            );
        }
    }
    return rows;
};

const PriceList = ({ products, loading }: PriceListProps) => {
    if (loading) {
        return (
            <section className="price-page">
                <div className="loading">กำลังโหลด...</div>
            </section>
        );
    }

    const rows = buildRows(products);

    return (
        <>
            <div className="price-hero">
                <div className="price-hero-inner">
                    <p className="price-breadcrumb">
                        <Link to="/">หน้าแรก</Link> · ราคาผลิตภัณฑ์
                    </p>
                    <h1>ราคาผลิตภัณฑ์</h1>
                    <p className="price-hero-sub">
                        ราคาต่อหน่วยของผลิตภัณฑ์ทั้งหมด กดที่ชื่อรายการเพื่อดูข้อมูลจำเพาะ
                    </p>
                </div>
            </div>

            <section className="price-page">
                <div className="price-list">
                    <div className="price-list-head" aria-hidden="true">
                        <span className="price-col-no">ลำดับ</span>
                        <span>รายการ</span>
                        <span className="price-col-amount">ราคาต่อหน่วย (บาท)</span>
                    </div>

                    {rows.map((row, index) => (
                        <div className="price-list-row" key={index}>
                            <span className="price-col-no">{index + 1}</span>
                            <span className="price-col-name">
                                {row.link ? (
                                    <Link to={row.link} className="price-name-link">
                                        {row.name}
                                    </Link>
                                ) : (
                                    <span className="price-name">{row.name}</span>
                                )}
                                {row.thaiName && <span className="price-name-thai">{row.thaiName}</span>}
                            </span>
                            <span className="price-col-amount">{money(row.price)}</span>
                        </div>
                    ))}
                </div>

                <div className="price-page-notes">
                    <p>ราคาข้างต้นเป็นราคาต่อหน่วย รวมภาษีมูลค่าเพิ่ม (VAT 7%) แล้ว</p>
                    <p>สำหรับใบเสนอราคาอย่างเป็นทางการ กรุณาติดต่อบริษัท</p>
                </div>
            </section>
        </>
    );
};

export default PriceList;
