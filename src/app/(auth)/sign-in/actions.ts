"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/data/store";
import { hashPassword } from "@/lib/data/seed";
import { createSession, landingFor } from "@/lib/session";

export type SignInState = { error?: string; email?: string };

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) return { error: "Enter your work email, for example asha.deshmukh@voicetrust.org." };
  if (!EMAIL_RE.test(email)) {
    return { error: "That email is missing an @ or a domain. Use the full address, e.g. name@voicetrust.org.", email };
  }
  if (!password) return { error: "Enter your password.", email };

  const record = attempts.get(email);
  if (record && record.lockedUntil > Date.now()) {
    const seconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { error: `Too many failed attempts. Try again in ${seconds} seconds.`, email };
  }

  const profile = db.profiles.find((p) => p.email === email);
  const valid = profile && profile.passwordHash === hashPassword(password);

  if (!profile || !valid) {
    const next = { count: (record?.count ?? 0) + 1, lockedUntil: 0 };
    if (next.count >= MAX_ATTEMPTS) {
      next.lockedUntil = Date.now() + LOCK_MS;
      attempts.set(email, next);
      return { error: "Account locked for 1 minute after 5 failed attempts.", email };
    }
    attempts.set(email, next);
    return { error: "Email or password is incorrect. Check both and try again.", email };
  }

  if (!profile.isActive) {
    return { error: "This account has been deactivated. Contact the Executive Director to restore access.", email };
  }

  attempts.delete(email);
  db.audit.push({
    id: `aud-login-${Date.now()}`,
    actorId: profile.id,
    actorName: profile.fullName,
    action: "login",
    tableName: "profiles",
    recordId: profile.id,
    at: new Date().toISOString(),
  });

  await createSession(profile.id);
  redirect(landingFor(profile.role));
}
