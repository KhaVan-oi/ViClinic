import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsPDF } from "jspdf";
import { autoTable, type CellInput } from "jspdf-autotable";
import { clinicConfig } from "@/config/clinic";
import { formatExportTime } from "@/lib/dates";

export async function createPdf(title: string, subtitle: string, landscape = false) {
  const [regular, bold, logo] = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/BeVietnamPro-Regular.ttf")),
    readFile(path.join(process.cwd(), "public/fonts/BeVietnamPro-Bold.ttf")),
    readFile(path.join(process.cwd(), "public/images/brand/logo.png")),
  ]);
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("ViClinic-Regular.ttf", regular.toString("base64"));
  doc.addFileToVFS("ViClinic-Bold.ttf", bold.toString("base64"));
  doc.addFont("ViClinic-Regular.ttf", "ViClinic", "normal");
  doc.addFont("ViClinic-Bold.ttf", "ViClinic", "bold");
  doc.setProperties({ title, author: clinicConfig.brandFullName, creator: "ViClinic" });
  const width = doc.internal.pageSize.getWidth();
  doc.setFont("ViClinic", "normal").setFontSize(10);
  const subtitleLines = doc.splitTextToSize(subtitle, width - 30) as string[];
  const contentTop = 61 + subtitleLines.length * 5;
  const image = doc.getImageProperties(new Uint8Array(logo));
  const drawnHeaders = new Set<number>();
  let nextY = contentTop;
  function header() {
    const page = doc.getCurrentPageInfo().pageNumber;
    if (drawnHeaders.has(page)) return;
    drawnHeaders.add(page);
    doc.addImage(new Uint8Array(logo), "PNG", 15, 12, 42, 42 * image.height / image.width);
    doc.setFont("ViClinic", "bold").setFontSize(16).setTextColor("#0b2545");
    doc.text(doc.splitTextToSize(title, width - 90), width - 15, 20, { align: "right" });
    doc.setFontSize(10);
    doc.text(clinicConfig.brandFullName, 15, 34);
    doc.setFont("ViClinic", "normal").setFontSize(8).setTextColor("#526579");
    doc.text(clinicConfig.address, 15, 40);
    doc.setFontSize(10).setTextColor("#0b2545");
    doc.text(subtitleLines, 15, 49);
    doc.setDrawColor("#d5e2e5").line(15, contentTop - 7, width - 15, contentTop - 7);
  }
  return {
    doc,
    table(head: CellInput[], body: CellInput[][]) {
      autoTable(doc, {
        startY: nextY,
        margin: { top: contentTop, bottom: 22, left: 15, right: 15 },
        head: [head], body, theme: "striped",
        styles: { font: "ViClinic", fontSize: 10, cellPadding: 4, valign: "middle", overflow: "linebreak", textColor: "#0b2545" },
        headStyles: { fontStyle: "bold", fillColor: "#0a6e63", textColor: "#ffffff" },
        alternateRowStyles: { fillColor: "#f0f6f5" },
        rowPageBreak: "avoid",
        willDrawPage: header,
        didDrawPage: data => { nextY = (data.cursor?.y ?? contentTop) + 10; },
      });
    },
  };
}

export function pdfResponse(doc: jsPDF, filename: string, generatedAt: Date) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setFont("ViClinic", "normal").setFontSize(8).setTextColor("#526579");
    doc.text(`Trang ${page}/${pages}`, 15, height - 10);
    doc.text(`Thời gian xuất: ${formatExportTime(generatedAt)}`, width - 15, height - 10, { align: "right" });
  }
  return new Response(doc.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
