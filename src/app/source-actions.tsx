"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";

/** Native top-layer popover avoids clipping inside the scrolling workspace. */
export function SourceActions({ disabled, trigger, onReplace, onRemove }: {
  disabled: boolean; trigger: RefObject<HTMLButtonElement | null>; onReplace: () => void; onRemove: () => void;
}) {
  const id = useId(), menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open) return;
    const close = () => menu.current?.hidePopover();
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open]);
  const close = (returnFocus = true) => { menu.current?.hidePopover(); if (returnFocus) trigger.current?.focus(); };
  return <>
    <button ref={trigger} type="button" disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      onKeyDown={event => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); event.currentTarget.click(); } }}
      onClick={() => {
        if (open) { close(); return; }
        const rect = trigger.current!.getBoundingClientRect();
        setPosition({ top: Math.min(rect.bottom + 8, window.innerHeight - 124), left: Math.max(12, Math.min(rect.right - 240, window.innerWidth - 252)) });
        menu.current?.showPopover();
        menu.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
      }}><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>Source actions</span></button>
    <div ref={menu} id={id} className="source-menu" popover="auto" role="menu" aria-label="Source actions" style={position}
      onToggle={event => setOpen(event.newState === "open")}
      onKeyDown={event => {
        if (event.key === "Escape" || event.key === "Tab") { close(); return; }
        const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault(); items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
        }
      }}>
      <button type="button" role="menuitem" tabIndex={-1} disabled={disabled} onClick={() => { close(); onReplace(); }}>Replace source</button>
      <button type="button" role="menuitem" tabIndex={-1} disabled={disabled} className="destructive" onClick={() => { close(); onRemove(); }}>Remove source</button>
    </div>
  </>;
}
