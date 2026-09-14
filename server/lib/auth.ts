import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT, jwtVerify } from "jose";

const SESSION_TTL = "8h";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export function getAdminCredentials(): {
  username: string;
  password: string;
} | null {
  const username = (process.env.ADMIN_USERNAME ?? "").trim();
  const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!username || !password) return null;
  return { username, password };
}

export async function signToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getJwtSecret());
}

export async function verifyToken(
  token: string,
): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const username =
      typeof payload.username === "string"
        ? payload.username
        : typeof payload.sub === "string"
          ? payload.sub
          : null;
    if (!username) return null;
    return { username };
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ username: string } | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  const session = await verifyToken(token);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
}
