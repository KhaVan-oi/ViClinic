import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errors = {
  badRequest: (code: string, msg: string) => new ApiError(400, code, msg),
  unauthorized: (msg = "Chưa đăng nhập hoặc phiên đã hết hạn") => new ApiError(401, "UNAUTHORIZED", msg),
  forbidden: (code = "FORBIDDEN", msg = "Không có quyền thực hiện thao tác này") => new ApiError(403, code, msg),
  notFound: (msg = "Không tìm thấy tài khoản") => new ApiError(404, "NOT_FOUND", msg),
  conflict: (code: string, msg: string) => new ApiError(409, code, msg),
};

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw errors.badRequest("INVALID_JSON", "Body không phải JSON hợp lệ");
  }
  return schema.parse(json);
}

/** Bọc Route Handler: chuyển ApiError / ZodError thành JSON response thống nhất. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ", details: err.flatten().fieldErrors } },
          { status: 422 },
        );
      }
      console.error(err);
      return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Lỗi hệ thống" } }, { status: 500 });
    }
  };
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw errors.notFound();
  return id;
}
