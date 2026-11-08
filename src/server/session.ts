import "server-only";

import crypto from "crypto";
import { addHours } from "date-fns";
import { cookies } from "next/headers";
import {
  AccountStatus,
  ALL_ROLES,
  RoleName,
  STAFF_ROLES,
} from "@/config/business";
import { env } from "@/config/env";
import { SESSION_TTL_HOURS } from "@/config/security";
import { DomainError } from "@/lib/errors";
import { db } from "@/server/db";

export interface AuthenticatedContext {
  sessionId: string;
  accountId: number;
  userId: number;
  fullName: string;
  phone: string;
  email: string | null;
  birthDate: Date | null;
  accountStatus: AccountStatus;
  roles: RoleName[];
  staffRole: RoleName | null;
  hasPatientRole: boolean;
  activeContext: RoleName;
}

const CONTEXT_COOKIE_NAME = `${env.SESSION_COOKIE_NAME}_ctx`;
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
};

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function resolveDefaultActiveContext(roles: RoleName[]): RoleName {
  const staff = roles.find((r) =>
    (STAFF_ROLES as readonly string[]).includes(r)
  );
  if (staff) {
    return staff;
  }
  if (roles.includes("PATIENT")) {
    return "PATIENT";
  }
  throw new DomainError("FORBIDDEN", "Tài khoản chưa được phân quyền hợp lệ.", 403);
}

export async function createAuthSession(input: {
  accountId: number;
  roles?: RoleName[];
  activeContext?: RoleName;
  preferredContext?: RoleName;
  ipAddress?: string | null;
  userAgent?: string | null;
  setCookie?: boolean;
}): Promise<{
  token: string;
  rawToken: string;
  sessionId: string;
  activeContext: RoleName;
  expiresAt: Date;
}> {
  const now = new Date();
  const roles =
    input.roles ??
    (
      await db.account.findUniqueOrThrow({
        where: { accountId: input.accountId },
        include: { user: { include: { roles: true } } },
      })
    ).user.roles.map((r) => r.role as RoleName);

  const requestedCtx = input.activeContext ?? input.preferredContext;
  const activeContext =
    requestedCtx && roles.includes(requestedCtx)
      ? requestedCtx
      : resolveDefaultActiveContext(roles);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = addHours(now, SESSION_TTL_HOURS);

  const session = await db.authSession.create({
    data: {
      accountId: input.accountId,
      tokenHash,
      createdAt: now,
      expiresAt,
    },
  });

  if (input.setCookie !== false) {
    const cookieStore = await cookies();
    cookieStore.set(env.SESSION_COOKIE_NAME, rawToken, { ...cookieOptions, expires: expiresAt });
    cookieStore.set(CONTEXT_COOKIE_NAME, activeContext, { ...cookieOptions, expires: expiresAt });
  }

  return {
    token: rawToken,
    rawToken,
    sessionId: String(session.sessionId),
    activeContext,
    expiresAt,
  };
}

export async function readCurrentSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(env.SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

async function readRequestedActiveContext(): Promise<RoleName | null> {
  try {
    const cookieStore = await cookies();
    const rawCtx = cookieStore.get(CONTEXT_COOKIE_NAME)?.value;
    if (rawCtx && (ALL_ROLES as readonly string[]).includes(rawCtx)) {
      return rawCtx as RoleName;
    }
  } catch {
  }
  return null;
}

export async function getCurrentSession(
  explicitToken?: string | null
): Promise<AuthenticatedContext | null> {
  const rawToken =
    explicitToken !== undefined ? explicitToken : await readCurrentSessionToken();
  if (!rawToken) {
    return null;
  }

  const now = new Date();
  const tokenHash = hashSessionToken(rawToken);

  const session = await db.authSession.findUnique({
    where: { tokenHash },
    include: {
      account: {
        include: {
          user: {
            include: {
              roles: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt || session.expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  if (session.account.status !== "ACTIVE") {
    return null;
  }

  const roles = session.account.user.roles.map((r) => r.role as RoleName);
  if (roles.length === 0) {
    return null;
  }

  const requestedContext = await readRequestedActiveContext();
  const activeContext =
    requestedContext && roles.includes(requestedContext)
      ? requestedContext
      : resolveDefaultActiveContext(roles);

  const staffRole =
    roles.find((r) => (STAFF_ROLES as readonly string[]).includes(r)) ?? null;
  const hasPatientRole = roles.includes("PATIENT");

  return {
    sessionId: String(session.sessionId),
    accountId: session.accountId,
    userId: session.account.userId,
    fullName: session.account.user.fullName,
    phone: session.account.user.phone,
    email: session.account.user.email,
    birthDate: session.account.user.birthDate,
    accountStatus: session.account.status as AccountStatus,
    roles,
    staffRole,
    hasPatientRole,
    activeContext,
  };
}

export async function switchSessionContext(
  targetContext: RoleName,
  explicitToken?: string | null
): Promise<AuthenticatedContext> {
  const rawToken =
    explicitToken !== undefined ? explicitToken : await readCurrentSessionToken();
  const ctx = await getCurrentSession(rawToken);
  if (!ctx || !rawToken) {
    throw new DomainError("UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.", 401);
  }
  if (!ctx.roles.includes(targetContext)) {
    throw new DomainError(
      "FORBIDDEN",
      "Tài khoản của bạn không có quyền sử dụng mục này.",
      403
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(CONTEXT_COOKIE_NAME, targetContext, cookieOptions);

  return {
    ...ctx,
    activeContext: targetContext,
  };
}

export async function revokeCurrentSession(explicitToken?: string | null): Promise<void> {
  const rawToken =
    explicitToken !== undefined ? explicitToken : await readCurrentSessionToken();
  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await db.authSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  const cookieStore = await cookies();
  cookieStore.delete(env.SESSION_COOKIE_NAME);
  cookieStore.delete(CONTEXT_COOKIE_NAME);
}
