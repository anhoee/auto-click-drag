const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || "/downloads/AutoClickDrag.exe";
const zipDownloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_ZIP_URL || "/downloads/AutoClickDrag.zip";
const version = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="topbar-inner brand">
          <div className="brand-name">Auto Click Drag</div>
          <div className="status">Windows desktop app</div>
        </div>
      </header>

      <section className="main">
        <div className="hero">
          <div>
            <h1 className="headline">Auto Click Drag</h1>
            <p className="lead">
              Công cụ tự động click, kéo thả, bấm phím và lặp thao tác theo cấu hình. Bản tải xuống có 3 ngày dùng thử,
              sau đó người dùng nhập key bản quyền do bạn cấp.
            </p>
          </div>

          <aside className="download-panel">
            <h2 className="download-title">Tải bản Windows</h2>
            <p className="download-meta">Phiên bản {version}. File chạy trực tiếp, không cần cài Python.</p>
            <a className="button" href={downloadUrl} download>
              Tải AutoClickDrag.exe
            </a>
            <a className="button secondary" href={zipDownloadUrl} download>
              Tải bản ZIP
            </a>
            <p className="note">
              Nếu trình duyệt chặn file exe trực tiếp, hãy tải bản ZIP rồi giải nén. File tự build chưa có chữ ký số nên
              Windows vẫn có thể hỏi xác nhận khi mở lần đầu.
            </p>
          </aside>
        </div>

        <div className="grid">
          <section className="info-panel">
            <h2>Dùng thử 3 ngày</h2>
            <p>App tự tạo thời gian dùng thử trên máy khách trong lần mở đầu tiên.</p>
          </section>
          <section className="info-panel">
            <h2>Kích hoạt bằng key</h2>
            <p>Key được khóa theo máy khi người dùng kích hoạt lần đầu.</p>
          </section>
          <section className="info-panel">
            <h2>API tích hợp sẵn</h2>
            <p>Trang này có luôn API kích hoạt và xác thực key cho app desktop.</p>
          </section>
        </div>
      </section>

      <footer className="footer">Auto Click Drag</footer>
    </main>
  );
}
