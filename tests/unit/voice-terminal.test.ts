import { test } from "node:test";
import assert from "node:assert/strict";
import { projectResponseTerminal, responseTerminalMessage } from "../../src/shared/response-terminal.ts";

for (const [status, reason, expected] of [
  ["incomplete", "max_output_tokens", "max_output_tokens"], ["incomplete", "content_filter", "content_filter"],
  ["cancelled", "turn_detected", "turn_detected"], ["cancelled", "client_cancelled", "client_cancelled"],
  ["incomplete", "turn_detected", "unknown"], ["cancelled", "max_output_tokens", "unknown"],
  ["failed", "context_length_exceeded", "unknown"], ["incomplete", "PRIVATE", "unknown"],
  ["completed", "PRIVATE", "completed"],
]) test(`08K terminal reason ${status}/${reason}`, () => {
  const terminal = projectResponseTerminal({ status, status_details: { reason, error: { message: "PRIVATE" } } });
  assert.equal(terminal.reason, expected);
  assert.doesNotMatch(JSON.stringify(terminal) + responseTerminalMessage(terminal), /PRIVATE/);
});

test("08K usage accepts only explicit nonnegative safe integer fields, no recursive copying", () => {
  const t = projectResponseTerminal({ status: "incomplete", usage: { input_tokens: 0, output_tokens: 512,
    total_tokens: Infinity, input_token_details: { audio_tokens: -1, text_tokens: "10" },
    output_token_details: { audio_tokens: 400, text_tokens: 112, private: 123 }, private: "PRIVATE" } });
  assert.deepEqual(t, { reason: "unknown", usage: { inputTokens: 0, outputTokens: 512, outputAudioTokens: 400, outputTextTokens: 112 } });
  for (const value of [null, [], "PRIVATE", 3]) assert.deepEqual(projectResponseTerminal({ usage: value }).usage, {});
  assert.ok(Object.isFrozen(t) && Object.isFrozen(t.usage));
});
