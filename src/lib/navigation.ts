import { RoleName, HOME_PATH_BY_CONTEXT, getHomePathForContext } from "@/config/business";

const DISALLOWED_NEXT_PREFIXES = [
  "/login",
  "/register",
  "/activate",
  "/recover",
  "/reactivate",
  "/choose-role",
  "/api",
];

export function sanitizeNextRedirect(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }
  try {
    const parsed = new URL(trimmed, "http://viclinic.local");
    if (parsed.origin !== "http://viclinic.local") {
      return null;
    }
    const pathname = parsed.pathname;
    if (
      DISALLOWED_NEXT_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )
    ) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function isNextPathCompatibleWithContext(
  nextPath: string | null,
  activeContext: RoleName
): boolean {
  const safe = sanitizeNextRedirect(nextPath);
  if (!safe) return false;

  const expectedPrefix = HOME_PATH_BY_CONTEXT[activeContext];
  return safe === expectedPrefix || safe.startsWith(`${expectedPrefix}/`) || safe.startsWith(`${expectedPrefix}?`);
}

export function resolvePostAuthDestination(
  activeContext: RoleName,
  nextPath?: string | null
): string {
  const safe = sanitizeNextRedirect(nextPath);
  if (safe && isNextPathCompatibleWithContext(safe, activeContext)) {
    return safe;
  }
  return getHomePathForContext(activeContext);
}

export function getPatientEntryPath(nextPath: string, activeContext?: RoleName): string {
  const next = sanitizeNextRedirect(nextPath) ?? "/patient";
  if (activeContext === "PATIENT") return next;
  return `${activeContext ? "/choose-role" : "/login"}?${new URLSearchParams({ next })}`;
}

export function buildFilterHref(path: string, filters: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== "" && value !== "ALL") search.set(key, String(value));
  }
  return `${path}?${search}`;
}
