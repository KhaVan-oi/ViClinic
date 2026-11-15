import React from "react";
import { StaffRoleLayoutGuard } from "@/app/(staff)/access";

export default function ReceptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffRoleLayoutGuard requiredRole="RECEPTIONIST">
      {children}
    </StaffRoleLayoutGuard>
  );
}
