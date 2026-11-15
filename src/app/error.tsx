"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section role="alert" className="mx-auto my-12 w-full max-w-lg space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-[#0B2545]">Chưa tải được nội dung</h1>
      <p className="text-base leading-7 text-slate-700">
        Vui lòng thử lại hoặc trở về trang làm việc để mở lại chức năng.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/choose-role" className="public-secondary">Về trang làm việc</Link>
        <button type="button" onClick={reset} className="public-primary">Thử lại</button>
      </div>
    </section>
  );
}
