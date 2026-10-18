import "server-only";
import Link from "next/link";
import { textProofAvailable } from "@/server/proof/availability";
import TextProof from "./text-proof";
export const dynamic = "force-dynamic";
export default function TextProofPage() {
  return <div className="app-shell">
    <header className="app-header"><Link href="/">Talk to a Document</Link><span className="build-label">Text proof</span></header>
    <main id="workspace" tabIndex={-1}>
      <div className="intro"><h1>Synthetic lighthouse text proof</h1><p>A microphone-free WebSocket test using a fixed synthetic source.</p>
        <Link href="/proof/voice" prefetch={false}>Open voice proof (ends this conversation)</Link></div>
      {textProofAvailable() ? <TextProof /> : <section className="conversation-panel"><h2>Text proof unavailable</h2><p>This proof is disabled or its server configuration is incomplete. No connection has been started.</p><button disabled>Start unavailable</button></section>}
    </main>
  </div>;
}
