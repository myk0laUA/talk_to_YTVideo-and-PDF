import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { VisitorConfig } from "./config.ts";

export const VISITOR_TTL_SECONDS = 3600;
export type Visitor = { owner: string; expiresAt: number; token: string };
export const cookieName = (config: VisitorConfig) => config.secure ? "__Host-td-visitor" : "td-visitor";
const sign = (payload: string, secret: string) => createHmac("sha256", Buffer.from(secret, "hex"))
  .update(`visitor-v1:${payload}`).digest("base64url");

export function createVisitor(config: VisitorConfig, now: number): Visitor {
  const expiresAt = Math.floor(now / 1000) + VISITOR_TTL_SECONDS;
  const payload = `${randomBytes(32).toString("base64url")}.${expiresAt}`;
  const token = `${payload}.${sign(payload, config.cookieSecret)}`;
  return { token, expiresAt, owner: ownerMarker(token) };
}

function ownerMarker(token: string): string {
  return createHash("sha256").update(`source-owner-v1:${token}`).digest("hex");
}

export function readVisitor(header: string | null, config: VisitorConfig, now: number): Visitor | null {
  if (!header || header.length > 8192) return null;
  const matches = header.split(";").map(part => part.trim()).filter(part => part.split("=", 1)[0] === cookieName(config));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(cookieName(config).length + 1);
  const match = /^([A-Za-z0-9_-]{43})\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  const expiresAt = Number(match[2]);
  const seconds = Math.floor(now / 1000);
  if (expiresAt <= seconds || expiresAt > seconds + VISITOR_TTL_SECONDS) return null;
  const expected = sign(`${match[1]}.${match[2]}`, config.cookieSecret);
  if (!timingSafeEqual(Buffer.from(match[3]), Buffer.from(expected))) return null;
  return { token, expiresAt, owner: ownerMarker(token) };
}

export function visitorCookie(visitor: Visitor, config: VisitorConfig, now: number): string {
  return `${cookieName(config)}=${visitor.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0, visitor.expiresAt - Math.floor(now / 1000))}; Expires=${new Date(visitor.expiresAt * 1000).toUTCString()}${config.secure ? "; Secure" : ""}`;
}
