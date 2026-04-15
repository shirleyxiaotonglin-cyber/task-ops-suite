import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "workgraph_session";

function secretBytes(): Uint8Array | null {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export function workgraphCookieName() {
  return COOKIE_NAME;
}

export function workgraphCookieOptions() {
  const prod = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure: prod,
    sameSite: (prod ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  };
}

export async function signWorkgraphToken(username: string): Promise<string | null> {
  const secret = secretBytes();
  if (!secret) return null;
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyWorkgraphToken(token: string): Promise<string | null> {
  const secret = secretBytes();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
