import { describe, it, expect, beforeEach } from 'vitest';
import { DoctorScheduleService } from '@/lib/services/doctor-schedule';
import { createShiftSchema, createUnavailabilitySchema } from '@/lib/validations/doctor-schedule';

describe('Doctor Schedule & Shift Management (FR-M03-001, FR-M03-002, FR-M03-004)', () => {
  const today = new Date().toISOString().split('T')[0];

  it('TC-1: Zod rejects shift with end_at <= start_at', () => {
    const invalidData = {
      doctor_id: 4,
      start_at: `${today}T10:00:00+07:00`,
      end_at: `${today}T09:00:00+07:00`,
    };
    const result = createShiftSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('TC-2: Overlap check rejects shift that overlaps with existing shift of same doctor (FR-M03-001)', () => {
    // Doctor 4 already has shift 08:00 - 12:00
    expect(() => {
      DoctorScheduleService.createShift({
        doctor_id: 4,
        start_at: `${today}T11:00:00+07:00`,
        end_at: `${today}T13:00:00+07:00`,
      });
    }).toThrow(/bị trùng lặp/);
  });

  it('TC-3: Allows non-overlapping shift creation for same doctor', () => {
    // Tomorrow night
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const created = DoctorScheduleService.createShift({
      doctor_id: 4,
      start_at: `${tomorrow}T08:00:00+07:00`,
      end_at: `${tomorrow}T12:00:00+07:00`,
    });
    expect(created.shift).toBeDefined();
    expect(created.shift.doctor_id).toBe(4);
  });

  it('TC-4: Detects affected appointments when doctor declares unavailability (FR-M03-004, UF-15)', () => {
    // Appointment 101 is doctor 4, 08:30 - 09:15 CONFIRMED
    const unavail = DoctorScheduleService.createUnavailability({
      doctor_id: 4,
      start_at: `${today}T08:00:00+07:00`,
      end_at: `${today}T09:00:00+07:00`,
    });

    expect(unavail.affected_appointments.length).toBeGreaterThan(0);
    const affected = unavail.affected_appointments.find(a => a.appointment_id === 101);
    expect(affected).toBeDefined();
    expect(affected?.conflict_reason).toBe('UNAVAILABILITY_OVERLAP');
  });

  it('TC-5: System identifies affected appointments without auto-cancelling or auto-reassigning (FR-M03-004)', () => {
    const list = DoctorScheduleService.findAffectedAppointments(4);
    expect(Array.isArray(list)).toBe(true);
    // Appointments retain their status and doctor_id
    for (const appt of list) {
      expect(['PENDING', 'CONFIRMED']).toContain(appt.status);
      expect(appt.doctor_id).toBe(4);
    }
  });
});
