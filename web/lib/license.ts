import { neon } from "@neondatabase/serverless";
import { randomBytes, timingSafeEqual } from "node:crypto";

type LicenseRow = {
  key: string;
  duration_days: number;
  note: string;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  bound_machine: string | null;
  disabled: boolean;
};

export type AdminLicenseKey = LicenseRow & {
  status: "unused" | "active" | "expired" | "disabled";
};

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return neon(url);
}

export function isAdminToken(token: string | null) {
  const expected = process.env.LICENSE_ADMIN_TOKEN || "";
  if (!expected || !token) {
    return false;
  }
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function makeKey() {
  const parts = Array.from({ length: 4 }, () => randomBytes(2).toString("hex").toUpperCase());
  return `ACD-${parts.join("-")}`;
}

export async function ensureSchema() {
  await sql()`
    CREATE TABLE IF NOT EXISTS license_keys (
      key TEXT PRIMARY KEY,
      duration_days INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      activated_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      bound_machine TEXT,
      disabled BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
}

export async function createLicenseKey(durationDays: number, note: string) {
  if (!Number.isInteger(durationDays) || durationDays < 0) {
    throw new Error("duration_days must be an integer >= 0. Use 0 for lifetime keys.");
  }
  await ensureSchema();
  const key = makeKey();
  await sql()`
    INSERT INTO license_keys (key, duration_days, note)
    VALUES (${key}, ${durationDays}, ${note || ""})
  `;
  return key;
}

function statusFor(row: LicenseRow): AdminLicenseKey["status"] {
  if (row.disabled) {
    return "disabled";
  }
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return "expired";
  }
  if (row.activated_at) {
    return "active";
  }
  return "unused";
}

export async function listLicenseKeys() {
  await ensureSchema();
  const rows = (await sql()`
    SELECT
      key,
      duration_days,
      note,
      created_at::TEXT,
      activated_at::TEXT,
      expires_at::TEXT,
      bound_machine,
      disabled
    FROM license_keys
    ORDER BY created_at DESC
    LIMIT 500
  `) as LicenseRow[];

  return rows.map((row) => ({ ...row, status: statusFor(row) }));
}

export async function setLicenseDisabled(key: string, disabled: boolean) {
  const normalized = key.trim().toUpperCase();
  if (!normalized) {
    throw new Error("key is required.");
  }
  await ensureSchema();
  const updated = (await sql()`
    UPDATE license_keys
    SET disabled = ${disabled}
    WHERE key = ${normalized}
    RETURNING
      key,
      duration_days,
      note,
      created_at::TEXT,
      activated_at::TEXT,
      expires_at::TEXT,
      bound_machine,
      disabled
  `) as LicenseRow[];
  const row = updated[0];
  if (!row) {
    throw new Error("Key not found.");
  }
  return { ...row, status: statusFor(row) };
}

export async function updateLicenseKey(
  key: string,
  durationDays: number,
  note: string | null
) {
  const normalized = key.trim().toUpperCase();
  if (!normalized) {
    throw new Error("key is required.");
  }
  if (!Number.isInteger(durationDays) || durationDays < 0) {
    throw new Error("duration_days must be an integer >= 0. Use 0 for lifetime keys.");
  }
  await ensureSchema();

  // If the key was already activated, recompute expiry from its activation time
  // so changing the duration takes effect immediately. 0 days = lifetime (no expiry).
  const updated = (await sql()`
    UPDATE license_keys
    SET duration_days = ${durationDays},
        note = COALESCE(${note}, note),
        expires_at = CASE
          WHEN activated_at IS NULL THEN expires_at
          WHEN ${durationDays} = 0 THEN NULL
          ELSE activated_at + (${durationDays} || ' days')::INTERVAL
        END
    WHERE key = ${normalized}
    RETURNING
      key,
      duration_days,
      note,
      created_at::TEXT,
      activated_at::TEXT,
      expires_at::TEXT,
      bound_machine,
      disabled
  `) as LicenseRow[];
  const row = updated[0];
  if (!row) {
    throw new Error("Key not found.");
  }
  return { ...row, status: statusFor(row) };
}

export async function deleteLicenseKey(key: string) {
  const normalized = key.trim().toUpperCase();
  if (!normalized) {
    throw new Error("key is required.");
  }
  await ensureSchema();
  const deleted = (await sql()`
    DELETE FROM license_keys
    WHERE key = ${normalized}
    RETURNING key
  `) as { key: string }[];
  if (deleted.length === 0) {
    throw new Error("Key not found.");
  }
  return { key: normalized };
}

export async function activateLicense(key: string, machineId: string) {
  const normalized = key.trim().toUpperCase();
  if (!normalized || !machineId) {
    return { valid: false, message: "Thiếu key hoặc machine_id." };
  }

  await ensureSchema();
  const rows = (await sql()`
    SELECT
      key,
      duration_days,
      note,
      created_at::TEXT,
      activated_at::TEXT,
      expires_at::TEXT,
      bound_machine,
      disabled
    FROM license_keys
    WHERE key = ${normalized}
    LIMIT 1
  `) as LicenseRow[];

  const row = rows[0];
  if (!row || row.disabled) {
    return { valid: false, message: "Key không tồn tại hoặc đã bị khóa." };
  }
  if (row.bound_machine && row.bound_machine !== machineId) {
    return { valid: false, message: "Key này đã được kích hoạt trên máy khác." };
  }
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return { valid: false, message: "Key đã hết hạn." };
  }

  if (!row.activated_at) {
    if (row.duration_days === 0) {
      const updated = await sql()`
        UPDATE license_keys
        SET activated_at = NOW(), expires_at = NULL, bound_machine = ${machineId}
        WHERE key = ${normalized}
          AND (bound_machine IS NULL OR bound_machine = ${machineId})
        RETURNING expires_at::TEXT
      `;
      if (updated.length === 0) {
        return { valid: false, message: "Key này đã được kích hoạt trên máy khác." };
      }
    } else {
      const updated = await sql()`
        UPDATE license_keys
        SET activated_at = NOW(),
            expires_at = NOW() + (${row.duration_days} || ' days')::INTERVAL,
            bound_machine = ${machineId}
        WHERE key = ${normalized}
          AND (bound_machine IS NULL OR bound_machine = ${machineId})
        RETURNING expires_at::TEXT
      `;
      if (updated.length === 0) {
        return { valid: false, message: "Key này đã được kích hoạt trên máy khác." };
      }
    }
  }

  const updatedRows = (await sql()`
    SELECT expires_at::TEXT
    FROM license_keys
    WHERE key = ${normalized}
    LIMIT 1
  `) as { expires_at: string | null }[];

  const expiresAt = updatedRows[0]?.expires_at ?? null;
  if (expiresAt) {
    return { valid: true, expires_at: expiresAt, message: `Kích hoạt thành công. Hạn dùng đến ${expiresAt}.` };
  }
  return { valid: true, expires_at: null, message: "Kích hoạt thành công. Key vĩnh viễn." };
}

export async function verifyLicense(key: string, machineId: string) {
  const normalized = key.trim().toUpperCase();
  await ensureSchema();
  const rows = (await sql()`
    SELECT expires_at::TEXT, bound_machine, disabled
    FROM license_keys
    WHERE key = ${normalized}
    LIMIT 1
  `) as { expires_at: string | null; bound_machine: string | null; disabled: boolean }[];

  const row = rows[0];
  if (!row || row.disabled) {
    return { valid: false, message: "Key không tồn tại hoặc đã bị khóa." };
  }
  if (row.bound_machine !== machineId) {
    return { valid: false, message: "Key không thuộc máy này." };
  }
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return { valid: false, message: "Key đã hết hạn." };
  }
  return { valid: true, expires_at: row.expires_at, message: "Key hợp lệ." };
}
