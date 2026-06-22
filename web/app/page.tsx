const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || "/downloads/AutoClickDrag.exe";
const zipDownloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_ZIP_URL || "/downloads/AutoClickDrag.zip";
const version = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="topbar-inner brand">
          <div className="brand-name">Auto Click Drag</div>
          <span className="status">🖥️ Windows Desktop App</span>
        </div>
      </header>

      <section className="main">
        <div className="hero">
          <div>
            <div style={{ marginBottom: "16px", display: "inline-flex" }}>
              <span className="status" style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", color: "#a5b4fc" }}>
                🔥 Phiên bản mới {version}
              </span>
            </div>
            <h1 className="headline">Tự động hoá chuột và bàn phím chuyên nghiệp</h1>
            <p className="lead">
              Auto Click Drag là công cụ đắc lực trên Windows giúp bạn tự động hoá các thao tác click đúp chuột, nhấn giữ kéo-thả, bấm phím và lặp lại chu trình một cách chuẩn xác, mượt mà nhất.
            </p>

            <div className="hero-features">
              <div className="hero-feature-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Dùng thử 3 ngày miễn phí
              </div>
              <div className="hero-feature-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Kích hoạt Key theo phần cứng máy
              </div>
              <div className="hero-feature-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Không lỗi khi nhận diện ký tự
              </div>
            </div>
          </div>

          <aside className="download-panel">
            <h2 className="download-title">Tải Về Cho Windows</h2>
            <p className="download-meta">Tương thích Windows 10 & 11. File chạy trực tiếp không cần cài đặt Python.</p>
            
            <a className="button" href={downloadUrl} download>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Tải AutoClickDrag.exe
            </a>
            
            <a className="button secondary" href={zipDownloadUrl} download>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              Tải bản nén .ZIP
            </a>
            
            <p className="note">
              <strong>Lưu ý:</strong> Nếu trình duyệt của bạn cảnh báo bảo mật khi tải file <code>.exe</code> trực tiếp, hãy chọn tải bản <code>.ZIP</code> rồi giải nén để chạy bình thường. Do phần mềm tự xây dựng chưa ký số thương mại nên Windows Defender có thể hỏi xác nhận trong lần chạy đầu tiên.
            </p>
          </aside>
        </div>

        <div className="grid">
          <section className="info-panel">
            <div className="info-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <h2>Dùng thử 3 ngày miễn phí</h2>
            <p>Trải nghiệm đầy đủ tính năng ngay khi mở ứng dụng lần đầu tiên mà không cần nhập key bản quyền ngay lập tức.</p>
          </section>

          <section className="info-panel">
            <div className="info-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h2>Bảo mật &amp; Độc bản</h2>
            <p>Mỗi Key bản quyền kích hoạt sẽ tự động liên kết (khóa) theo chữ ký phần cứng máy tính của khách hàng để bảo vệ bản quyền.</p>
          </section>

          <section className="info-panel">
            <div className="info-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <h2>API Kích Hoạt Tích Hợp</h2>
            <p>Trang web đi kèm với hệ thống API kích hoạt và kiểm tra bản quyền trực tuyến kết nối thẳng tới ứng dụng desktop của bạn.</p>
          </section>
        </div>
      </section>

      <footer className="footer">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", width: "min(1200px, 100%)", margin: "0 auto" }}>
          <span>© {new Date().getFullYear()} Auto Click Drag. All rights reserved.</span>
          <a href="/admin" className="status" style={{ textDecoration: "none", cursor: "pointer" }}>🔐 Trang Quản Trị Key</a>
        </div>
      </footer>
    </main>
  );
}
