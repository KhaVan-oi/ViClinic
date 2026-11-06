import { z } from 'zod';

/**
 * Zod validation schema for creating a doctor shift (FR-M03-001)
 */
export const createShiftSchema = z.object({
  doctor_id: z.coerce.number({
    required_error: 'doctor_id là bắt buộc',
    invalid_type_error: 'doctor_id phải là số nguyên',
  }).int().positive('Mã bác sĩ phải lớn hơn 0'),
  start_at: z.string({
    required_error: 'start_at là bắt buộc',
  }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'start_at phải là định dạng thời gian ISO 8601 hợp lệ',
  }),
  end_at: z.string({
    required_error: 'end_at là bắt buộc',
  }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'end_at phải là định dạng thời gian ISO 8601 hợp lệ',
  }),
}).refine(
  (data) => new Date(data.end_at).getTime() > new Date(data.start_at).getTime(),
  {
    message: 'Thời điểm kết thúc ca (end_at) phải sau thời điểm bắt đầu (start_at)',
    path: ['end_at'],
  }
);

/**
 * Zod validation schema for updating a doctor shift (FR-M03-001)
 */
export const updateShiftSchema = z.object({
  doctor_id: z.coerce.number().int().positive().optional(),
  start_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'start_at phải là định dạng thời gian ISO 8601 hợp lệ',
  }).optional(),
  end_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'end_at phải là định dạng thời gian ISO 8601 hợp lệ',
  }).optional(),
}).refine(
  (data) => {
    if (data.start_at && data.end_at) {
      return new Date(data.end_at).getTime() > new Date(data.start_at).getTime();
    }
    return true;
  },
  {
    message: 'Thời điểm kết thúc ca (end_at) phải sau thời điểm bắt đầu (start_at)',
    path: ['end_at'],
  }
);

/**
 * Zod validation schema for doctor unavailability (FR-M03-002)
 */
export const createUnavailabilitySchema = z.object({
  doctor_id: z.coerce.number({
    required_error: 'doctor_id là bắt buộc',
    invalid_type_error: 'doctor_id phải là số nguyên',
  }).int().positive('Mã bác sĩ phải lớn hơn 0'),
  start_at: z.string({
    required_error: 'start_at là bắt buộc',
  }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'start_at phải là định dạng thời gian ISO 8601 hợp lệ',
  }),
  end_at: z.string({
    required_error: 'end_at là bắt buộc',
  }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'end_at phải là định dạng thời gian ISO 8601 hợp lệ',
  }),
}).refine(
  (data) => new Date(data.end_at).getTime() > new Date(data.start_at).getTime(),
  {
    message: 'Thời điểm kết thúc khoảng bận (end_at) phải sau thời điểm bắt đầu (start_at)',
    path: ['end_at'],
  }
);

/**
 * Query filters for doctor schedule
 */
export const scheduleQuerySchema = z.object({
  doctor_id: z.coerce.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date phải có dạng YYYY-MM-DD').optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type CreateUnavailabilityInput = z.infer<typeof createUnavailabilitySchema>;
export type ScheduleQueryInput = z.infer<typeof scheduleQuerySchema>;
