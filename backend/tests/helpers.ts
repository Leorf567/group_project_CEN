import { NextRequest } from "next/server";

export function jsonRequest(path: string, body?: unknown, token?: string, method = "POST") {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest(`http://localhost:4000${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function authedGet(path: string, token?: string) {
  return jsonRequest(path, undefined, token, "GET");
}
