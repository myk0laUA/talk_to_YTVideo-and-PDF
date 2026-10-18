import "server-only";
import { connection } from "next/server";
import { PRODUCT_NAME } from "@/shared/product";
import { parseSourceConfig, parseYoutubeSourceConfig } from "@/server/sources/config";
import { SourceWorkspace } from "./source-workspace";

export default async function Home() {
  await connection();
  const pdfAvailable = parseSourceConfig(process.env) !== null;
  const youtubeAvailable = parseYoutubeSourceConfig(process.env) !== null;
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="wordmark">{PRODUCT_NAME}</span>
        <span className="build-label">Early preview</span>
      </header>
      <main id="workspace" tabIndex={-1}>
        <div className="intro">
          <h1>A little more understanding.</h1>
          <p>A place to explore one document or video, one question at a time.</p>
        </div>
        <SourceWorkspace pdfAvailable={pdfAvailable} youtubeAvailable={youtubeAvailable} />
      </main>
      <footer>One source. Space to understand it.</footer>
    </div>
  );
}
