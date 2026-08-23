// Join official Burning Man API events to their placed camps before app.js loads.
(()=>{
  const originalFetch=window.fetch.bind(window);
  const api=(u)=>originalFetch(u,{cache:'no-store'});
  const asArray=x=>Array.isArray(x)?x:(x&&Array.isArray(x.events)?x.events:(x&&Array.isArray(x.data)?x.data:[]));
  const seedLocations={
    'Best Butt':'A & 8:45','Baconeers':'3:00 & D','The Airship':'2:45 & E','AerialKnotics':'4:00 & B',
    'Earth Guardians':'5:00 & Esplanade','Sunrise Tavern':'2:30 & F','Naked Heart':'6:30 & F',
    'VCamp - Vibrations in the Desert':'2:15 & G','Pretty Pickle':'7:30 & F','No Drama Camp':'4:00 & C',
    'Black Rock Piano Lounge':'9:00 & E','Lamplighters':'6:45 & Esplanade','Toxic Disco Clam':'4:45 & C',
    'Camp Contact':'6:45 & F','Lunars Camp':'2:00 & H','Dreamery':'5:15 & B','Reverbia':'9:00 & Esplanade',
    'Soulshakers':'3:00 & F','PLAYGROUND':'2:00 & C','The Man':'Epicenter','People of Color Camp':'5:00 & B',
    'Disorient':'2:45 & Esplanade','Rogue Nation (SEAWeed)':'4:45 & G','Illumination Village':'2:00 & Esplanade',
    'Center Camp':'Center Camp Plaza','Deep Playa':'Deep Playa','Deep playa':'Deep Playa'
  };
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
  const enrichSeed=payload=>{
    const copy=JSON.parse(JSON.stringify(payload)),events=asArray(copy);
    for(const e of events){
      if(e.location||e.location_string)continue;
      const hint=seedLocations[e.camp];
      if(hint){e.location=hint;e.location_source='approximate_camp_directory';}
    }
    if(copy&&Array.isArray(copy.events))copy.events=events;
    else if(Array.isArray(copy))return events;
    else if(copy&&Array.isArray(copy.data))copy.data=events;
    return copy;
  };
  window.fetch=async(input,init)=>{
    const url=typeof input==='string'?input:(input?.url||'');
    if(!/data\/events\.json(?:\?|$)/.test(url))return originalFetch(input,init);
    try{
      const [er,cr]=await Promise.all([api('./data/api/events.json'),api('./data/api/camps.json')]);
      if(!er.ok||!cr.ok)throw new Error('official cache unavailable');
      const [events,camps]=await Promise.all([er.json(),cr.json()]),normalized=normalize(events,asArray(camps));
      if(normalized.length)return new Response(JSON.stringify({schema_version:'2.0.0',source:'Burning Man Public API',events:normalized}),{status:200,headers:{'Content-Type':'application/json'}});
    }catch(_){/* use seed dataset */}
    const response=await originalFetch(input,init);
    if(!response.ok)return response;
    try{return new Response(JSON.stringify(enrichSeed(await response.json())),{status:response.status,statusText:response.statusText,headers:{'Content-Type':'application/json'}})}catch(_){return response}
  };
})();