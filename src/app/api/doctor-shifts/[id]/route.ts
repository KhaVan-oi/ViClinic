import { NextRequest, NextResponse } from 'next/server';
import { updateShiftSchema } from '@/lib/validations/doctor-schedule';
import { DoctorScheduleService } from '@/lib/services/doctor-schedule';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * PUT /api/doctor-shifts/[id]
 * Cập nhật ca làm việc (FR-M03-001, UF-14)
 * Không cho phép chồng lấn ca. Trả về danh sách lịch hẹn bị ảnh hưởng để Lễ tân điều phối (FR-M03-004).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const shiftId = parseInt(params.id, 10);
    if (isNaN(shiftId) || shiftId <= 0) {
      return NextResponse.json({ error: 'Mã ca làm việc không hợp lệ' }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateShiftSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dữ liệu cập nhật không hợp lệ', details: validation.error.format() },
        { status: 400 }
      );
    }

    const result = DoctorScheduleService.updateShift(shiftId, validation.data);
    return NextResponse.json(
      {
        success: true,
        message: 'Cập nhật ca làm việc thành công',
        data: result.shift,
        affected_appointments: result.affected_appointments,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi cập nhật ca làm việc' },
      { status: 409 }
    );
  }
}

/**
 * DELETE /api/doctor-shifts/[id]
 * Xóa ca làm việc. Trả về các lịch hẹn bị ảnh hưởng khi ca bị hủy (FR-M03-004)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const shiftId = parseInt(params.id, 10);
    if (isNaN(shiftId) || shiftId <= 0) {
      return NextResponse.json({ error: 'Mã ca làm việc không hợp lệ' }, { status: 400 });
    }

    const result = DoctorScheduleService.deleteShift(shiftId);
    return NextResponse.json(
      {
        success: true,
        message: 'Xóa ca làm việc thành công',
        deleted_shift: result.deleted_shift,
        affected_appointments: result.affected_appointments,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi khi xóa ca làm việc' },
      { status: 404 }
    );
  }
}
