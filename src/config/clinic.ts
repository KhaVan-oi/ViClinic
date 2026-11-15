import { BOOKING_HORIZON_DAYS, PATIENT_CANCEL_CUTOFF_MINUTES } from "./business";

export const clinicConfig = {
  displayName: "ViClinic",
  brandFullName: "Phòng khám Đa khoa ViClinic",
  subtitle: "Đồng hành cùng sức khỏe bạn",
  hotline: "1900 0091",
  emergencyPhone: "028 7102 0091",
  supportEmail: "cskh@viclinic.vn",
  address: "268 Lý Thường Kiệt, Phường Diên Hồng, TP. Hồ Chí Minh",
  workingHours: "Thứ Hai – Thứ Bảy: 08:00 – 17:00",
} as const;

export const doctorPortraits: Record<number, string> = {
  20001: "/images/doctors/20001.webp",
  20002: "/images/doctors/20002.webp",
  20003: "/images/doctors/20003.webp",
  20004: "/images/doctors/20004.webp",
  20005: "/images/doctors/20005.webp",
  20006: "/images/doctors/20006.webp",
  20007: "/images/doctors/20007.webp",
  20008: "/images/doctors/20008.webp",
  20009: "/images/doctors/20009.webp",
  20010: "/images/doctors/20010.webp",
  20011: "/images/doctors/20011.webp",
  20012: "/images/doctors/20012.webp",
  20013: "/images/doctors/20013.webp",
  20014: "/images/doctors/20014.webp",
  20015: "/images/doctors/20015.webp",
  20016: "/images/doctors/20016.webp",
};


export const BOOKING_GUIDE_STEPS = [
  { title: "Chọn lịch khám", description: "Đăng nhập, chọn dịch vụ, bác sĩ hoặc để phòng khám phân công. Chọn ngày, buổi và giờ khám, kiểm tra thông tin rồi gửi yêu cầu." },
  { title: "Theo dõi xác nhận", description: "Mở Lịch hẹn và Thông báo để xem kết quả xác nhận và bác sĩ được phân công." },
  { title: "Đến khám theo giờ hẹn", description: `Mang phiếu hẹn khi đến phòng khám. Nếu cần đổi lịch đã xác nhận, gọi ${clinicConfig.hotline}.` },
] as const;

export const BOOKING_FAQS = [
  { question: "Đặt lịch trước bao lâu?", answer: `Chọn khung giờ còn trống trong ${BOOKING_HORIZON_DAYS} ngày tới.` },
  { question: "Có cần chọn bác sĩ?", answer: "Bạn có thể để phòng khám phân công bác sĩ phù hợp." },
  { question: "Không có giờ phù hợp?", answer: "Thử ngày khác hoặc bỏ lựa chọn bác sĩ cụ thể." },
  { question: "Có thể tự đổi lịch không?", answer: `Bạn có thể đổi dịch vụ, bác sĩ và giờ khám khi lịch còn chờ xác nhận và chưa đến giờ khám. Nếu đã xác nhận, gọi ${clinicConfig.hotline}.` },
  { question: "Khi nào lịch được xác nhận?", answer: "Phòng khám sẽ liên hệ để xác nhận. Bạn có thể theo dõi trạng thái trong Lịch hẹn." },
  { question: "Có thể tự hủy lịch không?", answer: `Bạn có thể tự hủy khi còn ít nhất ${PATIENT_CANCEL_CUTOFF_MINUTES / 60} giờ trước giờ khám.` },
] as const;
