import { PATIENT_CANCEL_CUTOFF_MINUTES } from "@/config/business";
import { ClinicIntro } from "@/components/clinic-intro.client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Phone, Users } from "lucide-react";
import { ServicePreview } from "@/components/service-preview";
import { BOOKING_GUIDE_STEPS, clinicConfig, doctorPortraits as portraits } from "@/config/clinic";
import { getCurrentSession } from "@/server/session";
import { getPatientEntryPath } from "@/lib/navigation";
import { listPublicServiceCatalog, listPublicDoctorsShowcase } from "@/modules/scheduling/services";
export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  const [services, doctors, session] = await Promise.all([listPublicServiceCatalog(), listPublicDoctorsShowcase(), getCurrentSession()]);
  const featuredDoctors = doctors.filter(doctor => portraits[doctor.doctorId] && doctor.services.length).slice(0, 4);
  return (
    <div className="clinic-home">
      <ClinicIntro bookingHref={getPatientEntryPath("/patient/book", session?.activeContext)} appointmentsHref={getPatientEntryPath("/patient/appointments", session?.activeContext)} />
      <nav className="clinic-quick-links" aria-label="Hỗ trợ khám bệnh">
        <a href={`tel:${clinicConfig.hotline.replace(/\s+/g, "")}`}><Phone aria-hidden="true" /><span>Gọi tổng đài<strong>{clinicConfig.hotline}</strong></span></a>
        <Link href={getPatientEntryPath("/patient/book", session?.activeContext)}><CalendarDays aria-hidden="true" /><span>Đặt lịch khám<strong>Chọn ngày và giờ khám</strong></span></Link>
        <Link href="/doctors"><Users aria-hidden="true" /><span>Tìm bác sĩ<strong>Xem dịch vụ phụ trách</strong></span></Link>
      </nav>
      <section id="dich-vu" className="clinic-services" aria-labelledby="clinic-services-title">
        <div className="clinic-services-heading"><h2 id="clinic-services-title">Dịch vụ khám</h2><Link href="/services" className="public-text-link">Tất cả dịch vụ <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></div>
        <div className="clinic-services-body">{services.map(service => <ServicePreview key={service.serviceId} service={service} activeContext={session?.activeContext} />)}</div>
      </section>

      <section className="clinic-doctors" aria-labelledby="clinic-doctors-title">
        <div className="clinic-section-heading"><h2 id="clinic-doctors-title">Đội ngũ bác sĩ</h2><Link href="/doctors" className="public-text-link">Xem tất cả bác sĩ <ArrowUpRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link></div>
        <div className="clinic-doctor-track">
          {featuredDoctors.map(doctor => <article key={doctor.doctorId} className="clinic-doctor">
            <Link href={getPatientEntryPath(`/patient/book?doctorId=${doctor.doctorId}&serviceId=${doctor.services[0]!.serviceId}`, session?.activeContext)} aria-label={`Đặt lịch với bác sĩ ${doctor.fullName}`}>
              <div className="clinic-doctor-photo clinic-portrait"><Image src={portraits[doctor.doctorId]!} alt={doctor.fullName} width={768} height={768} sizes="(max-width: 1023px) 44vw, 280px" /></div>
              <div className="clinic-doctor-caption"><h3>{doctor.fullName}</h3>
              <p>{doctor.services.map(service => service.name).join(" · ")}</p>
              <span className="clinic-doctor-book">Đặt lịch khám <ArrowUpRight aria-hidden="true" /></span></div>
            </Link>
          </article>)}
        </div>
      </section>

      <section id="quy-trinh-kham" className="clinic-guide" aria-labelledby="clinic-guide-title">
        <h2 id="clinic-guide-title">Hướng dẫn đặt lịch</h2>
        <div className="clinic-guide-main">
        <ol className="clinic-guide-instructions">
          {BOOKING_GUIDE_STEPS.map((step, index) => {
            return <li key={step.title}><span aria-hidden="true" className="clinic-step">{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>;
          })}
        </ol></div>
        <aside className="clinic-guide-contact">
          <h3>Cần hỗ trợ lịch hẹn?</h3>
          <p>Liên hệ phòng khám để đổi lịch đã xác nhận hoặc hủy khi còn dưới {PATIENT_CANCEL_CUTOFF_MINUTES / 60} giờ trước giờ khám.</p>
          <a href={`tel:${clinicConfig.hotline.replace(/\s+/g, "")}`} className="public-secondary tabular-nums">Gọi {clinicConfig.hotline}</a>
        </aside>
      </section>
    </div>
  );
}
