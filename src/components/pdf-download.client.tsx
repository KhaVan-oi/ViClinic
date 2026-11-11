"use client";

import { useRef, useState } from "react";

export function PdfDownloadButton({ href }: { href: string }) {
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(href, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? "Không xuất được PDF. Vui lòng thử lại.");
      }
      if (!response.headers.get("content-type")?.includes("application/pdf")) throw new Error("Không nhận được file PDF.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "ViClinic.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không xuất được PDF. Vui lòng thử lại.");
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return <div>
    <button type="button" className="public-secondary" disabled={pending} aria-busy={pending} onClick={() => void download()}>{pending ? "Đang xuất PDF…" : "Xuất PDF"}</button>
    {error && <p role="alert" className="mt-2 max-w-md text-sm text-rose-800">{error}</p>}
  </div>;
}
