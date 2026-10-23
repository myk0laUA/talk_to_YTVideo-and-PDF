import "server-only";

const stages = ["entry", "authorization", "body", "registry", "initial_authorization", "context",
  "final_authorization", "repository_start", "repository_end", "repository_failed", "response", "exit"] as const;
type Stage = typeof stages[number];
export type PreparationTrace = { mark: (stage: Stage) => void; finish: (status: number) => void };

/** Process-local sampling, no request data or exceptions accepted. No timers or retained request map.
 * Reserve a whole trace at entry so failures cannot flood logs or suppress its exit.
 */
export function createPreparationDiagnostics(write: (line: string) => void, clock = () => performance.now()) {
  let windowStart = -Infinity, samples = 0, sequence = 0;
  return (): PreparationTrace | undefined => {
    const start = clock();
    if (!Number.isFinite(start)) return;
    if (start - windowStart >= 60_000) { windowStart = start; samples = 0; }
    if (samples >= 4) return;
    samples++;
    const sample = sequence = (sequence % 1_000_000) + 1;
    let count = 0, closed = false;
    const emit = (stage: Stage, status: number) => {
      const duration = clock() - start;
      const elapsedMs = Number.isFinite(duration) ? Math.min(300_000, Math.max(0, Math.round(duration))) : 0;
      try { write(JSON.stringify({ event: "voice_preparation", sample, stage, elapsedMs, status })); } catch { /* Logging cannot fail a request. */ }
    };
    const trace: PreparationTrace = {
      mark(stage) {
        if (closed || count >= 31 || !stages.includes(stage) || stage === "exit") return;
        count++; emit(stage, 0);
      },
      finish(status) {
        if (closed) return;
        closed = true;
        emit("exit", [201, 400, 401, 403, 404, 405, 409, 413, 429, 503].includes(status) ? status : 0);
      },
    };
    trace.mark("entry");
    return trace;
  };
}
