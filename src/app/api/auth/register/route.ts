import { NextResponse } from "next/server";
import { handle, parseBody } from "@/lib/http";
import { toE164 } from "@/lib/phone";
import { createSessionClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation/account";
import { createAccount } from "@/server/account-service";

/** POST /api/auth/register — bệnh nhân tự đăng ký online, đăng nhập luôn sau khi tạo. */
export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, registerSchema);
  const user = await createAccount({ ...body, role: "PATIENT" });

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ phone: toE164(body.phone), password: body.password });
  if (error) throw error;

  return NextResponse.json({ user }, { status: 201 });
});
