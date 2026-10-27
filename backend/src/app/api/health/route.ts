import { NextResponse } from "next/server";
import { pool } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("health check failed", err);
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
