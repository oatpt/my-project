// File: src/types.ts
interface Productlist{
  name: string;
  list: string[];
}

/**
 * ไฟล์แนบที่ตั้งชื่อปุ่มเอง หรือชี้ไปไฟล์นอกโฟลเดอร์สินค้า
 * ปกติไม่ต้องใส่ — ไฟล์ที่วางไว้ใน public/files/<folder>/ ขึ้นเองอยู่แล้ว
 */
export interface Attachment {
  /** ชื่อที่แสดงบนปุ่ม เช่น "ใบเสนอราคา", "โบรชัวร์" */
  name: string;
  /** พาธจาก public เช่น "/files/mediasphere/quotation.pdf" */
  file: string;
  /** หัวข้อที่จะให้ไปอยู่ใต้ ถ้าไม่ใส่จะอยู่กลุ่ม "ไฟล์ทั่วไป" */
  group?: string;
}

/** ไฟล์ 1 ไฟล์ที่สคริปต์ scan-files เจอในโฟลเดอร์สินค้า */
export interface ScannedFile {
  /** พาธจาก public เช่น "/files/mediasphere/โบรชัวร์/a.pdf" */
  file: string;
  /** ชื่อไฟล์พร้อมนามสกุล */
  name: string;
  /** ขนาดเป็นไบต์ */
  size: number;
}

/** ไฟล์ที่อยู่ในโฟลเดอร์ย่อยเดียวกัน — ชื่อโฟลเดอร์ย่อยกลายเป็นหัวข้อบนหน้าเว็บ */
export interface AttachmentGroup {
  /** ชื่อโฟลเดอร์ย่อย, "" คือไฟล์ที่วางไว้ชั้นบนสุดของโฟลเดอร์สินค้า */
  group: string;
  files: ScannedFile[];
}

/** ผลการสำรวจ public/files/ ทั้งหมด คีย์คือชื่อโฟลเดอร์สินค้า */
export type AttachmentIndex = Record<string, AttachmentGroup[]>;

/** รูปแบบของช่องหนึ่งช่องตามที่ตั้งไว้ในไฟล์ .xlsx ต้นฉบับ */
export interface QuotationCellStyle {
  fontFamily?: string;
  /** ขนาดตัวอักษรหน่วย pt ตามที่ excel เก็บ */
  size?: number;
  bold?: boolean;
  italic?: boolean;
  /** สีตัวอักษร "" คือใช้สีปกติ */
  color?: string;
  /** สีพื้นของช่อง "" คือไม่ระบายสี */
  fill?: string;
  align?: string;
  wrap?: boolean;
  /** จำนวนทศนิยมของรูปแบบตัวเลข; null คือไม่ได้จัดรูปแบบไว้ */
  decimals?: number | null;
}

/** ข้อความหนึ่งช่องพร้อมรูปแบบของมัน */
export interface QuotationLine {
  text: string;
  style: QuotationCellStyle;
  /** ความสูงแถวที่ตั้งไว้ในไฟล์ (pt); null คือความสูงปกติ */
  ht?: number | null;
}

/** รายการหนึ่งบรรทัดในใบเสนอราคา ค่าทุกช่องเป็น string เพราะอ่านมาจากเซลล์ใน .xlsx ตรง ๆ */
export interface QuotationItem {
  /** ลำดับ */
  no: string;
  /** รายการ */
  name: string;
  /** จำนวน */
  qty: string;
  /** หน่วย เช่น "ชุด" "เครื่อง" "ระบบ" */
  unit: string;
  /** ราคาต่อหน่วย (บาท) */
  each: string;
  /** ราคารวมของบรรทัดนี้ (บาท) */
  sum: string;
  /** สีพื้นของแถวตามที่ระบายไว้ในไฟล์ต้นฉบับ "" คือไม่ระบาย */
  fill: string;
  /** ความสูงแถวที่ตั้งไว้ในไฟล์ (pt); null คือความสูงปกติ */
  ht?: number | null;
}

/**
 * ใบเสนอราคาหนึ่งใบที่แปลงมาจาก quotations-source/*.xlsx
 * สคริปต์ scripts/extract-quotations.mjs เขียนไว้ที่ src/data/quotations.json ตอน build
 * เก็บรูปแบบการจัดหน้ามาด้วย หน้าเว็บจึงพิมพ์ออกมาได้เหมือนไฟล์ excel
 */
export interface Quotation {
  /** หัวเอกสาร ปกติคือ "ใบเสนอราคา" */
  title: QuotationLine;
  /** ชื่อบริษัทใต้หัวเอกสาร */
  company: QuotationLine;
  /** บรรทัดรายละเอียดหัวเอกสาร เช่น เสนอต่อ / โครงการ / วันที่ */
  details: QuotationLine[];
  /** หัวตาราง 6 ช่อง ลำดับ / รายการ / จำนวน / หน่วย / ราคาต่อหน่วย / ราคารวม */
  headers: QuotationLine[];
  /** ความสูงแถวหัวตาราง (pt) */
  headerHt?: number | null;
  /** ความกว้างคอลัมน์ตามหน่วยของ excel */
  columns: number[];
  /** รูปแบบของแต่ละคอลัมน์ในตาราง (เอามาจากรายการแถวแรก) */
  columnStyles: QuotationCellStyle[];
  items: QuotationItem[];
  /** แถวรวมยอดท้ายตาราง */
  total: {
    label: string;
    amount: string;
    labelStyle: QuotationCellStyle;
    amountStyle: QuotationCellStyle;
    ht?: number | null;
  } | null;
  /** หมายเหตุใต้ตาราง */
  notes: QuotationLine[];
  /** สีเส้นตาราง */
  borderColor: string;
}

/** ใบเสนอราคาทั้งหมด คีย์คือชื่อไฟล์ .xlsx ที่ตัดนามสกุลออก */
export type QuotationIndex = Record<string, Quotation>;

export interface Product {
  id: string;
  name: string;
  /** ชื่อไทยของระบบตามเอกสาร word ใช้แสดงคู่กับชื่ออังกฤษในหน้าราคา */
  thaiName?: string;
  picture: string;
  /** ชื่อโฟลเดอร์ของสินค้านี้ใน public/files/ — ไฟล์ในนั้นขึ้นหน้าเว็บอัตโนมัติ */
  folder: string;
  /** คีย์ใบเสนอราคาของโครงการที่สินค้านี้อยู่ ใช้เลือกตารางราคาที่จะแสดงในหน้าสินค้า */
  quotation?: string;
  /** ชื่อรายการของสินค้านี้ในตารางราคา (ตรงกับ name ของ item ใน quotations.json) */
  quotationItem?: string;
  /**
   * ราคาต่อหน่วย (บาท) สำหรับสินค้าที่ไม่ได้อยู่ในใบเสนอราคา .xlsx ใบไหน
   * — ราคามาจากเอกสาร word ของสินค้านั้นโดยตรง
   */
  price?: number;
  attachments?: Attachment[];
  description: string;
  feature: Productlist[];
  technical: Productlist[];
}