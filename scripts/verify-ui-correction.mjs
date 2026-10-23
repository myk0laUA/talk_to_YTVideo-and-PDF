import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {chromium, expect} from '@playwright/test';
const dir=path.resolve('artifacts/local/12b-correction');
const {webpack}=createRequire(import.meta.url)('next/dist/compiled/webpack/webpack');
const compiler=webpack({mode:'development',devtool:false,target:'web',entry:path.resolve('tests/ui-correction/harness.tsx'),output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':path.resolve('src')}},plugins:[new webpack.NormalModuleReplacementPlugin(/\.\/text-http-controller$/,path.resolve('tests/ui-correction/text.ts')),new webpack.NormalModuleReplacementPlugin(/\.\/voice-browser-adapters$/,path.resolve('tests/ui-correction/voice.ts'))],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/transcript-view/loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((e,s)=>{compiler.close(()=>{});if(e||s.hasErrors()) reject(e??new Error(s.toString())); else resolve();}));
const inputs=await fs.readFile('artifacts/local/10c/inputs.json','utf8'), f=JSON.parse(inputs)[0];
const source={id:f.id,kind:'PDF',title:'Alder station — operations notes',pageCount:f.variant.source.sections.length,expiresAt:'2027-01-01T00:00:00Z',warnings:[],sections:f.variant.source.sections};
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script id="inputs" type="application/json">${inputs.replaceAll('<','\\u003c')}</script><script src="/fixture.js"></script></body></html>`;
const css=await fs.readFile('src/app/globals.css'),bundle=await fs.readFile(path.join(dir,'fixture.js'));
const server=createServer((req,res)=>{const file={'/':['text/html',html],'/style.css':['text/css',css],'/fixture.js':['text/javascript',bundle]}[req.url];res.writeHead(file?200:404,{'content-type':file?.[0]??'text/plain'});res.end(file?.[1]??'not found');});
await new Promise(r=>server.listen(3150,'127.0.0.1',r));
const browser=await chromium.launch();const results=[];
try {for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900}}),page=await context.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!=='http://127.0.0.1:3150'){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:r.request().method()==='POST'?201:200,contentType:'application/json',body:JSON.stringify({ok:true,source})});return r.continue();});
 await page.addInitScript(()=>{window.__nativeCalls=0;for(const name of ['WebSocket','RTCPeerConnection','Audio'])Object.defineProperty(window,name,{value:class{constructor(){window.__nativeCalls++;throw new Error('Native media/transport forbidden');}}});Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia(){window.__nativeCalls++;throw new Error('Native microphone forbidden');}}});});
 await page.goto('http://127.0.0.1:3150');await page.locator('input[type=file]').setInputFiles({name:'Alder station.pdf',mimeType:'application/pdf',buffer:Buffer.from('test acquisition')});
 await page.getByText('Source options',{exact:true}).focus();await page.keyboard.press('Enter');assert(await page.locator('.source-details').evaluate(e=>e.open));await page.getByText('Replace source',{exact:true}).focus();await page.keyboard.press('Enter');assert(await page.getByRole('button',{name:'Replace PDF',exact:true}).isVisible());await page.screenshot({path:path.join(dir,`source-options-${width}.png`)});await page.getByText('Source options',{exact:true}).click();await page.getByRole('button',{name:'Start text session',exact:true}).click();await page.evaluate(()=>window.fixture.prime('text'));
 const questions=['When does the station open, and what is the first ferry?','How much does each tank hold?','What is their combined capacity?','What did Trial A use and deliver?'];
 for(let i=0;i<4;i++){await page.getByLabel('Your question',{exact:true}).fill(questions[i]);await page.getByRole('button',{name:'Send question',exact:true}).click();await page.evaluate(i=>window.fixture.answer(i),i);await expect(page.locator('.transcript-turn')).toHaveCount((i+1)*2);await expect(page.locator('.text-session-status')).toHaveText('Ready for your question.');}
 await page.locator('.transcript').evaluate(e=>{e.scrollTop=0;});
 const dock=async()=>{const b=await page.locator('.session-dock').boundingBox();assert(b&&b.y>=0&&b.y+b.height<=page.viewportSize().height+1,JSON.stringify(b));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const transcript=await page.locator('.transcript').boundingBox();assert(transcript.y+transcript.height<=b.y+1,'Dock must not cover transcript');};
 assert.equal(await page.locator('.transcript-turn').count(),8);await dock();await page.screenshot({path:path.join(dir,`text-${width}.png`)});
 await page.getByLabel('Your question',{exact:true}).fill('Show the operating notes.');await page.getByRole('button',{name:'Send question',exact:true}).click();await page.evaluate(()=>window.fixture.pending());
 await page.locator('.transcript').evaluate(e=>{e.scrollTop=350;});await page.waitForTimeout(50);
 const anchor=await page.locator('.transcript-text').first().evaluate(e=>e.getBoundingClientRect().top);
 await page.getByLabel('Your question',{exact:true}).focus();await page.evaluate(()=>window.fixture.append());
 assert(Math.abs(await page.locator('.transcript-text').first().evaluate(e=>e.getBoundingClientRect().top)-anchor)<=1);
 assert(await page.getByLabel('Your question',{exact:true}).evaluate(e=>e===document.activeElement));await dock();
 await page.screenshot({path:path.join(dir,`long-scroll-${width}.png`)});
 await page.getByRole('button',{name:'Jump to latest'}).click();assert(await page.locator('.transcript-latest').evaluate(e=>e===document.activeElement));
 await page.evaluate(()=>window.fixture.fail());await expect(page.locator('.text-session-status')).toContainText('The text connection failed or closed.');await expect(page.getByRole('button',{name:'Start a fresh text session',exact:true})).toBeEnabled();await page.screenshot({path:path.join(dir,`error-${width}.png`)});
 await page.getByRole('button',{name:'Voice mode',exact:true}).click();await page.getByRole('button',{name:'Start voice session',exact:true}).click();await page.evaluate(()=>window.fixture.prime('voice'));await page.getByRole('button',{name:'Enable speaker playback',exact:true}).click();await page.evaluate(()=>window.fixture.voiceAnswer());await expect(page.locator('.voice-session-status')).toHaveText('Voice session ready.');await expect(page.locator('.transcript-turn')).toHaveCount(2);await expect(page.locator('.transcript')).not.toContainText('Text updating');await dock();
 await page.screenshot({path:path.join(dir,`voice-${width}.png`)});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(await page.evaluate(()=>window.__nativeCalls),0);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);results.push({width,height:page.viewportSize().height,dock:true,anchor:true,focus:true,external,errors});
 await page.setViewportSize({width:320,height:400});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.getByRole('button',{name:'Stop session',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`reflow-${width}.png`)});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(dir,'viewport-results.json'),JSON.stringify({build:(await fs.readFile('.next/BUILD_ID','utf8')).trim(),runtime:process.version,context:'Isolated actual UI/controllers; static authored source, fake providers/storage/media, denied external traffic; viewport emulation only',cssSha256:createHash('sha256').update(css).digest('hex'),bundleSha256:createHash('sha256').update(bundle).digest('hex'),results},null,2));}
console.log('Normal text, voice, error, long-scroll and short/200% reflow PASS');

