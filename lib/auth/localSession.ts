// ── KPA-OS — Local PIN session signing ──────────────────────────────────────
// The local_pin_session cookie used to store "staffId:role" in plain text,
// which meant anyone with access to the shared office computer could open
// devtools, edit the cookie to "anything:director", and get full director
// access without knowing any PIN. This signs the cookie with an HMAC so
// tampering is detected and rejected.
//
// Uses Web Crypto (crypto.subtle) instead of Node's `crypto` module so the
// same code works in both the server action (Node runtime) and Next.js
// middleware (Edge runtime).

function getSecret(): string {
  const secret = process.env.LOCAL_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "LOCAL_SESSION_SECRET is not set. Generate one with `openssl rand -hex 32` and add it to your .env."
    );
  }
  return secret;
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Buffer.from(sigBuffer).toString("hex");
}

// staffId/role must never contain ":" — both are UUIDs / a fixed enum, so this holds.
export async function signLocalSession(staffId: string, role: string): Promise<string> {
  const payload = `${staffId}:${role}`;
  const signature = await hmac(payload);
  return `${payload}:${signature}`;
}

export async function verifyLocalSession(
  cookieValue: string
): Promise<{ staffId: string; role: string } | null> {
  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;
  const [staffId, role, signature] = parts;

  const expected = await hmac(`${staffId}:${role}`);
  if (expected.length !== signature.length) return null;

  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff !== 0) return null;

  return { staffId, role };
}
