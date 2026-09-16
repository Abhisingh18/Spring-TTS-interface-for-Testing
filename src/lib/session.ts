import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "listener";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export interface Listener {
  id: string;
  name: string;
}

/**
 * Sign-in is just a name, so the cookie is signed rather than encrypted: it
 * stops someone from editing their own id or name by hand, which is all the
 * protection a listening study needs. Set SESSION_SECRET in production.
 */
function secret(): string {
  return process.env.SESSION_SECRET?.trim() || "vc-listening-studio-development-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function serialise(listener: Listener): string {
  const payload = Buffer.from(JSON.stringify(listener), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function deserialise(value: string | undefined): Listener | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(payload);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Listener;
    if (typeof parsed?.id !== "string" || typeof parsed?.name !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function currentListener(): Promise<Listener | null> {
  const jar = await cookies();
  return deserialise(jar.get(COOKIE)?.value);
}

export async function signIn(name: string): Promise<Listener> {
  const listener: Listener = { id: `p_${randomUUID()}`, name: cleanName(name) };
  const jar = await cookies();
  jar.set(COOKIE, serialise(listener), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return listener;
}

/** Keeps the same id — used when someone corrects the spelling of their name. */
export async function rename(listener: Listener, name: string): Promise<Listener> {
  const updated: Listener = { id: listener.id, name: cleanName(name) };
  const jar = await cookies();
  jar.set(COOKIE, serialise(updated), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return updated;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export const NAME_MAX_LENGTH = 40;

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX_LENGTH);
}

export function isValidName(name: string): boolean {
  const cleaned = cleanName(name);
  return cleaned.length >= 2 && cleaned.length <= NAME_MAX_LENGTH;
}

/**
 * Admin access. With ADMIN_PASSCODE unset the dashboard is open, which is what
 * you want while everyone is in the same room; set it before sharing the link.
 */
const ADMIN_COOKIE = "listener_admin";

export function adminPasscode(): string | null {
  return process.env.ADMIN_PASSCODE?.trim() || null;
}

export async function isAdmin(): Promise<boolean> {
  const passcode = adminPasscode();
  if (!passcode) return true;
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const expected = sign(`admin:${passcode}`);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function grantAdmin(candidate: string): Promise<boolean> {
  const passcode = adminPasscode();
  if (!passcode) return true;
  if (candidate !== passcode) return false;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sign(`admin:${passcode}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return true;
}
