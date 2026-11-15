"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function SlotFilters({ children, results }: { children: ReactNode; results: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <><form onSubmit={event => event.preventDefault()} onChange={event => {
    const form = event.currentTarget;
    if (event.target instanceof HTMLSelectElement && event.target.name === "serviceId") {
      const doctor = form.elements.namedItem("doctorId");
      if (doctor instanceof HTMLSelectElement) doctor.value = "unassigned";
    }
    if (!form.checkValidity()) return;
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => { if (typeof value === "string") params.set(key, value); });
    startTransition(() => router.replace(`/reception/appointments/new?${params}`, { scroll: false }));
  }} aria-busy={pending} className="space-y-4">
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-3">{children}</fieldset>
    {pending && <p role="status" className="text-sm text-slate-600">Đang tải giờ khám…</p>}
  </form>
    <fieldset disabled={pending} aria-busy={pending} className="min-w-0 space-y-6">{results}</fieldset>
  </>;
}
