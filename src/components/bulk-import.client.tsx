"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/dialog.client";
import { BULK_LIMITS, bulkKinds, type BulkKind, type BulkRow } from "@/lib/bulk";
import { previewBulkFile, saveBulkRow } from "@/app/(staff)/bulk-actions";

export function BulkImport({ kind }: { kind: BulkKind }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [impactIndex, setImpactIndex] = useState<number | null>(null);
  const cancel = useRef(false);
  const running = useRef(false);
  useEffect(() => () => { cancel.current = true; }, []);
  const router = useRouter();
  const config = bulkKinds[kind];
  const saved = rows.filter((row) => row.saved).length;
  const failed = rows.filter(row => row.error).length;
  const processed = saved + failed;
  function updateCell(index: number, column: number, value: string) {
    setRows(previous => previous.map((row, i) => i === index ? {
      ...row, error: undefined, impact: undefined, values: row.values.map((cell, c) => c === column ? value : cell),
    } : row));
  }
  async function upload(data: FormData) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setRows([]);
    setStopped(false);
    setCurrent(null);
    try {
      const result = await previewBulkFile(kind, data);
      setRows(result.rows ?? []);
      setError(result.error ?? "");
    } catch {
      setError("Không tải được file. Kiểm tra kết nối và thử lại.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function run(only?: number, acknowledgeImpact = false) {
    if (running.current) return;
    running.current = true;
    setError("");
    setBusy(true);
    cancel.current = false;
    setStopped(false);
    const next = [...rows];
    for (let index = 0; index < next.length; index++) {
      if (cancel.current) break;
      if (next[index].saved || (only === undefined && next[index].error) || (only !== undefined && index !== only)) continue;
      setCurrent(index);
      try {
        const result = await saveBulkRow(kind, next[index].values, acknowledgeImpact);
        next[index] = {
          ...next[index],
          error: result.error,
          saved: result.saved ?? false,
          impact: result.impact,
          warning: result.warning,
        };
      } catch {
        next[index] = {
          ...next[index],
          error:
            "Mất kết nối. Kiểm tra danh sách trước khi thử lại để tránh nhập trùng.",
        };
        cancel.current = true;
      }
      setRows([...next]);
    }
    setCurrent(null);
    running.current = false;
    setBusy(false);
    router.refresh();
  }
  return (
    <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="public-secondary"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Nhập Excel hàng loạt
        </button>
      <Dialog
        open={open && impactIndex === null}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent
          className="bulk-import-dialog min-w-0 max-w-5xl p-5 sm:p-6 [&>*]:min-w-0"
          aria-label={`Nhập ${config.label} hàng loạt`}
        >
          <h2 className="pr-10 text-xl font-semibold">
            Nhập {config.label} hàng loạt
          </h2>
          <p className="text-sm text-slate-600">
            Tải mẫu Excel, điền dữ liệu rồi tải lên để kiểm tra.
          </p>
          <a className="public-secondary justify-self-start" href={`/api/ui/import?kind=${kind}`}><Download className="h-4 w-4" aria-hidden="true" />Tải mẫu Excel</a>
          <form onSubmit={event => { event.preventDefault(); if (!busy) void upload(new FormData(event.currentTarget)); }} className="flex flex-wrap items-center gap-3">
            <label className="public-secondary relative focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-700">
              <input type="file" name="file" accept=".xlsx" required disabled={busy} aria-label="File Excel" className="sr-only"
                onChange={event => { setFileName(event.target.files?.[0]?.name ?? ""); setRows([]); setError(""); setStopped(false); }} />
              Chọn tệp
            </label>
            <span className="min-w-0 max-w-64 truncate text-sm" title={fileName}>{fileName || "Chưa chọn tệp"}</span>
            <button type="submit" disabled={busy} className="public-primary">
              Xem trước file
            </button>
          </form>
          {busy && current === null && <p role="status" className="text-sm text-slate-600">Đang đọc tệp…</p>}
          {error && (
            <p role="alert" className="text-sm text-rose-800">
              {error}
            </p>
          )}
          {!!rows.length && (
            <>
              <p role="status" className="text-sm tabular-nums">
                Đã lưu {saved}/{rows.length} dòng
                {current !== null ? ` · Đang xử lý dòng ${rows[current].sourceRow ?? current + 2}` : ""} ·{" "}
                {failed} dòng cần sửa · {rows.length - processed} dòng còn chờ
              </p>
              {stopped && !busy && <p role="status" className="text-sm text-slate-700">Đã dừng. Các dòng đã lưu được giữ nguyên; bạn có thể tiếp tục các dòng chưa lưu.</p>}
              <progress
                max={rows.length}
                value={processed}
                className="bulk-progress w-full"
                aria-label="Tiến trình nhập dữ liệu"
              />
              <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
                <table style={{minWidth: config.columns.length * 150 + 320}} className="w-full table-fixed text-left text-sm [&_th]:font-semibold [&_th:first-child]:w-16 [&_th:last-child]:w-72">
                  <thead>
                    <tr>
                      <th className="p-2">Dòng</th>
                      {config.columns.map((column) => (
                        <th key={column} className="p-2">
                            {column.replace(/\s*\(yyyy-mm-dd\)/, "")}
                        </th>
                      ))}
                      <th className="p-2">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="border-t border-slate-200 align-middle">
                        <td className="p-2 tabular-nums">{row.sourceRow ?? index + 2}</td>
                        {row.values.map((value, col) => (
                          <td key={col} className="p-2">
                            <input
                              aria-label={`Dòng ${row.sourceRow ?? index + 2}, ${config.columns[col]}`}
                              value={value}
                              maxLength={BULK_LIMITS.cellCharacters}
                              disabled={busy || row.saved}
                              onChange={event => updateCell(index, col, event.target.value)}
                                className="min-h-11 w-full min-w-0 rounded border border-slate-300 px-2"
                            />
                          </td>
                        ))}
                          <td className="p-2 whitespace-normal break-words">
                          {row.saved ? (
                            <div className="space-y-2"><span className="text-teal-800">Đã lưu</span>{row.warning && <p className="text-sm text-slate-700">{row.warning}</p>}</div>
                          ) : row.error ? (
                            <>
                              <p role="alert" className="text-rose-800">
                                {row.error}
                              </p>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => row.impact ? setImpactIndex(index) : void run(index)}
                                className={row.impact ? "public-warning mt-2" : "public-secondary mt-2"}
                              >
                                {row.impact ? "Xem lịch bị ảnh hưởng" : "Thử lại dòng này"}
                              </button>
                            </>
                          ) : (
                            "Chờ xác nhận"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-end gap-4">
                {busy ? (
                  <button
                    type="button"
                    onClick={() => {
                      cancel.current = true;
                      setStopped(true);
                    }}
                    className="public-secondary"
                    disabled={stopped}
                  >
                    Dừng sau dòng hiện tại
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saved + failed === rows.length}
                    onClick={() => void run()}
                    className="public-primary"
                  >
                    Xác nhận nhập {rows.length - saved - failed} dòng còn chờ
                  </button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={impactIndex !== null} onOpenChange={value => { if (!value) setImpactIndex(null); }}>
        <DialogContent aria-label="Xác nhận lịch bận ảnh hưởng lịch hẹn">
          <h2 className="pr-8 text-xl font-semibold">Lịch hẹn cần điều phối lại</h2>
          <p className="text-sm leading-6">Khoảng bận này ảnh hưởng các lịch hẹn dưới đây. Bạn vẫn muốn lưu để lễ tân sắp xếp lại?</p>
          <ul className="max-h-80 divide-y divide-slate-200 overflow-auto" aria-label="Lịch hẹn bị ảnh hưởng">
            {impactIndex !== null && rows[impactIndex]?.impact?.affectedAppointments.map(item => <li key={item.appointmentId} className="space-y-1 py-3 text-sm"><p className="font-semibold text-green-800">VC-{String(item.appointmentId).padStart(6, "0")}</p><p>{item.patientName} · {item.serviceName}</p><p className="tabular-nums">{item.timeRangeLabel}</p></li>)}
          </ul>
          <div className="flex flex-wrap justify-end gap-3"><button type="button" className="public-secondary" onClick={() => setImpactIndex(null)}>Quay lại</button><button type="button" className="public-primary" disabled={busy} onClick={() => { const index = impactIndex; setImpactIndex(null); if (index !== null) void run(index, true); }}>Xác nhận lưu lịch bận</button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
