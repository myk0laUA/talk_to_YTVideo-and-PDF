import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {chromium, expect} from '@playwright/test';

const stage=process.argv[2]??'inspection';
assert(['before','inspection','confirmation'].includes(stage));
const dir=path.resolve(`artifacts/local/12e/${stage}`);
await fs.mkdir(dir,{recursive:true});
const {webpack}=createRequire(import.meta.url)('next/dist/compiled/webpack/webpack');
const compiler=webpack({mode:'development',devtool:false,target:'web',entry:path.resolve('tests/ui-12e/harness.tsx'),output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':path.resolve('src')}},plugins:[new webpack.NormalModuleReplacementPlugin(/\.\/text-http-controller$/,path.resolve('tests/ui-correction/text.ts')),new webpack.NormalModuleReplacementPlugin(/\.\/voice-browser-adapters$/,path.resolve('tests/ui-correction/voice.ts'))],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.resolve('tests/transcript-view/loader.mjs')}]}});
await new Promise((resolve,reject)=>compiler.run((e,s)=>{compiler.close(()=>{});if(e||s.hasErrors())reject(e??new Error(s.toString()));else resolve();}));
const inputs=await fs.readFile('artifacts/local/10c/inputs.json','utf8'),fixtures=JSON.parse(inputs);
const source=(i=0)=>({id:fixtures[i].id,kind:'PDF',title:'Alder station — operations notes',pageCount:fixtures[i].variant.source.sections.length,expiresAt:'2027-01-01T00:00:00Z',warnings:[],sections:fixtures[i].variant.source.sections});
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Talk to a Document — isolated UI verification</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script id="inputs" type="application/json">${inputs.replaceAll('<','\\u003c')}</script><script src="/fixture.js"></script></body></html>`;
const css=await fs.readFile('src/app/globals.css'),bundle=await fs.readFile(path.join(dir,'fixture.js'));
await fs.writeFile(path.join(dir,'style.css'),css);
await fs.writeFile(path.join(dir,'index.html'),html.replace('href="/style.css"','href="style.css"').replace('src="/fixture.js"','src="fixture.js"'));
const server=createServer((req,res)=>{const file={'/':['text/html',html],'/style.css':['text/css',css],'/fixture.js':['text/javascript',bundle]}[new URL(req.url,'http://localhost').pathname];res.writeHead(file?200:404,{'content-type':file?.[0]??'text/plain'});res.end(file?.[1]??'not found');});
await new Promise(r=>server.listen(3151,'127.0.0.1',r));
const browser=await chromium.launch();const results=[];
try {for(const theme of ['light','dark']) for(const width of [390,768,1440]){
 const context=await browser.newContext({colorScheme:theme,reducedMotion:'reduce',viewport:{width,height:width===390?844:width===768?1024:900}}),page=await context.newPage(),errors=[],external=[];
 let currentSource=source(),failure=null,hold=false,release,posts=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!=='http://127.0.0.1:3151'){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/')){
  if(r.request().method()==='POST'){posts++;if(hold)await new Promise(resolve=>{release=resolve;});if(failure)return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:{code:failure}})});}
  return r.fulfill({status:r.request().method()==='POST'?201:200,contentType:'application/json',body:JSON.stringify(r.request().method()==='DELETE'?{ok:true}:{ok:true,source:currentSource})});}return r.continue();});
 await page.addInitScript(()=>{window.__nativeCalls=0;for(const name of ['WebSocket','RTCPeerConnection','Audio'])Object.defineProperty(window,name,{value:class{constructor(){window.__nativeCalls++;throw new Error('Native media/transport forbidden');}}});Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia(){window.__nativeCalls++;throw new Error('Native microphone forbidden');}}});});
 const capture=async name=>{await page.screenshot({path:path.join(dir,`${name}-${theme}-${width}.png`),fullPage:true});};
 const upload=()=>page.locator('input[type=file]').setInputFiles({name:'Alder station.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic acquisition')});
 const audit=()=>page.evaluate(()=>window.fixture.audit());
 const overflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
 await page.goto('http://127.0.0.1:3151/?noYoutube');await expect(page.getByRole('button',{name:'Upload a PDF',exact:true})).toBeVisible();await capture('entry-unavailable');await overflow();
 if(stage==='before'){
  await page.goto('http://127.0.0.1:3151/');await capture('entry-available');await upload();await expect(page.getByRole('button',{name:'View source'})).toBeVisible();await capture('text-idle');await context.close();continue;
 }
 assert.equal((await audit()).textStarts,0);await expect(page.getByRole('button',{name:'Add a YouTube video'})).toBeDisabled();
 await page.goto('http://127.0.0.1:3151/?noYoutube&noPdf');await expect(page.getByRole('button',{name:'Upload a PDF',exact:true})).toBeDisabled();await capture('entry-disabled');
 await page.goto('http://127.0.0.1:3151/');await capture('entry-available');await overflow();
 const url=page.getByLabel('YouTube URL',{exact:true});await url.fill('https://example.com/not-youtube');await page.getByRole('button',{name:'Import YouTube video',exact:true}).click();await expect(url).toBeFocused();await expect(url).toHaveAttribute('aria-invalid','true');await capture('url-invalid');assert.equal(posts,0);
 await url.fill('https://youtu.be/dQw4w9WgXcQ');await page.getByRole('switch',{name:'Dark theme'}).click();await expect(url).toHaveValue('https://youtu.be/dQw4w9WgXcQ');await page.getByRole('switch',{name:'Dark theme'}).click();
 hold=true;await page.getByRole('button',{name:'Import YouTube video',exact:true}).click();await expect(page.getByRole('button',{name:'Cancel import'})).toBeVisible();await capture('import-loading');await page.getByRole('button',{name:'Cancel import'}).click();hold=false;release?.();await expect(page.getByRole('button',{name:'Import YouTube video',exact:true})).toBeEnabled();await expect(url).toHaveValue('https://youtu.be/dQw4w9WgXcQ');await capture('import-cancelled');
 failure='no_captions';await page.getByRole('button',{name:'Import YouTube video',exact:true}).click();await expect(page.locator('.source-status')).toContainText('No captions');await capture('import-failed');failure=null;
 await upload();await expect(page.getByRole('button',{name:'View source'})).toBeVisible();await expect(page.locator('#source-heading')).toBeFocused();await capture('text-idle');assert.equal((await audit()).textStarts,0);assert.equal((await audit()).voice.length,0);
 const start=page.getByRole('button',{name:'Start chat',exact:true});await expect(start).toHaveCount(1);await expect(page.locator('textarea[name=question]')).toBeHidden();
 const b=await start.boundingBox();assert(b.height>=52 && b.y+b.height<=page.viewportSize().height);assert(Math.abs(b.x+b.width/2-width/2)<12,'Centered start');
 const idle=await audit();await page.getByRole('switch',{name:'Dark theme'}).click();await page.getByRole('switch',{name:'Dark theme'}).click();assert.deepEqual(await audit(),idle);
 await start.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Stop text session'})).toBeVisible();assert.equal((await audit()).textStarts,1);await capture('text-connecting');await expect(page.locator('textarea[name=question]')).toBeHidden();
 await page.evaluate(()=>window.fixture.fail());await expect(page.getByRole('button',{name:'Start chat',exact:true})).toBeEnabled();await capture('text-start-failed');
 await page.getByRole('button',{name:'Start chat',exact:true}).click();await page.evaluate(()=>window.fixture.prime('text'));const question=page.getByLabel('Your question',{exact:true});await expect(question).toBeEditable();await expect(question).toBeFocused();assert.equal((await audit()).textStarts,2);
 await question.fill('When does the station open, and what is the first ferry?');await page.getByRole('button',{name:'Send question',exact:true}).click();await page.evaluate(()=>window.fixture.answer(0));await expect(page.locator('.transcript-turn')).toHaveCount(2);await capture('text-active');
 const textBefore=await page.locator('.transcript-turns').innerText(),activeAudit=await audit();await page.getByRole('switch',{name:'Dark theme'}).click();await page.getByRole('switch',{name:'Dark theme'}).click();assert.deepEqual(await audit(),activeAudit);assert.equal(await page.locator('.transcript-turns').innerText(),textBefore);
 await question.fill('Keep this unsent question');await page.evaluate(()=>window.fixture.fail());await expect(question).toHaveValue('Keep this unsent question');await expect(page.getByRole('button',{name:'Start chat',exact:true})).toHaveCount(0);await capture('text-restart');
 await page.getByRole('button',{name:'Start a fresh text session',exact:true}).click();await page.evaluate(()=>window.fixture.prime('text'));await expect(question).toHaveValue('Keep this unsent question');await expect(page.locator('.transcript-turn')).toHaveCount(0);
 await page.getByRole('button',{name:'Voice mode',exact:true}).click();await capture('voice-idle');assert.equal((await audit()).voice.at(-1).prepare,0);await page.getByRole('button',{name:'Start voice',exact:true}).click();await page.evaluate(()=>window.fixture.prime('voice'));await page.evaluate(()=>window.fixture.voiceAnswer());await expect(page.locator('.transcript-turn')).toHaveCount(2);await capture('voice-active');
 const voiceAudit=await audit();await page.getByRole('switch',{name:'Dark theme'}).click();await page.getByRole('switch',{name:'Dark theme'}).click();assert.deepEqual(await audit(),voiceAudit);
 await page.getByRole('button',{name:'Source actions',exact:true}).click();await page.getByRole('menuitem',{name:'Replace source',exact:true}).click();await expect(page.getByLabel('YouTube URL',{exact:true})).toHaveValue('https://youtu.be/dQw4w9WgXcQ');failure='no_captions';await page.getByRole('button',{name:'Replace with YouTube video',exact:true}).click();await expect(page.locator('.replacement-dialog')).toContainText('No captions');await capture('replacement-failed');assert.equal(await page.locator('.transcript-turn').count(),2);failure=null;
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Source actions',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Source actions',exact:true}).click();await page.getByRole('menuitem',{name:'Replace source',exact:true}).click();currentSource=source(1);await upload();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#source-heading')).toBeFocused();await expect(page.locator('.transcript-turn')).toHaveCount(0);await capture('replaced');
 await page.getByRole('button',{name:'Source actions',exact:true}).click();await page.getByRole('menuitem',{name:'Remove source',exact:true}).click();await page.getByRole('button',{name:'Confirm remove',exact:true}).click();await expect(page.getByRole('button',{name:'Upload a PDF',exact:true})).toBeVisible();await expect(page.locator('#source-heading')).toBeFocused();await capture('removed');
 const contrast=await page.evaluate(()=>{const css=getComputedStyle(document.documentElement);const luminance=name=>{const hex=css.getPropertyValue(name).trim().slice(1);const values=(hex.length===3?[...hex].map(x=>x+x):hex.match(/../g)).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};return [['--ink','--surface'],['--muted','--surface'],['--warning','--surface'],['--primary-ink','--primary'],['--primary-ink','--primary-end']].map(([fg,bg])=>{const a=luminance(fg),b=luminance(bg);return {fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});});assert(contrast.every(x=>x.ratio>=4.5));
 await page.setViewportSize({width:320,height:600});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await overflow();await capture('reflow-entry');await upload();await expect(page.getByRole('button',{name:'Text mode'})).toBeVisible();await page.getByRole('button',{name:'Text mode'}).click();await overflow();await capture('reflow-text');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(await page.evaluate(()=>window.__nativeCalls),0);
 results.push({theme,width,contrast,errors,external,nativeCalls:0,explicitStarts:true,draft:true,focus:true,replacement:true,reflow:true});await context.close();
 }
 await fs.writeFile(path.join(dir,'results.json'),JSON.stringify({stage,node:process.version,build:await fs.readFile('.next/BUILD_ID','utf8').catch(()=>null),bundle: createHash('sha256').update(bundle).digest('hex'),css:createHash('sha256').update(css).digest('hex'),results},null,2));
 console.log(`${stage}: PASS; ${results.length} complete viewport/theme scenarios`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
