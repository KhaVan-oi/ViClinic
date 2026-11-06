import { NextRequest, NextResponse } from 'next/server';
import { createUnavailabilitySchema } from '@/lib/validations/doctor-schedule';
import { DoctorScheduleService } from '@/lib/services/doctor-schedule';

/**
 * GET /api/doctor-unavailability
 * Danh sách thời gian không sẵn sàng của bác sĩ (FR-M03-002, UF-15)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctor_id') ? parseInt(searchParams.get('doctor_id')!, 10) : undefined;

    const list = DoctorScheduleService.getUnavailability({ doctor_id: doctorId });
    return NextResponse.json({ success: true, data: list }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

/**
 * POST /api/doctor-unavailability
 * Bác sĩ khai báo khoảng không sẵn sàng (FR-M03-002, UF-15)
 * Trả về danh sách lịch hẹn bị ảnh hưởng để Lễ tân điều phối (FR-M03-004)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createUnavailabilitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không sẵn sàng không hợp lệ', details: validation.error.format() },
        { status: 400 }
      );
    }

    const result = DoctorScheduleService.createUnavailability(validation.data);
    return NextResponse.json(
      {
        success: true,
        message: 'Đã ghi nhận khoảng thời gian không sẵn sàng của bác sĩ',
        data: result.unavailability,
        affected_appointments: result.affected_appointments,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 400 });
  }
}
