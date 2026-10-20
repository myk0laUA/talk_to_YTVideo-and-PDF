import "server-only";

// One process, including separately compiled Next route modules. No cookies/source data retained.
type Listener = (owner: string) => void;
const state = globalThis as unknown as { sourceInvalidation10d?: Set<Listener> };
const listeners = state.sourceInvalidation10d ??= new Set<Listener>();
export function onSourceChange(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function sourceChanged(owner: string) { for (const listener of listeners) listener(owner); }
