import "server-only";
import { ThemeToggle } from "./theme-toggle";
import { connection } from "next/server";
import { PRODUCT_NAME } from "@/shared/product";
import { parseSourceConfig, parseYoutubeSourceConfig } from "@/server/sources/config";
import { SourceWorkspace } from "./source-workspace";
import { textAvailability } from "@/server/text/config";
import { voiceAvailability } from "@/server/voice/config";

export default async function Home() {
  await connection();
  const pdfAvailable = parseSourceConfig(process.env) !== null;
  const youtubeAvailable = parseYoutubeSourceConfig(process.env) !== null;
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="wordmark"><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 3h14v14H9l-4 4V3Z"/><path d="M9 7h6M9 11h6"/></svg>{PRODUCT_NAME}</span>
        <div className="header-tools"><ThemeToggle /></div>
      </header>
      <main id="workspace" tabIndex={-1}>
        <SourceWorkspace pdfAvailable={pdfAvailable} youtubeAvailable={youtubeAvailable} textAvailable={textAvailability(process.env).available} voiceAvailable={voiceAvailability(process.env).available} />
      </main>
      <footer>One source. Space to understand it.</footer>
    </div>
  );
}
