import { z } from "zod";
import { isValidIsoDate } from "@/lib/dates";

export interface ReportFilterInput {
  fromDate: string;
  toDate: string;
  doctorId?: number | null;
  period?: "DAY" | "WEEK" | "MONTH" | "QUARTER";
  page?: number;
  exportDetails?: boolean;
}

export interface ReportDoctorOption {
  userId: number;
  fullName: string;
}

export interface AppointmentReportDto {
  fromDate: string;
  toDate: string;
  doctorId: number | null;
  doctorName: string | null;
  metrics: {
    total: number;
    completed: number;
    cancelled: number;
    pending: number;
    confirmed: number;
  };
  doctors: ReportDoctorOption[];
  byService: { label: string; count: number; cancelled: number }[];
  byDoctor: { label: string; count: number; cancelled: number }[];
  byDate: { label: string; count: number; cancelled: number }[];
  period: "DAY" | "WEEK" | "MONTH" | "QUARTER";
  byPeriod: {label:string;count:number;cancelled:number}[];
  detailTotal: number;
  detailPage: number;
  detailPageSize: number;
  details: { code: string; service: string; doctor: string; slot: string; date: string; time: string; duration: number; status: string }[];
}

export const reportFilterSchema = z
  .object({
    fromDate: z.string().refine(isValidIsoDate, "Ngày bắt đầu không hợp lệ."),
    toDate: z.string().refine(isValidIsoDate, "Ngày kết thúc không hợp lệ."),
    doctorId: z.number().int().positive().nullable().optional(),
    period: z.enum(["DAY","WEEK","MONTH","QUARTER"]).default("DAY"),
  })
  .refine((val) => val.fromDate <= val.toDate, {
    message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.",
    path: ["toDate"],
  });

