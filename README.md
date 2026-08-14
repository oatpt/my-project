# my-project

เว็บแนะนำผลิตภัณฑ์ (React + TypeScript + Vite) เสิร์ฟด้วย nginx ใน Docker

```
docker compose up --build     # เปิดที่ http://localhost
npm run dev                   # โหมดพัฒนา
```

---

## ใส่ไฟล์ให้ลูกค้าโหลด

**วางไฟล์ลงในโฟลเดอร์ของสินค้า แค่นั้น** ไม่ต้องแก้ JSON

โฟลเดอร์คือ `public/files/<folder>/` โดย `<folder>` ดูได้จากค่า `"folder"` ของสินค้านั้นใน
`src/data/products.json` ทุกไฟล์ในโฟลเดอร์จะขึ้นในหน้ารายละเอียดสินค้าให้กดโหลดได้เอง

### แยกโฟลเดอร์ย่อยได้ ชื่อโฟลเดอร์กลายเป็นหัวข้อ

```
public/files/mediasphere/
├── สรุปโครงการ.pdf          → อยู่ใต้หัวข้อ "ไฟล์ทั่วไป"
├── โบรชัวร์/
│   └── brochure.pdf          → อยู่ใต้หัวข้อ "โบรชัวร์"
└── ใบเสนอราคา/
    └── ใบเสนอราคา 2568.pdf   → อยู่ใต้หัวข้อ "ใบเสนอราคา"
```

ตั้งชื่อโฟลเดอร์ย่อยเป็นภาษาไทยได้เลย ชื่อที่แสดงบนปุ่มคือชื่อไฟล์ (ตัดนามสกุลออก)
ไฟล์ที่ขึ้นต้นด้วย `.` เช่น `.gitkeep` ถูกข้าม นามสกุลอะไรก็ได้ ไม่จำกัดแค่ PDF

### ต้อง build ใหม่ทุกครั้งที่เพิ่มไฟล์

เว็บนี้เป็น static site ไม่มี server คอยอ่านโฟลเดอร์ตอนคนเปิดหน้า สคริปต์
`scripts/scan-files.mjs` จึงสำรวจ `public/files/` ตอน build แล้วเขียนผลไว้ที่
`src/data/attachments.json` — สคริปต์นี้ถูกเรียกเองจาก `npm run dev` และ `npm run build`
ไม่ต้องสั่งเอง แต่ **ถ้าเพิ่มไฟล์ตอน container รันอยู่ ต้อง `docker compose up --build` ใหม่**
ไฟล์ถึงจะเข้าไปอยู่ใน image

(`src/data/attachments.json` เป็นไฟล์ที่สร้างอัตโนมัติ ไม่ต้องแก้เอง — แก้ไปก็โดนเขียนทับ)

### อยากตั้งชื่อปุ่มเอง ใช้ไฟล์ร่วมกันหลายสินค้า หรือลิงก์ไปไฟล์ข้างนอก

สามกรณีนี้โฟลเดอร์บอกไม่ได้ ให้เขียนใน `attachments` ของสินค้านั้นใน `products.json`
ระบบจะรวมเข้ากับรายการที่สแกนเจอให้เอง

```jsonc
"folder": "mediasphere",
"attachments": [
  {
    // ไฟล์นี้มีอยู่จริงในโฟลเดอร์ แต่อยากให้ปุ่มเขียนว่าอย่างอื่น
    "name": "ใบเสนอราคา (ฉบับล่าสุด)",
    "file": "/files/mediasphere/ใบเสนอราคา/ใบเสนอราคา 2568.pdf"
  },
  {
    // ไฟล์ที่ใช้ร่วมกันหลายสินค้า เก็บไว้ที่เดียว แล้วให้แต่ละสินค้าชี้มา
    "name": "ใบเสนอราคา (โครงการ Smart Thatoom Super App)",
    "file": "/files/_quotations/ใบเสนอราคา_Smart Thatoom Super App.xlsx",
    "group": "ใบเสนอราคา"
  },
  {
    "name": "สเปกฉบับเต็ม",
    "file": "https://example.com/spec.pdf"
  }
]
```

`group` คือหัวข้อที่จะให้ไปอยู่ใต้ ไม่ใส่ก็จะไปอยู่กลุ่ม "ไฟล์ทั่วไป"
(สำหรับไฟล์ที่วางในโฟลเดอร์ตรง ๆ ไม่ต้องใส่ ระบบใช้ชื่อโฟลเดอร์ย่อยเป็นหัวข้ออยู่แล้ว)

### ใบเสนอราคาชุด ProTech

ใบเสนอราคาแยกตามโครงการ โครงการละ 1 ใบ เก็บไว้ 3 ที่:

| ที่ | ไฟล์ | ใคร |
|---|---|---|
| `quotations-source/` | `.xlsx` ต้นฉบับที่แก้ราคาได้ | **อยู่นอก `public/` จึงไม่ขึ้นเว็บ** ใช้ภายในเท่านั้น |
| `public/files/_quotations/` | `.pdf` ที่ export จาก Excel | **ไม่ได้ลิงก์จากหน้าเว็บแล้ว** เก็บไว้เป็นไฟล์อ้างอิง |
| `src/data/quotations.json` | ข้อมูลในไฟล์ `.xlsx` แปลงเป็น JSON | ต้นทางของตารางราคาในหน้าสินค้า (สร้างอัตโนมัติ ไม่ต้องแก้เอง) |

| ใบเสนอราคา | รายการ | รวม (บาท) | ใช้กับสินค้า |
|---|---|---|---|
| `ใบเสนอราคา_ระบบประชาสัมพันธ์` | 6 | 8,741,000 | Central Digital Media Management System, Multimedia Distribution Platform, Public Display Management Platform, Central User & Communication System |
| `ใบเสนอราคา_Smart Thatoom Super App` | 6 | 9,525,000 | IdentiCore, LinkFrame, SignalWave, CivicHub |
| `ใบเสนอราคา_War Room` | 11 | 4,909,000 | Urban Data Management and Analytics Platform |
| `ใบเสนอราคา_City Data Platform` | 9 | 10,365,000 | Central Data Management Platform, Spatial Information Platform, Data Integration Gateway, Data Insight Center |

`_quotations` ไม่ใช่โฟลเดอร์ของสินค้าตัวไหน จึงไม่ถูกสแกนขึ้นเอง แต่ละสินค้าชี้มาผ่าน
`attachments` — แก้ราคาที่ไฟล์เดียว สินค้าที่ชี้มาทั้งหมดได้ของใหม่พร้อมกัน

**แก้ราคาแล้วต้องสร้าง PDF ใหม่ด้วย:**

```
npm run quotations
```

อ่าน `.xlsx` ทุกไฟล์ใน `quotations-source/` แล้วพิมพ์เป็น PDF A4 ใบละ 1 หน้า
ลงที่ `public/files/_quotations/` ทับของเดิม
(ใช้ Chrome หรือ Edge ที่ติดตั้งอยู่ในเครื่องเป็นตัวพิมพ์ ถ้าไม่มีจะข้ามไปเฉย ๆ
ตั้ง `CHROME_PATH` ได้ถ้าติดตั้งไว้ที่อื่น) สคริปต์นี้ไม่ได้ผูกกับ `npm run build`
เพราะ PDF ที่สร้างแล้วถูก commit ไว้ในโปรเจกต์อยู่แล้ว

> **สั่งแล้วไฟล์เดิมหาย** PDF ที่อยู่ใน `public/files/_quotations/` ตอนนี้เป็นไฟล์ที่
> export ออกมาจาก Excel โดยตรง (2 หน้า) ไม่ใช่ผลจากสคริปต์ สั่ง `npm run quotations`
> เมื่อไหร่ ไฟล์พวกนั้นจะถูกทับด้วยฉบับที่สคริปต์สร้าง (1 หน้า) ทับแล้วเอาคืนได้ด้วย
> `git checkout -- public/files/_quotations`

### หน้า "ราคาผลิตภัณฑ์" (`/pricing`)

ตารางเดียวรวมทุกรายการของทั้งเว็บ เข้าจากลิงก์ "ราคา" บนแถบเมนู กติกา:

- เอาเฉพาะ**รายการพื้นขาว**ในไฟล์ excel — แถวราคากลาง ICT ที่ระบายสีเขียวถูกข้าม
- คอลัมน์มีแค่ ลำดับ / รายการ / ราคาต่อหน่วย ไม่มีราคารวม
- รายการที่เป็นระบบของเว็บ ใช้**ชื่ออังกฤษจากเอกสาร word** เป็นชื่อหลัก
  มี**ชื่อไทย**กำกับ (ค่า `"thaiName"` ใน `products.json`) และกดไปหน้าสินค้าได้
  การจับคู่รายการ↔สินค้าใช้ค่า `"quotationItem"` (ต้องตรงกับ `name` ของรายการใน
  `quotations.json` ทุกตัวอักษร)
- รายการพื้นขาวที่ไม่ใช่ระบบ (เช่น จอ Video Wall โต๊ะ เก้าอี้ ของโครงการ War Room)
  ขึ้นด้วยชื่อตามใบเสนอราคา ไม่มีลิงก์
- แก้ราคาที่ไฟล์ `.xlsx` ใน `quotations-source/` แล้ว build ใหม่ ราคาบนเว็บเปลี่ยนตาม

### ไฟล์ไม่ขึ้น

| เช็ก | ที่ไหน |
|---|---|
| ไฟล์อยู่ใน `public/files/<folder>/` จริงไหม | `<folder>` คือค่า `"folder"` ของสินค้านั้น ไม่ใช่ชื่อสินค้า |
| build ใหม่หรือยัง | `docker compose up --build` หรือ `npm run build` |
| ชื่อไฟล์ขึ้นต้นด้วย `.` หรือเปล่า | ไฟล์พวกนี้ถูกข้ามโดยตั้งใจ |

เช็กตัวไฟล์แยกต่างหากได้ที่ `http://localhost/files/<folder>/<ชื่อไฟล์>` — ถ้าตรงนี้ 200
แต่หน้าเว็บไม่ขึ้น แปลว่ายังไม่ได้ build ใหม่

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
