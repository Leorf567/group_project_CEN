import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";

// handy for the frontend to check if a saved token still works
export const GET = handle(async (req: Request) => {
  const { user } = await requireUser(req);
  return NextResponse.json({ user });
});
