import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { createSessionClient } from "@/lib/supabase/server";

/** POST /api/auth/logout */
export const POST = handle(async () => {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  return NextResponse.json({ message: "Đăng xuất thành công" });
});
