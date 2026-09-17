# Monely

Không gian quản lý tài chính cá nhân (cho vay, thu chi, tài sản) — React + Vite + Vercel Serverless API + MongoDB Atlas.

## Yêu cầu

- Node.js 20+
- Tài khoản [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- (Production) Project Vercel

## Biến môi trường

Tạo file `.env` ở root (đã gitignore — **không commit**):

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
JWT_SECRET=long-random-string
MONGODB_URI=mongodb+srv://USER:PASS@cluster0....mongodb.net/loan-db?retryWrites=true&w=majority
# OpenRouteService — geocode + directions for auto quote (server-only, no VITE_ prefix)
ORS_API_KEY=your-ors-api-key
# Ably — realtime signals for ride admin (server-only; token auth for browser)
ABLY_API_KEY=your-ably-api-key
```

Trên Vercel → Project → Environment Variables, thêm cùng các key trên (Production). **Không** dùng prefix `VITE_` cho các biến này (đặc biệt `ORS_API_KEY` / `ABLY_API_KEY` — chỉ dùng trên server).

Atlas Network Access: cho phép IP serverless (thường `0.0.0.0/0`) và user DB có quyền read/write.

## Chạy local

```bash
npm install
npm run dev
```

`vite` phục vụ UI và `/api/*` qua plugin dev (cùng process). Đăng nhập bằng `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

## Build

```bash
npm run build
```

## Deploy

Push lên GitHub; Vercel build static + serverless dưới `/api`. Sau khi set env → Redeploy.
