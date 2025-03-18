# Stage 1: Build stage
FROM node:18 as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
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
