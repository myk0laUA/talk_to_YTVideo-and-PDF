/** One subscription set per mounted owner. No browser access before mount.
 * Stop is synchronous; connectivity is advisory and never starts a controller. */
export type BrowserSessionState = { offline: boolean; departed: boolean; notice: "departure" | "offline" | "online" | null };
export const initialBrowserSession: BrowserSessionState = { offline: false, departed: false, notice: null };

export class BrowserSession {
  private state = initialBrowserSession;
  private disposed = false;
  private stop: () => void;
  private notify: (state: BrowserSessionState) => void;
  constructor(stop: () => void, notify: (state: BrowserSessionState) => void) {
    this.stop = stop; this.notify = notify;
    for (const type of ["pagehide", "pageshow", "offline", "online"]) window.addEventListener(type, this.receive);
    this.connectivity();
  }
  private publish(next: BrowserSessionState) {
    if (this.disposed || (next.offline === this.state.offline && next.departed === this.state.departed && next.notice === this.state.notice)) return;
    this.state = next; this.notify(next);
  }
  private connectivity = () => {
    if (this.disposed) return;
    const offline = navigator.onLine === false;
    if (offline === this.state.offline) return;
    if (offline) this.stop();
    this.publish({ ...this.state, offline, notice: offline ? "offline" : "online" });
  };
  private receive = (event: Event) => {
    if (this.disposed) return;
    if (event.type === "pagehide") {
      if (this.state.departed) return;
      this.stop(); this.publish({ ...this.state, departed: true, notice: "departure" });
    } else if (event.type === "pageshow") {
      this.publish({ ...this.state, departed: false }); this.connectivity();
    } else this.connectivity();
  };
  /** React state or a queued offline event may lag a click. Read the browser now. */
  allowsAction() {
    this.connectivity();
    return !this.disposed && !this.state.offline && !this.state.departed;
  }
  started() { this.publish({ ...this.state, notice: null }); }
  dispose() {
    this.disposed = true;
    for (const type of ["pagehide", "pageshow", "offline", "online"]) window.removeEventListener(type, this.receive);
  }
}

export function browserSessionMessage(state: BrowserSessionState) {
  if (state.offline) return "You appear to be offline. Chat stopped; received text stays here. Reconnect to start again.";
  if (state.departed) return "Session ended for page departure. Nothing resumes automatically.";
  if (state.notice === "departure") return "Session ended for page departure. Received text stays in this page; a full reload clears it. Use Start for a fresh session.";
  if (state.notice === "online") return "Connection may be back. Start a new session when ready; previous questions won’t be resent.";
  return null;
}
