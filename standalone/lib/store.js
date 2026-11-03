import {mkdir,readFile,writeFile,rename,copyFile,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {resolveParents} from '../public/family-tree.js';
export class Store{
 constructor(dir){this.dir=dir;this.file=path.join(dir,'family.json');this.queue=Promise.resolve();}
 async init(){await mkdir(this.dir,{recursive:true,mode:0o700});this.lock=await open(path.join(this.dir,'.lock'),'wx',0o600).catch(()=>{throw Error('Another instance or stale .lock exists. Stop the other server before removing .lock.');});try{await this.read();}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(this.file,JSON.stringify({members:[],candidates:[],votes:[],settings:{voting_open:true}}),{mode:0o600});}}
 async close(){await this.queue;await this.lock?.close();await unlink(path.join(this.dir,'.lock')).catch(()=>{});}
 async read(){const d=JSON.parse(await readFile(this.file,'utf8'));if(!Array.isArray(d.members)||!Array.isArray(d.candidates)||!Array.isArray(d.votes)||!d.settings)throw Error('Invalid family.json; restore the backup.');return d;}
 update(fn){const run=this.queue.then(async()=>{const d=await this.read();const r=await fn(d);const parents=resolveParents(d.members);d.members.forEach(m=>m.parent_id=parents.get(m.id)??null);const tmp=this.file+'.tmp';await writeFile(tmp,JSON.stringify(d,null,2),{mode:0o600});const f=await open(tmp,'r');await f.sync();await f.close();await copyFile(this.file,this.file+'.backup');await rename(tmp,this.file);return r;});this.queue=run.catch(()=>{});return run;}
}
export function voting(d){const total=d.votes.length;return {total,open:d.settings.voting_open!==false,results:d.candidates.map(c=>{const votes=d.votes.filter(v=>v.candidate_id===c.id).length;return {...c,votes,percent:total?Math.round(votes/total*1000)/10:0};})};}
export function publicFamily(d){const rows=d.members.filter(m=>m.status==='approved').sort((a,b)=>a.created_at.localeCompare(b.created_at));const parents=resolveParents(rows);const members=rows.map(({phone,status,...m})=>({...m,parent_id:parents.get(m.id)??null}));return {members,elders:members.filter(m=>m.is_elder)};}
