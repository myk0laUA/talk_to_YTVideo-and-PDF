"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "../shared/theme";

function snapshot() {
  const preference = document.documentElement.dataset.theme;
  return preference === "dark" || preference !== "light" && matchMedia("(prefers-color-scheme: dark)").matches;
}
function subscribe(notify: () => void) {
  const system = matchMedia("(prefers-color-scheme: dark)");
  system.addEventListener("change", notify);
  window.addEventListener("theme-change", notify);
  return () => { system.removeEventListener("change", notify); window.removeEventListener("theme-change", notify); };
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  return <button type="button" className="theme-toggle" role="switch" aria-label="Dark theme" aria-checked={dark} onClick={() => {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Memory-only preference still works. */ }
    window.dispatchEvent(new Event("theme-change"));
  }}><span className="theme-track" aria-hidden="true">
    <span className="theme-sun"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" focusable="false"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg></span>
    <span className="theme-moon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z" /></svg></span>
    <span className="theme-thumb" />
  </span></button>;
}
