import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { BULK_LIMITS, bulkKinds, type BulkKind } from "@/lib/bulk";
import { type RoleName } from "@/config/business";
import { requireActiveContext } from "@/server/authorization";
import { apiErrorResponse } from "@/lib/errors";
import { formatClinicIsoDate, exportTimeSuffix, formatExportTime } from "@/lib/dates";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") as BulkKind;
  if (!Object.hasOwn(bulkKinds, kind))
    return Response.json({ error: "Loại mẫu không hợp lệ." }, { status: 400 });
  try {
    await requireActiveContext([bulkKinds[kind].role as RoleName]);
    const generatedAt = new Date();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ViClinic";
    workbook.created = generatedAt;
    const sheet = workbook.addWorksheet("Dữ liệu");
    sheet.addRow([...bulkKinds[kind].columns]);
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF096B60" },
    };
    sheet.columns.forEach((column) => {
      column.width = 30;
      column.numFmt = "@";
    });
    sheet.views=[{state:"frozen",ySplit:1}];
    sheet.autoFilter={from:{row:1,column:1},to:{row:BULK_LIMITS.rows + 1,column:sheet.columnCount}};
    for(let row=2;row<=BULK_LIMITS.rows + 1;row++) for(let col=1;col<=sheet.columnCount;col++) {
      const cell=sheet.getCell(row,col);
      cell.alignment={vertical:"middle",wrapText:true};
      cell.border={bottom:{style:"hair",color:{argb:"FFE1E8E5"}}};
      if (kind === "staff" && col === 5) cell.dataValidation={type:"list",allowBlank:false,formulae:['"Bác sĩ,Lễ tân,Quản lý,Quản trị viên"']};
      if (kind === "staff" && col === 6) cell.dataValidation={type:"list",allowBlank:false,formulae:['"Có,Không"']};
      if (kind === "services" && col === 2) cell.dataValidation={type:"whole",operator:"greaterThan",allowBlank:false,formulae:[0],showErrorMessage:true,error:"Nhập số phút nguyên lớn hơn 0."};
    }
    const notes = workbook.addWorksheet("Hướng dẫn");
    notes.columns = [{ width: 32 }, { width: 68 }, { width: 32 }];
    notes.addRow(["Cách nhập", "Điền sheet Dữ liệu, giữ nguyên tiêu đề. Tối đa 200 dòng. Tải lên để xem trước, kiểm tra lỗi rồi mới xác nhận lưu."]);
    notes.addRow(["Định dạng", "Số điện thoại giữ số 0 đầu; ngày yyyy-mm-dd; giờ HH:mm. Không dùng công thức. Sheet Ví dụ chỉ để tham khảo, không tự nhập vào hệ thống."]);
    notes.addRow([]);
    notes.addRow(["Trường", "Cách điền", "Ví dụ"]);
    const exampleDate = formatClinicIsoDate(new Date(Date.now() + 86_400_000));
    const examples = {
      services: ["Dịch vụ mới", "30"],
      staff: ["Nguyễn Văn An", "0901234567", "1990-01-15", "an@example.com", "Lễ tân", "Không"],
      patients: ["Nguyễn Văn An", "0901234567", "1990-01-15", "an@example.com"],
      shifts: ["", exampleDate, "08:00", "12:00"],
      unavailable: [exampleDate, "08:00", "09:00"],
    };
    if (kind === "shifts") {
      const doctors = await db.user.findMany({
        where: { roles: { some: { role: "DOCTOR" } } },
        select: { userId: true, fullName: true }, orderBy: { userId: "asc" },
      });
      const directory = workbook.addWorksheet("Bác sĩ");
      directory.columns = [{ header: "Mã bác sĩ", width: 18 }, { header: "Họ và tên", width: 40 }];
      doctors.forEach(doctor => directory.addRow([doctor.userId, doctor.fullName]));
      directory.views = [{ state: "frozen", ySplit: 1 }];
      examples.shifts[0] = doctors[0] ? String(doctors[0].userId) : "Mã trong sheet Bác sĩ";
      if (doctors.length) workbook.definedNames.add(`'B\u00e1c s\u0129'!$A$2:$A$${doctors.length + 1}`, "DoctorIds");
      if (doctors.length) for (let row = 2; row <= BULK_LIMITS.rows + 1; row++) sheet.getCell(row, 1).dataValidation = { type: "list", allowBlank: false, formulae: ["DoctorIds"], showErrorMessage: true, error: "Chọn mã trong danh sách bác sĩ." };
    }
    const rules: Record<string, string> = {
      "Ngày sinh (yyyy-mm-dd)": "Bắt buộc. Từ 1900-01-01 đến hôm nay, định dạng yyyy-mm-dd.",
      "Họ và tên": "Bắt buộc. Nhập họ tên đầy đủ.",
      "Số điện thoại": "Bắt buộc. Số Việt Nam, giữ số 0 đầu.",
      "Email": "Không bắt buộc. Để trống nếu chưa có.",
      "Vai trò": "Chọn Bác sĩ, Lễ tân, Quản lý hoặc Quản trị viên.",
      "Hồ sơ khám bệnh (Có/Không)": "Chọn Có nếu nhân sự cần đặt lịch cho bản thân; còn lại chọn Không.",
      "Mã bác sĩ": "Chọn mã từ sheet Bác sĩ; không nhập họ tên thay mã.",
      "Thời lượng (phút)": "Bắt buộc. Số nguyên dương, đơn vị phút.",
    };
    bulkKinds[kind].columns.forEach((column, index) => notes.addRow([column, rules[column] ?? (column.includes("HH:mm") ? "Bắt buộc. Giờ 24h HH:mm; kết thúc sau bắt đầu trong cùng ngày." : column.includes("yyyy-mm-dd") ? "Bắt buộc. Ngày yyyy-mm-dd; chọn ngày phù hợp trước khi tải lên." : "Bắt buộc. Nhập tên, không để trống."), examples[kind][index]]));
    const sample = workbook.addWorksheet("Ví dụ");
    sample.addRow([...bulkKinds[kind].columns]);
    sample.addRow(examples[kind]);
    sample.columns.forEach(column => { column.width = 30; column.numFmt = "@"; });
    for (const tab of [notes, sample]) tab.eachRow(row => row.eachCell(cell => { cell.alignment = { vertical: "middle", wrapText: true }; }));
    notes.getRow(1).height = 48;
    notes.getRow(2).height = 64;
    notes.getRow(4).font = { bold: true };
    notes.addRow(["Thời gian xuất", formatExportTime(generatedAt)]);
    return new Response(new Uint8Array(await workbook.xlsx.writeBuffer()), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="viclinic-${kind}-template-${exportTimeSuffix(generatedAt)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Không tạo được mẫu.");
  }
}
