# my-project

เว็บแนะนำผลิตภัณฑ์ (React + TypeScript + Vite) เสิร์ฟด้วย nginx ใน Docker

```
docker compose up --build     # เปิดที่ http://localhost:8081
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

ตารางเดียวรวมทุกระบบของทั้งเว็บ เข้าจากลิงก์ "ราคา" บนแถบเมนู กติกา:

- เอาเฉพาะ**รายการพื้นขาว**ในไฟล์ excel — แถวราคากลาง ICT ที่ระบายสีเขียวถูกข้าม
- คอลัมน์มีแค่ ลำดับ / รายการ / ราคาต่อหน่วย ไม่มีราคารวม
- ทุกแถวเป็นระบบของเว็บ ใช้**ชื่ออังกฤษจากเอกสาร word** เป็นชื่อหลัก
  มี**ชื่อไทย**กำกับ (ค่า `"thaiName"` ใน `products.json`) และกดไปหน้าสินค้าได้
  การจับคู่รายการ↔สินค้าใช้ค่า `"quotationItem"` (ต้องตรงกับ `name` ของรายการใน
  `quotations.json` ทุกตัวอักษร)
- รายการพื้นขาวที่ไม่ใช่ระบบ (จอ Video Wall ตัวควบคุมจอ โต๊ะ เก้าอี้ และงานปรับปรุงห้อง
  ของโครงการ War Room) **ไม่ขึ้นในตาราง** — รายการที่ไม่ match `quotationItem` ของสินค้า
  ไหนเลยจะถูกข้าม
- แก้ราคาที่ไฟล์ `.xlsx` ใน `quotations-source/` แล้ว build ใหม่ ราคาบนเว็บเปลี่ยนตาม

### ไฟล์ไม่ขึ้น

| เช็ก | ที่ไหน |
|---|---|
| ไฟล์อยู่ใน `public/files/<folder>/` จริงไหม | `<folder>` คือค่า `"folder"` ของสินค้านั้น ไม่ใช่ชื่อสินค้า |
| build ใหม่หรือยัง | `docker compose up --build` หรือ `npm run build` |
| ชื่อไฟล์ขึ้นต้นด้วย `.` หรือเปล่า | ไฟล์พวกนี้ถูกข้ามโดยตั้งใจ |

เช็กตัวไฟล์แยกต่างหากได้ที่ `http://localhost:8081/files/<folder>/<ชื่อไฟล์>` — ถ้าตรงนี้ 200
แต่หน้าเว็บไม่ขึ้น แปลว่ายังไม่ได้ build ใหม่

---

## Deploy ขึ้น Google Cloud VM (pro-teches.com)

VM ตัวนี้มีหลายเว็บรันอยู่ **ตัวที่แยกว่า request ไหนเป็นของเว็บไหนคือ nginx บน host**
แยกด้วย `server_name` ล้วน ๆ เว็บนี้ = container ที่ผูกไว้แค่ `127.0.0.1:8081`
แล้วให้ nginx บน host เป็นคนถือ certificate ของ Cloudflare และ proxy เข้ามา

```
ผู้ใช้ → Cloudflare (เมฆส้ม, https) → nginx บน host :443 → container :8081 → dist/
```

container ไม่ได้เปิดพอร์ตออกเน็ตเอง เพิ่มเว็บใหม่บน VM นี้ทีหลังก็แค่ใช้พอร์ต 8082, 8083
ต่อไป ไม่ต้องแตะของเว็บนี้เลย

### ครั้งแรก

**1. DNS + certificate ที่ Cloudflare**

- เพิ่ม A record `pro-teches.com` และ `www` ชี้ไป IP ภายนอกของ VM **เปิดเมฆส้ม (Proxied)**
- SSL/TLS mode ตั้งเป็น **Full (strict)** และเปิด **Always Use HTTPS**
- ออก Origin Certificate (SSL/TLS → Origin Server → Create Certificate) ใส่ hostname
  `pro-teches.com` กับ `*.pro-teches.com` แล้วเอาไปวางบน VM ตามชื่อนี้:

```
/etc/ssl/cloudflare/pro-teches.com.pem      ← Origin Certificate
/etc/ssl/cloudflare/pro-teches.com.key      ← Private Key (chmod 600)
```

certificate ของโดเมนอื่นบนเครื่องเดียวกันใช้แทนกันไม่ได้ ต้องออกใบของโดเมนนี้เอง

**2. IP ของ VM ต้องเป็น static** ไม่งั้น reboot ทีเดียว DNS ชี้ผิดทันที
(`gcloud compute addresses create ...` แล้วผูกกับ VM) และ VM ต้องเปิดพอร์ต 80/443
ผ่าน firewall ของ GCP (tag `http-server`, `https-server`)

**3. รัน container**

```bash
git clone -b pluem https://github.com/oatpt/my-project.git /opt/pro-teches
cd /opt/pro-teches && docker compose up -d --build
curl -I http://127.0.0.1:8081/          # ต้องได้ 200 ก่อนไปต่อ
```

**4. ต่อ nginx บน host**

ไฟล์คอนฟิกอยู่ในโปรเจกต์แล้วที่ [`deploy/pro-teches.com.conf`](deploy/pro-teches.com.conf)

```bash
sudo cp deploy/pro-teches.com.conf /etc/nginx/sites-available/pro-teches.com
sudo ln -s /etc/nginx/sites-available/pro-teches.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` ต้องผ่านก่อน reload เสมอ — คอนฟิกพังแล้ว reload ไปเลย **เว็บอื่นบนเครื่อง
เดียวกันดับตามไปด้วย**

### อัปเดตเว็บรอบถัดไป

```bash
cd /opt/pro-teches && git pull && docker compose up -d --build
```

ไม่ต้อง reload nginx บน host เพราะพอร์ตกับ server_name ไม่ได้เปลี่ยน
ถ้าแก้แล้วยังเห็นของเก่า ให้ purge cache ที่ Cloudflare — ไฟล์ใน `/assets/` ไม่มีปัญหา
เพราะชื่อเปลี่ยนทุก build แต่ `index.html` โดนแคชที่ขอบได้

### เรื่องที่ตั้งใจให้เป็นแบบนี้

| | ทำไม |
|---|---|
| container ผูก `127.0.0.1:8081` ไม่ใช่ `8081` เฉย ๆ | docker เขียน iptables เองไม่ผ่าน ufw เขียนแบบหลังพอร์ตจะทะลุ firewall ออกเน็ต เข้าเว็บตรงข้าม Cloudflare ได้ |
| พอร์ต 80 บน host ไม่ redirect ไป https เอง | Origin Certificate เบราว์เซอร์ไม่รู้จัก ถ้าเมฆยังเทาแล้ว redirect เองผู้ใช้จะเจอหน้าเตือน certificate ปล่อยให้ Always Use HTTPS จัดการที่ขอบแทน |
| กฎแคช/404 อยู่ใน `default.conf` ของ container ที่เดียว | host ทำหน้าที่ส่งต่ออย่างเดียว จะได้ไม่มีกฎสองชุดที่ขัดกันเอง |
| `location ^~ /files/` ไม่ใช่ `/files/` เฉย ๆ | location แบบ regex ชนะ prefix เสมอ ถ้าวันหลังมีใครเพิ่ม `~* \.pdf$` เข้ามา ไฟล์แนบจะหลุดไปเข้า fallback ของ SPA แล้วได้ index.html ที่ตั้งชื่อเป็น .pdf |
| Origin Certificate อายุ 15 ปี แต่ **ไม่ auto-renew** | ไม่มี certbot มาต่อให้เหมือน Let's Encrypt จดวันหมดไว้ด้วย |

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
