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
          <h1 className="admin-title">Quản lý key</h1>
          <p className="admin-subtitle">Tạo, sửa hạn dùng, khóa và xoá key bản quyền cho khách.</p>
        </div>
        <a className="button secondary" href="/">
          Trang tải app
        </a>
      </header>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Tổng key</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.active}</span>
          <span className="stat-label">Đang dùng</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.unused}</span>
          <span className="stat-label">Chưa dùng</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.expired}</span>
          <span className="stat-label">Hết hạn</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.disabled}</span>
          <span className="stat-label">Đã khóa</span>
        </div>
      </div>

      <div className="admin-grid">
        <section className="admin-card">
          <h2 className="card-title">Tạo key mới</h2>
          <form onSubmit={createKey}>
            <div className="field">
              <label htmlFor="token">Admin token</label>
              <input
                id="token"
                className="input"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="LICENSE_ADMIN_TOKEN"
              />
            </div>

            <div className="field">
              <label htmlFor="days">Số ngày dùng</label>
              <input
                id="days"
                className="input"
                value={days}
                disabled={lifetime}
                onChange={(event) => setDays(event.target.value)}
              />
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={lifetime}
                onChange={(event) => setLifetime(event.target.checked)}
              />
              <span>Key vĩnh viễn (không hết hạn)</span>
            </label>

            <div className="field">
              <label htmlFor="note">Ghi chú khách hàng</label>
              <input id="note" className="input" value={note} onChange={(event) => setNote(event.target.value)} />
            </div>

            <div className="button-row">
              <button className="button" type="submit" disabled={loading || !token}>
                Tạo key
              </button>
              <button className="button secondary" type="button" onClick={loadKeys} disabled={loading || !token}>
                Tải danh sách
              </button>
            </div>
          </form>

          {message ? <div className="message">{message}</div> : null}
          {error ? <div className="message error">{error}</div> : null}
        </section>

        <section className="admin-card">
          <div className="table-toolbar">
            <h2 className="card-title">Danh sách key</h2>
            <input
              className="input search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo key, ghi chú, máy..."
            />
          </div>
          <div className="table-wrap">
            <table className="key-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Trạng thái</th>
                  <th>Thời hạn</th>
                  <th>Ghi chú</th>
                  <th>Máy</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {visibleKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      {keys.length === 0
                        ? "Chưa có dữ liệu. Nhập admin token rồi bấm Tải danh sách."
                        : "Không có key nào khớp tìm kiếm."}
                    </td>
                  </tr>
                ) : (
                  visibleKeys.map((item) =>
                    editingKey === item.key ? (
                      <tr key={item.key} className="editing-row">
                        <td className="mono">{item.key}</td>
                        <td>
                          <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
                        </td>
                        <td>
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
                        </td>
                        <td colSpan={2}>
                          <input
                            className="input compact"
                            value={editNote}
                            onChange={(event) => setEditNote(event.target.value)}
                            placeholder="Ghi chú"
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
                        <td className="mono">{item.key}</td>
                        <td>
                          <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
                        </td>
                        <td>
                          <div className="duration-main">{durationLabel(item.duration_days)}</div>
                          <div className="date-meta">Tạo: {formatDate(item.created_at)}</div>
                          <div className="date-meta">Kích hoạt: {formatDate(item.activated_at)}</div>
                          <div className="date-meta">Hết hạn: {formatDate(item.expires_at)}</div>
                        </td>
                        <td>{item.note || "-"}</td>
                        <td className="mono">{item.bound_machine ? `${item.bound_machine.slice(0, 12)}...` : "-"}</td>
                        <td>
                          <div className="action-group">
                            <button className="small-action" type="button" onClick={() => startEdit(item)} disabled={loading}>
                              Sửa
                            </button>
                            <button className="small-action" type="button" onClick={() => setDisabled(item.key, !item.disabled)} disabled={loading}>
                              {item.disabled ? "Mở khóa" : "Khóa"}
                            </button>
                            <button className="small-action danger" type="button" onClick={() => removeKey(item.key)} disabled={loading}>
                              Xoá
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
