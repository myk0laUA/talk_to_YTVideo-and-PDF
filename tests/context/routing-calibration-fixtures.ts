import type { PdfExtraction } from "../../src/shared/pdf.ts";
import type { CaptionTranscript } from "../../src/shared/captions.ts";
import { pdfFixture, captionFixture, pdfQuestions, captionQuestions, type EvaluationQuestion } from "./fixtures.ts";

export const ROUTING_CALIBRATION_VERSION = "routing-calibration-inventory-2026-10-22-v1";
// These are synthetic routing LOAD fixtures. Repetition adds load, never independent semantic evidence.
// Original 03H real-source regressions are separately frozen by hash in docs/MODEL_ROUTING_03I.md.
export function routingCalibrationFixtures() {
  return ([1, 8, 32] as const).flatMap((copies, index) => {
    const size = (["short", "medium", "long"] as const)[index];
    const pages = Array.from({ length: copies }, () => pdfFixture.sections).flat()
      .map((section, i) => ({ ...section, id: `page-${i + 1}`, pageNumber: i + 1 }));
    const fullText = pages.map(s => s.text).join("\n\n");
    const pdf: PdfExtraction = { ...pdfFixture, sections: pages, pageCount: pages.length, fullText, characterCount: fullText.length };
    const segments = Array.from({ length: copies }, (_, block) => captionFixture.segments.map(segment => ({
      ...segment, startSeconds: segment.startSeconds + block * 4000 }))).flat();
    const captions: CaptionTranscript = { ...captionFixture, segments, fullText: segments.map(s => s.text).join("\n") };
    const questions = (kind: "PDF" | "YOUTUBE") => {
      const base = kind === "PDF" ? pdfQuestions : captionQuestions, count = kind === "PDF" ? pdfFixture.sections.length : captionFixture.segments.length;
      const result = base.map(q => {
        const block = q.region === "end" ? copies - 1 : q.region === "middle" ? Math.floor(copies / 2) : 0;
        return { ...q, evidence: q.evidence.map(id => id.replace(/\d+$/, n => String(Number(n) + block * count))) };
      });
      const summary: EvaluationQuestion = kind === "PDF" ? { id: "pdf-summary", category: "synthesis",
        question: "Summarize the operating schedule, energy trial comparison and final safety directions in this document.",
        expectedAnswer: "Station opens 06:15; B uses 9 versus A 12 kWh for 30 crates; inspections every 14 days; emergency meeting at east cedar gate. Label calculations; invent no advice.",
        evidence: ["page-1", "page-4", "page-5", `page-${(copies - 1) * count + 6}`, `page-${copies * count}`] }
        : { id: "cap-summary", category: "synthesis", question: "Summarize the workshop timing, method comparison and closing shipping instructions.",
          expectedAnswer: "Mira opens at 09:20; A takes 18 versus B 12 minutes for three lamps; rest 45 minutes, violet label, returns shelf Q. Invent no practical advice.",
          evidence: ["segment-1", "segment-3", "segment-4", `segment-${(copies - 1) * count + 5}`, `segment-${copies * count}`] };
      return [...result, summary];
    };
    return [{ id: `pdf-${size}`, kind: "PDF" as const, size, copies, content: pdf, questions: questions("PDF") },
      { id: `captions-${size}`, kind: "YOUTUBE" as const, size, copies, content: captions, questions: questions("YOUTUBE") }];
  });
}
