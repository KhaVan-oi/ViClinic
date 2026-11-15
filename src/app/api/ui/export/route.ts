import { readPrivateSearch } from "@/server/private-search";
import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { z } from "zod";
import { requireActiveContext } from "@/server/authorization";
import { getDoctorAppointments, getReceptionAppointments, appointmentSearch } from "@/modules/appointments/queries";
import { listPatientsForReception } from "@/modules/patients/server";
import type { DoctorAppointmentTab, ReceptionQueueTab } from "@/modules/appointments/contracts";
import { db } from "@/server/db";
import { isValidIsoDate, parseDateOnlyUtc, formatClinicIsoDate, formatClinicTime, exportTimeSuffix, formatExportTime } from "@/lib/dates";
import { apiErrorResponse } from "@/lib/errors";
import { formatAppointmentStatusLabel } from "@/config/business";

const filters = z.object({ kind: z.enum(["appointments","patients"]), period: z.enum(["morning", "afternoon", "day"]).optional(), tab: z.string().max(40).optional(), status: z.enum(["ALL","PENDING","CONFIRMED","COMPLETED","CANCELLED"]).optional(), query: z.string().max(120).optional(), date: z.string().refine(isValidIsoDate).optional(), doctorId: z.coerce.number().int().positive().optional(), serviceId: z.coerce.number().int().positive().optional(), appointments: z.enum(["upcoming","none"]).optional() });

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveContext(["RECEPTIONIST","DOCTOR"]);
    const input = filters.parse(Object.fromEntries([...request.nextUrl.searchParams].filter(([, value]) => value !== "")));
    input.query = await readPrivateSearch(ctx.activeContext === "DOCTOR" ? "/doctor/appointments" : input.kind === "patients" ? "/reception/patients" : "/reception/appointments");
    const generatedAt = new Date();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ViClinic";
    workbook.created = generatedAt;
    const sheet = workbook.addWorksheet(input.kind === "patients" ? "Người khám bệnh" : "Lịch hẹn");
    if (input.kind === "patients" && ctx.activeContext === "DOCTOR") {
      const people = await db.user.findMany({ where: { patientAppointments: {some: {doctorId:ctx.userId,...appointmentSearch(input.query)}} }, select:{userId:true,fullName:true,birthDate:true,_count:{select:{patientAppointments:{where:{doctorId:ctx.userId}}}}}, orderBy:{userId:"asc"}, take:5001 });
      if (people.length>5000) return Response.json({error:"Có hơn 5.000 hồ sơ. Thu hẹp bộ lọc trước khi xuất."},{status:400});
      sheet.addRow(["Họ tên","Ngày sinh","Số lịch được phân công"]);
      people.forEach(person=>sheet.addRow([person.fullName,person.birthDate ?? "",person._count.patientAppointments]));
    } else {
      const fetchRows = async () => {
        if (input.kind === "patients") {
          const result = await listPatientsForReception({searchQuery:input.query,appointments:input.appointments,page:1,pageSize:5001},ctx,5001);
          return {rows:result.items.map(person=>[person.fullName,person.phone,person.birthDate ? parseDateOnlyUtc(person.birthDate) : "",person.email ?? "",person.appointmentCount])};
        }
        const result = ctx.activeContext === "DOCTOR"
          ? await getDoctorAppointments({query:input.query,date:input.date,status:input.status,serviceId:input.serviceId,tab:input.tab as DoctorAppointmentTab | undefined,page:1,pageSize:5001},ctx,5001)
          : await getReceptionAppointments({...input,tab:input.tab as ReceptionQueueTab | undefined,page:1,pageSize:5001},ctx,5001);
        return {rows:result.items.map(item=>[`VC-${String(item.appointmentId).padStart(6,"0")}`,item.patientName,...("patientPhone" in item ? [item.patientPhone] : []),item.patientBirthDate ? parseDateOnlyUtc(item.patientBirthDate) : "",item.serviceName,item.doctorName ?? "Cần phân công",parseDateOnlyUtc(formatClinicIsoDate(new Date(item.startAtIso))),`${formatClinicTime(new Date(item.startAtIso))}–${formatClinicTime(new Date(item.endAtIso))}`,Math.round((Date.parse(item.endAtIso)-Date.parse(item.startAtIso))/60000),formatAppointmentStatusLabel(item.status)])};
      };
      const first = await fetchRows();
      if (first.rows.length>5000) return Response.json({error:"Có hơn 5.000 dòng. Thu hẹp bộ lọc trước khi xuất."},{status:400});
      sheet.addRow(input.kind === "patients" ? ["Họ tên","Số điện thoại","Ngày sinh","Email","Số lịch hẹn"] : ["Mã lịch hẹn","Người khám bệnh",...(ctx.activeContext === "RECEPTIONIST" ? ["Số điện thoại"] : []),"Ngày sinh","Dịch vụ","Bác sĩ","Ngày khám","Giờ khám","Thời lượng (phút)","Trạng thái"]);
      sheet.addRows(first.rows);
    }
    sheet.pageSetup={paperSize:9,orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:"1:1"};
    sheet.headerFooter.oddHeader="&CPhòng khám Đa khoa ViClinic";
    sheet.headerFooter.oddFooter=`&LTrang &P / &N&RThời gian xuất: ${formatExportTime(generatedAt)}`;
    sheet.views=[{state:"frozen",ySplit:1}];
    sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:sheet.columnCount}};
    sheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};
    sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0A6E63"}};
    sheet.columns.forEach(column=>{column.width=24;column.alignment={vertical:"middle",wrapText:true};});
    sheet.eachRow(row=>row.eachCell(cell=>{if(cell.value instanceof Date) cell.numFmt="dd/mm/yyyy";}));
    return new Response(new Uint8Array(await workbook.xlsx.writeBuffer()),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="viclinic-${input.kind}-${exportTimeSuffix(generatedAt)}.xlsx"`,"Cache-Control":"no-store"}});
  } catch (error) {
    return apiErrorResponse(error, "Không xuất được dữ liệu. Kiểm tra bộ lọc và thử lại.", 400);
  }
}
