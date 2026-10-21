/** Test-only scalar observer. No provider payloads or identifiers are accepted or retained. */
export class SetupObserver {
  private now: () => number;
  private start: number;
  readonly summary: { offsets: Record<string, number>; expected: number; unique: number; writes: number;
    cleanupCount: number; firstTerminal?: { origin: string; reason: string; ms: number }; socketCloseCode?: number } = {
      offsets: {}, expected: 0, unique: 0, writes: 0, cleanupCount: 0,
    };
  constructor(now: () => number) { this.now = now; this.start = now(); }
  event(name: string, count = 0, reason = "") {
    const s = this.summary, ms = this.now() - this.start;
    if (name === "priming_start") { this.start = this.now(); s.offsets.priming_start = 0; s.expected = count; }
    if (["initial_ack", "final_send", "final_ack", "ready"].includes(name)) s.offsets[name] ??= ms;
    if (name === "source_write" && s.offsets.ready === undefined) { s.writes++; s.offsets.last_source_write = ms; }
    if (name === "source_ack" && count > s.unique && count <= s.expected) {
      s.unique = count; s.offsets.first_source_ack ??= ms; s.offsets.last_source_ack = ms;
    }
    const reasons = ["timeout", "transport", "protocol", "configuration", "provider", "context_limit", "invalid_input",
      "budget_unavailable", "connection", "preparation", "limit", "stop", "closed", "write_timeout", "native_overflow",
      "native_write_failed", "closed_or_aborted", "queue_or_frame_limit", "error", "remote_close"];
    if (["priming_failure", "priming_stop", "socket_failure", "lifecycle_finish", "registry_close"].includes(name)
      && !s.firstTerminal && reasons.includes(reason)) s.firstTerminal = { origin: name, reason, ms };
    if (name === "cleanup") { s.cleanupCount++; s.offsets.cleanup ??= ms; }
    if (name === "socket_close") { s.socketCloseCode = count; s.offsets.socket_close ??= ms; }
  }
}
