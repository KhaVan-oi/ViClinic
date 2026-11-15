import Link from "next/link";
import { ArrowUpRight, Stethoscope, HeartPulse, Baby, Ear, Eye, ScanFace } from "lucide-react";
import { type RoleName } from "@/config/business";
import { getPatientEntryPath } from "@/lib/navigation";

const icons = { "Khám Nhi": Baby, "Tai Mũi Họng": Ear, "Tim mạch": HeartPulse, "Mắt": Eye, "Da liễu": ScanFace };

type Service = { serviceId: number; name: string };

export function ServicePreview({ service, activeContext }: { service: Service; activeContext?: RoleName }) {
  const Icon = icons[service.name as keyof typeof icons] ?? Stethoscope;
  const bookingPath = getPatientEntryPath(`/patient/book?serviceId=${service.serviceId}`, activeContext);
  return <article className="service-preview" id={`dich-vu-${service.serviceId}`}>
    <div className="service-preview-heading"><Icon aria-hidden="true" /><div>
      <h2><Link href={bookingPath}>{service.name}</Link></h2>
    </div></div>
      <Link href={`/doctors?serviceId=${service.serviceId}`} className="service-preview-doctors public-text-link">Xem bác sĩ phụ trách <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
      <Link href={bookingPath} className="service-preview-book services-book">Chọn giờ khám <ArrowUpRight aria-hidden="true" /></Link>
  </article>;
}
