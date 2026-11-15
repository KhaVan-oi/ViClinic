import { readAuthPhone } from "@/server/auth-navigation";
import { singleSearchParams } from "@/lib/pagination";
import Link from "next/link";
import { FeedbackBanner } from "@/components/feedback";
import { PasswordInput, PhoneInput, AuthSubmit } from "@/app/(auth)/fields.client";
import { loginFormAction } from "@/app/(auth)/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = singleSearchParams(await searchParams);
  const phone = (await readAuthPhone());
  const error = params.error ?? "";
  const success = params.success ?? "";
  const nextUrl = params.next ?? "";

  return (
    <div className="space-y-5" >
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-[#0B2545]">
          Đăng nhập
        </h1>
      </div>

      {success && (
        <FeedbackBanner
          variant="success"
          title="Hoàn tất"
          message={success}

        />
      )}

      {error && (
        <FeedbackBanner
          variant="error"
          title="Không thể đăng nhập"
          message={error}

        />
      )}

      <form action={loginFormAction} className="space-y-4">
        <input type="hidden" name="next" value={nextUrl} />

        <div>
          <label
            htmlFor="login-phone"
            className="block text-sm font-bold text-[#0B2545]"
          >
            Số điện thoại
          </label>
          <PhoneInput id="login-phone" defaultValue={phone} />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-bold text-[#0B2545]"
          >
            Mật khẩu
          </label>
          <PasswordInput
            id="login-password"
            name="password"
            placeholder="Nhập mật khẩu"

          />
        </div>

        <AuthSubmit label="Đăng nhập" pendingLabel="Đang đăng nhập…" />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E6EFF5] pt-4 text-sm">
        <Link
          href="/recover"

          className="font-semibold text-[#0B2545] underline-offset-4 hover:text-[#0A6E63] hover:underline"
        >
          Quên mật khẩu?
        </Link>
        <div className="text-[#486581]">
          <span>Chưa có tài khoản? </span>
          <Link
            href="/register"

            className="font-bold text-[#0B2545] underline-offset-4 hover:text-[#0A6E63] hover:underline"
          >
            Đăng ký tài khoản
          </Link>
        </div>
      </div>
    </div>
  );
}
