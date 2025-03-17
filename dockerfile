# Stage 1: Build stage
FROM node:16 as builder
WORKDIR /app
# คัดลอกไฟล์ package และติดตั้ง dependencies
COPY package*.json ./
RUN npm install
# คัดลอก source code ทั้งหมด
COPY . .
# สร้างโปรเจกต์ (build output จะอยู่ที่โฟลเดอร์ dist)
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine
# คัดลอก build output จาก Stage 1 ไปยังโฟลเดอร์ที่ Nginx ใช้งาน
COPY --from=builder /app/dist /usr/share/nginx/html
# เปิดพอร์ต 80
EXPOSE 80
# รัน nginx ในโหมด foreground
CMD ["nginx", "-g", "daemon off;"]
