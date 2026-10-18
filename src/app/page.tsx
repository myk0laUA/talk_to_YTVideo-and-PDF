import { PRODUCT_NAME } from "@/shared/product";

export default function Home() {
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
        <div className="workspace">
          <section className="source-panel" aria-labelledby="source-heading">
            <h2 id="source-heading">Your source</h2>
            <p className="empty-title">Nothing added yet</p>
            <p>PDF uploads and YouTube imports are coming next.</p>
            <div className="source-options" aria-label="Planned source options">
              <button disabled type="button">Upload a PDF</button>
              <button disabled type="button">Add a YouTube video</button>
            </div>
            <p className="note">Import is not available in this preview.</p>
          </section>
          <section className="conversation-panel" aria-labelledby="conversation-heading">
            <h2 id="conversation-heading">Conversation</h2>
            <div className="conversation-empty">
              <p className="empty-title">Room for your questions.</p>
              <p>Once a source is ready, this will be your space to ask, listen, and follow up.</p>
              <p className="note">Voice and text conversations are not connected yet.</p>
            </div>
          </section>
        </div>
      </main>
      <footer>One source. Space to understand it.</footer>
    </div>
  );
}
