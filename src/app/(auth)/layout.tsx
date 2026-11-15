import Link from "next/link";
import Image from "next/image";
import { clinicConfig } from "@/config/clinic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#E7F0ED] text-[#0B2545]">
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[460px]">
          <div className="rounded-lg bg-white p-6 shadow-[0_12px_48px_#153c3810] sm:p-9">
            <Link href="/" aria-label="Trang chủ ViClinic" className="mx-auto mb-8 block w-fit">
              <Image src="/images/brand/logo.webp" alt="ViClinic" width={210} height={70} priority className="h-auto w-48" />
            </Link>
            {children}
          </div>
          <div className="mt-5 px-3 text-center text-sm leading-7 text-[#355D56]">
            <p>Cần hỗ trợ? Gọi <a href={`tel:${clinicConfig.hotline.replace(/\s+/g, "")}`} className="whitespace-nowrap font-semibold tabular-nums underline underline-offset-4">{clinicConfig.hotline}</a></p>
            <p>{clinicConfig.workingHours}</p>
          </div>
        </div>
      </main>
      <footer className="px-4 py-4 text-center text-xs text-slate-600">© {new Date().getFullYear()} {clinicConfig.brandFullName}</footer>
    </div>
  );
}
