/**
 * Session handling: signed, httpOnly JWT cookie. Trust boundary - not a place
 * to cut corners, so the secret is required and every read verifies signature
 * and expiry before the payload is trusted.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

import { db } from "./db";
import type { Role } from "./enums";

const COOKIE = "malganga_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12h working day

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  investorId: string | null;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Returns the signed-in user, or null. Never throws on a bad/expired cookie. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as Role,
      investorId: (payload.investorId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/** Page/action guard. Redirects to login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Guard for anything that mutates or reads whole-business data. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "INVESTOR") redirect("/portfolio");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** Throwing variants for server actions, where redirecting mid-mutation hides the cause. */
export async function assertStaff(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role === "INVESTOR") throw new Error("Not authorised");
  return user;
}

export async function assertAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Administrator access required");
  return user;
}

export async function recordAudit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  meta?: unknown,
): Promise<void> {
  await db.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}
