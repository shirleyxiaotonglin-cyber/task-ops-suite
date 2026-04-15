import type { NextRequest } from "next/server";
import { workgraphCookieName, workgraphCookieOptions } from "@/lib/workgraph-session";
import { workgraphJson, workgraphPreflightHeaders } from "@/lib/workgraph-cors";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: workgraphPreflightHeaders(request) });
}

export async function POST(request: NextRequest) {
  const res = workgraphJson(request, { ok: true });
  res.cookies.set(workgraphCookieName(), "", { ...workgraphCookieOptions(), maxAge: 0 });
  return res;
}
