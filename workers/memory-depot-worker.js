// Memory Depot R2 routes for the existing playa-companion-api Worker.
// Requires an R2 binding named MEMORIES pointing at your Memories bucket.
// Merge the route handler below into the existing Worker rather than replacing
// your current official Burning Man API routes.

const ALLOWED_ORIGINS = new Set(['https://dmitrirumschlag1989.github.io']);

function cors(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://dmitrirumschlag1989.github.io';
  return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Accept','Access-Control-Max-Age':'86400',Vary:'Origin'};
}
function json(data,status=200,origin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin)}})}
function safeName(name='upload'){return String(name).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').slice(-120)}

export async function handleMemoryDepot(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/memories')) return null;
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors(origin)});
  if(!env.MEMORIES) return json({error:'R2 binding MEMORIES is not configured'},500,origin);
  const match=url.pathname.match(/^\/memories(?:\/([^/]+))?(?:\/content)?$/);
  if(!match) return null;
  const id=match[1]?decodeURIComponent(match[1]):null;
  const isContent=/\/content$/.test(url.pathname);

  if(request.method==='GET'&&!id){
    const listed=await env.MEMORIES.list({prefix:'meta/',limit:200});
    const memories=[];
    for(const object of listed.objects){const item=await env.MEMORIES.get(object.key);if(!item)continue;try{memories.push(await item.json())}catch(_){} }
    memories.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    return json({memories},200,origin);
  }
  if(request.method==='GET'&&id&&isContent){
    const media=await env.MEMORIES.get(`media/${id}`);if(!media)return json({error:'Memory not found'},404,origin);
    const headers=new Headers(cors(origin));headers.set('Content-Type',media.httpMetadata?.contentType||'application/octet-stream');headers.set('Cache-Control','public, max-age=31536000, immutable');if(media.httpEtag)headers.set('ETag',media.httpEtag);return new Response(media.body,{headers});
  }
  if(request.method==='POST'&&!id){
    const form=await request.formData(),file=form.get('file');
    if(!(file instanceof File))return json({error:'file is required'},400,origin);
    if(!/^image\/(jpeg|png|webp|gif)|^video\//i.test(file.type||''))return json({error:'Only image and video files are accepted'},415,origin);
    if(file.size>25*1024*1024)return json({error:'File exceeds 25 MB limit'},413,origin);
    const idValue=crypto.randomUUID(),kind=file.type.startsWith('video/')?'video':'photo',created_at=new Date().toISOString();
    const memory={id:idValue,kind,author:String(form.get('author')||'').trim().slice(0,80),caption:String(form.get('caption')||'').trim().slice(0,1000),day:String(form.get('day')||'').trim().slice(0,20),location:String(form.get('location')||'').trim().slice(0,160),event:String(form.get('event')||'').trim().slice(0,200),created_at,url:`${url.origin}/memories/${idValue}/content`,original_name:safeName(file.name)};
    await env.MEMORIES.put(`media/${idValue}`,file.stream(),{httpMetadata:{contentType:file.type||'application/octet-stream'},customMetadata:{kind,original_name:safeName(file.name)}});
    await env.MEMORIES.put(`meta/${idValue}.json`,JSON.stringify(memory),{httpMetadata:{contentType:'application/json; charset=utf-8'}});
    return json(memory,201,origin);
  }
  if(request.method==='DELETE'&&id){await env.MEMORIES.delete(`media/${id}`);await env.MEMORIES.delete(`meta/${id}.json`);return json({ok:true,id},200,origin)}
  return json({error:'Method not allowed'},405,origin);
}
