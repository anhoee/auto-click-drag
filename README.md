# Auto Click Drag

Ứng dụng desktop Windows để tự động click, giữ chuột kéo-thả, bấm phím và lặp lại theo cấu hình người dùng.

## Tính năng chính

- Lưu điểm nguồn `A/B/C/D` và vị trí thả chuột.
- Chọn một điểm cố định hoặc random trong các điểm đã tick.
- Không có ký tự đặc biệt: click đủ số lần tại nguồn để bôi đen nội dung, sau đó mới giữ chuột kéo sang ô đích rồi thả.
- Có ký tự đặc biệt như `-`: click đủ số lần để bôi đen và kiểm tra nội dung, nếu thấy ký tự thì click thêm 1 lần, sau đó mới giữ chuột kéo sang ô đích rồi thả.
- Sau khi thả chuột, app bấm một phím do người dùng chọn, mặc định là `Tab`.
- Lặp theo số lần hoặc lặp vô hạn.
- Tùy chỉnh tốc độ mỗi vòng, thời gian giữa click, thời gian giữ trước khi kéo, thời gian kéo.
- Hotkey mặc định: `F8` chạy/tạm dừng, `F9` dừng.
- Có giao diện tiếng Việt, system tray, icon trạng thái.

## Icon trạng thái

- Icon thương hiệu: sẵn sàng/chưa chạy.
- Tam giác: đang chạy.
- Hình vuông: đã dừng.

Khi bấm `Ẩn xuống khay` hoặc thu nhỏ cửa sổ, app sẽ chạy nền ở system tray gần khu vực loa. Chuột phải vào icon tray để mở cửa sổ, chạy/tạm dừng, dừng hoặc thoát.

## Yêu cầu hệ thống

- Windows 10 hoặc Windows 11.
- Python 3.11 trở lên nếu chạy từ mã nguồn.
- Git nếu muốn đẩy code lên GitHub.

## Cài đặt từ A-Z để chạy từ mã nguồn

### 1. Cài Python

Tải Python tại:

https://www.python.org/downloads/windows/

Khi cài, tick `Add python.exe to PATH`.

Kiểm tra:

```powershell
python --version
```

### 2. Tải hoặc clone dự án

Nếu đã có thư mục này trên máy:

```powershell
cd "C:\Users\Vanh\Documents\auto click"
```

Nếu lấy từ GitHub:

```powershell
git clone https://github.com/USERNAME/auto-click-drag.git
cd auto-click-drag
```

### 3. Cài thư viện

```powershell
python -m pip install -r requirements.txt
```

### 4. Chạy app

```powershell
python auto_click_drag.py
```

Hoặc double-click:

```text
run_app.bat
```

## Bản quyền, dùng thử và cấp key

App cho dùng thử miễn phí 3 ngày trên mỗi máy. Sau khi hết dùng thử, người dùng phải nhập key do server của bạn cấp.

### Chạy server cấp key

Server dùng Python chuẩn và SQLite, không cần cài thêm thư viện:

```powershell
cd "C:\Users\Vanh\Documents\auto click"
$env:LICENSE_ADMIN_TOKEN="doi-token-admin-nay"
python license_server.py serve --host 0.0.0.0 --port 8008
```

Hoặc double-click:

```text
run_license_server.bat
```

Database key sẽ nằm ở:

```text
licenses.sqlite3
```

### Tạo key để bán

Tạo key 30 ngày:

```powershell
python license_server.py create-key --days 30 --note "ten-khach-hang"
```

Tạo key vĩnh viễn:

```powershell
python license_server.py create-key --days 0 --note "ten-khach-hang"
```

Key chỉ bắt đầu tính hạn khi khách nhập key và kích hoạt lần đầu. Sau khi kích hoạt, key bị khóa theo máy đó.

### Đổi địa chỉ server trong app

Mặc định app gọi server tại:

```text
http://127.0.0.1:8008
```

Khi bán thật, hãy đưa `license_server.py` lên VPS/server riêng, mở port hoặc đặt sau domain HTTPS. Trước khi chạy hoặc build app, đặt biến môi trường:

```powershell
$env:AUTO_CLICK_LICENSE_SERVER="https://domain-cua-ban.com"
python auto_click_drag.py
```

Khi build `.exe`, chạy `build_exe.bat` và nhập URL server public khi script hỏi. URL này sẽ được nhúng vào file exe.

### Deploy server miễn phí

Khuyến nghị dùng Koyeb free tier cho bản quyền nhỏ vì có 1 web service miễn phí. Render cũng dùng được nhưng free service có thể ngủ khi không có request; lần kích hoạt đầu tiên có thể chậm. Fly.io hiện không phù hợp nếu cần free lâu dài cho tài khoản mới.

### Deploy bằng Next.js trên Vercel

Thư mục `web/` là một app Next.js gồm trang tải app và API license:

```text
web/
```

App này phù hợp để deploy lên Vercel. Vì Vercel serverless không nên lưu SQLite local lâu dài, bản Next.js dùng Neon Postgres qua biến `DATABASE_URL`.

Các bước:

1. Tạo database miễn phí trên Neon và copy connection string.
2. Push repo lên GitHub.
3. Tạo project Vercel, chọn root directory là `web`.
4. Thêm env vars:

```text
DATABASE_URL=postgresql://...
LICENSE_ADMIN_TOKEN=mot-token-bi-mat-cua-ban
NEXT_PUBLIC_DOWNLOAD_URL=/downloads/AutoClickDrag.exe
NEXT_PUBLIC_APP_VERSION=1.0.0
```

5. Deploy. URL Vercel nhận được sẽ là license server URL để nhập khi chạy `build_exe.bat`.

Tạo key qua API Vercel từ máy bạn:

```powershell
cd web
$env:LICENSE_SERVER_URL="https://ten-project.vercel.app"
$env:LICENSE_ADMIN_TOKEN="mot-token-bi-mat-cua-ban"
npm run key:create -- --days=30 --note="ten-khach"
```

Hoặc mở trang admin:

```text
https://ten-project.vercel.app/admin
```

Nhập `LICENSE_ADMIN_TOKEN` để tạo key, xem danh sách key, khóa/mở key.

Nếu muốn trang web cho tải trực tiếp file exe, copy file sau khi build vào:

```text
web\public\downloads\AutoClickDrag.exe
```

Rồi commit/push để Vercel deploy lại. Nếu file exe quá lớn, upload lên GitHub Releases hoặc storage khác rồi đổi `NEXT_PUBLIC_DOWNLOAD_URL`.

#### Deploy lên Koyeb

1. Push code lên GitHub.
2. Vào Koyeb, tạo Web Service từ repository GitHub.
3. Chọn deploy bằng Dockerfile.
4. Đặt biến môi trường:

```text
LICENSE_ADMIN_TOKEN=mot-token-bi-mat-cua-ban
LICENSE_DB=/data/licenses.sqlite3
```

5. Thêm persistent volume mount vào `/data` nếu Koyeb cho cấu hình volume trên plan bạn dùng. Nếu không có volume, database SQLite có thể mất khi service redeploy.
6. Deploy xong, copy URL dạng:

```text
https://ten-app-cua-ban.koyeb.app
```

URL này dùng để build file `.exe`.

#### Deploy lên Render

1. Tạo Web Service từ GitHub.
2. Chọn Docker.
3. Đặt biến môi trường:

```text
LICENSE_ADMIN_TOKEN=mot-token-bi-mat-cua-ban
LICENSE_DB=/data/licenses.sqlite3
```

4. Nếu dùng SQLite thật, cần disk/persistent storage. Nếu không có disk, key có thể mất khi redeploy/restart. Với bán thật, nên dùng VPS rẻ hoặc database ngoài.

### Build file .exe cho khách tải

Double-click:

```text
build_exe.bat
```

Khi script hỏi `License server URL`, nhập URL server public, ví dụ:

```text
https://ten-app-cua-ban.koyeb.app
```

File gửi cho khách nằm ở:

```text
dist\AutoClickDrag.exe
```

## Cách sử dụng nhanh

1. Mở website/ứng dụng cần thao tác.
2. Trong Auto Click Drag, tại điểm `A/B/C/D`, bấm `Lấy sau 3s`, đưa chuột tới vị trí cần click/kéo, đợi app lưu tọa độ.
3. Ở `Vị trí thả chuột`, bấm `Lấy sau 3s`, đưa chuột tới ô đích, đợi app lưu tọa độ.
4. Tick các điểm nguồn muốn dùng.
5. Nếu muốn random, chọn `Random trong các điểm đã tick`.
6. Nếu cần nhận diện dấu `-` hoặc ký tự khác, bật `Nếu nội dung có ký tự này thì click thêm 1 lần`, rồi nhập ký tự cần nhận diện.
7. Cài số lần lặp, delay mỗi vòng, thời gian kéo, phím sau khi thả.
8. Bấm `Chạy` hoặc hotkey `F8`.
9. Bấm `F9` để dừng khẩn cấp.

## Chạy test trực quan

Test này mở một cửa sổ mẫu, kéo chữ `ABC-123` sang vùng thả, sau đó lưu ảnh kết quả.

```powershell
python visual_drag_test.py
```

Hoặc double-click:

```text
run_visual_test.bat
```

Ảnh kết quả nằm tại:

```text
test-results/visual_drag_test.png
```

## Build file .exe từ A-Z

### Cách nhanh

Double-click:

```text
build_exe.bat
```

Sau khi build xong, file `.exe` nằm tại:

```text
dist/AutoClickDrag.exe
```

### Cách thủ công

```powershell
cd "C:\Users\Vanh\Documents\auto click"
python -m pip install -r requirements.txt
python create_icons.py
python -m PyInstaller --noconfirm --clean --onefile --windowed --icon assets\AutoClickDrag.ico --name AutoClickDrag auto_click_drag.py
```

File kết quả:

```text
dist/AutoClickDrag.exe
```

## Đẩy lên GitHub

Xem hướng dẫn chi tiết tại:

```text
GIT_PUSH_GUIDE.md
```

Tóm tắt:

```powershell
git init
git add .
git commit -m "Initial Auto Click Drag app"
git branch -M main
git remote add origin https://github.com/USERNAME/auto-click-drag.git
git push -u origin main
```

## Lưu ý kỹ thuật

- Tọa độ là tọa độ màn hình hiện tại. Nếu thay đổi kích thước cửa sổ/trình duyệt, hãy lấy lại tọa độ.
- Nhận diện ký tự dùng cách chọn chữ rồi `Ctrl+C`; nếu nội dung là ảnh, canvas, video hoặc trang chặn copy thì cần làm thêm OCR.
- Nếu cần điều khiển ứng dụng đang chạy bằng quyền Administrator, hãy chạy Auto Click Drag bằng quyền Administrator.
- File `.exe` tự build có thể bị Windows Defender hỏi xác nhận vì chưa ký số.
