import crypto from "crypto";

const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function inviteSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-invite-secret";
}

export function generateProjectInviteToken(projectId: string, now = Date.now()) {
  const exp = Math.floor(now / 1000) + INVITE_TTL_SECONDS;
  const payload = JSON.stringify({ projectId, exp });
  const payloadEncoded = base64UrlEncode(payload);
  const sig = crypto.createHmac("sha256", inviteSecret()).update(payloadEncoded).digest("base64url");
  return `${payloadEncoded}.${sig}`;
}

export function parseProjectInviteToken(token: string, now = Date.now()): { projectId: string } | null {
  const [payloadEncoded, sig] = token.split(".");
  if (!payloadEncoded || !sig) return null;
  const expectedSig = crypto
    .createHmac("sha256", inviteSecret())
    .update(payloadEncoded)
    .digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payloadRaw = base64UrlDecode(payloadEncoded);
    const payload = JSON.parse(payloadRaw) as { projectId?: string; exp?: number };
    if (!payload.projectId || !payload.exp) return null;
    if (payload.exp < Math.floor(now / 1000)) return null;
    return { projectId: payload.projectId };
  } catch {
    return null;
  }
}
