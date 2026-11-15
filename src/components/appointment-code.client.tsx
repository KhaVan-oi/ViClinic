"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function AppointmentCode({ appointmentId }: { appointmentId: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const code = `VC-${String(appointmentId).padStart(6, "0")}`;
  useEffect(() => {
    if (svg.current) JsBarcode(svg.current, code, { format: "CODE128", width: 1.5, height: 40, displayValue: false, margin: 8 });
  }, [code]);
  return <div className="appointment-code-line"><svg ref={svg} role="img" aria-label={`Mã vạch ${code}`} /></div>;
}
