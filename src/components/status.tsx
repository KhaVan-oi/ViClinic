
import { formatDateOnlyDisplay } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { formatAccountStatusLabel, formatAppointmentStatusLabel, formatRoleLabel } from "@/config/business";

const appointmentStyles: Record<string, string> = {
  PENDING: "text-[#174954]",
  CONFIRMED: "text-teal-800",
  COMPLETED: "text-slate-700",
  CANCELLED: "text-rose-800",
};
const accountStyles: Record<string, string> = {
  ACTIVE: "text-teal-800",
  PENDING_ACTIVATION: "text-[#174954]",
  DISABLED: "text-rose-800",
};

function StatusText({ status, kind, className }: {
  status: string;
  kind: "appointment" | "account";
  className?: string;
}) {
  const styles = kind === "appointment" ? appointmentStyles : accountStyles;
  return <span className={cn("inline-flex items-center text-sm font-medium", styles[status] ?? "text-slate-700", className)}>
    {kind === "appointment" ? formatAppointmentStatusLabel(status) : formatAccountStatusLabel(status)}
  </span>;
}
export function AppointmentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <StatusText status={status} kind="appointment" className={className} />
  );
}

export function AccountStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return <StatusText status={status} kind="account" className={className} />;
}

export function RoleBadge({
  role,
  className,
}: {
  role: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "role-label inline-flex items-center text-sm text-slate-700",
        className,
      )}
    >
      {formatRoleLabel(role)}
    </span>
  );
}

export function DailyTrend({ rows, title }: { title?: string; rows: { label: string; count: number; cancelled?: number }[] }) {
  const max = Math.max(1, ...rows.map(row => row.count));
  const firstDay = Date.parse(rows[0]?.label ?? "1970-01-01");
  const span = Math.max(1, Date.parse(rows.at(-1)?.label ?? "1970-01-01") - firstDay);
  const x = (index: number) => 44 + (Date.parse(rows[index].label) - firstDay) / span * 700;
  const y = (count: number) => 184 - count / max * 150;
  const cancelledPoints = rows.map((row,index) => `${x(index)},${y(row.cancelled ?? 0)}`).join(" ");
  const points = rows.map((row,index) => `${x(index)},${y(row.count)}`).join(" ");
  const peak = rows.reduce((best,row) => row.count > best.count ? row : best, { label: "", count: 0 });
  return <figure className="space-y-3 rounded-lg bg-[#edf5f5] p-5"><figcaption className="flex flex-wrap items-baseline justify-between gap-3"><span className="text-lg font-semibold">{title ?? "Lượng lịch hẹn theo ngày"}</span><span className="text-sm text-slate-600 tabular-nums">{peak.count ? `Cao nhất: ${peak.count} lịch · ${formatDateOnlyDisplay(peak.label)}` : "Chưa có lịch trong khoảng này"}</span></figcaption><div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Biểu đồ lịch hẹn, cuộn ngang để xem các mốc"><svg viewBox="0 0 780 224" className="min-w-[780px] w-full" role="img" aria-label={title ?? "Biến động số lịch hẹn"}><title>Số lịch hẹn theo ngày</title>{[...new Set([0,Math.ceil(max/2),max])].map((value,index) => <g key={index}><line x1="44" x2="744" y1={y(value)} y2={y(value)} stroke="#c9dcda" /><text x="32" y={y(value)+4} textAnchor="end" fontSize="12" fill="#526579">{value}</text></g>)}<polyline points={cancelledPoints} fill="none" stroke="#be123c" strokeWidth="2" strokeDasharray="6 4" /><polyline points={points} fill="none" stroke="#0b7c6d" strokeWidth="3" strokeLinejoin="round" />{rows.map((row,index)=><g key={row.label}><title>{`${row.label}: ${row.count} lịch, ${row.cancelled ?? 0} đã hủy`}</title><circle cx={x(index)} cy={y(row.count)} r="3.5" fill="#0b7c6d" /><circle cx={x(index)} cy={y(row.cancelled ?? 0)} r="3" fill="#be123c" /></g>)}{rows.filter((_,index) => rows.length < 8 || index % Math.ceil(rows.length/6)===0 || index===rows.length-1).map(row => {const index=rows.indexOf(row);return <text key={row.label} x={x(index)} y="212" textAnchor="middle" fontSize="12" fill="#526579">{row.label.slice(8)}/{row.label.slice(5,7)}</text>;})}</svg></div><p className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span className="inline-flex items-center gap-2 text-teal-800"><svg aria-hidden="true" width="32" height="12"><path d="M0 6H32" stroke="#0b7c6d" strokeWidth="3" /></svg>Tổng số lịch</span><span className="inline-flex items-center gap-2 text-rose-800"><svg aria-hidden="true" width="32" height="12"><path d="M0 6H32" stroke="#be123c" strokeWidth="2" strokeDasharray="6 4" /></svg>Lịch đã hủy</span></p></figure>;
}

export function CountChart({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number; tone?: "danger" | "warning" }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  const min = Math.min(max, ...rows.map(row => row.count));
  const levels = ["#b8d8d2", "#82bdb3", "#4a9d90", "#287e71", "#105c50"];
  return (
    <figure className="min-w-0 space-y-4">
      <figcaption className="text-lg font-semibold">{title}</figcaption>
      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
                <span className="min-w-0 break-words">{row.label}</span>
                <strong
                  className={`tabular-nums ${row.tone === "danger" ? "text-rose-800" : row.tone === "warning" ? "text-[#174954]" : "text-teal-800"}`}
                >
                  {row.count}
                </strong>
              </div>
              <div
                className="h-2 overflow-hidden rounded bg-slate-100"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded"
                  style={{ width: `${(row.count / max) * 100}%`, backgroundColor: row.tone === "danger" ? "#be123c" : row.tone === "warning" ? "#397584" : levels[max === min ? 4 : Math.floor((row.count - min) / (max - min) * 4)] }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">
          Chưa có dữ liệu trong khoảng này.
        </p>
      )}
      {!!rows.length && !rows.some(row => row.tone) && <p className="flex items-center gap-2 text-sm text-slate-600"><span>Ít lịch</span><span aria-hidden="true" className="h-2 w-24 rounded" style={{ background: `linear-gradient(to right, ${levels.join(", ")})` }} /><span>Nhiều lịch</span></p>}
    </figure>
  );
}
