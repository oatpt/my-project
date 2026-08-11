// File: src/types.ts
interface Productlist{
  name: string;
  list: string[];
}

/** ไฟล์แนบของสินค้า วางไฟล์จริงไว้ใน public/files/<ชื่อโฟลเดอร์สินค้า>/ */
export interface Attachment {
  /** ชื่อที่แสดงบนปุ่ม เช่น "ใบเสนอราคา", "โบรชัวร์" */
  name: string;
  /** พาธจาก public เช่น "/files/mediasphere/quotation.pdf" */
  file: string;
}

export interface Product {
  id: string;
  name: string;
  picture: string;
  attachments?: Attachment[];
  description: string;
  feature: Productlist[];
  technical: Productlist[];
}