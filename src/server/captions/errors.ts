import type { CaptionFailure, CaptionFailureCode, CaptionStage } from "../../shared/captions.ts";

export class CaptionError extends Error {
  readonly failure: CaptionFailure;
  constructor(code: CaptionFailureCode, message: string, stage?: CaptionStage, upstreamStatus?: number) {
    super(message);
    this.failure = { code, message, ...(stage ? { stage } : {}), ...(upstreamStatus ? { upstreamStatus } : {}) };
  }
}
