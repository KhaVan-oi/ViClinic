"use client";

import { useEffect, useRef, type RefObject } from "react";

const openModals: HTMLElement[] = [];
const inertRegions = new Map<HTMLElement, { count: number; initial: boolean }>();
let originalBodyOverflow = "";

export function useModalFocus(
  open: boolean,
  panel: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLElement | null>,
  close: () => void,
  isolateBackground = false,
) {
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; }, [close]);
  useEffect(() => {
    const element = panel.current;
    if (!open || !element) return;
    if (!openModals.length) originalBodyOverflow = document.body.style.overflow;
    const returnTarget = trigger.current ?? document.activeElement;
    openModals.push(element);
    document.body.style.overflow = "hidden";
    const background: HTMLElement[] = [];
    let branch = isolateBackground ? element.parentElement : null;
    while (branch && branch !== document.body) {
      for (const sibling of branch.parentElement?.children ?? []) {
        if (!(sibling instanceof HTMLElement) || sibling === branch) continue;
        const state = inertRegions.get(sibling) ?? { count: 0, initial: sibling.inert };
        state.count++;
        inertRegions.set(sibling, state);
        sibling.setAttribute("inert", "");
        background.push(sibling);
      }
      branch = branch.parentElement;
    }
    const focusable = () => Array.from(element.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter(item => item.getClientRects().length > 0 && !item.closest('[inert]'));
    (focusable()[0] ?? element).focus();
    function onKeyDown(event: KeyboardEvent) {
      if (openModals.at(-1) !== element) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      const index = openModals.indexOf(element);
      if (index !== -1) openModals.splice(index, 1);
      document.body.style.overflow = openModals.length ? "hidden" : originalBodyOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
      for (const region of background) {
        const state = inertRegions.get(region)!;
        if (--state.count === 0) {
          region.toggleAttribute("inert", state.initial);
          inertRegions.delete(region);
        }
      }
      if (returnTarget instanceof HTMLElement && returnTarget.isConnected) returnTarget.focus();
    };
  }, [open, panel, trigger, isolateBackground]);
}
