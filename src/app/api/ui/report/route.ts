import { exportTimeSuffix, formatExportTime, formatDateOnlyDisplay } from "@/lib/dates";
import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAppointmentReport } from "@/modules/reports/server";
import { apiErrorResponse } from "@/lib/errors";
import { createPdf, pdfResponse } from "@/server/pdf";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const view = params.get("view") ?? "all";
    const format = params.get("format") ?? "xlsx";
    if (!["xlsx", "pdf"].includes(format)) return Response.json({ error: "Định dạng báo cáo không hợp lệ." }, { status: 400 });
    if (!["all", "overview", "services", "doctors", "details"].includes(view)) {
      return Response.json({ error: "Loại báo cáo không hợp lệ." }, { status: 400 });
    }
    const report = await getAppointmentReport({
      exportDetails: view === "all" || view === "details",
      fromDate: params.get("fromDate") ?? "",
      toDate: params.get("toDate") ?? "",
      doctorId: params.get("doctorId") ? Number(params.get("doctorId")) : null,
      period: (params.get("period") ?? "DAY") as "DAY" | "WEEK" | "MONTH" | "QUARTER",
    });
    const generatedAt = new Date();
    if (format === "pdf") {
      const titles: Record<string, string> = { all: "Báo cáo lịch hẹn", overview: "Tổng quan lịch hẹn", services: "Lịch hẹn theo dịch vụ", doctors: "Lịch hẹn theo bác sĩ", details: "Chi tiết lịch hẹn" };
      const { doc, table } = await createPdf(titles[view], `${report.doctorName ?? "Toàn bộ phòng khám"} · ${formatDateOnlyDisplay(report.fromDate)} – ${formatDateOnlyDisplay(report.toDate)}`, view === "details" || view === "all");
      if (view === "overview" || view === "all") {
        const values = [["Chờ xác nhận", report.metrics.pending], ["Đã xác nhận", report.metrics.confirmed], ["Đã hoàn tất", report.metrics.completed], ["Đã hủy", report.metrics.cancelled]] as const;
        table(["Kết quả", "Số lịch", "Tỷ lệ"], values.map(([label, count]) => [label, count, `${report.metrics.total ? (count / report.metrics.total * 100).toFixed(1) : "0"}%`]));
        table(["Kỳ bắt đầu", "Tổng số lịch", "Đã hủy"], report.byPeriod.map(row => [formatDateOnlyDisplay(row.label), row.count, row.cancelled]));
      }
      if (view === "services" || view === "all") table(["Dịch vụ", "Số lịch", "Đã hủy"], report.byService.map(row => [row.label, row.count, row.cancelled]));
      if (view === "doctors" || view === "all") table(["Bác sĩ", "Số lịch", "Đã hủy"], report.byDoctor.map(row => [row.label, row.count, row.cancelled]));
      if (view === "details" || view === "all") table(["Mã lịch hẹn", "Dịch vụ", "Bác sĩ", "Ngày khám", "Giờ khám", "Phút", "Trạng thái"], report.details.map(row => [row.code, row.service, row.doctor, formatDateOnlyDisplay(row.date), row.time, row.duration, row.status]));
      return pdfResponse(doc, `Bao-cao-${view}-${exportTimeSuffix(generatedAt)}`, generatedAt);
    }
    const workbook = new ExcelJS.Workbook();
    const summary = workbook.addWorksheet("Tổng hợp");
    summary.addRows([
      ["Báo cáo lịch hẹn ViClinic"],
      ["Từ ngày", report.fromDate],
      ["Đến ngày", report.toDate],
      ["Bác sĩ", report.doctorName ?? "Toàn bộ phòng khám"],
      ["Thời gian xuất", formatExportTime(generatedAt)],
      ["Tổng số", report.metrics.total],
      ["Đã hoàn tất", report.metrics.completed],
      ["Đã hủy", report.metrics.cancelled],
      ["Chờ xác nhận",report.metrics.pending],
      ["Đã xác nhận",report.metrics.confirmed],
    ]);
    for (const [name, rows] of [
      ["Theo dịch vụ", report.byService],
      ["Theo bác sĩ", report.byDoctor],
      ["Theo ngày", report.byDate],
      ["Theo kỳ", report.byPeriod],
    ] as const) {
      const sheet = workbook.addWorksheet(name);
      sheet.addRow([name, "Số lịch", "Đã hủy"]);
      rows.forEach(row => sheet.addRow([row.label, row.count, row.cancelled]));
    }
    const details = workbook.addWorksheet("Lịch hẹn chi tiết");
    details.addRow(["Mã lịch hẹn","Dịch vụ","Bác sĩ","Ngày khám","Giờ khám","Thời lượng (phút)","Trạng thái"]);
    report.details.forEach(row=>details.addRow([row.code,row.service,row.doctor,new Date(`${row.date}T00:00:00Z`),row.time,row.duration,row.status]));
    workbook.creator="ViClinic";
    workbook.created=generatedAt;
    workbook.worksheets.forEach(sheet=>{
      sheet.views=[{state:"frozen",ySplit:1}];
      sheet.columns.forEach(column=>{column.width=28;column.alignment={vertical:"middle",wrapText:true};});
      sheet.eachRow((row,index)=>{row.height=index===1 ? 32 : 28;row.font={name:"Aptos",size:11};if(index>1 && index%2===0) row.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF2F7F6"}};});
      sheet.getRow(1).font={name:"Aptos",size:11,bold:true,color:{argb:"FFFFFFFF"}};
      sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0A6E63"}};
      sheet.pageSetup={paperSize:9,orientation:sheet===details ? "landscape" : "portrait",fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:"1:1"};
      sheet.headerFooter.oddHeader="&CPhòng khám Đa khoa ViClinic — Báo cáo lịch hẹn";
      sheet.headerFooter.oddFooter=`&LTrang &P / &N&RThời gian xuất: ${formatExportTime(generatedAt)}`;
      if(sheet!==summary) sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:sheet.columnCount}};
    });
    summary.spliceRows(1, 0, [], [], [], []);
    summary.mergeCells("A1:B3");
    summary.mergeCells("C1:F1");
    summary.mergeCells("C2:F2");
    summary.mergeCells("C3:F3");
    summary.getCell("C1").value = "Phòng khám Đa khoa ViClinic";
    summary.getCell("C2").value = "Báo cáo lịch hẹn";
    summary.getCell("C3").value = `Thời gian xuất: ${formatExportTime(generatedAt)}`;
    for (let index = 1; index <= 3; index++) {
      const row = summary.getRow(index);
      row.height = 24;
      row.font = { name: "Aptos", size: 11, bold: index < 3, color: { argb: "FF0B2545" } };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    }
    summary.mergeCells("A5:B5");
    summary.getColumn(1).width = 38;
    summary.getColumn(2).width = 32;
    const logo = await readFile(path.join(process.cwd(), "public/images/brand/logo.png"));
    const logoId = workbook.addImage({ base64: `data:image/png;base64,${logo.toString("base64")}`, extension: "png" });
    summary.addImage(logoId, { tl: { col: 0.1, row: 0.25 }, ext: { width: 135, height: 45 }, editAs: "oneCell" });
    summary.pageSetup.printArea = `A1:F${summary.rowCount}`;
    summary.pageSetup.printTitlesRow = "1:5";
    summary.views = [{ state: "frozen", ySplit: 5 }];
    for (const [cell, date] of [["B6", report.fromDate], ["B7", report.toDate]]) {
      summary.getCell(cell).value = new Date(`${date}T00:00:00Z`);
      summary.getCell(cell).numFmt = "dd/mm/yyyy";
    }
    details.getColumn(4).numFmt="dd/mm/yyyy";details.getColumn(1).width=18;details.getColumn(6).width=20;
    const sheetsByView: Record<string, string[]> = {
      overview: ["Tổng hợp", "Theo ngày", "Theo kỳ"],
      services: ["Tổng hợp", "Theo dịch vụ"],
      doctors: ["Tổng hợp", "Theo bác sĩ"],
      details: ["Tổng hợp", "Lịch hẹn chi tiết"],
    };
    if (sheetsByView[view]) {
      for (const sheet of [...workbook.worksheets]) {
        if (!sheetsByView[view].includes(sheet.name)) workbook.removeWorksheet(sheet.id);
      }
    }
    return new Response(new Uint8Array(await workbook.xlsx.writeBuffer()), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="viclinic-lich-hen-${view}-${report.fromDate}-${report.toDate}-${exportTimeSuffix(generatedAt)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Không xuất được báo cáo.");
  }
}
