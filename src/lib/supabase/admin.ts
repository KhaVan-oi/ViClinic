import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Client service role: bỏ qua RLS, chỉ dùng trong Route Handlers. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Client anon không lưu session: dùng để kiểm tra mật khẩu mà không đổi cookie. */
export function createStatelessClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
