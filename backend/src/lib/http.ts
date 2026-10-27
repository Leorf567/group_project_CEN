import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// every route goes through this so errors always come back as { error: "..." }
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err.status, err.message);
      if (err instanceof ZodError) return errorResponse(400, err.issues[0]?.message ?? "Invalid request");
      if (err instanceof SyntaxError) return errorResponse(400, "Request body must be valid JSON");
      console.error(err);
      return errorResponse(500, "Something went wrong");
    }
  };
}

export async function readJson(req: Request) {
  return req.json();
}
