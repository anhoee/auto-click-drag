import { NextRequest, NextResponse } from "next/server";
import {
  createLicenseKey,
  deleteLicenseKey,
  isAdminToken,
  listLicenseKeys,
  setLicenseDisabled,
  updateLicenseKey
} from "@/lib/license";

export async function GET(request: NextRequest) {
  if (!isAdminToken(request.headers.get("x-admin-token"))) {
    return NextResponse.json({ error: "admin_token_required" }, { status: 403 });
  }

  try {
    const keys = await listLicenseKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminToken(request.headers.get("x-admin-token"))) {
    return NextResponse.json({ error: "admin_token_required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const durationDays = Number(body.duration_days ?? 30);
    const note = String(body.note || "");
    const key = await createLicenseKey(durationDays, note);
    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminToken(request.headers.get("x-admin-token"))) {
    return NextResponse.json({ error: "admin_token_required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const key = await setLicenseDisabled(String(body.key || ""), Boolean(body.disabled));
    return NextResponse.json({ key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdminToken(request.headers.get("x-admin-token"))) {
    return NextResponse.json({ error: "admin_token_required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const note = body.note === undefined ? null : String(body.note);
    const key = await updateLicenseKey(String(body.key || ""), Number(body.duration_days), note);
    return NextResponse.json({ key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminToken(request.headers.get("x-admin-token"))) {
    return NextResponse.json({ error: "admin_token_required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = await deleteLicenseKey(String(body.key || ""));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
