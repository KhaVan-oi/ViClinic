import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationBar({ page, totalPages, totalItems, pageSize, buildHref }: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  buildHref: (targetPage: number) => string;
}) {
  if (!totalItems) return null;
  const outsideRange = page > totalPages;
  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <p className="tabular-nums text-slate-700">
        {outsideRange ? "Trang này không có kết quả." : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} trong ${totalItems} kết quả`}
      </p>
      <div className="flex items-center gap-2">
        {outsideRange && <Link href={buildHref(1)} className="public-secondary">Về trang đầu</Link>}
        {page > 1 ? <Link aria-label="Trang trước" href={buildHref(Math.min(totalPages, page - 1))} className="inline-flex h-11 w-11 items-center justify-center"><ChevronLeft aria-hidden="true" className="h-5 w-5" /></Link> : <span aria-label="Trang trước" aria-disabled="true" className="inline-flex h-11 w-11 items-center justify-center text-slate-400"><ChevronLeft aria-hidden="true" className="h-5 w-5" /></span>}
        <span className="tabular-nums text-slate-700" aria-label={`Trang ${page} trên ${totalPages}`}>{page} / {totalPages}</span>
        {page < totalPages ? <Link aria-label="Trang sau" href={buildHref(page + 1)} className="inline-flex h-11 w-11 items-center justify-center"><ChevronRight aria-hidden="true" className="h-5 w-5" /></Link> : <span aria-label="Trang sau" aria-disabled="true" className="inline-flex h-11 w-11 items-center justify-center text-slate-400"><ChevronRight aria-hidden="true" className="h-5 w-5" /></span>}
      </div>
    </nav>
  );
}
