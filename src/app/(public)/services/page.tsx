import Link from "next/link";
import { Search } from "lucide-react";
import { ServicePreview } from "@/components/service-preview";
import { getCurrentSession } from "@/server/session";
import { singleSearchParams, normalizeSearchText } from "@/lib/pagination";
import { listPublicServiceCatalog } from "@/modules/scheduling/services";

export const dynamic = "force-dynamic";

export default async function PublicServicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = singleSearchParams(await searchParams).q?.trim() ?? "";
  const [catalog, session] = await Promise.all([listPublicServiceCatalog(), getCurrentSession()]);
  const services = catalog.filter(service => normalizeSearchText(service.name).includes(normalizeSearchText(query)));
  return (
    <div className="catalog-page services-page">
      <header className="services-intro">
        <h1>Dịch vụ khám</h1><p>Chọn dịch vụ, xem bác sĩ phụ trách và tìm giờ khám.</p>
      </header>
      <section className="services-results" aria-label="Danh sách dịch vụ">
        <div className="services-toolbar"><form method="GET" action="/services" role="search" className="services-search">
          <label htmlFor="service-query" className="sr-only">Tìm dịch vụ</label><Search aria-hidden="true" /><input id="service-query" type="search" name="q" defaultValue={query} placeholder="Tìm theo tên dịch vụ" maxLength={100} />
          <button className="public-primary" type="submit">Tìm kiếm</button>
        </form>{query && <Link href="/services" className="public-text-link">Xóa bộ lọc</Link>}</div>
        <div className="services-grid">
          {services.map(service => <ServicePreview key={service.serviceId} service={service} activeContext={session?.activeContext} />)}
        </div>
        {!services.length && <div className="py-12"><h2 className="text-xl font-semibold">Không tìm thấy dịch vụ</h2><p className="mt-3">Thử tên khác hoặc <Link href="/services" className="public-text-link">xem tất cả dịch vụ</Link>.</p></div>}
      </section>
    </div>
  );
}
