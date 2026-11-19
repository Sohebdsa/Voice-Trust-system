import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./data/store";
import type { Profile, Role } from "./data/types";

const COOKIE_NAME = "vt_session";
const SESSION_SECONDS = 60 * 60 * 8;

// TD-01: Fail fast in production if the secret is not set.
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required in production.");
}
const SECRET = process.env.SESSION_SECRET ?? "voice-trust-prototype-dev-secret";

const sign = (value: string) => createHmac("sha256", SECRET).update(value).digest("base64url");

function createToken(userId: string) {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: expiresAt })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      sub?: string;
      exp?: number;
    };
    if (!parsed.sub || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Profile | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = readToken(token);
  if (!userId) return null;
  const profile = db.profiles.find((p) => p.id === userId && p.isActive);
  return profile ?? null;
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireSession(): Promise<Profile> {
  const profile = await getSession();
  if (!profile) redirect("/sign-in");
  return profile;
}

/** Server-side guard: a role that is not permitted never receives the page. */
export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await requireSession();
  if (!roles.includes(profile.role)) redirect(landingFor(profile.role));
  return profile;
}

/** PRD §8.5 role landing pages. */
export function landingFor(role: Role): string {
  switch (role) {
    case "field_staff":
    case "data_entry":
      return "/home";
    case "finance":
      return "/dashboard/finance";
    case "mel_officer":
      return "/dashboard?tab=mel";
    default:
      return "/dashboard";
  }
}
