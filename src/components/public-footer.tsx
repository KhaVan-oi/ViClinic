import Image from "next/image";
import { Phone } from "lucide-react";
import { clinicConfig } from "@/config/clinic";

export function PublicFooter() {
  return (
    <footer id="lien-he-footer" className="public-footer">
      <div className="mx-auto grid max-w-7xl grid-cols-[72px_minmax(0,1fr)] items-start gap-x-5 gap-y-3 px-5 py-6 sm:grid-cols-[100px_1fr] sm:px-8 lg:grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
        <Image src="/images/brand/logo-stacked.webp" alt={clinicConfig.displayName} width={100} height={110} className="h-auto w-[72px] sm:w-24" />
        <address className="space-y-2 text-sm not-italic leading-relaxed">
          <p className="font-semibold">{clinicConfig.brandFullName}</p>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicConfig.address)}`} target="_blank" rel="noopener noreferrer" className="block underline underline-offset-4">{clinicConfig.address}</a>
          <a href={`mailto:${clinicConfig.supportEmail}`} className="inline-flex min-h-8 items-center underline underline-offset-4">{clinicConfig.supportEmail}</a>
        </address>
        <div className="col-start-2 space-y-2 text-sm lg:col-start-auto">
          <a href={`tel:${clinicConfig.hotline.replace(/\s+/g, "")}`} className="inline-flex min-h-9 items-center gap-3">Tổng đài <strong className="text-xl tabular-nums">{clinicConfig.hotline}</strong></a>
          <p className="leading-relaxed">{clinicConfig.workingHours}</p>
        </div>
      </div>
      <p className="border-t border-[#123C38]/15 px-5 py-3 text-center text-xs">© {new Date().getFullYear()} {clinicConfig.brandFullName}</p>
      <a href={`tel:${clinicConfig.hotline.replace(/\s+/g, "")}`} className="clinic-call" aria-label={`Liên hệ đặt lịch ngay: ${clinicConfig.hotline}`}><span>Liên hệ đặt lịch ngay</span><Phone aria-hidden="true" /></a>
    </footer>
  );
}
