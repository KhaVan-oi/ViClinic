import React from "react";
import { StaffRoleLayoutGuard } from "@/app/(staff)/access";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffRoleLayoutGuard requiredRole="ADMIN">{children}</StaffRoleLayoutGuard>
  );
}
