// Forge Studio · Cloudflare Worker gateway
// npx wrangler deploy   ·   npx wrangler secret put FORGE_TOKEN
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Authorization,x-forge-token,x-forge-provider,x-forge-base,x-forge-key,x-forge-adapter','Access-Control-Max-Age':'86400'};
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json',...CORS}});
const hits=new Map();
function limited(ip,max=600){const n=Date.now(),w=hits.get(ip)||{n:0,t:n};if(n-w.t>60000){w.n=0;w.t=n}w.n++;hits.set(ip,w);return w.n>max}
async function runJobs(env){
  const l=JSON.parse((await env.FORGE_KV.get('jobs'))||'[]');let done=0;
  for(const j of l){
    if(j.status!=='queued')continue;
    j.status='running';
    try{
      const base=j.base.replace(/\/+$/,'');
      const isA=/anthropic/i.test(base);
      const r=isA
        ?await fetch(base+'/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':j.key||'','anthropic-version':'2023-06-01'},body:JSON.stringify({model:j.model,system:j.system||'You are Forge, an autonomous background agent. Complete the task fully, then output the final result.',messages:[{role:'user',content:j.prompt}],max_tokens:8192,stream:false}),signal:AbortSignal.timeout(120000)})
        :await fetch(base+'/chat/completions',{method:'POST',headers:{'content-type':'application/json',...(j.key?{'Authorization':'Bearer '+j.key}:{})},body:JSON.stringify({model:j.model,messages:[{role:'system',content:j.system||'You are Forge, an autonomous background agent. Complete the task fully, then output the final result.'},{role:'user',content:j.prompt}],stream:false}),signal:AbortSignal.timeout(120000)});
      const t=await r.text();let jz=null;try{jz=JSON.parse(t)}catch{}
      if(r.ok)j.result=(isA?(jz&&jz.content||[]).map(c=>c.text||'').join(''):(jz&&jz.choices&&jz.choices[0]&&jz.choices[0].message&&jz.choices[0].message.content||'')).slice(0,40000)||'(empty response)';
      else{j.status='error';j.error=('HTTP '+r.status+' '+t.slice(0,300))}
    }catch(e){j.status='error';j.error=String(e&&e.message||e).slice(0,300)}
    j.finished=new Date().toISOString();
    await env.FORGE_KV.put('jobs',JSON.stringify(l.slice(-60)));
    if(++done>=2)break;
  }
  const keep=l.filter(x=>!(x.finished&&Date.now()-new Date(x.finished).getTime()>6048e5));
  if(keep.length!==l.length)await env.FORGE_KV.put('jobs',JSON.stringify(keep));
}
export default{async scheduled(ctrl,env,ctx){ctx.waitUntil(runJobs(env))},async fetch(req,env){
  if(req.method==='OPTIONS')return new Response(null,{headers:CORS});
  const url=new URL(req.url),ip=req.headers.get('cf-connecting-ip')||'anon';
  if((url.pathname==='/v1/chat/completions'||url.pathname==='/fetch')&&limited(ip))return json({error:'rate limited'},429);
  if(env.FORGE_TOKEN&&(req.headers.get('x-forge-token')||'')!==env.FORGE_TOKEN)return json({error:'bad token'},401);
  try{
    if(url.pathname==='/v1/chat/completions'&&req.method==='POST'){
      const base=(req.headers.get('x-forge-base')||'').replace(/\/+$/,''),key=req.headers.get('x-forge-key')||'',adapter=req.headers.get('x-forge-adapter')||'';
      const body=await req.json();if(!base)return json({error:'missing base'},400);
      if(adapter==='anthropic'){
        const sys=body.messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
        const msgs=body.messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='tool'?'user':m.role,content:typeof m.content==='string'?m.content:JSON.stringify(m.content)}));
        const r=await fetch(base+'/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
          body:JSON.stringify({model:body.model,system:sys,messages:msgs,max_tokens:body.max_tokens||4096,stream:!!body.stream})});
        if(!body.stream){const j=await r.json();return json({choices:[{message:{role:'assistant',content:(j.content||[]).map(c=>c.text||'').join('')},finish_reason:j.stop_reason||'stop'}]})}
        const {readable,writable}=new TransformStream();const w=writable.getWriter(),enc=new TextEncoder();
        (async()=>{const rd=r.body.getReader(),dec=new TextDecoder();let buf='';
          while(true){const{done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
            while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line.startsWith('data:'))continue;
              try{const ev=JSON.parse(line.slice(5));
                if(ev.type==='content_block_delta'&&ev.delta?.text)await w.write(enc.encode('data: '+JSON.stringify({choices:[{delta:{content:ev.delta.text}}]})+'\n\n'));
                if(ev.type==='message_stop')await w.write(enc.encode('data: [DONE]\n\n'));}catch{}}}
          await w.close()})();
        return new Response(readable,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache',...CORS}});}
      const h={'Content-Type':'application/json'};if(key)h.Authorization='Bearer '+key;
      const up=await fetch(base+'/chat/completions',{method:'POST',headers:h,body:JSON.stringify(body)});
      return new Response(up.body,{status:up.status,headers:{'Content-Type':up.headers.get('content-type')||'application/json','Cache-Control':'no-cache',...CORS}});}
    if(url.pathname==='/models'&&req.method==='POST'){const{base,key}=await req.json();const h={};if(key)h.Authorization='Bearer '+key;
      const r=await fetch(base.replace(/\/+$/,'')+'/models',{headers:h});return new Response(await r.text(),{status:r.status,headers:{'Content-Type':'application/json',...CORS}})}
    if(url.pathname==='/mcp'&&req.method==='POST'){const{url:t,payload,headers}=await req.json();
      const r=await fetch(t,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(headers||{})},body:JSON.stringify(payload)});
      const out=new Response(r.body,{status:r.status,headers:{'Content-Type':r.headers.get('content-type')||'application/json',...CORS}});
      const sid=r.headers.get('mcp-session-id');if(sid)out.headers.set('Mcp-Session-Id',sid);return out}
    if(url.pathname==='/fetch'&&req.method==='POST'){const{url:t,method,headers,body}=await req.json();
      const r=await fetch(t,{method:method||'GET',headers:headers||{},body:body||undefined});
      return new Response(r.body,{status:r.status,headers:{'Content-Type':r.headers.get('content-type')||'text/plain',...CORS}})}
    if(url.pathname==='/exec'&&req.method==='POST'){const{command}=await req.json();const allow=['time','uuid','sha256','base64','ip'];
      const[cmd,...rest]=String(command||'').split(' ');if(!allow.includes(cmd))return json({error:'not allowed',allow},400);
      let out='';if(cmd==='time')out=new Date().toISOString();if(cmd==='uuid')out=crypto.randomUUID();if(cmd==='ip')out=ip;if(cmd==='base64')out=btoa(rest.join(' '));
      if(cmd==='sha256'){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rest.join(' ')));out=[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
      return json({out})}
    if(url.pathname.startsWith('/sync')){if(!env.FORGE_KV)return json({error:'bind FORGE_KV'},400);
      const id=url.searchParams.get('id')||'default';
      if(req.method==='GET')return json(JSON.parse((await env.FORGE_KV.get('ws:'+id))||'null'));
      const b=await req.text();await env.FORGE_KV.put('ws:'+id,b);return json({ok:true,bytes:b.length})}
    if(url.pathname==='/jobs'){if(!env.FORGE_KV)return json({error:'bind FORGE_KV'},400);
      const load=async()=>JSON.parse((await env.FORGE_KV.get('jobs'))||'[]');
      const pub=j=>({id:j.id,status:j.status,name:j.name,created:j.created,result:j.result,error:j.error});
      if(req.method==='POST'){const b=await req.json();
        if(!b.prompt||!b.model||!b.base)return json({error:'model, base, prompt required'},400);
        const j={id:'j'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),status:'queued',name:String(b.name||String(b.prompt).slice(0,60)).slice(0,100),prompt:String(b.prompt).slice(0,12000),model:String(b.model).slice(0,120),base:String(b.base).slice(0,300),system:String(b.system||'').slice(0,4000),key:String(b.key||'').slice(0,400),created:new Date().toISOString()};
        const l=await load();l.push(j);await env.FORGE_KV.put('jobs',JSON.stringify(l.slice(-60)));
        return json({id:j.id,status:j.status})}
      if(req.method==='GET'){const id=url.searchParams.get('id');const l=await load();
        if(id){const j=l.find(x=>x.id===id);return j?json({job:pub(j)}):json({error:'no such job'},404)}
        return json({jobs:l.map(pub).reverse()})}
      if(req.method==='DELETE'){const id=url.searchParams.get('id');const l=await load();const n=l.filter(x=>x.id!==id);await env.FORGE_KV.put('jobs',JSON.stringify(n));return json({ok:true,removed:l.length-n.length})}
      return json({error:'method not allowed'},405)}
    if(url.pathname==='/')return json({ok:true,service:'forge-gateway',routes:['/v1/chat/completions','/models','/mcp','/fetch','/exec','/sync','/jobs']});
    return json({error:'not found'},404);
  }catch(e){return json({error:String(e&&e.message||e)},500)}}};
