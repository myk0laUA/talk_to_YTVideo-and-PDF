import type { KeyboardEvent } from "react";

/** Include summaries, inputs and other controls, not only the Close buttons. */
export function containDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const nodes = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([hidden]), textarea:not(:disabled), select:not(:disabled), summary, a[href], [tabindex="0"]')]
    .filter(node => node.getClientRects().length > 0);
  const first = nodes[0], last = nodes.at(-1);
  if (event.shiftKey && (document.activeElement === first || !nodes.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
