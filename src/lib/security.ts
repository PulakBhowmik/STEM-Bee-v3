import bcrypt from "bcryptjs";
import crypto from "crypto";

import { getSessionSecret } from "@/lib/env";

const ADMIN_COOKIE = "bee_admin_session";
const TEAM_COOKIE = "bee_team_session";
const COOKIE_MAX_AGE = 60 * 60 * 8;

export { ADMIN_COOKIE, TEAM_COOKIE, COOKIE_MAX_AGE };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function randomPassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function randomToken() {
  return crypto.randomUUID();
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAdminToken(adminId: string) {
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const payload = `${adminId}.${issuedAt}`;
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

export function verifyAdminToken(token?: string) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [adminId, issuedAt, signature] = parts;
  const payload = `${adminId}.${issuedAt}`;
  const expected = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");

  if (signature.length !== expected.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  const age = Math.floor(Date.now() / 1000) - Number(issuedAt);
  if (!Number.isFinite(age) || age < 0 || age > COOKIE_MAX_AGE) {
    return null;
  }

  return { adminId };
}
