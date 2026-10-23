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
  }}><span className="theme-track" aria-hidden="true"><span className="theme-sun">☀</span><span className="theme-moon">☾</span><span className="theme-thumb" /></span></button>;
}
