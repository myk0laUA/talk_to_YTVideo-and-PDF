import assert from "node:assert/strict";
import type { Manifest } from "../../src/shared/priming-manifest.ts";

/** Independent test decoder: identity/order come only from first appearance, never numeric suffixes. */
export function decodeCaptions(manifest: Manifest) {
  type Locator = { id: string; startSeconds: number; durationSeconds: number };
  type Fragment = { sectionCount: number; locator: Locator; part: number; offset: number; last: boolean; text: string; sectionIndex?: number };
  const captions: (Locator & { text: string })[] = [];
  const seen = new Set<string>();
  let current: Locator & { text: string } | undefined, part = 0, finished = true, count: number | undefined;
  for (const event of manifest.items) {
    const data = JSON.parse(event.item.content[0].text) as { fragments: Fragment[] };
    for (const f of data.fragments) {
      assert.equal(Object.hasOwn(f, "sectionIndex"), false);
      count ??= f.sectionCount; assert.equal(f.sectionCount, count);
      if (current?.id !== f.locator.id) {
        assert.ok(finished); assert.ok(!seen.has(f.locator.id)); seen.add(f.locator.id);
        current = { ...f.locator, text: "" }; captions.push(current); part = 0; finished = false;
      } else assert.equal(finished, false);
      assert.ok(current);
      const { text, ...locator } = current;
      assert.deepEqual(f.locator, locator); assert.equal(f.part, part++); assert.equal(f.offset, text.length);
      current.text += f.text; finished = f.last;
    }
  }
  assert.ok(finished); assert.equal(captions.length, count);
  return captions;
}
