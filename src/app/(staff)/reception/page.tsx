import { submitPrivateSearch } from "@/server/private-search";
import Link from "next/link";
import { ArrowRight, CalendarPlus, Search } from "lucide-react";
import { getReceptionAppointments, getReceptionQueueCounts } from "@/modules/appointments/queries";
import { ReceptionAppointmentTable } from "@/modules/appointments/views";
import { db } from "@/server/db";
import { formatClinicIsoDate, formatClinicTime, getClinicDayStart, getClinicDayEndExclusive, isValidIsoDate } from "@/lib/dates";
import { addHours } from "date-fns";
import { formatAppointmentStatusLabel } from "@/config/business";

export const dynamic = "force-dynamic";

export default async function ReceptionHomePage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const query = await searchParams;
  const [counts, urgentCoordination, pendingUnassigned] = await Promise.all([
    getReceptionQueueCounts(),
    getReceptionAppointments({
      tab: "NEEDS_COORDINATION",
      page: 1,
      pageSize: 5,
    }),
    getReceptionAppointments({
      tab: "PENDING_UNASSIGNED",
      page: 1,
      pageSize: 6,
    }),
  ]);
  const now = new Date();
  const date = query.date && isValidIsoDate(query.date) ? query.date : formatClinicIsoDate(now);
  const period = ["morning","afternoon","day"].includes(query.period ?? "") ? query.period! : Number(formatClinicTime(now).slice(0,2)) < 12 ? "morning" : "afternoon";
  const start = getClinicDayStart(date);
  const grouped = await db.appointment.groupBy({by:["status"],where:{startAt:{gte:period === "afternoon" ? addHours(start,12) : start,lt:period === "morning" ? addHours(start,12) : getClinicDayEndExclusive(date)}},_count:{_all:true}});

  return (
    <div className="space-y-6" >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0B2545] sm:text-2xl">
            Quầy tiếp đón
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Tra cứu người khám bệnh hoặc chọn lịch hẹn cần xử lý.
          </p>
        </div>

        <Link
          href="/reception/appointments/new"

          className="public-primary inline-flex gap-2"
        >
          <CalendarPlus className="h-4 w-4" />
          <span>Đặt lịch tại quầy</span>
        </Link>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-5"><form method="GET" className="flex flex-wrap items-end gap-4"><label className="text-sm font-medium">Ngày làm việc<input type="date" name="date" required defaultValue={date} className="public-control mt-2" /></label><label className="text-sm font-medium">Buổi làm việc<select name="period" defaultValue={period} className="public-control mt-2"><option value="morning">Buổi sáng (trước 12:00)</option><option value="afternoon">Buổi chiều (từ 12:00)</option><option value="day">Cả ngày</option></select></label><button type="submit" className="public-secondary">Xem tổng quan</button></form><dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-4">{["PENDING","CONFIRMED","COMPLETED","CANCELLED"].map(status=><Link key={status} href={`/reception/appointments?${new URLSearchParams({tab:"ALL",status,date,period})}`} className="rounded-md p-3 hover:bg-slate-50"><dt className="text-sm text-slate-600">{formatAppointmentStatusLabel(status)}</dt><dd className={`mt-2 text-2xl font-semibold tabular-nums ${status === "CANCELLED" ? "text-rose-800" : "text-teal-800"}`}>{grouped.find(row=>row.status === status)?._count._all ?? 0}</dd></Link>)}</dl></section>

      <section className="bg-white p-5 sm:p-6">
        <form
          action={submitPrivateSearch.bind(null, "/reception/appointments/new")}
          className="grid gap-3 lg:grid-cols-12 lg:items-center"
        >
          <div className="lg:col-span-5">
            <h2 className="text-lg font-semibold text-[#0B2545]">
              Tìm người khám bệnh theo số điện thoại
            </h2>
            <p className="text-sm text-slate-600">
              Có thể tạo hồ sơ nếu người khám bệnh chưa từng đến khám.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:col-span-7">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-600" />
              <label htmlFor="lookup-phone" className="sr-only">Số điện thoại người khám bệnh</label>
              <input
                id="lookup-phone"
                name="lookupPhone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                maxLength={25}
                required
                placeholder="Nhập số điện thoại cần tìm"

                className="public-control pl-10 tabular-nums"
              />
            </div>
            <button
              type="submit"

              className="public-primary inline-flex shrink-0 gap-2"
            >
              <span>Tìm hồ sơ và đặt lịch</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </section>

      <section className="queue-workbench" aria-label="Hàng đợi cần xử lý">
        {[{title:"Tiếp nhận và xác nhận",items:[{tab:"TODAY_SCHEDULE",label:"Lịch khám hôm nay",count:counts.TODAY_SCHEDULE},{tab:"CREATED_TODAY_PENDING",label:"Mới đặt hôm nay, chờ xác nhận",count:counts.CREATED_TODAY_PENDING},{tab:"PENDING_UNASSIGNED",label:"Chờ phân công bác sĩ",count:counts.PENDING_UNASSIGNED},{tab:"PENDING_ASSIGNED",label:"Chờ xác nhận lịch hẹn",count:counts.PENDING_ASSIGNED},{tab:"TODAY_CONFIRMED",label:"Lịch khám đã xác nhận hôm nay",count:counts.TODAY_CONFIRMED}]},{title:"Theo dõi và xử lý",items:[{tab:"NEEDS_COORDINATION",label:"Cần điều phối lại",count:counts.NEEDS_COORDINATION},{tab:"OVERDUE_CONFIRMED",label:"Đã qua giờ, chờ hoàn tất",count:counts.OVERDUE_CONFIRMED},{tab:"OVERDUE_PENDING",label:"Đã qua giờ, chưa xác nhận",count:counts.OVERDUE_PENDING}]}].map(group => <div key={group.title}><h2>{group.title}</h2><nav aria-label={group.title}>{group.items.map(item => <Link key={item.tab} href={`/reception/appointments?tab=${item.tab}`} className="queue-workbench-row"><span>{item.label}</span><strong className="tabular-nums">{item.count}</strong><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>)}</nav></div>)}
      </section>

      {urgentCoordination.items.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0B2545]">
                Lịch hẹn cần điều phối lại
              </h2>
            </div>
            <Link
              href="/reception/appointments?tab=NEEDS_COORDINATION"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0A6E63] hover:underline"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ReceptionAppointmentTable items={urgentCoordination.items} />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0B2545]">
              Chờ phân công bác sĩ
            </h2>
          </div>
          <Link
            href="/reception/appointments"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0A6E63] hover:underline"
          >
            <span>Mở toàn bộ hàng đợi</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ReceptionAppointmentTable items={pendingUnassigned.items} />
      </section>
    </div>
  );
}
