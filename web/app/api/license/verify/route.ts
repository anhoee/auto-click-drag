import { NextRequest, NextResponse } from "next/server";
import { verifyLicense } from "@/lib/license";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await verifyLicense(String(body.key || ""), String(body.machine_id || ""));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ valid: false, message }, { status: 500 });
  }
}
