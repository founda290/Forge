// Forge Studio · Cloudflare Worker gateway
// npx wrangler deploy   ·   npx wrangler secret put FORGE_TOKEN
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Authorization,x-forge-token,x-forge-provider,x-forge-base,x-forge-key,x-forge-adapter','Access-Control-Max-Age':'86400'};
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json',...CORS}});
const hits=new Map();
function limited(ip,max=600){const n=Date.now(),w=hits.get(ip)||{n:0,t:n};if(n-w.t>60000){w.n=0;w.t=n}w.n++;hits.set(ip,w);return w.n>max}
export default{async fetch(req,env){
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
    if(url.pathname==='/')return json({ok:true,service:'forge-gateway',routes:['/v1/chat/completions','/models','/mcp','/fetch','/exec','/sync']});
    return json({error:'not found'},404);
  }catch(e){return json({error:String(e&&e.message||e)},500)}}};
