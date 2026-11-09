"use server";

import ExcelJS from "exceljs";
import { unzipSync, zipSync } from "fflate";
import { revalidatePath } from "next/cache";
import { BULK_LIMITS, bulkKinds, type BulkKind, type BulkRow } from "@/lib/bulk";
import { requireActiveContext } from "@/server/authorization";
import { isDomainError } from "@/lib/errors";
import { createService } from "@/modules/scheduling/services";
import { createShift, createUnavailability } from "@/modules/scheduling/shifts";
import { createOrReuseStaff } from "@/modules/identity/staff";
import { createPatientContext } from "@/modules/patients/server";
import { type RoleName, type StaffRoleName } from "@/config/business";

async function authorize(kind: BulkKind) {
  if (!Object.hasOwn(bulkKinds, kind))
    throw new Error("Loại dữ liệu không hợp lệ.");
  return requireActiveContext([bulkKinds[kind].role as RoleName]);
}

export async function previewBulkFile(
  kind: BulkKind,
  data: FormData,
): Promise<{ rows?: BulkRow[]; error?: string }> {
  await authorize(kind);
  const file = data.get("file");
  if (
    !(file instanceof File) ||
    !file.name.toLowerCase().endsWith(".xlsx") ||
    file.size > BULK_LIMITS.fileBytes
  )
    return {
      error: "Chọn file Excel .xlsx tối đa 750 KB, không quá 200 dòng.",
    };
  try {
    let expandedSize = 0;
    let entries = 0;
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter(entry) {
        expandedSize += entry.originalSize;
        if (
          ++entries > BULK_LIMITS.archiveEntries ||
          entry.originalSize > BULK_LIMITS.entryBytes ||
          expandedSize > BULK_LIMITS.expandedBytes
        )
          throw new Error("File vượt giới hạn giải nén.");
        return true;
      },
    });
    if (
      Object.values(files).reduce((size, bytes) => size + bytes.length, 0) >
      BULK_LIMITS.expandedBytes
    )
      throw new Error("File quá lớn.");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      Uint8Array.from(zipSync(files, { level: 0 })).buffer,
    );
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount > BULK_LIMITS.rows + 1 || sheet.columnCount > BULK_LIMITS.columns)
      return {
        error: "File phải có một dòng tiêu đề và tối đa 200 dòng dữ liệu.",
      };
    const columns = bulkKinds[kind].columns;
    if (
      columns.some(
        (label, index) =>
          sheet
            .getRow(1)
            .getCell(index + 1)
            .text.trim() !== label,
      )
    )
      return {
        error: "Tiêu đề cột không khớp. Tải mẫu Excel mới rồi nhập lại.",
      };
    const rows: BulkRow[] = [];
    let invalidCell = "";
    sheet.eachRow((row, index) => {
      row.eachCell((cell, column) => {
        if (column > columns.length && cell.text.trim()) invalidCell = `Dòng ${index}: có dữ liệu ngoài các cột của mẫu. Kiểm tra và bỏ cột dư trước khi nhập.`;
      });
      if (index === 1) return;
      const values = columns.map((_, col) => {
        const cell = row.getCell(col + 1);
        if (cell.type === ExcelJS.ValueType.Formula)
          invalidCell = `Dòng ${index}, cột ${col + 1}: không chấp nhận công thức. Nhập giá trị trực tiếp.`;
        const value = cell.value instanceof Date
          ? cell.value.toISOString().slice(columns[col].startsWith("Giờ") ? 11 : 0, columns[col].startsWith("Giờ") ? 16 : 10)
          : cell.text.trim();
        if (value.length > BULK_LIMITS.cellCharacters) invalidCell = `Dòng ${index}, cột ${col + 1}: nội dung vượt 250 ký tự. Rút ngắn rồi tải lại file.`;
        return value;
      });
      if (values.some(Boolean)) rows.push({ values, sourceRow: index });
    });
    if (invalidCell) return { error: invalidCell };
    return rows.length
      ? { rows }
      : { error: "File chưa có dữ liệu. Điền thông tin vào mẫu rồi tải lên." };
  } catch {
    return {
      error:
        "Không đọc được file. Dùng mẫu .xlsx, nhập giá trị văn bản và không dùng công thức.",
    };
  }
}

export async function saveBulkRow(
  kind: BulkKind,
  values: string[],
  acknowledgeImpact = false,
): Promise<Pick<BulkRow, "error" | "saved" | "impact" | "warning">> {
  const ctx = await authorize(kind);
  if (
    !Array.isArray(values) ||
    values.length !== bulkKinds[kind].columns.length ||
    values.some((value) => typeof value !== "string" || value.length > BULK_LIMITS.cellCharacters)
  )
    return { error: "Dữ liệu dòng không hợp lệ." };
  let warning: string | undefined;
  try {
    if (kind === "services")
      await createService(
        { name: values[0], durationMinutes: Number(values[1]) },
        ctx,
      );
    else if (kind === "shifts")
      await createShift(
        {
          doctorId: Number(values[0]),
          date: values[1],
          startTime: values[2],
          endTime: values[3],
        },
        ctx,
      );
    else if (kind === "patients")
      await createPatientContext(
        {
          fullName: values[0],
          phone: values[1],
          birthDate: values[2],
          email: values[3] || null,
        },
        ctx,
      );
    else if (kind === "unavailable")
      await createUnavailability(
        { date: values[0], startTime: values[1], endTime: values[2], acknowledgeImpact: acknowledgeImpact === true },
        ctx,
      );
    else {
      const roles: Record<string, StaffRoleName> = {
        "Bác sĩ": "DOCTOR",
        "Lễ tân": "RECEPTIONIST",
        "Quản lý": "CLINIC_MANAGER",
        "Quản trị viên": "ADMIN",
      };
      if (!roles[values[4]] || !["Có", "Không", ""].includes(values[5]))
        return {
          error:
            "Vai trò: Bác sĩ, Lễ tân, Quản lý hoặc Quản trị viên. Hồ sơ khám bệnh: Có hoặc Không.",
        };
      const staff = await createOrReuseStaff(
        {
          fullName: values[0],
          phone: values[1],
          birthDate: values[2] || null,
          email: values[3] || null,
          staffRole: roles[values[4]],
          includePatientRole: values[5] === "Có",
        },
        ctx,
      );
      if (staff.activationOtpSent === false) warning = "Chưa gửi được mã. Nhân sự có thể yêu cầu mã tại trang Kích hoạt tài khoản.";
    }
    for (const path of [
      "/manager",
      "/manager/services",
      "/manager/shifts",
      "/admin",
      "/admin/accounts",
      "/reception/patients",
      "/doctor/unavailability",
      "/services",
      "/",
    ])
      revalidatePath(path);
    return { saved: true, warning };
  } catch (error) {
    return {
      ...(isDomainError(error) && error.code === "CONFIRMATION_REQUIRED" && error.details?.impact ? { impact: error.details.impact as NonNullable<BulkRow["impact"]> } : {}),
      error: isDomainError(error)
        ? error.message
        : "Không lưu được dòng này. Kiểm tra dữ liệu hoặc thử lại.",
    };
  }
}
