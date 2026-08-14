# Stage 1: Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# ลง dependency ก่อน copy ซอร์ส เพื่อให้ layer นี้ถูกใช้ซ้ำตราบใดที่ lockfile ไม่เปลี่ยน
COPY package*.json ./
RUN npm ci

# ต้อง copy ทั้งโปรเจกต์ ไม่ใช่แค่ src/ เพราะ prebuild ต้องอ่าน public/files/
# กับ quotations-source/*.xlsx เพื่อสร้าง attachments.json / quotations.json ก่อน vite build
COPY . .
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine

# คัดลอกไฟล์ build ไปยังตำแหน่งที่ Nginx จะใช้เป็น root
COPY --from=builder /app/dist /usr/share/nginx/html

# คัดลอกไฟล์ default.conf ของคุณ ไปแทนไฟล์คอนฟิกเดิม
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
