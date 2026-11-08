import "server-only";
import type { DbTransactionClient } from "@/server/db";
import { DomainError } from "@/lib/errors";

export async function protectLastActiveAdmin(tx: DbTransactionClient, userId: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('viclinic-admin-membership'))`;
  const account = await tx.account.findUnique({ where: { userId }, select: { status: true, user: { select: { roles: true } } } });
  if (account?.status !== "ACTIVE" || !account.user.roles.some(row => row.role === "ADMIN")) return;
  const others = await tx.account.count({ where: { status: "ACTIVE", userId: { not: userId }, user: { roles: { some: { role: "ADMIN" } } } } });
  if (!others) throw new DomainError("DEPENDENCY_BLOCKED", "Cần ít nhất một quản trị viên đang hoạt động trong hệ thống.", 409);
}
