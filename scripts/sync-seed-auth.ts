/**
 * Tạo user Supabase Auth cho các tài khoản seed (password_hash trong seed_data.sql là giá trị giả).
 * CHỈ dùng cho dev/test:  npm run seed:auth -- [mat_khau]   (mặc định: Password@123)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const password = process.argv[2] ?? "Password@123";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await db
    .from("users")
    .select("user_id, phone, auth_user_id, accounts!inner(status)")
    .is("auth_user_id", null)
    .neq("accounts.status", "PENDING_ACTIVATION");
  if (error) throw error;

  for (const u of data as unknown as { user_id: number; phone: string; accounts: { status: string } }[]) {
    const { data: created, error: authErr } = await db.auth.admin.createUser({
      phone: `84${u.phone.slice(1)}`,
      password,
      phone_confirm: true,
      ...(u.accounts.status === "DISABLED" && { ban_duration: "876000h" }),
    });
    if (authErr) {
      console.error(`user_id=${u.user_id} (${u.phone}): ${authErr.message}`);
      continue;
    }
    await db.from("users").update({ auth_user_id: created.user.id }).eq("user_id", u.user_id);
    await db.from("accounts").update({ password_hash: "SUPABASE_AUTH" }).eq("user_id", u.user_id);
    console.log(`OK user_id=${u.user_id} ${u.phone}`);
  }
  console.log(`Xong. Mật khẩu dev: ${password}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
