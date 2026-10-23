import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {chromium, expect} from '@playwright/test';
const dir=path.resolve('artifacts/local/12d/confirmation'); await fs.mkdir(dir,{recursive:true});
const {webpack}=createRequire(import.meta.url)('next/dist/compiled/webpack/webpack');
const compiler=webpack({mode:'development',devtool:false,target:'web',entry:path.resolve('tests/ui-12d/harness.tsx'),output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':path.resolve('src')}},plugins:[new webpack.NormalModuleReplacementPlugin(/\.\/text-http-controller$/,path.resolve('tests/ui-correction/text.ts')),new webpack.NormalModuleReplacementPlugin(/\.\/voice-browser-adapters$/,path.resolve('tests/ui-correction/voice.ts'))],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/transcript-view/loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((e,s)=>{compiler.close(()=>{});if(e||s.hasErrors()) reject(e??new Error(s.toString())); else resolve();}));
const inputs=await fs.readFile('artifacts/local/10c/inputs.json','utf8'), f=JSON.parse(inputs)[0];
const source={id:f.id,kind:'PDF',title:'Alder station — operations notes',pageCount:f.variant.source.sections.length,expiresAt:'2027-01-01T00:00:00Z',warnings:[],sections:f.variant.source.sections};
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script id="inputs" type="application/json">${inputs.replaceAll('<','\\u003c')}</script><script src="/fixture.js"></script></body></html>`;
const css=await fs.readFile('src/app/globals.css'),bundle=await fs.readFile(path.join(dir,'fixture.js'));
const server=createServer((req,res)=>{const file={'/':['text/html',html],'/style.css':['text/css',css],'/fixture.js':['text/javascript',bundle]}[req.url];res.writeHead(file?200:404,{'content-type':file?.[0]??'text/plain'});res.end(file?.[1]??'not found');});
await new Promise(r=>server.listen(3150,'127.0.0.1',r));
const browser=await chromium.launch();const results=[];
try {for(const theme of ['light','dark']) for(const width of [390,1440]){
 const context=await browser.newContext({colorScheme:theme,viewport:{width,height:width===390?844:900}}),page=await context.newPage(),errors=[],external=[];
 let currentSource=structuredClone(source), imports=0, importFailure=false;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='http://127.0.0.1:3150'){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/')){
 if(r.request().method()==='POST' && u.pathname.includes('/sources/')){
  if(importFailure)return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:{code:'storage_unavailable'}})});
  if(imports++>0){const next=JSON.parse(inputs)[1];currentSource={...source,id:next.id,pageCount:next.variant.source.sections.length,sections:next.variant.source.sections};}
 }
 return r.fulfill({status:r.request().method()==='POST'?201:200,contentType:'application/json',body:JSON.stringify({ok:true,source:currentSource})});}
return r.continue();});
 await page.addInitScript(()=>{window.__nativeCalls=0;for(const name of ['WebSocket','RTCPeerConnection','Audio'])Object.defineProperty(window,name,{value:class{constructor(){window.__nativeCalls++;throw new Error('Native media/transport forbidden');}}});Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia(){window.__nativeCalls++;throw new Error('Native microphone forbidden');}}});});
 await page.goto('http://127.0.0.1:3150');await page.screenshot({path:path.join(dir,`entry-${theme}-${width}.png`)});await page.locator('input[type=file]').setInputFiles({name:'Alder station.pdf',mimeType:'application/pdf',buffer:Buffer.from('test acquisition')});
 await page.screenshot({path:path.join(dir,`empty-${theme}-${width}.png`)});await page.getByRole('button',{name:'Source actions',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('menu')).toBeVisible();await page.screenshot({path:path.join(dir,`menu-${theme}-${width}.png`)});await page.getByRole('menuitem',{name:'Replace source',exact:true}).click();assert(await page.getByRole('button',{name:'Replace PDF',exact:true}).isVisible());await page.screenshot({path:path.join(dir,`replacement-${theme}-${width}.png`)});await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Source actions',exact:true})).toBeFocused();await page.getByRole('button',{name:'View source'}).click();await page.screenshot({path:path.join(dir,`preview-${theme}-${width}.png`)});await page.keyboard.press('Escape');await page.getByRole('button',{name:'Start text session',exact:true}).click();await page.evaluate(()=>window.fixture.prime('text'));
 const questions=['When does the station open, and what is the first ferry?','How much does each tank hold?','What is their combined capacity?','What did Trial A use and deliver?'];
 for(let i=0;i<4;i++){await page.getByLabel('Your question',{exact:true}).fill(questions[i]);await page.getByRole('button',{name:'Send question',exact:true}).click();await page.evaluate(i=>window.fixture.answer(i),i);await expect(page.locator('.transcript-turn')).toHaveCount((i+1)*2);await expect(page.locator('.text-session-status')).toHaveText('Ready for your question.');}
 await page.locator('.transcript').evaluate(e=>{e.scrollTop=0;});
 const dock=async()=>{const b=await page.locator('.session-dock').boundingBox();assert(b&&b.y>=0&&b.y+b.height<=page.viewportSize().height+1,JSON.stringify(b));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const transcript=await page.locator('.transcript').boundingBox();assert(transcript.y+transcript.height<=b.y+1,'Dock must not cover transcript');};
 assert.equal(await page.locator('.transcript-turn').count(),8);await dock();const textAudit=await page.evaluate(()=>window.fixture.audit());const textTurns=await page.locator('.transcript-turns').innerText();await page.getByRole('switch',{name:'Dark theme'}).click();await page.getByRole('switch',{name:'Dark theme'}).click();assert.deepEqual(await page.evaluate(()=>window.fixture.audit()),textAudit);assert.equal(await page.locator('.transcript-turns').innerText(),textTurns);await page.evaluate(()=>localStorage.removeItem('talk-to-document-theme-v1'));await page.waitForTimeout(200);await page.screenshot({path:path.join(dir,`text-${theme}-${width}.png`)});
 await page.getByLabel('Your question',{exact:true}).fill('Show the operating notes.');await page.getByRole('button',{name:'Send question',exact:true}).click();await page.evaluate(()=>window.fixture.pending());
 await page.locator('.transcript').evaluate(e=>{e.scrollTop=350;});await page.waitForTimeout(50);
 const anchor=await page.locator('.transcript-text').first().evaluate(e=>e.getBoundingClientRect().top);
 await page.getByLabel('Your question',{exact:true}).focus();await page.evaluate(()=>window.fixture.append());
 assert(Math.abs(await page.locator('.transcript-text').first().evaluate(e=>e.getBoundingClientRect().top)-anchor)<=1);
 assert(await page.getByLabel('Your question',{exact:true}).evaluate(e=>e===document.activeElement));await dock();
 await page.screenshot({path:path.join(dir,`long-scroll-${theme}-${width}.png`)});
 await fs.writeFile(path.join(dir,`nav-${theme}-${width}.json`),JSON.stringify(await page.locator('.transcript-navigation').evaluate(e=>({class:e.className,nav:e.getBoundingClientRect().toJSON(),style:{position:getComputedStyle(e).position,z:getComputedStyle(e).zIndex},button:e.querySelector('button').getBoundingClientRect().toJSON(),buttonStyle:{clip:getComputedStyle(e.querySelector('button')).clipPath,position:getComputedStyle(e.querySelector('button')).position},transcript:e.parentElement.getBoundingClientRect().toJSON()})),null,2));
 await page.getByRole('button',{name:'Jump to latest'}).focus();await page.getByRole('button',{name:'Jump to latest'}).click({timeout:5000});assert(await page.locator('.transcript-latest').evaluate(e=>e===document.activeElement));
 await page.evaluate(()=>window.fixture.fail());await expect(page.locator('.text-session-status')).toContainText('The text connection failed or closed.');await expect(page.getByRole('button',{name:'Start a fresh text session',exact:true})).toBeEnabled();await page.screenshot({path:path.join(dir,`error-${theme}-${width}.png`)});
 await page.getByRole('button',{name:'Voice mode',exact:true}).click();await page.getByRole('button',{name:'Start voice',exact:true}).click();await page.evaluate(()=>window.fixture.prime('voice'));await expect(page.getByRole('button',{name:'Mute speaker',exact:true})).toBeVisible();await page.evaluate(()=>window.fixture.voiceAnswer());await expect(page.locator('.voice-session-status')).toHaveText('Voice session ready.');await expect(page.locator('.transcript-turn')).toHaveCount(2);await expect(page.locator('.transcript')).not.toContainText('Text updating');await dock();
 await page.screenshot({path:path.join(dir,`voice-${theme}-${width}.png`)});
 await page.getByRole('button',{name:'Mute microphone',exact:true}).click();await page.getByRole('button',{name:'Mute speaker',exact:true}).click();
 const turnsBefore=await page.locator('.transcript-turns').innerText(),auditBefore=await page.evaluate(()=>window.fixture.audit());
 const toggle=page.getByRole('switch',{name:'Dark theme'});await toggle.focus();await page.keyboard.press('Space');await expect(toggle).toHaveAttribute('aria-checked',String(theme!=='dark'));
 assert.equal(await page.locator('.transcript-turns').innerText(),turnsBefore);assert.deepEqual(await page.evaluate(()=>window.fixture.audit()),auditBefore);await expect(page.getByRole('button',{name:'Unmute microphone',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Unmute speaker',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Space');await expect(toggle).toHaveAttribute('aria-checked',String(theme==='dark'));
 assert.deepEqual(await page.evaluate(()=>Object.entries(localStorage)),[['talk-to-document-theme-v1',theme]]);
 await page.evaluate(()=>localStorage.removeItem('talk-to-document-theme-v1'));

 const contrast=await page.evaluate(()=>{const css=getComputedStyle(document.documentElement);const luminance=name=>{const hex=css.getPropertyValue(name).trim().slice(1);const values=(hex.length===3?[...hex].map(x=>x+x):hex.match(/../g)).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};return [['--ink','--surface'],['--muted','--surface'],['--warning','--surface'],['--primary-ink','--primary'],['--primary-ink','--primary-end']].map(([fg,bg])=>{const a=luminance(fg),b=luminance(bg);return {fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});});assert(contrast.every(x=>x.ratio>=4.5),JSON.stringify(contrast));
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(await page.evaluate(()=>window.__nativeCalls),0);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);results.push({theme,contrast,width,height:page.viewportSize().height,dock:true,anchor:true,focus:true,external,errors});
 
 await page.getByRole('button',{name:'End voice',exact:true}).click();await expect(page.locator('.transcript-turn')).toHaveCount(2);
 await page.evaluate(()=>window.fixture.limit('window',5));await page.getByRole('button',{name:'Start voice',exact:true}).click();
 await expect(page.locator('.voice-recovery')).toContainText('Voice start limit reached');await expect(page.getByRole('button',{name:'Retry voice',exact:true})).toBeDisabled();
 await page.screenshot({path:path.join(dir,`cooldown-${theme}-${width}.png`)});
 const rejectedAudit=await page.evaluate(()=>window.fixture.audit());
 await page.getByRole('button',{name:'Text mode',exact:true}).click();await expect(page.getByRole('button',{name:'Start text session',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Voice mode',exact:true}).click();await expect(page.getByRole('button',{name:'Retry voice',exact:true})).toBeDisabled();
 assert.equal((await page.evaluate(()=>window.fixture.audit())).voice.reduce((n,r)=>n+r.prepare,0),rejectedAudit.voice.reduce((n,r)=>n+r.prepare,0));
 await expect(page.getByRole('button',{name:'Retry voice',exact:true})).toBeEnabled({timeout:7000});
 assert.equal((await page.evaluate(()=>window.fixture.audit())).voice.reduce((n,r)=>n+r.prepare,0),rejectedAudit.voice.reduce((n,r)=>n+r.prepare,0),'Cooldown must not restart voice');
 await page.getByRole('button',{name:'Retry voice',exact:true}).click();await page.evaluate(()=>window.fixture.prime('voice'));await expect(page.getByRole('button',{name:'Mute microphone',exact:true})).toBeVisible();
 await page.evaluate(()=>window.fixture.voiceBegin());await expect(page.locator('.voice-state')).toHaveText('Answering…');await page.getByRole('button',{name:'Interrupt answer',exact:true}).click();await page.evaluate(()=>window.fixture.voiceInterruptDone());
 await expect(page.locator('.voice-media-announcement')).toContainText('Interruption confirmed');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.theme-thumb').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 await page.getByRole('button',{name:'Source actions',exact:true}).click();await page.keyboard.press('End');await expect(page.getByRole('menuitem',{name:'Remove source'})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Source actions',exact:true})).toBeFocused();

 await page.setViewportSize({width:320,height:400});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'End voice',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`reflow-${theme}-${width}.png`)});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

 await page.getByRole('button',{name:'View source'}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(dir,`preview-reflow-${theme}-${width}.png`)});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Source actions',exact:true}).click();await page.getByRole('menuitem',{name:'Replace source',exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(dir,`replacement-reflow-${theme}-${width}.png`)});
 
 await page.keyboard.press('Escape');await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(()=>document.documentElement.style.fontSize='');
 await page.getByRole('button',{name:'End voice',exact:true}).click();
 await page.evaluate(()=>window.fixture.limit('window',30));await page.getByRole('button',{name:'Start voice',exact:true}).click();await expect(page.getByRole('button',{name:'Retry voice',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Source actions',exact:true}).click();await page.getByRole('menuitem',{name:'Replace source'}).click();
 const sourceBefore=await page.locator('.source-title').innerText();importFailure=true;
 await page.locator('input[type=file]').setInputFiles({name:'failed.pdf',mimeType:'application/pdf',buffer:Buffer.from('test')});await expect(page.locator('.replacement-dialog')).toContainText('storage');
 assert.equal(await page.locator('.source-title').innerText(),sourceBefore);
 await page.getByRole('textbox',{name:'YouTube URL'}).fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');await page.keyboard.press('Escape');await page.getByRole('switch',{name:'Dark theme'}).click();await page.getByRole('switch',{name:'Dark theme'}).click();
 await page.getByRole('button',{name:'Source actions',exact:true}).click();await page.getByRole('menuitem',{name:'Replace source'}).click();await expect(page.getByRole('textbox',{name:'YouTube URL'})).toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 importFailure=false;
 const longName='Operating-notes-'.repeat(14)+'Résumé-日本語.pdf';await page.locator('input[type=file]').setInputFiles({name:longName,mimeType:'application/pdf',buffer:Buffer.from('test')});
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.source-title')).toHaveText(longName);await expect(page.getByRole('button',{name:'Retry voice',exact:true})).toBeDisabled();
 assert.equal((await page.evaluate(()=>window.fixture.audit())).voice.at(-1).prepare,0,'Replacement cannot reset a known voice cooldown or auto-start');
 await page.screenshot({path:path.join(dir,`long-name-${theme}-${width}.png`)});
 await page.getByRole('button',{name:'View source'}).click();await expect(page.locator('.reader-source-title')).toHaveText(longName);
 assert.deepEqual(await page.locator('.page-text').allTextContents(),currentSource.sections.map(s=>s.text||'No extractable text on this page.'));
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'View source'})).toBeFocused();
 await page.getByRole('button',{name:'Source actions',exact:true}).click();await page.getByRole('menuitem',{name:'Remove source'}).click();await expect(page.getByRole('button',{name:'Keep source'})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Confirm remove'})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Keep source'})).toBeFocused();
 await page.screenshot({path:path.join(dir,`remove-${theme}-${width}.png`)});await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Source actions',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Text mode',exact:true}).click();await page.getByRole('button',{name:'Start text session',exact:true}).click();await page.evaluate(()=>window.fixture.prime('text'));await page.getByLabel('Your question',{exact:true}).fill('Keep this draft while retrying');await page.evaluate(()=>window.fixture.fail());
 await page.getByRole('button',{name:'Start a fresh text session',exact:true}).click();await page.evaluate(()=>window.fixture.prime('text'));await expect(page.getByLabel('Your question',{exact:true})).toHaveValue('Keep this draft while retrying');await expect(page.locator('.transcript-turn')).toHaveCount(0);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(await page.evaluate(()=>window.__nativeCalls),0);

 await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(dir,'viewport-results.json'),JSON.stringify({build:(await fs.readFile('.next/BUILD_ID','utf8')).trim(),runtime:process.version,context:'Isolated actual UI/controllers; static authored source, fake providers/storage/media, denied external traffic; viewport emulation only',cssSha256:createHash('sha256').update(css).digest('hex'),bundleSha256:createHash('sha256').update(bundle).digest('hex'),results},null,2));}
console.log('Normal text, voice, error, long-scroll and short/200% reflow PASS');

