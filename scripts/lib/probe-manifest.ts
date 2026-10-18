import { open, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { createManifest, parseManifest, ProbeError } from "./db-persistence.ts";
import type { ProbeCommand } from "./db-persistence.ts";

export async function prepareManifest(mode: ProbeCommand, requestedPath: string, repositoryRoot: string) {
  try {
    if (!isAbsolute(requestedPath)) throw new Error();
    const root = await realpath(repositoryRoot);
    const parent = await realpath(dirname(requestedPath));
    const path = resolve(parent, basename(requestedPath));
    const create = mode === "write" || mode === "prepare";
    const target = create ? path : await realpath(path);
    const within = relative(root, target);
    if (within === "" || (!within.startsWith(".." + sep) && !isAbsolute(within))) throw new Error();
    if (create) {
      const manifest = createManifest();
      const file = await open(path, "wx", 0o600);
      try { await file.writeFile(JSON.stringify(manifest) + "\n"); await file.sync(); }
      finally { await file.close(); }
      return manifest;
    }
    const file = await open(target, "r");
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 4096 || (process.platform !== "win32" && (stat.mode & 0o077) !== 0)) {
        throw new Error();
      }
      return parseManifest(JSON.parse(await file.readFile("utf8")));
    } finally { await file.close(); }
  } catch { throw new ProbeError("MANIFEST"); }
}
