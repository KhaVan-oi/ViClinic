"use server";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuthenticated } from "@/server/authorization";
import { env } from "@/config/env";
import { DomainError } from "@/lib/errors";

const screens: Record<string, string> = {
  "/reception/appointments/new": "lookupPhone",
  "/reception/calendar": "query", "/doctor/calendar": "query", "/manager/calendar": "query",
  "/patient/appointments": "query", "/doctor/appointments": "query",
  "/reception/appointments": "query", "/reception/patients": "q",
  "/admin/accounts": "q", "/admin/roles": "q", "/reception/history": "actor",
};
const filterNames = new Set(["tab", "status", "date", "doctorId", "serviceId", "role", "view", "appointments", "from", "to", "fromDate", "toDate", "days", "period"]);
const key = createHash("sha256").update(env.OTP_HMAC_SECRET + ":private-search").digest();

async function searchContext(screen: string) {
  const ctx = await requireAuthenticated();
  const prefixes = { PATIENT: "/patient/", DOCTOR: "/doctor/", RECEPTIONIST: "/reception/", CLINIC_MANAGER: "/manager/", ADMIN: "/admin/" };
  if (!screens[screen] || !screen.startsWith(prefixes[ctx.activeContext])) throw new DomainError("FORBIDDEN", "Không có quyền tra cứu.", 403);
  return { name: "viclinic-search-" + ctx.userId + "-" + screen.replaceAll("/", "-"), ctx };
}

export async function readPrivateSearch(screen: string) {
  const { name, ctx } = await searchContext(screen);
  const value = (await cookies()).get(name)?.value;
  if (!value) return "";
  try {
    const [iv, tag, content] = value.split(".").map(part => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(ctx.sessionId));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(content), decipher.final()]).toString("utf8").slice(0, 120);
  } catch { return ""; }
}

export async function submitPrivateSearch(screen: string, form: FormData) {
  const { name, ctx } = await searchContext(screen);
  const clear = form.get("clear") === "1";
  const text = clear ? "" : String(form.get(screens[screen]) ?? "").trim().slice(0, 120);
  const store = await cookies();
  if (!text) store.delete(name);
  else {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(ctx.sessionId));
    const content = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    store.set(name, [iv, cipher.getAuthTag(), content].map(part => part.toString("base64url")).join("."), {
      httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production", path: "/", maxAge: 1800,
    });
  }
  const filters = new URLSearchParams();
  for (const [name, value] of form) if (!clear && filterNames.has(name) && typeof value === "string" && value.length <= 40 && value) filters.set(name, value);
  redirect(screen + (filters.size ? "?" + filters : ""));
}
