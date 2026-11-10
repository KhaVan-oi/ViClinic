import type { ComponentType } from "react";

export interface WorkspaceNavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string; }>;

}
import { type StaffRoleName } from "@/config/business";
import {
  BarChart3,
  BriefcaseMedical,
  Calendar,
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  Home,
  CalendarCheck,
  History,
} from "lucide-react";

export const NAV_BY_ROLE: Record<StaffRoleName, WorkspaceNavItem[]> = {
  RECEPTIONIST: [
    {
      href: "/reception",
      label: "Quầy tiếp đón",
      Icon: LayoutDashboard,

    },
    {
      href: "/reception/appointments",
      label: "Hàng đợi lịch hẹn",
      Icon: ClipboardList,

    },
    {
      href: "/reception/appointments/new",
      label: "Đặt lịch tại quầy",
      Icon: CalendarPlus,

    },
    {
      href: "/reception/patients",
      label: "Danh sách người khám bệnh",
      Icon: Users,

    },
    {
      href: "/reception/calendar",
      label: "Lịch phòng khám",
      Icon: Calendar,

    },
    { href: "/reception/history", label: "Lịch sử lịch hẹn", Icon: History },
  ],
  DOCTOR: [
    {
      href: "/doctor",
      label: "Hôm nay",
      Icon: LayoutDashboard,

    },
    {
      href: "/doctor/appointments",
      label: "Danh sách ca khám",
      Icon: ClipboardList,

    },
    {
      href: "/doctor/calendar",
      label: "Lịch tuần",
      Icon: Calendar,

    },
    {
      href: "/doctor/unavailability",
      label: "Báo bận",
      Icon: CalendarOff,

    },
  ],
  CLINIC_MANAGER: [
    {
      href: "/manager",
      label: "Tổng quan",
      Icon: LayoutDashboard,

    },
    {
      href: "/manager/services",
      label: "Dịch vụ khám",
      Icon: BriefcaseMedical,

    },
    {
      href: "/manager/doctor-services",
      label: "Phân công bác sĩ",
      Icon: Users,

    },
    {
      href: "/manager/shifts",
      label: "Ca làm việc",
      Icon: CalendarClock,

    },
    { href: "/manager/calendar", label: "Lịch phòng khám", Icon: Calendar },
    {
      href: "/manager/reports",
      label: "Báo cáo",
      Icon: BarChart3,

    },
  ],
  ADMIN: [
    {
      href: "/admin",
      label: "Tổng quan",
      Icon: LayoutDashboard,

    },
    {
      href: "/admin/accounts",
      label: "Tài khoản",
      Icon: ShieldCheck,

    },
    {
      href: "/admin/staff/new",
      label: "Thêm nhân sự",
      Icon: UserPlus,

    },
    {
      href: "/admin/roles",
      label: "Phân quyền",
      Icon: UserCog,

    },
    {
      href: "/admin/reactivation",
      label: "Mở lại tài khoản",
      Icon: KeyRound,

    },
  ],
};

export const PATIENT_NAV_ITEMS = [
  {
    href: "/patient",
    label: "Tổng quan",
    Icon: Home,

  },
  {
    href: "/patient/book",
    label: "Đặt lịch khám",
    Icon: CalendarPlus,

  },
  {
    href: "/patient/appointments",
    label: "Lịch hẹn của tôi",
    Icon: CalendarCheck,

  },
] satisfies WorkspaceNavItem[];
