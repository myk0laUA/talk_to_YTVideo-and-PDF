// Server-only fixture construction runs in a child Node process, never the browser bundle.
import { writeFile } from "node:fs/promises";
import { fixture } from "../priming/harness.ts";
const a = await fixture("PDF", "B", "fixture", "text"), b = await fixture("YOUTUBE", "B", "fixture", "text");
await writeFile("artifacts/local/12e-correction/regression/10b/inputs.json", JSON.stringify([a, b].map(f => ({ variant: f.prepared.variants.B, input: f.input, id: f.row.id }))));
