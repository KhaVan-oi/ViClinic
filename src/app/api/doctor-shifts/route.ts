import { NextRequest, NextResponse } from 'next/server';
import { createShiftSchema, scheduleQuerySchema } from '@/lib/validations/doctor-schedule';
import { DoctorScheduleService } from '@/lib/services/doctor-schedule';

/**
 * GET /api/doctor-shifts
 * Lấy danh sách ca làm việc của bác sĩ theo ngày hoặc mã bác sĩ
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      doctor_id: searchParams.get('doctor_id') || undefined,
      date: searchParams.get('date') || undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined,
    };

    const parsedQuery = scheduleQuerySchema.safeParse(queryParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: 'Tham số truy vấn không hợp lệ', details: parsedQuery.error.format() },
        { status: 400 }
      );
    }

    const shifts = DoctorScheduleService.getShifts(parsedQuery.data);
    return NextResponse.json({ success: true, data: shifts }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/doctor-shifts
 * Tạo ca làm việc mới cho bác sĩ (FR-M03-001, UF-14)
 * Yêu cầu: Không chồng lấn ca cùng bác sĩ. Trả về danh sách lịch hẹn bị ảnh hưởng nếu có.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createShiftSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Dữ liệu ca làm việc không hợp lệ', 
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const result = DoctorScheduleService.createShift(validation.data);
    return NextResponse.json(
      {
        success: true,
        message: 'Tạo ca làm việc thành công',
        data: result.shift,
        affected_appointments: result.affected_appointments,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi tạo ca làm việc' },
      { status: 409 } // Conflict error
    );
  }
}
