import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHmac,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Store,publicFamily,voting} from './lib/store.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const fail=(message='تحقق من البيانات المدخلة',status=400)=>{throw Object.assign(Error(message),{status});};
const text=(v,max,required=false)=>{if(v==null||v===''){if(required)fail();return null;}if(typeof v!=='string'||v.trim().length>max||(required&&v.trim().length<2))fail();return v.trim();};
const id=v=>{if(typeof v!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))fail();return v;};
const photo=v=>{if(!v)return null;if(typeof v!=='string'||v.length>600000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v))fail('صيغة صورة غير صالحة');return v;};
function member(b,submission=false){const m={full_name:text(b.full_name,120,true),father_name:text(b.father_name,120,submission),relation:text(b.relation,80),phone:text(b.phone,30),notes:text(b.notes,1000),photo_url:photo(b.photo_url)};if(submission&&m.full_name.split(/\s+/).length<4)fail('أدخل الاسم الرباعي');return m;}
const find=(rows,key)=>rows.find(r=>r.id===key)||fail('السجل غير موجود',404);
const stamp=()=>new Date().toISOString();
async function body(req){let size=0;const parts=[];for await(const chunk of req){size+=chunk.length;if(size>700000)fail('الطلب كبير جدًا',413);parts.push(chunk);}try{const b=JSON.parse(Buffer.concat(parts).toString());if(!b||Array.isArray(b)||typeof b!=='object')fail();return b;}catch{fail();}}
export async function createServer({dir=path.resolve(process.env.DATA_DIR||'data'),config,production=process.env.NODE_ENV==='production'}={}){
 config ||= JSON.parse(await readFile(path.join(dir,'config.json'),'utf8'));if(!config.salt||!config.passwordHash||!config.sessionSecret)throw Error('Run npm run setup first.');
 const store=new Store(dir);await store.init();const limits=new Map();
 function limit(req,key,n,ms){const ip=req.socket.remoteAddress;const name=ip+key;const t=Date.now();const v=limits.get(name);if(!v||v.until<t)limits.set(name,{count:1,until:t+ms});else if(++v.count>n)fail('طلبات كثيرة؛ حاول لاحقًا',429);if(limits.size>10000)for(const[k,v]of limits)if(v.until<t)limits.delete(k);}
 const sign=v=>createHmac('sha256',config.sessionSecret).update(v).digest('base64url');
 const admin=req=>{const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('bakri-admin='))?.slice(12);if(!cookie)return false;const[e,n,s]=cookie.split('.');const expected=sign(`${e}.${n}`);return !!s&&s.length===expected.length&&timingSafeEqual(Buffer.from(s),Buffer.from(expected))&&Number(e)>Date.now();};
 const server=http.createServer(async(req,res)=>{
  const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
  try{
   const url=new URL(req.url,'http://localhost');const p=url.pathname;const method=req.method;
   if(!p.startsWith('/api/')){const routes={'/':'index.html','/vote':'vote.html','/admin':'admin.html'};const file=routes[p]||( /^\/[a-zA-Z0-9._-]+\.(css|js|html|woff2)$/.test(p)?p.slice(1):null);if(!file)fail('غير موجود',404);const bytes=await readFile(path.join(root,'public',file)).catch(()=>fail('غير موجود',404));const mime=file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.woff2')?'font/woff2':'text/html';res.writeHead(200,{'Content-Type':mime+'; charset=utf-8'});res.end(bytes);return;}
   res.setHeader('Cache-Control','no-store');limit(req,'all',120,60000);
   if(!['GET','POST'].includes(method))fail('غير مسموح',405);
   if(method==='POST'){const proto=process.env.TRUST_PROXY==='1'?req.headers['x-forwarded-proto']:(req.socket.encrypted?'https':'http');if(req.headers.origin&&req.headers.origin!==`${proto}://${req.headers.host}`)fail('طلب غير مصرح',403);if(!req.headers['content-type']?.startsWith('application/json'))fail('صيغة غير صالحة',415);}
   const b=method==='POST'?await body(req):{};
   if(p==='/api/admin/status'&&method==='GET')return json({admin:admin(req)});
   if(p==='/api/admin/login'&&method==='POST'){limit(req,'login',10,900000);const password=typeof b.password==='string'?b.password:'';if(password.length>256)fail();const expected=Buffer.from(config.passwordHash,'hex'),actual=scryptSync(password,config.salt,64);if(expected.length!==actual.length||!timingSafeEqual(actual,expected))fail('كلمة المرور غير صحيحة',401);const v=`${Date.now()+43200000}.${randomUUID()}`;res.setHeader('Set-Cookie',`bakri-admin=${v}.${sign(v)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${production?'; Secure':''}`);return json({ok:true});}
   if(p.startsWith('/api/admin/')&&!admin(req))fail('غير مصرح',401);
   if(p==='/api/admin/logout'&&method==='POST'){res.setHeader('Set-Cookie',`bakri-admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${production?'; Secure':''}`);return json({ok:true});}
   if(p==='/api/family'&&method==='GET')return json(publicFamily(await store.read()));
   if(p==='/api/voting'&&method==='GET')return json(voting(await store.read()));
   if(p==='/api/members'&&method==='POST'){limit(req,'submit',30,3600000);const m=member(b,true);await store.update(d=>d.members.push({...m,id:randomUUID(),status:'pending',is_elder:false,parent_id:null,created_at:stamp()}));return json({ok:true});}
   if(p==='/api/votes'&&method==='POST'){const candidate=id(b.candidate_id),token=text(b.voter_token,100,true);if(token.length<16)fail();return json(await store.update(d=>{if(!voting(d).open)return {ok:false,reason:'closed'};find(d.candidates,candidate);if(d.votes.some(v=>v.voter_token===token))return {ok:false,reason:'duplicate'};d.votes.push({id:randomUUID(),candidate_id:candidate,voter_token:token,created_at:stamp()});return {ok:true};}));}
   if(p==='/api/admin/all'&&method==='GET'){const d=await store.read();return json({members:[...d.members].sort((a,b)=>b.created_at.localeCompare(a.created_at)),voting:voting(d)});}
   if(p==='/api/admin/status-change'&&method==='POST'){const key=id(b.id);if(!['approved','pending','rejected'].includes(b.status))fail();await store.update(d=>find(d.members,key).status=b.status);return json({ok:true});}
   if(p==='/api/admin/member'&&method==='POST'){const m=member(b);if(typeof b.is_elder!=='boolean')fail();const key=b.id?id(b.id):null;await store.update(d=>{if(key)Object.assign(find(d.members,key),m,{is_elder:b.is_elder});else d.members.push({...m,id:randomUUID(),is_elder:b.is_elder,status:'approved',parent_id:null,created_at:stamp()});});return json({ok:true});}
   if(p==='/api/admin/delete-member'&&method==='POST'){const key=id(b.id);await store.update(d=>{find(d.members,key);d.members=d.members.filter(m=>m.id!==key);});return json({ok:true});}
   if(p==='/api/admin/candidate'&&method==='POST'){const c={name:text(b.name,120,true),bio:text(b.bio,1000),photo_url:photo(b.photo_url)};const key=b.id?id(b.id):null;await store.update(d=>{if(key)Object.assign(find(d.candidates,key),c);else d.candidates.push({...c,id:randomUUID(),created_at:stamp()});});return json({ok:true});}
   if(p==='/api/admin/delete-candidate'&&method==='POST'){const key=id(b.id);await store.update(d=>{find(d.candidates,key);d.candidates=d.candidates.filter(c=>c.id!==key);d.votes=d.votes.filter(v=>v.candidate_id!==key);});return json({ok:true});}
   if(p==='/api/admin/voting-control'&&method==='POST'){if(!['open','close','reset'].includes(b.action))fail();await store.update(d=>{if(b.action==='reset')d.votes=[];else d.settings.voting_open=b.action==='open';});return json({ok:true});}
   fail('غير موجود',404);
  }catch(e){json({error:e.status?e.message:'تعذر تنفيذ الطلب؛ حاول مجددًا'},e.status||500);}
 });return {server,store};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {server,store}=await createServer();server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('موقع البكري جاهز.'));for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>server.close(async()=>{await store.close();process.exit(0);}));}
