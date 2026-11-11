import { singleSearchParams } from "@/lib/pagination";
import { StaffCalendarPage } from "@/modules/appointments/views";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <StaffCalendarPage role="RECEPTIONIST" params={singleSearchParams(await searchParams)} />;
}
