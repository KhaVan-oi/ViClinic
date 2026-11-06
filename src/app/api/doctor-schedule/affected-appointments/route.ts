import { NextRequest, NextResponse } from 'next/server';
import { DoctorScheduleService } from '@/lib/services/doctor-schedule';

/**
 * GET /api/doctor-schedule/affected-appointments
 * Danh sách các lịch hẹn bị ảnh hưởng do thay đổi ca làm việc hoặc bác sĩ báo bận (FR-M03-004)
 * Dùng cho Lễ tân tiếp nhận và xử lý điều phối (không tự động hủy hoặc gán lại).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctor_id') ? parseInt(searchParams.get('doctor_id')!, 10) : undefined;

    const affected = DoctorScheduleService.findAffectedAppointments(doctorId);

    return NextResponse.json(
      {
        success: true,
        count: affected.length,
        data: affected,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi tra cứu lịch hẹn bị ảnh hưởng' },
      { status: 500 }
    );
  }
}
