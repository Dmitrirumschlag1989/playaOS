// Join official Burning Man API events to their placed camps before app.js loads.
(()=>{
  const originalFetch=window.fetch.bind(window);
  const api=(u)=>originalFetch(u,{cache:'no-store'});
  const asArray=x=>Array.isArray(x)?x:(x&&Array.isArray(x.events)?x.events:(x&&Array.isArray(x.data)?x.data:[]));
  const timeParts=iso=>{const m=String(iso||'').match(/T(\d{2}):(\d{2})/);return m?`${m[1]}:${m[2]}`:null};
  const dateParts=iso=>String(iso||'').slice(0,10)||null;
  const campLocation=camp=>{
    if(!camp)return '';
    if(typeof camp.location_string==='string'&&camp.location_string.trim())return camp.location_string.trim();
    const l=camp.location;
    if(typeof l==='string')return l.trim();
    if(l&&typeof l==='object'){
      if(l.location_string)return String(l.location_string).trim();
      const front=l.frontage||'',inter=l.intersection||'',type=l.intersection_type||'&';
      if(front&&inter)return `${front} ${type} ${inter}`;
    }
    return '';
  };
  const normalize=(raw,camps)=>{
    const byUid=new Map(camps.map(c=>[c.uid,c])),out=[];
    for(const e of asArray(raw)){
      const occ=Array.isArray(e.occurrence_set)?e.occurrence_set:[];
      const occurrences=occ.length?occ:[{start_time:e.start_time,end_time:e.end_time}];
      const camp=byUid.get(e.hosted_by_camp)||null,location=campLocation(camp)||e.other_location||'';
      for(let i=0;i<occurrences.length;i++){
        const o=occurrences[i]||{},start=timeParts(o.start_time),end=timeParts(o.end_time),date=dateParts(o.start_time);
        if(!date||!start)continue;
        out.push({id:`api-${e.uid||e.event_id||e.slug||e.title||'event'}-${date}-${start}-${i}`,date,start,end:end||start,title:e.title||'Untitled event',description:e.description||e.print_description||'',camp:camp?.name||e.other_location||'Location TBD',location,category:e.event_type?.abbr||e.category||'other',priority:'normal',status:'verified',source_url:e.url||'https://playaevents.burningman.org/',source_type:'burningman_public_api',source_id:e.uid||e.event_id,hosted_by_camp:e.hosted_by_camp||null,location_data:camp?.location||null,official_api:true});
      }
    }
    return out;
  };
  window.fetch=async(input,init)=>{
    const url=typeof input==='string'?input:(input?.url||'');
    if(!/data\/events\.json(?:\?|$)/.test(url))return originalFetch(input,init);
    try{
      const [er,cr]=await Promise.all([api('./data/api/events.json'),api('./data/api/camps.json')]);
      if(!er.ok||!cr.ok)throw new Error('official cache unavailable');
      const [events,camps]=await Promise.all([er.json(),cr.json()]),normalized=normalize(events,asArray(camps));
      if(normalized.length)return new Response(JSON.stringify({schema_version:'2.0.0',source:'Burning Man Public API',events:normalized}),{status:200,headers:{'Content-Type':'application/json'}});
    }catch(_){/* use existing seed dataset */}
    return originalFetch(input,init);
  };
})();
