import { NextResponse } from "next/server";
import { requireUser, revokeToken } from "@/lib/auth";
import { handle } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const { token } = await requireUser(req);
  await revokeToken(token);
  return NextResponse.json({ ok: true });
});
