import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium, expect} from '@playwright/test';
import { workspaceServer } from '../workspace/server.mjs';
const workspace=await workspaceServer('layout');
const {dir,css,bundle,font,origin}=workspace,source=workspace.source();
const browser=await chromium.launch(),results=[];
const report={node:process.version,css:createHash('sha256').update(css).digest('hex'),bundle:createHash('sha256').update(bundle).digest('hex'),font:createHash('sha256').update(font).digest('hex'),context:'actual UI/controllers; synthetic transport/media/storage; no physical audio or SQL',results};
// Inspect all text line rectangles and overflow ancestors. No short internal status scrollers.
async function geometry(page,selector){return page.locator(selector).evaluate(group=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
 const heading=group.querySelector('h3'),actions=group.querySelector('.source-actions'),button=actions.querySelector('button:not([hidden])');
 const issues=[],texts=[];for(const p of group.querySelectorAll('p:not(.visually-hidden)')){
  const range=document.createRange();range.selectNodeContents(p);const lines=[...range.getClientRects()].filter(r=>r.width&&r.height);texts.push(p.textContent);
  if(p.scrollHeight>p.clientHeight+1||p.scrollWidth>p.clientWidth+1)issues.push('text exceeds box');
  for(let n=p;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n),r=rect(n),cy=['hidden','clip','auto','scroll'].includes(s.overflowY),cx=['hidden','clip','auto','scroll'].includes(s.overflowX);
   if(lines.some(l=>cy&&(l.top<r.top+n.clientTop-1||l.bottom>r.top+n.clientTop+n.clientHeight+1)||cx&&(l.left<r.left+n.clientLeft-1||l.right>r.left+n.clientLeft+n.clientWidth+1)))issues.push('ancestor clips text: '+n.className);
  }
  if(lines.some(r=>r.bottom>rect(actions).top+1))issues.push('text overlaps action');
 }
 const s=getComputedStyle(group),bs=getComputedStyle(button),a=rect(button),g=rect(group),h=rect(heading);
 if(h.bottom>rect(actions).top)issues.push('heading overlaps action');
 if(Math.abs(a.left+a.width/2-(g.left+g.width/2))>1)issues.push('action not centered');
 return {group:g,heading:h,action:a,texts,issues,padding:s.padding,font:bs.font,paddingAction:bs.padding,minHeight:bs.minHeight,actionGap:rect(actions).top-(group.querySelector('.voice-recovery')?rect(group.querySelector('.voice-recovery')).bottom:rect(group.querySelector('p:not(.visually-hidden)')??heading).bottom)};
});}
try{
 for(const theme of ['light','dark'])for(const size of [{width:390,height:844},{width:1440,height:900},{width:320,height:600,reflow:true}]){
  const context=await browser.newContext({colorScheme:theme,reducedMotion:'reduce',viewport:{width:size.width,height:size.height}}),page=await context.newPage();
  const entry={theme,...size,states:[],errors:[],external:[]};results.push(entry);
  page.on('pageerror',e=>entry.errors.push(e.message));
  await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!==origin){entry.external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:r.request().method()==='POST'?201:200,contentType:'application/json',body:JSON.stringify({ok:true,source})});return r.continue();});
  await page.addInitScript(()=>{window.__nativeCalls=0;for(const name of ['WebSocket','RTCPeerConnection','Audio'])Object.defineProperty(window,name,{value:class{constructor(){window.__nativeCalls++;throw Error('Native transport/media forbidden');}}});Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia(){window.__nativeCalls++;throw Error('Native microphone forbidden');}}});});
  const suffix=`${theme}-${size.width}${size.reflow?'-200':''}`;
  const capture=async(name,selector)=>{if(name!=='source-menu')await page.evaluate(()=>scrollTo(0,0));const m=selector?await geometry(page,selector):{issues:[]};if(selector&&!size.reflow&&m.action.bottom>size.height)m.issues.push('action outside viewport');
   const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,elements:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right}))}));if(overflow.width>overflow.viewport){m.issues.push('horizontal overflow');m.overflow=overflow;}entry.states.push({name,...m});
   await expect(page.getByText('Early preview',{exact:true})).toHaveCount(0);await expect(page.getByText('Voice help',{exact:true})).toHaveCount(0);await page.screenshot({path:path.join(dir,`${name}-${suffix}.png`),fullPage:!!size.reflow&&name!=='source-menu'});
   if(selector){const action=page.locator(`${selector} .source-actions button:not([hidden])`);await expect(action).toHaveCount(1);await action.scrollIntoViewIfNeeded();const reachable=await action.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e===hit||e.contains(hit);});if(!reachable)m.issues.push('action obscured or unreachable');}
  };
  const start=()=>page.getByRole('button',{name:/^(Start|Retry) voice$/,exact:true});
  const end=()=>page.getByRole('button',{name:'End voice',exact:true});
  const audit=()=>page.evaluate(()=>window.fixture.audit());
  const online=async value=>page.evaluate(value=>{Object.defineProperty(navigator,'onLine',{configurable:true,value});dispatchEvent(new Event(value?'online':'offline'));},value);
  await page.goto(origin+'/?noYoutube');await page.evaluate(()=>document.fonts.ready);if(size.reflow)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await capture('welcome-pdf');
  await page.goto(origin);await page.evaluate(()=>document.fonts.ready);if(size.reflow)await page.evaluate(()=>document.documentElement.style.fontSize='200%');await capture('welcome-both');
  await page.goto(origin+'/?noYoutube');await page.evaluate(()=>document.fonts.ready);if(size.reflow)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert(await page.evaluate(()=>document.fonts.check('16px Geist')),'Self-hosted Geist loaded');
  await page.locator('input[type=file]').setInputFiles({name:'Alder station.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic acquisition')});
  await expect(page.locator('#source-heading')).toBeFocused();await capture('text-idle','.text-start');
  const reference=entry.states.at(-1);assert.equal((await audit()).textStarts,0);
  await page.getByRole('button',{name:'Start chat',exact:true}).click();await expect(page.locator('.text-session-status')).toContainText('Loading your source');await capture('text-pending','.text-start');
  await page.getByRole('button',{name:'Stop text session',exact:true}).click();await capture('text-empty-ended','.text-start');
  await page.getByRole('button',{name:'Start chat',exact:true}).click();await page.evaluate(()=>window.fixture.fail());await capture('text-failed','.text-start');
  await page.getByRole('button',{name:'Start chat',exact:true}).click();await page.evaluate(()=>window.fixture.prime('text'));const question=page.getByLabel('Your question',{exact:true});await expect(question).toBeEditable();await question.fill('When does Alder station open?');await page.getByRole('button',{name:'Send question',exact:true}).click();await page.evaluate(()=>window.fixture.answer(0,true));await expect(page.locator('.transcript-turn')).toHaveCount(2);await capture('text-active');
  if(!size.reflow){
   const transcript=page.locator('.text-session .transcript'),dock=page.locator('.text-session .session-dock');
   const tr=await transcript.boundingBox(),dr=await dock.boundingBox();assert(tr.y+tr.height<=dr.y+1,'Dock does not cover transcript');assert(dr.y+dr.height<=size.height+1,'Composer remains visible');
   assert(await transcript.evaluate(e=>e.scrollHeight>e.clientHeight+1));await transcript.evaluate(e=>e.scrollTop=180);const scroll=await transcript.evaluate(e=>e.scrollTop);assert(scroll>0);
   await page.getByRole('switch',{name:'Dark theme'}).click();await page.getByRole('switch',{name:'Dark theme'}).click();assert.equal(await transcript.evaluate(e=>e.scrollTop),scroll,'Theme preserves reading position');
  }

  await page.getByRole('button',{name:'Source actions',exact:true}).click();await capture('source-menu');await page.getByRole('menuitem',{name:'Replace source',exact:true}).click();await capture('replacement');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Source actions',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Voice mode',exact:true}).click();await expect(start()).toBeEnabled();await capture('voice-idle','.voice-start');
  const voiceIdle=entry.states.at(-1);for(const key of ['padding','font','paddingAction','minHeight'])assert.equal(voiceIdle[key],reference[key],`same text/voice ${key}`);
  assert.equal(voiceIdle.action.width,reference.action.width);assert.equal(voiceIdle.action.height,reference.action.height);assert.equal(voiceIdle.actionGap,reference.actionGap);
  assert.equal((await audit()).voice.at(-1).prepare,0);
  await start().focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');await expect(end()).toBeVisible();
  await expect(page.locator('.voice-session-status')).toContainText('Loading your source');assert.equal((await audit()).voice.at(-1).prepare,1);assert.equal((await audit()).voice.at(-1).media,0);await capture('voice-pending','.voice-start');
  await end().click();await expect(start()).toBeEnabled();await capture('voice-cancelled','.voice-start');
  await start().click();await page.evaluate(()=>window.fixture.prime('voice'));await expect(page.getByRole('button',{name:'Mute microphone',exact:true})).toBeVisible();await expect(page.locator('.voice-start')).toHaveCount(0);
  await end().click();await expect(page.locator('.transcript-turn')).toHaveCount(0);await capture('voice-empty-ended','.voice-start');
  await start().click();await page.evaluate(()=>window.fixture.voiceFail());await expect(start()).toBeEnabled();await capture('voice-failed','.voice-start');
  await page.evaluate(()=>window.fixture.limit('window',2));await start().click();await expect(page.locator('.voice-recovery')).toContainText('start limit reached');await expect(start()).toBeDisabled();await capture('voice-cooldown','.voice-start');
  await online(false);await expect(page.locator('.voice-session-status')).toBeVisible();await expect(page.locator('.voice-session-status')).toContainText('offline');await capture('voice-offline','.voice-start');
  const beforeOnline=await audit();await online(true);await expect(page.locator('.voice-session-status')).toContainText('Connection may be back');await expect(start()).toBeEnabled({timeout:5000});assert.deepEqual(await audit(),beforeOnline);await capture('voice-reconnected','.voice-start');
  // A fresh owner with denied microphone: real controller and ACK gates, fake media only.
  await page.getByRole('button',{name:'Text mode',exact:true}).click();await page.evaluate(()=>window.fixture.voiceScenario('denied-microphone'));await page.getByRole('button',{name:'Voice mode',exact:true}).click();await start().click();await page.evaluate(()=>window.fixture.prime('voice'));await expect(page.locator('.voice-session-status')).toContainText('Microphone access was denied');await capture('voice-permission-failed','.voice-start');
  await page.getByRole('button',{name:'Text mode',exact:true}).click();await page.evaluate(()=>window.fixture.voiceScenario('blocked-playback'));await page.getByRole('button',{name:'Voice mode',exact:true}).click();await start().click();await page.evaluate(()=>window.fixture.prime('voice'));await expect(page.getByRole('button',{name:'Tap to enable sound',exact:true})).toBeVisible();await capture('voice-playback-blocked');
  await page.getByRole('button',{name:'Tap to enable sound',exact:true}).click();await expect(page.getByRole('button',{name:'Tap to enable sound',exact:true})).toBeHidden();await page.getByRole('button',{name:'Mute speaker',exact:true}).click();await expect(page.getByRole('button',{name:'Mute microphone',exact:true})).toHaveAttribute('aria-pressed','false');await page.getByRole('button',{name:'Unmute speaker',exact:true}).click();
  await page.evaluate(()=>window.fixture.voicePartial());await expect(page.locator('.transcript-turn')).toHaveCount(2);await capture('voice-partial');
  await page.getByRole('button',{name:'Interrupt answer',exact:true}).click();await page.evaluate(()=>window.fixture.voiceInterruptDone());await expect(page.locator('.voice-media-announcement')).toContainText('Interruption confirmed');await capture('voice-interrupted');
  const received=await page.locator('.transcript-text').allTextContents();await end().click();await expect(page.locator('.voice-start')).toHaveCount(0);await expect(page.locator('.restart-warning')).toContainText('Starting again clears it');assert.deepEqual(await page.locator('.transcript-text').allTextContents(),received);await expect(page.locator('.transcript')).toContainText('Text unfinished when the conversation stopped.');await capture('voice-received-ended');
  const stable=await audit();await page.getByRole('switch',{name:'Dark theme'}).click();await page.getByRole('switch',{name:'Dark theme'}).click();assert.deepEqual(await audit(),stable);
  await page.getByRole('button',{name:'View source',exact:true}).click();await expect(page.getByRole('heading',{name:'Extracted PDF text',exact:true})).toBeFocused();
  await expect(page.locator('.source-reader .reader-source-title')).toHaveText('Alder station.pdf');await expect(page.getByText('Extraction notes',{exact:true})).toHaveCount(0);
  assert(!/document order|visitor cookie|Reloading clears|Expires|PDF reading order/.test(await page.locator('.source-reader').innerText()));
  assert.deepEqual(await page.locator('.source-reader .page-text').allTextContents(),source.sections.map(s=>s.text||'No extractable text on this page.'));
  await capture('pdf-reader');await page.locator('.source-reader .source-page').last().scrollIntoViewIfNeeded();await expect(page.locator('.source-reader .source-page').last()).toBeInViewport();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'View source',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'View source',exact:true}).click();await page.getByRole('button',{name:'Close text and return',exact:true}).first().click();await expect(page.getByRole('button',{name:'View source',exact:true})).toBeFocused();
  entry.contrast=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);const lum=k=>{const h=s.getPropertyValue(k).trim().slice(1),rgb=(h.length===3?[...h].map(c=>c+c):h.match(/../g)).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};return [['--ink','--surface'],['--muted','--surface'],['--muted','--paper'],['--warning','--warning-surface'],['--primary-ink','--primary'],['--primary-ink','--primary-end']].map(([fg,bg])=>({fg,bg,ratio:(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05)}));});assert(entry.contrast.every(x=>x.ratio>=4.5),'Text and primary contrast');
  entry.nativeCalls=await page.evaluate(()=>window.__nativeCalls);assert.equal(entry.nativeCalls,0);assert.deepEqual(entry.errors,[]);assert.deepEqual(entry.external,[]);await context.close();
 }
 const failures=results.flatMap(e=>e.states.filter(s=>s.issues.length).map(s=>({theme:e.theme,width:e.width,name:s.name,issues:s.issues})));report.failures=failures;
 assert.deepEqual(failures,[]);report.status='PASS';console.log(`Workspace layout: PASS, ${results.length} theme/viewport scenarios; ${results.reduce((n,r)=>n+r.states.length,0)} geometry states`);
}catch(e){report.status='FAIL';report.failure=String(e);throw e;}
finally{await browser.close();await workspace.close();report.resourcesReleased=true;await fs.writeFile(path.join(dir,'results.json'),JSON.stringify(report,null,2));}
