import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir='qa-results';fs.mkdirSync(dir,{recursive:true});
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(path.join(dir,x.name)):[path.join(dir,x.name)]);}
const sourceHash=crypto.createHash('sha256');for(const p of files('src').filter(p=>/\.(ts|json|css)$/.test(p)).sort()){sourceHash.update(p);sourceHash.update(fs.readFileSync(p));}
const build={version:JSON.parse(fs.readFileSync('package.json')).version,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceHash.digest('hex')};
http.createServer((req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5190');res.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS'){res.end();return;}
 if(req.url!=='/results'||req.method!=='POST'){res.writeHead(404);res.end();return;}
 let body='';req.on('data',d=>{body+=d;if(body.length>40_000_000)req.destroy();});
 req.on('end',()=>{try{const r=JSON.parse(body);r.build=build;for(const item of r.results){if(item.image?.startsWith('data:image/png;base64,')&&/^[A-Z0-9-]+$/.test(item.id)){fs.writeFileSync(`${dir}/${item.id}.png`,Buffer.from(item.image.split(',')[1],'base64'));item.evidence=`${item.id}.png`;delete item.image;}}fs.writeFileSync(`${dir}/browser.json`,JSON.stringify(r,null,2));res.end('saved');console.log('Сохранено требований:',r.results.length);}catch(e){res.writeHead(400);res.end(String(e));}});
}).listen(5191,'127.0.0.1',()=>console.log('Сборщик результатов: 127.0.0.1:5191',build));
