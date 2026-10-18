import "server-only";
import Link from "next/link";
import { voiceProofAvailable } from "@/server/proof/availability";
import VoiceProof from "./voice-proof";

export const dynamic = "force-dynamic";

export default function VoiceProofPage() {
  return <div className="app-shell">
    <header className="app-header"><Link href="/">Talk to a Document</Link><span className="build-label">Voice proof</span></header>
    <main id="workspace" tabIndex={-1}>
      <div className="intro"><h1>Synthetic lighthouse proof</h1>
        <p>A short WebRTC test using a fixed synthetic source. PDF and YouTube imports are not involved.</p>
        <Link href="/proof/text" prefetch={false}>Use text without a microphone (ends this conversation)</Link></div>
      {voiceProofAvailable() ? <VoiceProof /> : <section className="conversation-panel">
        <h2>Voice proof unavailable</h2><p>This proof is disabled or its server configuration is incomplete. No microphone or connection has been started.</p>
        <button disabled>Start unavailable</button>
      </section>}
    </main>
  </div>;
}
