import argparse
from contextlib import contextmanager
import datetime as dt
import json
import os
import secrets
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


DB_PATH = Path(os.environ.get("LICENSE_DB", "licenses.sqlite3"))
ADMIN_TOKEN = os.environ.get("LICENSE_ADMIN_TOKEN", "")


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


def iso_utc(value: dt.datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_utc(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=dt.UTC)
    return parsed.astimezone(dt.UTC)


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db():
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS license_keys (
                key TEXT PRIMARY KEY,
                duration_days INTEGER NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                activated_at TEXT,
                expires_at TEXT,
                bound_machine TEXT,
                disabled INTEGER NOT NULL DEFAULT 0
            )
            """
        )


def make_key() -> str:
    parts = [secrets.token_hex(2).upper() for _ in range(4)]
    return "ACD-" + "-".join(parts)


def create_key(duration_days: int, note: str = "") -> str:
    if duration_days < 0:
        raise ValueError("duration_days phải >= 0. Dùng 0 cho key vĩnh viễn.")
    init_db()
    key = make_key()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO license_keys (key, duration_days, note, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (key, duration_days, note, iso_utc(utc_now())),
        )
    return key


def row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "key": row["key"],
        "duration_days": row["duration_days"],
        "note": row["note"],
        "created_at": row["created_at"],
        "activated_at": row["activated_at"],
        "expires_at": row["expires_at"],
        "bound_machine": row["bound_machine"],
        "disabled": bool(row["disabled"]),
    }


def activate_key(key: str, machine_id: str) -> dict:
    normalized = key.strip().upper()
    if not normalized or not machine_id:
        return {"valid": False, "message": "Thiếu key hoặc machine_id."}

    init_db()
    with db() as conn:
        row = conn.execute("SELECT * FROM license_keys WHERE key = ?", (normalized,)).fetchone()
        if row is None or row["disabled"]:
            return {"valid": False, "message": "Key không tồn tại hoặc đã bị khóa."}
        if row["bound_machine"] and row["bound_machine"] != machine_id:
            return {"valid": False, "message": "Key này đã được kích hoạt trên máy khác."}

        now = utc_now()
        expires_at = parse_utc(row["expires_at"])
        if expires_at is not None and expires_at <= now:
            return {"valid": False, "message": "Key đã hết hạn."}

        if not row["activated_at"]:
            expires_at = None if row["duration_days"] == 0 else now + dt.timedelta(days=row["duration_days"])
            cursor = conn.execute(
                """
                UPDATE license_keys
                SET activated_at = ?, expires_at = ?, bound_machine = ?
                WHERE key = ?
                  AND (bound_machine IS NULL OR bound_machine = ?)
                """,
                (iso_utc(now), iso_utc(expires_at), machine_id, normalized, machine_id),
            )
            if cursor.rowcount == 0:
                return {"valid": False, "message": "Key này đã được kích hoạt trên máy khác."}

        updated = conn.execute("SELECT * FROM license_keys WHERE key = ?", (normalized,)).fetchone()
        expires_text = updated["expires_at"]
        if expires_text:
            return {"valid": True, "expires_at": expires_text, "message": f"Kích hoạt thành công. Hạn dùng đến {expires_text}."}
        return {"valid": True, "expires_at": None, "message": "Kích hoạt thành công. Key vĩnh viễn."}


def verify_key(key: str, machine_id: str) -> dict:
    normalized = key.strip().upper()
    init_db()
    with db() as conn:
        row = conn.execute("SELECT * FROM license_keys WHERE key = ?", (normalized,)).fetchone()
        if row is None or row["disabled"]:
            return {"valid": False, "message": "Key không tồn tại hoặc đã bị khóa."}
        if row["bound_machine"] != machine_id:
            return {"valid": False, "message": "Key không thuộc máy này."}
        expires_at = parse_utc(row["expires_at"])
        if expires_at is not None and expires_at <= utc_now():
            return {"valid": False, "message": "Key đã hết hạn."}
        return {"valid": True, "expires_at": row["expires_at"], "message": "Key hợp lệ."}


class LicenseHandler(BaseHTTPRequestHandler):
    server_version = "AutoClickLicense/1.0"

    def do_GET(self) -> None:
        if self.path == "/health":
            self.send_json(200, {"ok": True})
            return
        self.send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        try:
            payload = self.read_json()
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
            return

        if self.path in {"/api/activate", "/api/license/activate"}:
            self.send_json(200, activate_key(str(payload.get("key", "")), str(payload.get("machine_id", ""))))
            return
        if self.path in {"/api/verify", "/api/license/verify"}:
            self.send_json(200, verify_key(str(payload.get("key", "")), str(payload.get("machine_id", ""))))
            return
        if self.path == "/api/admin/keys":
            if not self.is_admin():
                self.send_json(403, {"error": "admin_token_required"})
                return
            try:
                key = create_key(int(payload.get("duration_days", 30)), str(payload.get("note", "")))
            except (TypeError, ValueError) as exc:
                self.send_json(400, {"error": str(exc)})
                return
            self.send_json(201, {"key": key})
            return

        self.send_json(404, {"error": "not_found"})

    def is_admin(self) -> bool:
        token = self.headers.get("X-Admin-Token", "")
        return bool(ADMIN_TOKEN) and secrets.compare_digest(token, ADMIN_TOKEN)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError as exc:
            raise ValueError("invalid_json") from exc
        if not isinstance(payload, dict):
            raise ValueError("json_body_must_be_object")
        return payload

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        print(f"{self.address_string()} - {format % args}")


def run_server(host: str, port: int) -> None:
    init_db()
    httpd = ThreadingHTTPServer((host, port), LicenseHandler)
    print(f"License server đang chạy tại http://{host}:{port}")
    print(f"Database: {DB_PATH.resolve()}")
    if not ADMIN_TOKEN:
        print("Chưa đặt LICENSE_ADMIN_TOKEN, API tạo key từ xa sẽ bị tắt.")
    httpd.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Server cấp key cho Auto Click Drag")
    sub = parser.add_subparsers(dest="command", required=True)

    serve = sub.add_parser("serve", help="Chạy HTTP license server")
    serve.add_argument("--host", default="0.0.0.0")
    serve.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8008")))

    create = sub.add_parser("create-key", help="Tạo key bán cho người dùng")
    create.add_argument("--days", type=int, default=30, help="Số ngày dùng sau khi kích hoạt. 0 = vĩnh viễn.")
    create.add_argument("--note", default="", help="Ghi chú khách hàng/đơn hàng")

    args = parser.parse_args()
    if args.command == "serve":
        run_server(args.host, args.port)
    elif args.command == "create-key":
        print(create_key(args.days, args.note))


if __name__ == "__main__":
    main()
