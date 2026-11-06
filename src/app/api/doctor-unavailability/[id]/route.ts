import { NextRequest, NextResponse } from 'next/server';
import { DoctorScheduleService } from '@/lib/services/doctor-schedule';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * DELETE /api/doctor-unavailability/[id]
 * Hủy ghi nhận khoảng không sẵn sàng của bác sĩ
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const unavailId = parseInt(params.id, 10);
    if (isNaN(unavailId) || unavailId <= 0) {
      return NextResponse.json({ error: 'Mã không sẵn sàng không hợp lệ' }, { status: 400 });
    }

    const result = DoctorScheduleService.deleteUnavailability(unavailId);
    return NextResponse.json(
      {
        success: true,
        message: 'Đã xóa khoảng không sẵn sàng',
        deleted_unavailability: result.deleted_unavailability,
        affected_appointments: result.affected_appointments,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa' }, { status: 404 });
  }
}
