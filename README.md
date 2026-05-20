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
