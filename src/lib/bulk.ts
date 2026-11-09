export const BULK_LIMITS = {
  fileBytes: 750_000,
  archiveEntries: 100,
  entryBytes: 6_000_000,
  expandedBytes: 12_000_000,
  rows: 200,
  columns: 20,
  cellCharacters: 250,
} as const;

export const bulkKinds = {
  services: {
    label: "dịch vụ",
    columns: ["Tên dịch vụ", "Thời lượng (phút)"],
    role: "CLINIC_MANAGER",
  },
  shifts: {
    label: "ca làm việc",
    columns: [
      "Mã bác sĩ",
      "Ngày (yyyy-mm-dd)",
      "Giờ bắt đầu (HH:mm)",
      "Giờ kết thúc (HH:mm)",
    ],
    role: "CLINIC_MANAGER",
  },
  staff: {
    label: "nhân sự",
    columns: [
      "Họ và tên",
      "Số điện thoại",
      "Ngày sinh (yyyy-mm-dd)",
      "Email",
      "Vai trò",
      "Hồ sơ khám bệnh (Có/Không)",
    ],
    role: "ADMIN",
  },
  patients: {
    label: "người khám bệnh",
    columns: ["Họ và tên", "Số điện thoại", "Ngày sinh (yyyy-mm-dd)", "Email"],
    role: "RECEPTIONIST",
  },
  unavailable: {
    label: "lịch bận",
    columns: [
      "Ngày (yyyy-mm-dd)",
      "Giờ bắt đầu (HH:mm)",
      "Giờ kết thúc (HH:mm)",
    ],
    role: "DOCTOR",
  },
} as const;
export type BulkKind = keyof typeof bulkKinds;
export type BulkRow = {
  values: string[];
  sourceRow?: number;
  error?: string;
  saved?: boolean;
  warning?: string;
  impact?: { affectedAppointments: { appointmentId: number; serviceName: string; patientName?: string; timeRangeLabel: string }[] };
};
