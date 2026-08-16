// File: src/components/PriceList.tsx
//
// หน้า "ราคาผลิตภัณฑ์" — ตารางเดียวรวมทุกระบบของทั้งเว็บ
//
// เอาเฉพาะรายการพื้นขาวในไฟล์ excel (รายการนอกเกณฑ์ราคากลาง — แถวราคากลาง ICT
// ที่ระบายสีเขียวไว้ถูกข้าม) ที่เป็นระบบซึ่งมีหน้าของตัวเอง รายการพื้นขาวที่ไม่ใช่ระบบ
// (จอ video wall, ตัวควบคุมจอ, โต๊ะ, เก้าอี้, งานปรับปรุงห้อง War Room) ไม่ขึ้นในตาราง
// ทุกแถวใช้ชื่ออังกฤษจากเอกสาร word เป็นชื่อหลัก มีชื่อไทยกำกับ และกดไปหน้ารายละเอียดได้
// คอลัมน์มีแค่ ลำดับ / รายการ / ราคาต่อหน่วย
//
// สินค้าบางตัวไม่ได้อยู่ในใบเสนอราคา .xlsx ใบไหน (ชุดเสียงตามสาย และชุดจอแสดงผล)
// ราคาของพวกนี้เขียนไว้ในเอกสาร word ของตัวเอง จึงเก็บไว้ที่ "price" ใน products.json
// แล้วต่อท้ายตาราง — กติกาเดิมไม่เปลี่ยน คือทุกแถวต้องเป็นสินค้าที่มีหน้าของตัวเอง

import { Link } from 'react-router-dom';
import { Product, QuotationIndex } from '../types';
import productsData from '../data/products.json';
import quotationsData from '../data/quotations.json';
import './PriceList.css';

interface PriceListProps {
    products: Product[];
    loading: boolean;
}

const quotationIndex = quotationsData as QuotationIndex;

interface PriceRow {
    /** ชื่อหลัก — ชื่ออังกฤษของระบบ */
    name: string;
    /** ชื่อไทยกำกับใต้ชื่อหลัก */
    thaiName?: string;
    /** ลิงก์ไปหน้ารายละเอียด */
    link: string;
    /** ราคาต่อหน่วย (บาท) */
    price: number;
}

const money = (value: number): string => value.toLocaleString('en-US');

/**
 * รวมรายการพื้นขาวจากใบเสนอราคาทุกโครงการเป็นรายการเดียว เรียงตามลำดับในไฟล์
 * เอาเฉพาะรายการที่ map กับสินค้า (quotationItem) — ใช้ชื่อจากเว็บและลิงก์ไปหน้าสินค้า
 * แล้วต่อท้ายด้วยสินค้าที่ตั้งราคาไว้เองใน products.json เรียงตามลำดับในไฟล์นั้น
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
            if (!product) continue; // รายการพื้นขาวที่ไม่ใช่ระบบของเว็บ (จอ โต๊ะ เก้าอี้ งานปรับปรุงห้อง) ไม่เอา

            rows.push({
                name: product.name,
                thaiName: product.thaiName,
                link: `/product-details/${product.id}`,
                price: Number(item.each),
            });
        }
    }

    // ไล่จาก products.json ตรง ๆ ไม่ใช่ props เพราะหน้าแรกส่งลำดับที่เรียงตามชื่อมาให้
    // ส่วนตรงนี้อยากได้ลำดับตามที่เขียนไว้ในไฟล์ ซึ่งเรียงตามเอกสาร word ต้นฉบับ
    for (const product of productsData as Product[]) {
        if (product.price === undefined) continue;
        rows.push({
            name: product.name,
            thaiName: product.thaiName,
            link: `/product-details/${product.id}`,
            price: product.price,
        });
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
                                <Link to={row.link} className="price-name-link">
                                    {row.name}
                                </Link>
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
