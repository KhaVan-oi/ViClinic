import React from "react";
import { StaffRoleLayoutGuard } from "@/app/(staff)/access";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffRoleLayoutGuard requiredRole="DOCTOR">
      {children}
    </StaffRoleLayoutGuard>
  );
}
