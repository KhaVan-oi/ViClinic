import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountStatus, ListAccountsQuery, Role } from "@/lib/validation/account";

/** Bản ghi USERS + ACCOUNTS (1-1) trả về cho client. */
export interface Account {
  userId: number;
  accountId: number;
  fullName: string;
  birthDate: string | null;
  phone: string;
  email: string | null;
  role: Role;
  status: AccountStatus;
  createdAt: string;
}

export interface AccountRecord extends Account {
  authUserId: string | null;
}

/** Marker thỏa chk_account_password_hash; mật khẩu thật nằm trong Supabase Auth. */
export const PASSWORD_MANAGED_BY_AUTH = "SUPABASE_AUTH";

const SELECT = `user_id, full_name, birth_date, phone, email, role, auth_user_id,
  accounts!inner(account_id, status, created_at)`;

interface Row {
  user_id: number;
  full_name: string;
  birth_date: string | null;
  phone: string;
  email: string | null;
  role: Role;
  auth_user_id: string | null;
  accounts: { account_id: number; status: AccountStatus; created_at: string };
}

function toRecord(r: Row): AccountRecord {
  return {
    userId: r.user_id,
    accountId: r.accounts.account_id,
    fullName: r.full_name,
    birthDate: r.birth_date,
    phone: r.phone,
    email: r.email,
    role: r.role,
    status: r.accounts.status,
    createdAt: r.accounts.created_at,
    authUserId: r.auth_user_id,
  };
}

export function toPublic({ authUserId: _omit, ...account }: AccountRecord): Account {
  return account;
}

export class AccountRepository {
  constructor(private db: SupabaseClient) {}

  private async one(column: string, value: string | number): Promise<AccountRecord | null> {
    const { data, error } = await this.db.from("users").select(SELECT).eq(column, value).maybeSingle();
    if (error) throw error;
    return data ? toRecord(data as unknown as Row) : null;
  }

  findByUserId = (id: number) => this.one("user_id", id);
  findByPhone = (phone: string) => this.one("phone", phone);
  findByAuthUserId = (authId: string) => this.one("auth_user_id", authId);

  async phoneTaken(phone: string, excludeUserId?: number): Promise<boolean> {
    let q = this.db.from("users").select("user_id", { head: true, count: "exact" }).eq("phone", phone);
    if (excludeUserId) q = q.neq("user_id", excludeUserId);
    const { count, error } = await q;
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async list(query: ListAccountsQuery & { roles: Role[] }): Promise<{ items: Account[]; total: number }> {
    const from = (query.page - 1) * query.pageSize;
    let q = this.db
      .from("users")
      .select(SELECT, { count: "exact" })
      .order("user_id")
      .range(from, from + query.pageSize - 1);
    q = q.in("role", query.roles);
    if (query.status) q = q.eq("accounts.status", query.status);
    if (query.q) {
      // Loại ký tự đặc biệt của cú pháp filter PostgREST
      const term = query.q.replace(/[,()%*\\]/g, " ").trim();
      if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
    }
    const { data, error, count } = await q;
    if (error) throw error;
    return { items: (data as unknown as Row[]).map((r) => toPublic(toRecord(r))), total: count ?? 0 };
  }

  async create(input: {
    fullName: string;
    birthDate?: string | null;
    phone: string;
    email?: string | null;
    role: Role;
    authUserId: string | null;
    status: AccountStatus;
  }): Promise<AccountRecord> {
    const { data: user, error } = await this.db
      .from("users")
      .insert({
        full_name: input.fullName,
        birth_date: input.birthDate ?? null,
        phone: input.phone,
        email: input.email ?? null,
        role: input.role,
        auth_user_id: input.authUserId,
      })
      .select("user_id")
      .single();
    if (error) throw error;

    const { error: accErr } = await this.db.from("accounts").insert({
      user_id: user.user_id,
      password_hash: input.status === "PENDING_ACTIVATION" ? null : PASSWORD_MANAGED_BY_AUTH,
      status: input.status,
    });
    if (accErr) {
      // PostgREST không có transaction nhiều câu lệnh: bù trừ thủ công
      await this.db.from("users").delete().eq("user_id", user.user_id);
      throw accErr;
    }
    return (await this.findByUserId(user.user_id))!;
  }

  async updateProfile(
    userId: number,
    fields: { fullName?: string; birthDate?: string; email?: string | null; phone?: string },
  ): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (fields.fullName !== undefined) patch.full_name = fields.fullName;
    if (fields.birthDate !== undefined) patch.birth_date = fields.birthDate;
    if (fields.email !== undefined) patch.email = fields.email;
    if (fields.phone !== undefined) patch.phone = fields.phone;
    if (Object.keys(patch).length === 0) return;
    const { error } = await this.db.from("users").update(patch).eq("user_id", userId);
    if (error) throw error;
  }

  async linkAuthUser(userId: number, authUserId: string): Promise<void> {
    const { error } = await this.db.from("users").update({ auth_user_id: authUserId }).eq("user_id", userId);
    if (error) throw error;
  }

  async setStatus(userId: number, status: AccountStatus): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (status !== "PENDING_ACTIVATION") patch.password_hash = PASSWORD_MANAGED_BY_AUTH;
    const { error } = await this.db.from("accounts").update(patch).eq("user_id", userId);
    if (error) throw error;
  }
}
