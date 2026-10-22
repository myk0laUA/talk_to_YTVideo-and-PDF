// Frozen evaluation contract; public questions/scoring only. No model or source acquisition.
export const RESPONSES_EVALUATION = Object.freeze({
  version: "03f-responses-v1", language: "sq", captions: 428,
  fullTextSha256: "b9c847f38059adf2932ce8be455e28ce18848cfa8b08a09720cec2efcdceae98",
  questions: [
    "In English, summarize the central message of this talk in under 100 words. Attribute claims to the speaker and include supporting source references.",
    "In the personal story later in the talk, how long was the annual Princeton talk, and how many people was it given to? Include supporting source references.",
    "In English, summarize the central message of this talk in under 100 words. Attribute claims to the speaker and include supporting source references.",
    "What is the exact publication DOI of the power-posing study discussed in this talk? Answer only if the source provides it, with supporting source references.",
  ],
  history: "Case 2 only: exact case-1 user question followed by validated candidate answer, including statement classification, IDs and inference_basis. No provider response IDs. Other cases fresh.",
  absentInspection: "Independently read all 428 original sq captions before freeze. No publication DOI, journal identifier or DOI string is supplied. Mentions publishing findings (262), but no identifier. Expected explicit unavailable, no guessed DOI or invented evidence.",
  scoring: {
    summaries: "Both under 100 words; cover central message (body/nonverbal behavior can shape one's own mind/feelings and behavior/outcomes; small changes/practice before stress). Attribute scientific claims to speaker. Enumerate EVERY material assertion, including compound claims and antecedents. All must be fully supported by exactly selected original captions; untranslated references remain original. Existing IDs alone do not pass.",
    princeton: "20 minutes/20 people must be supported by original segment-355 at 1040.594 seconds. Every additional assertion needs its own complete selected support.",
    absent: "Explicit source uncertainty/unavailable, no fabricated fact or evidence. Entire original source inspected for absence; no invented excerpt can prove absence.",
    procedure: "Human worker reads every statement and selected original passages, lists precise support/gaps. No model judge, no neighbor expansion or ID repair, no post-live edits/resampling. All four gates must pass; schema, membership and semantics scored separately.",
  },
  allocation: { maxCalls: 4, maxEstimatedUsd: 0.50, reservedPerCallUsd: 0.115, inputTokens: 128000, outputTokens: 4096,
    inputUsdPerMillion: 0.75, outputUsdPerMillion: 4.50, retries: 0 },
});
