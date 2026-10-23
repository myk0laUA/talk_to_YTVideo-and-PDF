// Server-only synthetic source construction; never imported by the browser.
import { writeFile } from "node:fs/promises";
import { fixture } from "../priming/harness.ts";
const a = await fixture(), b = await fixture("YOUTUBE");
await writeFile(`${process.env.VERIFICATION_ROOT ?? "artifacts/local"}/12e/regression/10c/inputs.json`, JSON.stringify([a, b].map(f => ({ variant: f.prepared.variants.B, input: f.input, id: f.row.id }))));
