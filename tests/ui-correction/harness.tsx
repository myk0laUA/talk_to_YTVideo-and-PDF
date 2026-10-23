import { createRoot } from 'react-dom/client';
import { SourceWorkspace } from '../../src/app/source-workspace';
import * as text from '../mode-switch/text';
import * as voice from '../mode-switch/voice';
import { PRODUCT_NAME } from '../../src/shared/product';
// Static answers transcribed from tests/context/fixtures.ts; no model generation.
const answers = [
 'Alder station opens at 06:15. Its first ferry is named Iris.',
 'The blue tank holds 120 litres; the red tank holds 80 litres.',
 'Together, the two tanks hold 200 litres: 120 in the blue tank and 80 in the red tank.',
 'Trial A used 12 kWh and delivered 30 crates.'
];
Reflect.set(window, 'fixture', {
 async prime(mode: string) { const t = mode === 'text' ? text.records.at(-1)?.transports.at(-1) : voice.records.at(-1)?.resources.at(-1)?.transport; t?.config(); await text.flush(); t?.items(); await text.flush(); t?.config(); await text.flush(); },
 async answer(index: number, long = false) { const t = text.records.at(-1)!.transports.at(-1)!; t.question(true); await text.flush(); t.answer(); const value = long ? answers.join('\n\n').repeat(30) : answers[index]; t.partial(value); t.emit({type:'response.output_text.done', ...t.ids, text:value}); t.emit({type:'response.done', response:{id:t.ids.response_id, conversation_id:'conversation_fixture', status:'completed', output:[{id:t.ids.item_id,type:'message',role:'assistant',content:[{type:'output_text',text:value}]}]}}); await text.flush(); },
 async voiceAnswer() { const t = voice.records.at(-1)!.resources.at(-1)!.transport; t.answer("When does Alder station open, and what is the first ferry?"); t.emit({ type:'conversation.item.input_audio_transcription.completed',item_id:`${t.response}_user`,content_index:0,transcript:'When does Alder station open, and what is the first ferry?'}); t.partial(answers[0]); t.emit({type:'response.output_audio_transcript.done',...t.ids,transcript:answers[0]}); t.done(); t.buffer('stopped'); await voice.flush(); },
 async append() { const t = text.records.at(-1)!.transports.at(-1)!; t.partial(' More source text.'); await text.flush(); },
 async pending() { const t = text.records.at(-1)!.transports.at(-1)!; t.question(true); await text.flush(); t.answer(); t.partial(answers.join('\n\n').repeat(30)); await text.flush(); },
 async fail() { text.records.at(-1)!.transports.at(-1)!.disconnect(); await text.flush(); },
});
createRoot(document.getElementById('root')!).render(<div className="app-shell"><header className="app-header"><span className="wordmark"><svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 3h14v14H9l-4 4V3Z"/><path d="M9 7h6M9 11h6"/></svg>{PRODUCT_NAME}</span><span className="build-label">Early preview</span></header><main><SourceWorkspace pdfAvailable youtubeAvailable textAvailable voiceAvailable /></main></div>);
