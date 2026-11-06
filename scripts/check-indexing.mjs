import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2]||'dist');
const origin='https://www.shorttermrentalforsale.com';
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const urls=[...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(urls.length,new Set(urls).size,'Duplicate sitemap URL');
function resolve(url){const pathname=new URL(url,origin).pathname;const p=path.join(root,decodeURIComponent(pathname));return [p,path.join(p,'index.html'),p.replace(/\/$/,'')+'.html'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());}
const errors=[];let schemas=0,links=0;
for(const url of urls){
 if(!url.startsWith(origin+'/')){errors.push('Foreign sitemap URL '+url);continue;}
 const file=resolve(url);if(!file){errors.push('Missing sitemap page '+url);continue;}
 const html=fs.readFileSync(file,'utf8');
 const canonical=[...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
 if(canonical.length!==1||!(canonical[0][0].includes('href="'+url+'"')||canonical[0][0].includes("href='"+url+"'")))errors.push('Canonical mismatch '+url);
 if(/<meta\b(?=[^>]*(?:name=["'](?:robots|googlebot)["']))[^>]*content=["'][^"']*noindex/i.test(html))errors.push('Noindex sitemap page '+url);
 if(!/<title>[^<]+<\/title>/i.test(html)||!/<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+/i.test(html))errors.push('Missing metadata '+url);
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{JSON.parse(m[1]);schemas++;}catch{errors.push('Invalid JSON-LD '+url);}}
}
const guide='/field-guides/buying-str-with-existing-bookings/';
const html=read(guide+'index.html');
for(const m of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)){if(m[1].startsWith('/')&&!m[1].startsWith('//')){links++;if(!resolve(m[1]))errors.push('Broken new guide link '+m[1]);}}
for(const hub of ['index.html','resources/index.html','field-guides/index.html','resources/seller-booking-revenue-verification/index.html'])assert(read(hub).includes('href="'+guide+'"'),'Missing discovery link '+hub);
const manifest=JSON.parse(read('content-manifest.json'));
assert.equal(manifest.totalPages,urls.length,'Manifest count mismatch');
assert.deepEqual(manifest.urls,urls,'Manifest URLs mismatch');
assert(read('robots.txt').includes('Sitemap: '+origin+'/sitemap.xml'));
assert(!/^Disallow:\s*\/\s*$/mi.test(read('robots.txt')),'Sitewide crawling blocked');
assert(urls.includes(origin+guide),'New guide missing from sitemap');
assert.equal((html.match(/<h1\b/g)||[]).length,1,'New guide requires one H1');
assert.equal(errors.length,0,errors.slice(0,30).join('\n'));
console.log(JSON.stringify({sitemapPages:urls.length,validStructuredDataBlocks:schemas,newGuideLocalLinks:links,manifestAligned:true,indexingChecks:'passed',note:'Eligibility checks do not guarantee search-engine indexing.'}));
