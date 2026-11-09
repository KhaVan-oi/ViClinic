import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/errors";
import { findPatientByPhone } from "@/modules/patients/server";

const searchInput = z.object({ phone: z.string().trim().min(1).max(32) });

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) {
      return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
    }
    const parsed = searchInput.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Số điện thoại không hợp lệ." }, { status: 400 });
    }
    const result = await findPatientByPhone(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
    }
    return apiErrorResponse(err, "Không thể tra cứu thông tin người khám bệnh.");
  }
}
