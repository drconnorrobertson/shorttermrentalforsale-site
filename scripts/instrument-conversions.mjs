import fs from 'node:fs';
import path from 'node:path';
const [directory,mode] = process.argv.slice(2);
if (!directory) throw Error('Output directory required');
const root = path.resolve(directory);
fs.copyFileSync(new URL('../bnb-conversion.js',import.meta.url),path.join(root,'bnb-conversion.js'));
const tag = '<script defer src="/bnb-conversion.js?v=20261010"></script>';
let count=0;
function walk(dir) {
 for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
  const file=path.join(dir,item.name);
  if(item.isDirectory()) { walk(file); continue; }
  if(!item.name.endsWith('.html') || (mode==='preserve-home' && file===path.join(root,'index.html'))) continue;
  let html=fs.readFileSync(file,'utf8');
  if(!html.includes('src="/bnb-conversion.js')) { html=html.replace(/<\/head>/i,tag+'</head>'); fs.writeFileSync(file,html); count++; }
 }
}
walk(root);
console.log(JSON.stringify({conversion_pages:count,homepage_preserved:mode==='preserve-home'}));
