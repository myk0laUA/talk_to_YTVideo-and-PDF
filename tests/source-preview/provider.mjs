// Test-only extension of the established offline provider; no production import.
import "../text-relay/server.mjs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Provider = require("next/dist/compiled/ws");
const original = Provider.prototype.event;
Provider.prototype.event = function (value) {
  if (value.type === "response.done" && this.turns === 1) {
    value.response.usage = { input_tokens: 100, output_tokens: 12, total_tokens: 112,
      output_token_details: { text_tokens: 12, audio_tokens: 0 } };
  }
  return original.call(this, value);
};
