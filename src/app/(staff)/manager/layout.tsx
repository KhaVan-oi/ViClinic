import React from "react";
import { StaffRoleLayoutGuard } from "@/app/(staff)/access";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffRoleLayoutGuard requiredRole="CLINIC_MANAGER">
      {children}
    </StaffRoleLayoutGuard>
  );
}
