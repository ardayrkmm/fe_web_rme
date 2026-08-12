# Tahap 1: Membangun Aplikasi React (Builder Stage)
FROM node:20-alpine AS builder

WORKDIR /app

# Salin file konfigurasi package (package.json dan package-lock.json)
COPY package*.json ./

# Install semua dependensi Node.js
RUN npm install

# Salin seluruh kode sumber React (pastikan node_modules masuk .dockerignore)
COPY . .

# Argument VITE_API_URL untuk mengatur alamat API backend
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Jalankan proses build (mengubah React menjadi file HTML/JS statis)
RUN npm run build

# Tahap 2: Menjalankan Aplikasi di Nginx (Runner Stage)
FROM nginx:alpine

# Salin hasil build React (biasanya di folder dist) ke folder default Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Salin konfigurasi Nginx khusus yang tadi kita buat
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 untuk akses web
EXPOSE 80

# Jalankan Nginx
CMD ["nginx", "-g", "daemon off;"]
