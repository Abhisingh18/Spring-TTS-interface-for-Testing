import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "ses_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

/**
 * Administrator sign-in: one credential pair held in the environment.
 *
 * This is deliberately small. It is not a user directory — real accounts,
 * roles and permissions arrive with the database (see prisma/schema.prisma).
 * What it does provide is a genuine gate: nothing on the management side is
 * reachable without it, and every write re-checks server-side.
 */

const DEFAULT_EMAIL = "admin@spring.com";
const DEFAULT_PASSWORD = "spring-admin";

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL?.trim() || DEFAULT_EMAIL).toLowerCase();
}

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || DEFAULT_PASSWORD;
}

/** True while the shipped default password is still in use. */
export function usingDefaultPassword(): boolean {
  return !process.env.ADMIN_PASSWORD?.trim();
}

function secret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "ses-development-secret"
  );
}

function token(): string {
  // Tied to the credential pair, so changing either invalidates old sessions.
  return createHmac("sha256", secret())
    .update(`admin:${adminEmail()}:${adminPassword()}`)
    .digest("base64url");
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  return Boolean(value) && sameString(value as string, token());
}

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signInAdmin(email: string, password: string): Promise<SignInResult> {
  const emailMatches = sameString(email.trim().toLowerCase(), adminEmail());
  const passwordMatches = sameString(password, adminPassword());

  // Check both before answering so a wrong email and a wrong password take the
  // same path and the response cannot be used to enumerate the address.
  if (!emailMatches || !passwordMatches) {
    return { ok: false, error: "That email and password do not match." };
  }

  const jar = await cookies();
  jar.set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return { ok: true };
}

export async function signOutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Throws unless the caller holds an admin session. Use at the top of writes. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new AdminAuthError();
  }
}

export class AdminAuthError extends Error {
  constructor() {
    super("Administrator sign-in required.");
    this.name = "AdminAuthError";
  }
}
