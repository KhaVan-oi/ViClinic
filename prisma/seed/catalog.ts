export interface SeedServiceDef {
  serviceId: number;
  code: string;
  name: string;
  durationMinutes: number;
  isActive: boolean;
}

export const SEED_SERVICES: readonly SeedServiceDef[] = [
  { serviceId: 1, code: "S01", name: "Khám tổng quát", durationMinutes: 30, isActive: true },
  { serviceId: 2, code: "S02", name: "Khám Nội", durationMinutes: 30, isActive: true },
  { serviceId: 3, code: "S03", name: "Khám Nhi", durationMinutes: 30, isActive: true },
  { serviceId: 4, code: "S04", name: "Tai Mũi Họng", durationMinutes: 30, isActive: true },
  { serviceId: 5, code: "S05", name: "Da liễu", durationMinutes: 30, isActive: true },
  { serviceId: 6, code: "S06", name: "Cơ Xương Khớp", durationMinutes: 45, isActive: false },
  { serviceId: 7, code: "S07", name: "Tim mạch", durationMinutes: 45, isActive: true },
  { serviceId: 8, code: "S08", name: "Mắt", durationMinutes: 30, isActive: true },
] as const;

export const SERVICE_DURATION_BY_ID: Record<number, number> = Object.fromEntries(
  SEED_SERVICES.map((s) => [s.serviceId, s.durationMinutes])
);
