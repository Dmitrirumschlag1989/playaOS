(()=>{
  const previousFetch=window.fetch.bind(window);
  const cache={camps:null};
  const arr=x=>Array.isArray(x)?x:(x&&Array.isArray(x.events)?x.events:(x&&Array.isArray(x.data)?x.data:[]));
  const key=v=>String(v??'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const location=c=>{
    if(!c)return '';
    if(typeof c.location_string==='string'&&c.location_string.trim())return c.location_string.trim();
    const l=c.location;
    if(typeof l==='string'&&l.trim())return l.trim();
    if(l&&typeof l==='object'){
      if(typeof l.location_string==='string'&&l.location_string.trim())return l.location_string.trim();
      const a=l.frontage||l.street, b=l.intersection||l.cross_street;
      if(a&&b)return `${a} ${l.intersection_type||'&'} ${b}`;
    }
    return '';
  };
  async function camps(){
    if(camps.cache)return camps.cache;
    camps.cache=previousFetch('./data/api/camps.json',{cache:'no-store'}).then(r=>r.ok?r.json():[]).then(arr).catch(()=>[]);
    return camps.cache;
  }
  window.fetch=async(input,init)=>{
    const url=typeof input==='string'?input:(input?.url||'');
    const response=await previousFetch(input,init);
    if(!/data\/events\.json(?:\?|$)/.test(url)||!response.ok)return response;
    try{
      const payload=await response.json();
      const list=arr(payload), campList=await camps(), byName=new Map(campList.map(c=>[key(c.name||c.title||c.camp_name),c]));
      const out=list.map(e=>{
        if(e.location&&typeof e.location==='string'&&e.location.trim()&&!/^location tbd$/i.test(e.location.trim()))return e;
        const campName=e.camp||e.camp_name||e.hosted_by_camp_name||e.hosted_by_camp?.name||e.other_location;
        const camp=byName.get(key(campName));
        const loc=location(camp);
        if(!loc)return e;
        return {...e,location:loc,location_string:loc,location_source:'official_camp_directory',location_data:camp.location||null};
      });
      if(Array.isArray(payload))return new Response(JSON.stringify(out),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
      if(payload&&Array.isArray(payload.events))payload.events=out;else if(payload&&Array.isArray(payload.data))payload.data=out;
      return new Response(JSON.stringify(payload),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    }catch(_){return response}
  };
})();
