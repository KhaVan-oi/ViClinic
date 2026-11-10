import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { doctorPortraits } from "@/config/clinic";
import { singleSearchParams, parsePositiveId, normalizeSearchText } from "@/lib/pagination";
import { getCurrentSession } from "@/server/session";
import { getPatientEntryPath } from "@/lib/navigation";
import { listBookableServices, listPublicDoctorsShowcase } from "@/modules/scheduling/services";

export const dynamic = "force-dynamic";

export default async function PublicDoctorsPage({ searchParams }: { searchParams: Promise<{ q?: string; serviceId?: string }> }) {
  const params = singleSearchParams(await searchParams);
  const query = params.q?.trim() ?? "";
  const [allDoctors, services, session] = await Promise.all([listPublicDoctorsShowcase(), listBookableServices(), getCurrentSession()]);
  const selectedService = services.find(service => service.serviceId === parsePositiveId(params.serviceId));
  const selected = selectedService?.serviceId ?? null;
  const matchingNames = allDoctors.filter(doctor => normalizeSearchText(doctor.fullName).includes(normalizeSearchText(query)));
  const doctors = matchingNames.filter(doctor => !selected || doctor.services.some(service => service.serviceId === selected));
  return (
    <div className="catalog-page doctors-page">
      <header className="catalog-intro doctor-intro">
        <div><h1>Bác sĩ tại ViClinic</h1><p>Chọn bác sĩ theo dịch vụ bạn cần khám.</p></div>
      </header>
      <section className="catalog-results" aria-label="Danh sách bác sĩ">
        <form method="GET" action="/doctors" role="search" className="catalog-search">
          <label htmlFor="doctor-query">Tên bác sĩ<input id="doctor-query" type="search" name="q" defaultValue={query} placeholder="Nhập tên bác sĩ" className="public-control mt-2" /></label>
          <label htmlFor="doctor-service">Dịch vụ khám<select id="doctor-service" name="serviceId" defaultValue={selected ?? ""} className="public-control mt-2"><option value="">Tất cả dịch vụ</option>{services.map(service => <option key={service.serviceId} value={service.serviceId}>{service.name}</option>)}</select></label>
          <div className="flex flex-wrap items-center gap-3"><button type="submit" className="public-primary">Tìm bác sĩ</button>{(query || selected) && <Link href="/doctors" className="public-text-link">Xóa bộ lọc</Link>}</div>
        </form>
        <div className="doctor-directory">
          {doctors.map(doctor => {
            const serviceId = selected ?? doctor.services[0]?.serviceId;
            return <article key={doctor.doctorId}>
              {doctorPortraits[doctor.doctorId] && <div className="doctor-directory-portrait clinic-portrait"><Image src={doctorPortraits[doctor.doctorId]} alt={doctor.fullName} width={320} height={320} sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 280px" /></div>}
              <div className="doctor-directory-info"><h2>{doctor.fullName}</h2><ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">{doctor.services.map(service => <li key={service.serviceId}><Link className="public-text-link" href={getPatientEntryPath(`/patient/book?serviceId=${service.serviceId}&doctorId=${doctor.doctorId}`, session?.activeContext)}>{service.name}</Link></li>)}</ul>
                {serviceId && <Link href={getPatientEntryPath(`/patient/book?serviceId=${serviceId}&doctorId=${doctor.doctorId}`, session?.activeContext)} className="service-book mt-4">Đặt lịch với bác sĩ <ArrowUpRight className="h-5 w-5" aria-hidden="true" /></Link>}
              </div>
            </article>;
          })}
        </div>
        {!doctors.length && <div className="space-y-3 py-6" role="status">
          <h2 className="text-xl font-semibold">{query && matchingNames.length && selectedService ? "Bác sĩ không phụ trách dịch vụ đã chọn" : "Không tìm thấy bác sĩ phù hợp"}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{query && matchingNames.length && selectedService ? `Có bác sĩ khớp tên “${query}”, nhưng không phụ trách dịch vụ “${selectedService.name}”.` : "Thử nhập một phần họ tên, kiểm tra lại cách viết hoặc chọn dịch vụ khác."}</p>
          {selected && <Link href={`/doctors?${new URLSearchParams(query ? {q: query} : {})}`} className="public-secondary">Bỏ lọc dịch vụ</Link>}
        </div>}
      </section>
    </div>
  );
}
