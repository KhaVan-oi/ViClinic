export default function GlobalLoading() {
  return (
    <div

      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-pulse"
      aria-busy="true"
      aria-label="Đang tải dữ liệu..."
    >
      <div className="h-24 rounded-2xl bg-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-32 rounded-xl bg-slate-200/70" />
        <div className="h-32 rounded-xl bg-slate-200/70" />
        <div className="h-32 rounded-xl bg-slate-200/70" />
      </div>
      <div className="h-64 rounded-xl bg-slate-200/60" />
    </div>
  );
}
