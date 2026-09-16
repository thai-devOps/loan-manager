import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT, jwtVerify } from "jose";
import {
  getEffectivePermissions,
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
} from "./access/permissions-resolve.js";
import type { AppUser } from "./access/types.js";
import { usersCol } from "./mongo.js";

export { getAdminCredentials } from "./auth-credentials.js";

const SESSION_TTL = "8h";

export interface AuthSession {
  userId: string;
  username: string;
}

export interface AuthContext extends AuthSession {
  user: AppUser;
  roleCodes: string[];
  permissions: string[];
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(input: {
  userId: string;
  username: string;
}): Promise<string> {
  return new SignJWT({ username: input.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getJwtSecret());
}

export async function verifyToken(
  token: string,
): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const userId =
      typeof payload.sub === "string" && payload.sub.length > 0
        ? payload.sub
        : null;
    const username =
      typeof payload.username === "string"
        ? payload.username
        : null;
    // Reject legacy tokens that only had username as sub (no userId)
    if (!userId || !username || userId === username) {
      // Allow if sub looks like uuid (contains hyphens) even when equal check...
      // Legacy signToken set sub=username. New tokens set sub=userId (uuid).
      if (!userId || !username) return null;
      const looksLikeUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          userId,
        );
      if (!looksLikeUuid) return null;
    }
    return { userId, username };
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthContext | null> {
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

  const col = await usersCol();
  const user = await col.findOne({ id: session.userId });
  if (!user || user.status !== "ACTIVE") {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const { roleCodes, permissions } = await getEffectivePermissions(user);
  return {
    userId: user.id,
    username: user.username,
    user,
    roleCodes,
    permissions,
  };
}

export async function requirePermission(
  req: VercelRequest,
  res: VercelResponse,
  permission: string | string[],
): Promise<AuthContext | null> {
  const ctx = await requireAuth(req, res);
  if (!ctx) return null;
  if (!checkPermission(ctx.permissions, ctx.roleCodes, permission)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return ctx;
}

export async function requireAnyPermission(
  req: VercelRequest,
  res: VercelResponse,
  permissions: string[],
): Promise<AuthContext | null> {
  const ctx = await requireAuth(req, res);
  if (!ctx) return null;
  if (!checkAnyPermission(ctx.permissions, ctx.roleCodes, permissions)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return ctx;
}
