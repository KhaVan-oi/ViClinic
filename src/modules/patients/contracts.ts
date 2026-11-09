import { RoleName } from "@/config/business";
import { z } from "zod";
import { birthDateSchema, optionalEmailSchema, fullNameSchema } from "@/lib/profile";

export interface ReceptionPatientSummaryDto {
  userId: number;
  fullName: string;
  birthDate: string | null;
  phone: string;
  email: string | null;
  hasPatientRole: boolean;
  roles: RoleName[];
  appointmentCount: number;
}

export interface ReceptionPatientLookupResult {
  found: boolean;
  normalizedPhone: string;
  patient: ReceptionPatientSummaryDto | null;
}

export interface ReceptionPatientAppointmentItemDto {
  appointmentId: number;
  serviceId: number;
  serviceName: string;
  doctorId: number | null;
  doctorName: string | null;
  startAtIso: string;
  endAtIso: string;
  startAtLabel: string;
  status: string;
}

export interface ReceptionPatientDetailDto extends ReceptionPatientSummaryDto {
  appointments: ReceptionPatientAppointmentItemDto[];
}

export interface ReceptionPatientListFilter {
  searchQuery?: string;
  appointments?: "upcoming" | "none";
  page?: number;
  pageSize?: number;
}

const patientProfileSchema = z.object({
  fullName: fullNameSchema,
  birthDate: birthDateSchema,
  email: optionalEmailSchema,
});

export const patientContextInputSchema = patientProfileSchema.extend({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại."),
});

export const updatePatientBasicProfileSchema = patientProfileSchema.extend({
  userId: z.number().int().positive(),
});
