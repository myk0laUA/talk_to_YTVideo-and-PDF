// Conservative evaluator for the committed synthetic 07F fixtures only.
// Unsupported prose is reviewable evidence, never an automatic success.
export type FactStatus = "PASS" | "FAIL" | "REVIEW_REQUIRED";
export type QuantityCheck = { label: "A" | "B"; expected: number; unit: string;
  observed: number[]; exactEquivalent: boolean[]; status: FactStatus; reason: string };
const numeric = String.raw`(?:\d+\s*[/⁄]\s*\d+|\d+(?:[.,]\d+)?|[.,]\d+|[¼½¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])`;
const fractions: Record<string, readonly [bigint, bigint]> = { "¼": [1n,4n], "½": [1n,2n], "¾": [3n,4n], "⅕": [1n,5n], "⅖": [2n,5n],
  "⅗": [3n,5n], "⅘": [4n,5n], "⅙": [1n,6n], "⅚": [5n,6n], "⅛": [1n,8n], "⅜": [3n,8n], "⅝": [5n,8n], "⅞": [7n,8n] };
function rational(text: string): readonly [bigint, bigint] {
  if (text in fractions) return fractions[text];
  const parts = text.split(/[/⁄]/);
  if (parts.length === 2) return [BigInt(parts[0].trim()), BigInt(parts[1].trim())];
  const [whole, decimal = ""] = text.replace(",", ".").split(".");
  return [BigInt((whole || "0") + decimal), 10n ** BigInt(decimal.length)];
}
export function evaluateQuantities(kind: "PDF" | "YOUTUBE", answer: string): QuantityCheck[] {
  const text = answer.normalize("NFC").replace(/[*_`]/g, "");
  const name = kind === "PDF" ? "trial" : "method";
  const labels = [...text.matchAll(new RegExp(String.raw`\b${name}\s+([ab])\b|\b([ab])(?=\s*[:=])`, "gi"))];
  const unit = kind === "PDF" ? String.raw`kwh\s*(?:/|per)\s*crate\b` : String.raw`(?:minutes?|mins?)\s*(?:/|per)\s*lamp\b`;
  // A sign, extra decimal, or a preceding identifier must not disappear from a quantity.
  const quantities = [...text.matchAll(new RegExp(String.raw`(?<![\w.,/⁄+−-])(${numeric})\s*(${unit})`, "gi"))];
  const rates = [...text.matchAll(new RegExp(String.raw`(${numeric})\s*([a-z]+\s*(?:/|per)\s*[a-z]+)`, "gi"))];
  const unscoped = quantities.some(q => !labels.length || q.index! < labels[0].index!);
  const otherUnits = rates.some(r => !quantities.some(q => q.index === r.index));
  return (["A", "B"] as const).map((label, index) => {
    const expected = kind === "PDF" ? [12/30, 9/30][index] : [18/3, 12/3][index];
    const blocks = labels.filter(l => (l[1] ?? l[2]).toUpperCase() === label);
    const observed: number[] = [];
    const exactEquivalent: boolean[] = [];
    let ambiguous = unscoped || otherUnits;
    for (const block of blocks) {
      const end = labels.find(l => l.index! > block.index!)?.index ?? text.length;
      const content = text.slice(block.index! + block[0].length, end);
      // Comparatives, negation, corrections, or multiple subjects need human scope review.
      if (/\b(not|rather|instead|incorrect|wrong|versus|vs|than|respectively)\b|[?]/i.test(content)) ambiguous = true;
      const pairs = quantities.filter(q => q.index! >= block.index! + block[0].length && q.index! < end);
      if (!pairs.length) ambiguous = true;
      for (const pair of pairs) {
        // Do not inherit a subject across a sentence/newline or an unrelated named clause.
        const prefix = text.slice(block.index! + block[0].length, pair.index!);
        if (/[;\n]|\.(?:\s|$)|\b(?:unrelated|weather|number|code|example)\b/i.test(prefix)
          || /[+−-]\s*$|\d\s+$/.test(prefix)) ambiguous = true;
        if (/^[1-9]\d{0,2},\d{3}$/.test(pair[1])) ambiguous = true; // Decimal comma versus thousands grouping.
        const [numerator, denominator] = rational(pair[1]);
        observed.push(Number(numerator) / Number(denominator)); // Display only; never used for equivalence.
        const wantedNumerator = kind === "PDF" ? [12n, 9n][index] : [18n, 12n][index];
        const wantedDenominator = kind === "PDF" ? 30n : 3n;
        exactEquivalent.push(denominator !== 0n && numerator * wantedDenominator === wantedNumerator * denominator);
      }
    }
    const wrong = exactEquivalent.some(match => !match);
    const status: FactStatus = ambiguous || !blocks.length || !observed.length ? "REVIEW_REQUIRED" : wrong ? "FAIL" : "PASS";
    return { label, expected, unit: kind === "PDF" ? "kWh/crate" : "minutes/lamp", observed, exactEquivalent, status,
      reason: status === "PASS" ? "label_value_unit_match" : status === "FAIL" ? "wrong_or_contradictory_quantity" : "unsupported_or_ambiguous_association" };
  });
}
