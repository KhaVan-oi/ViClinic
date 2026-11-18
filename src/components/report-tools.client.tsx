import { Download } from "lucide-react";
import { PdfDownloadButton } from "./pdf-download.client";

export function ReportTools({ query }: { query: string }) {
  return <div className="flex flex-wrap gap-3">
    <a href={`/api/ui/report?${query}`} className="public-primary gap-2"><Download aria-hidden="true" className="h-4 w-4" />Xuất Excel</a>
    <PdfDownloadButton href={`/api/ui/report?${query}&format=pdf`} />
  </div>;
}
