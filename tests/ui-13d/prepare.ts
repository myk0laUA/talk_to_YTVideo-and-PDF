// Committed synthetic fixtures, without ignored historical evidence inputs.
import { mkdir, writeFile } from "node:fs/promises";
import { fixture } from "../priming/harness.ts";
const directory = "artifacts/local/13d/inputs";
await mkdir(directory, { recursive: true });
const a = await fixture(), b = await fixture("YOUTUBE");
await writeFile(`${directory}/inputs.json`, JSON.stringify([a, b].map(f => ({ variant: f.prepared.variants.B, input: f.input, id: f.row.id }))));
