/** Local transport limits, distinct from provider context rejection. No source data. */
export class SourceSizeError extends Error {
  constructor() { super("Source exceeds conversation preparation bounds"); }
}
export const SOURCE_SIZE_MESSAGE = "Your source was imported, but it is too large to start this conversation. You can still use View source. Choose a smaller source to continue.";
