# Auto Click Drag Web

Trang Next.js để người dùng tải `AutoClickDrag.exe` và API license dùng chung trên Vercel.

## Biến môi trường

Tạo các biến này trên Vercel:

```text
DATABASE_URL=postgresql://...
LICENSE_ADMIN_TOKEN=token-bi-mat-cua-ban
NEXT_PUBLIC_DOWNLOAD_URL=/downloads/AutoClickDrag.exe
NEXT_PUBLIC_APP_VERSION=1.0.0
```

Khuyến nghị tạo database miễn phí bằng Neon rồi copy connection string vào `DATABASE_URL`.

## Chạy local

```powershell
cd web
npm install
copy .env.example .env.local
npm run dev
```

## Deploy Vercel

1. Push thư mục `web` lên GitHub cùng repo.
2. Tạo project Vercel, chọn root directory là `web`.
3. Thêm env vars ở trên.
4. Deploy.

## Đưa file exe lên trang tải

Cách đơn giản:

1. Build exe ở project gốc bằng `build_exe.bat`.
2. Copy `dist\AutoClickDrag.exe` vào `web\public\downloads\AutoClickDrag.exe`.
3. Commit và push.
4. Vercel redeploy, trang chủ sẽ có link tải.

Nếu file exe lớn hoặc bị Vercel giới hạn dung lượng, hãy upload exe lên GitHub Releases, Google Drive direct link, Cloudflare R2, hoặc Vercel Blob rồi đặt:

```text
NEXT_PUBLIC_DOWNLOAD_URL=https://link-file-exe-cua-ban
```

## Tạo key bán cho khách

Sau khi deploy, chạy từ máy bạn:

```powershell
cd web
$env:LICENSE_SERVER_URL="https://ten-project.vercel.app"
$env:LICENSE_ADMIN_TOKEN="token-bi-mat-cua-ban"
npm run key:create -- --days=30 --note="ten-khach"
```

Key vĩnh viễn:

```powershell
npm run key:create -- --days=0 --note="ten-khach"
```

## Trang admin

Sau khi deploy, mở:

```text
https://ten-project.vercel.app/admin
```

Nhập đúng `LICENSE_ADMIN_TOKEN` để:

- Tạo key theo số ngày dùng.
- Xem danh sách key.
- Xem key đã kích hoạt trên máy nào.
- Khóa hoặc mở khóa key.

Token chỉ lưu trong trình duyệt của bạn bằng `localStorage`. Không gửi link `/admin` hoặc token cho khách.

## API app desktop dùng

```text
POST /api/license/activate
POST /api/license/verify
```

Khi build exe, nhập URL Vercel làm license server URL, ví dụ:

```text
https://ten-project.vercel.app
```
