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

export interface Product {
  id: string;
  name: string;
  picture: string;
  /** ชื่อโฟลเดอร์ของสินค้านี้ใน public/files/ — ไฟล์ในนั้นขึ้นหน้าเว็บอัตโนมัติ */
  folder: string;
  attachments?: Attachment[];
  description: string;
  feature: Productlist[];
  technical: Productlist[];
}