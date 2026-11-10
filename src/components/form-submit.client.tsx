"use client";

import { formatDateOnlyDisplay } from "@/lib/dates";

import { useFormStatus } from "react-dom";
import {
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Dialog, DialogContent, PendingDialog } from "./dialog.client";
import { useRouter } from "next/navigation";

const activeSubmitters = new WeakMap<HTMLFormElement, HTMLButtonElement>();

export function FormSubmit({
  label,
  pendingLabel = "Đang xử lý…",
  children,
  disabled,
  className = "public-primary w-full",
  confirmation,
  destructive = false,
  hideTrigger = false,
  onClick,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  label?: string;
  pendingLabel?: string;
  destructive?: boolean;
  hideTrigger?: boolean;
  confirmation?: {
    title: string;
    message: string;
    label?: string;
    openInitially?: boolean;
    details?: ReactNode;
    selectedTimeField?: string;
    warning?: boolean;
    fields?: { name: string; label: string }[];
  };
}) {
  const { pending } = useFormStatus();
  const router = useRouter();
  const [submitter, setSubmitter] = useState<HTMLButtonElement | null>(null);
  const [{ open, selectedTime }, setConfirmationView] = useState({
    open: confirmation?.openInitially ?? false,
    selectedTime: "",
  });
  const setOpen = (value: boolean) =>
    setConfirmationView((previous) => ({ ...previous, open: value }));
  const dismissConfirmation = () => {
    setOpen(false);
    if (confirmation?.openInitially) {
      const url = new URL(window.location.href);
      for (const key of ["earlyWarning", "overdueWarning", "warningMsg", "pendingDoctorId", "action"]) url.searchParams.delete(key);
      router.replace(url.pathname + url.search, {scroll: false});
    }
  };
  const button = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();
  const [review, setReview] = useState<{ label: string; value: string }[]>([]);
  return (
    <>
      <button
        {...props}
        ref={button}
        type="submit"
        style={hideTrigger ? {display: "none"} : props.style}
        className={
          destructive
            ? `public-danger ${className.replace(/public-primary/g, "")}`
            : className
        }
        onClick={(event) => {
          setSubmitter(event.currentTarget);
          if (event.currentTarget.form) activeSubmitters.set(event.currentTarget.form, event.currentTarget);
          onClick?.(event);
          if (!confirmation || event.defaultPrevented) return;
          event.preventDefault();
          const form = event.currentTarget.form;
          if (form?.reportValidity()) {
            setReview(
              (confirmation.fields ?? []).map((field) => {
                const controls = Array.from(form.elements).filter(
                  (element): element is HTMLInputElement | HTMLSelectElement =>
                    (element instanceof HTMLInputElement ||
                      element instanceof HTMLSelectElement) &&
                    element.name === field.name,
                );
                const value = controls
                  .filter(
                    (control) =>
                      !(control instanceof HTMLInputElement) ||
                      control.type !== "checkbox" ||
                      control.checked,
                  )
                  .map((control) =>
                    control instanceof HTMLSelectElement
                      ? (control.selectedOptions[0]?.textContent ?? "")
                      : control.type === "checkbox"
                        ? (control.closest("label")?.textContent?.trim() ?? "")
                        : control.type === "date"
                          ? formatDateOnlyDisplay(control.value)
                          : control.value,
                  )
                  .join(", ");
                return { label: field.label, value: value || "Không chọn" };
              }),
            );
            const selected = Array.from(
              form.querySelectorAll<HTMLInputElement>("input:checked"),
            ).find((input) => input.name === confirmation.selectedTimeField);
            setConfirmationView({
              open: true,
              selectedTime:
                selected?.closest("label")?.textContent?.trim() ?? "",
            });
          }
        }}
        disabled={disabled || pending}
        aria-busy={pending}
      >
        {children ?? label}
      </button>
      <PendingDialog open={pending && Boolean(submitter?.form && activeSubmitters.get(submitter.form) === submitter)} label={pendingLabel} />
      {confirmation && (
        <Dialog open={open} onOpenChange={value => value ? setOpen(true) : dismissConfirmation()}>
          <DialogContent aria-labelledby={titleId} aria-describedby={messageId}>
            <h2 id={titleId} className="pr-10 text-xl font-semibold">
              {confirmation.title}
            </h2>
            <p
              id={messageId}
              className={`text-sm leading-relaxed ${destructive ? "rounded-md bg-rose-50 p-3 font-medium text-rose-900" : confirmation.warning ? "rounded-md bg-[#eef3f5] p-3 font-medium text-[#174954]" : "text-slate-700"}`}
            >
              {confirmation.message}
            </p>
            {confirmation.details}
            {!!review.length && (
              <dl className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm">
                {review.map((row) => (
                  <div
                    key={row.label}
                    className="grid gap-1 sm:grid-cols-[140px_minmax(0,1fr)]"
                  >
                    <dt className="text-slate-600">{row.label}</dt>
                    <dd className="font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {confirmation.selectedTimeField && (
              <p className="text-sm">
                Giờ khám:{" "}
                <strong className="tabular-nums">{selectedTime}</strong>
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={dismissConfirmation}
                className="public-secondary"
              >
                Không thực hiện
              </button>
              <button
                type="button"
                disabled={pending}
                className={
                  destructive ? "public-danger" : confirmation.warning ? "public-warning" : "public-primary min-h-11"
                }
                onClick={() => {
                  const submitter = button.current;
                  setOpen(false);
                  if (submitter?.form) {
                    setSubmitter(submitter);
                    activeSubmitters.set(submitter.form, submitter);
                    submitter.form.requestSubmit(submitter);
                  }
                }}
              >
                {confirmation.label ?? "Xác nhận"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
