import "server-only";
import { parseServerEnvironment } from "./env-schema";

export function getServerEnvironment() {
  return parseServerEnvironment(process.env);
}
