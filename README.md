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
# Public site origin for ride SEO (canonical, sitemap, Open Graph) — no trailing slash
VITE_SITE_URL=https://your-domain.com
# Optional GA4 for /ride public pages only
VITE_GA_MEASUREMENT_ID=
```

Trên Vercel → Project → Environment Variables, thêm cùng các key trên (Production). **Không** dùng prefix `VITE_` cho `ORS_API_KEY` / `ABLY_API_KEY` / secrets server. `VITE_SITE_URL` và `VITE_GA_MEASUREMENT_ID` là biến public (được nhúng vào bundle).

Atlas Network Access: cho phép IP serverless (thường `0.0.0.0/0`) và user DB có quyền read/write.

## Chạy local

```bash
npm install
npm run dev
```

`vite` phục vụ UI và `/api/*` qua plugin dev (cùng process). Đăng nhập bằng `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

Public ride site: http://localhost:5173/ride

## Build

```bash
npm run build
```

Build chạy `tsc` + Vite, rồi generate `sitemap.xml` và prerender HTML tĩnh cho các landing SEO `/ride/*` (booking/admin vẫn SPA).

## Deploy

Push lên GitHub; Vercel build static + serverless dưới `/api`. Sau khi set env → Redeploy.
