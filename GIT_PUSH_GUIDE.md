# Đẩy dự án lên GitHub

## 1. Cài Git

Tải Git for Windows:

https://git-scm.com/download/win

Sau khi cài, mở PowerShell mới và kiểm tra:

```powershell
git --version
```

## 2. Tạo repo trên GitHub

1. Vào https://github.com/new
2. Đặt tên repo, ví dụ `auto-click-drag`
3. Chọn `Private` hoặc `Public`
4. Không tick tạo README, `.gitignore`, license nếu muốn dùng nguyên repo local này
5. Copy URL repo, ví dụ:

```text
https://github.com/USERNAME/auto-click-drag.git
```

## 3. Push code lần đầu

Mở PowerShell tại thư mục dự án:

```powershell
cd "C:\Users\Vanh\Documents\auto click"
```

Chạy các lệnh sau, thay URL repo của bạn vào dòng `git remote add origin`:

```powershell
git init
git add .
git commit -m "Initial Auto Click Drag app"
git branch -M main
git remote add origin https://github.com/USERNAME/auto-click-drag.git
git push -u origin main
```

## 4. Các lần cập nhật sau

```powershell
git add .
git commit -m "Update app"
git push
```

## Lưu ý

- Thư mục `dist/`, `build/`, file `.spec`, và ảnh test không được đưa lên git vì chúng là file sinh ra khi build/test.
- File `.exe` nên đưa lên GitHub Releases thay vì commit trực tiếp vào repo.
- Nếu GitHub hỏi đăng nhập, hãy đăng nhập bằng trình duyệt hoặc dùng Personal Access Token theo hướng dẫn của GitHub.

