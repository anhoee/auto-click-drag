"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type LicenseKey = {
  key: string;
  duration_days: number;
  note: string;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  bound_machine: string | null;
  disabled: boolean;
  status: "unused" | "active" | "expired" | "disabled";
};

const tokenStorageKey = "auto-click-admin-token";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusLabel(status: LicenseKey["status"]) {
  const labels = {
    unused: "Chưa dùng",
    active: "Đang dùng",
    expired: "Hết hạn",
    disabled: "Đã khóa"
  };
  return labels[status];
}

function durationLabel(days: number) {
  return days === 0 ? "Vĩnh viễn" : `${days} ngày`;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [days, setDays] = useState("30");
  const [lifetime, setLifetime] = useState(false);
  const [note, setNote] = useState("");
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDays, setEditDays] = useState("30");
  const [editLifetime, setEditLifetime] = useState(false);
  const [editNote, setEditNote] = useState("");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "X-Admin-Token": token
    }),
    [token]
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(tokenStorageKey);
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem(tokenStorageKey, token);
    }
  }, [token]);

  const stats = useMemo(() => {
    const base = { total: keys.length, active: 0, unused: 0, expired: 0, disabled: 0 };
    for (const item of keys) {
      base[item.status] += 1;
    }
    return base;
  }, [keys]);

  const visibleKeys = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return keys;
    }
    return keys.filter(
      (item) =>
        item.key.toLowerCase().includes(term) ||
        item.note.toLowerCase().includes(term) ||
        (item.bound_machine || "").toLowerCase().includes(term)
    );
  }, [keys, search]);

  async function loadKeys() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/keys", { headers });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Không tải được danh sách key.");
      }
      setKeys(payload.keys || []);
      setMessage("Đã tải danh sách key.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách key.");
    } finally {
      setLoading(false);
    }
  }

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/keys", {
        method: "POST",
        headers,
        body: JSON.stringify({ duration_days: lifetime ? 0 : Number(days), note })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Không tạo được key.");
      }
      setMessage(`Đã tạo key: ${payload.key}`);
      setNote("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được key.");
    } finally {
      setLoading(false);
    }
  }

  async function setDisabled(key: string, disabled: boolean) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/keys", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ key, disabled })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Không cập nhật được key.");
      }
      setKeys((current) => current.map((item) => (item.key === key ? payload.key : item)));
      setMessage(disabled ? `Đã khóa ${key}.` : `Đã mở khóa ${key}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được key.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: LicenseKey) {
    setEditingKey(item.key);
    setEditLifetime(item.duration_days === 0);
    setEditDays(item.duration_days === 0 ? "30" : String(item.duration_days));
    setEditNote(item.note);
    setMessage("");
    setError("");
  }

  function cancelEdit() {
    setEditingKey(null);
  }

  async function saveEdit(key: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/keys", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key,
          duration_days: editLifetime ? 0 : Number(editDays),
          note: editNote
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Không sửa được key.");
      }
      setKeys((current) => current.map((item) => (item.key === key ? payload.key : item)));
      setMessage(`Đã cập nhật ${key}.`);
      setEditingKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không sửa được key.");
    } finally {
      setLoading(false);
    }
  }

  async function removeKey(key: string) {
    if (!window.confirm(`Xoá hẳn key ${key}? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/keys", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ key })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Không xoá được key.");
      }
      setKeys((current) => current.filter((item) => item.key !== key));
      setMessage(`Đã xoá ${key}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được key.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Hệ Thống Quản Lý Key</h1>
          <p className="admin-subtitle">Tạo mới khóa kích hoạt, cấu hình thời gian sử dụng, khóa/mở khóa bản quyền phần mềm.</p>
        </div>
        <a className="button secondary" href="/">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Trang tải app
        </a>
      </header>

      <div className="stat-row">
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-value">{stats.total}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          </div>
          <span className="stat-label">Tổng số Key</span>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-value" style={{ color: "#34d399" }}>{stats.active}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <span className="stat-label">Đang hoạt động</span>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-value" style={{ color: "#60a5fa" }}>{stats.unused}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <span className="stat-label">Chưa sử dụng</span>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-value" style={{ color: "#f59e0b" }}>{stats.expired}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <span className="stat-label">Đã hết hạn</span>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-value" style={{ color: "#f87171" }}>{stats.disabled}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <span className="stat-label">Đã bị khóa</span>
        </div>
      </div>

      <div className="admin-grid">
        <section className="admin-card">
          <h2 className="card-title">Tạo Key Bản Quyền</h2>
          <form onSubmit={createKey}>
            <div className="field">
              <label htmlFor="token">Admin Token Xác Thực</label>
              <input
                id="token"
                className="input"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Nhập mã bí mật..."
              />
            </div>

            <div className="field">
              <label htmlFor="days">Thời Hạn Sử Dụng (Ngày)</label>
              <input
                id="days"
                className="input"
                value={days}
                disabled={lifetime}
                onChange={(event) => setDays(event.target.value)}
                placeholder="30"
              />
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={lifetime}
                onChange={(event) => setLifetime(event.target.checked)}
              />
              <span>Cấp quyền Vĩnh Viễn</span>
            </label>

            <div className="field">
              <label htmlFor="note">Ghi Chú Khách Hàng</label>
              <input 
                id="note" 
                className="input" 
                value={note} 
                onChange={(event) => setNote(event.target.value)} 
                placeholder="Ví dụ: Tên KH, số điện thoại..."
              />
            </div>

            <div className="button-row">
              <button className="button" type="submit" disabled={loading || !token}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Tạo Key
              </button>
              <button className="button secondary" type="button" onClick={loadKeys} disabled={loading || !token}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Tải Danh Sách
              </button>
            </div>
          </form>

          {message ? <div className="message">✨ {message}</div> : null}
          {error ? <div className="message error">❌ {error}</div> : null}
        </section>

        <section className="admin-card">
          <div className="table-toolbar">
            <h2 className="card-title" style={{ marginBottom: 0 }}>Danh Sách Key Hiện Tại</h2>
            <input
              className="input search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="🔍 Tìm theo Key, Ghi chú, Máy tính..."
            />
          </div>
          
          <div className="table-wrap">
            <table className="key-table">
              <thead>
                <tr>
                  <th>Mã Key</th>
                  <th>Trạng Thái</th>
                  <th>Thời Hạn &amp; Lịch Sử</th>
                  <th>Ghi Chú</th>
                  <th>ID Thiết Bị</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {visibleKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      {keys.length === 0
                        ? "Chưa có dữ liệu. Nhập Admin Token ở cột bên trái rồi bấm Tải Danh Sách."
                        : "Không tìm thấy Key nào trùng khớp."}
                    </td>
                  </tr>
                ) : (
                  visibleKeys.map((item) =>
                    editingKey === item.key ? (
                      <tr key={item.key} className="editing-row">
                        <td className="mono" style={{ fontWeight: 600, color: "#a5b4fc" }}>{item.key}</td>
                        <td>
                          <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <input
                              className="input compact"
                              value={editDays}
                              disabled={editLifetime}
                              onChange={(event) => setEditDays(event.target.value)}
                            />
                            <label className="checkbox tight">
                              <input
                                type="checkbox"
                                checked={editLifetime}
                                onChange={(event) => setEditLifetime(event.target.checked)}
                              />
                              <span>Vĩnh viễn</span>
                            </label>
                          </div>
                        </td>
                        <td colSpan={2}>
                          <input
                            className="input compact"
                            style={{ maxWidth: "100%" }}
                            value={editNote}
                            onChange={(event) => setEditNote(event.target.value)}
                            placeholder="Nhập ghi chú mới..."
                          />
                        </td>
                        <td>
                          <div className="action-group">
                            <button className="small-action primary" type="button" onClick={() => saveEdit(item.key)} disabled={loading}>
                              Lưu
                            </button>
                            <button className="small-action" type="button" onClick={cancelEdit} disabled={loading}>
                              Hủy
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.key}>
                        <td className="mono" style={{ fontWeight: 600, color: "#818cf8" }}>{item.key}</td>
                        <td>
                          <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
                        </td>
                        <td>
                          <div className="duration-main">{durationLabel(item.duration_days)}</div>
                          <div className="date-meta">📅 Tạo: {formatDate(item.created_at)}</div>
                          {item.activated_at && <div className="date-meta">⚡ Kích hoạt: {formatDate(item.activated_at)}</div>}
                          {item.expires_at && <div className="date-meta">⏳ Hết hạn: {formatDate(item.expires_at)}</div>}
                        </td>
                        <td style={{ color: "#cbd5e1" }}>{item.note || "-"}</td>
                        <td className="mono" style={{ fontSize: "12px", color: "#94a3b8" }}>
                          {item.bound_machine ? `${item.bound_machine.slice(0, 14)}...` : "-"}
                        </td>
                        <td>
                          <div className="action-group">
                            <button className="small-action" type="button" onClick={() => startEdit(item)} disabled={loading}>
                              Sửa
                            </button>
                            <button className="small-action" type="button" onClick={() => setDisabled(item.key, !item.disabled)} disabled={loading}>
                              {item.disabled ? "Mở khóa" : "Khóa Key"}
                            </button>
                            <button className="small-action danger" type="button" onClick={() => removeKey(item.key)} disabled={loading}>
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
