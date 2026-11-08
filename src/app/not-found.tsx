import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-[70dvh] items-center justify-center bg-[#F3F8FA] px-5 py-12">
      <section className="w-full max-w-lg space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-4xl font-semibold tabular-nums text-slate-500">404</p>
        <h1 className="text-2xl font-semibold text-[#0B2545]">Không tìm thấy nội dung</h1>
        <p className="text-base leading-7 text-slate-700">
          Trang hoặc thông tin bạn tìm không còn khả dụng. Kiểm tra lại đường dẫn hoặc trở về trang làm việc.
        </p>
        <Link href="/choose-role" className="public-primary">Về trang làm việc</Link>
      </section>
    </main>
  );
}
