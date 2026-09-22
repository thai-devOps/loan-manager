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
# Cloudinary — signed direct upload (server-only; never expose CLOUDINARY_API_SECRET)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
# Public site origin for ride SEO (canonical, sitemap, Open Graph) — no trailing slash
VITE_SITE_URL=https://www.chauthai.id.vn
# Optional GA4 for /ride public pages only
VITE_GA_MEASUREMENT_ID=
```

Trên Vercel → Project → Environment Variables, thêm cùng các key trên (Production). **Không** dùng prefix `VITE_` cho `ORS_API_KEY` / `ABLY_API_KEY` / `CLOUDINARY_*` / `PNJ_ZONE` / `GOLD_PRICE_SYNC_SECRET` / secrets server. `VITE_SITE_URL` và `VITE_GA_MEASUREMENT_ID` là biến public (được nhúng vào bundle). Production canonical host là `https://www.chauthai.id.vn` (khớp Domains + sitemap). Cron giá vàng (Hobby: 1 lần/ngày, `0 2 * * *` UTC ≈ 09:00 VN): `GOLD_PRICE_SYNC_SECRET` (hoặc `CRON_SECRET`) cho `/api/jobs/gold-price-sync`. Khi mở trang vàng, API vẫn tự refresh nếu snapshot quá TTL.

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

Push lên GitHub; Vercel build static + serverless dưới `/api`.

**Quan trọng cho SEO `/ride`:**

1. Build Command phải là `npm run build` (đã set trong `vercel.json`) — không chỉ `vite build`, vì cần bước generate sitemap + prerender HTML.
2. Thêm env Production:
   - `VITE_SITE_URL=https://www.chauthai.id.vn` (không trailing slash) — canonical/sitemap/OG tuyệt đối; phải khớp host chuẩn (www)
   - (tuỳ chọn) `VITE_GA_MEASUREMENT_ID=G-...`
3. Redeploy sau khi set env.
4. Kiểm tra nhanh: mở `https://www.chauthai.id.vn/ride/locations/an-giang` → View Source phải thấy `<title>`, `<link rel="canonical">`, và thẻ `<h1>` trong HTML (không chỉ `#root` trống). Cũng mở `/robots.txt` và `/sitemap.xml`.

Sau khi set env → Redeploy.
