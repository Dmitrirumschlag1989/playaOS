// Join official Burning Man API events to their placed camps before app.js loads.
(()=>{
  const originalFetch=window.fetch.bind(window);
  const api=(u)=>originalFetch(u,{cache:'no-store'});
  const asArray=x=>Array.isArray(x)?x:(x&&Array.isArray(x.events)?x.events:(x&&Array.isArray(x.data)?x.data:[]));
  const seedLocations={'Best Butt':'A & 8:45','Baconeers':'3:00 & D','The Airship':'2:45 & E','AerialKnotics':'4:00 & B','Earth Guardians':'5:00 & Esplanade','Sunrise Tavern':'2:30 & F','Naked Heart':'6:30 & F','VCamp - Vibrations in the Desert':'2:15 & G','Pretty Pickle':'7:30 & F','No Drama Camp':'4:00 & C','Black Rock Piano Lounge':'9:00 & E','Lamplighters':'6:45 & Esplanade','Toxic Disco Clam':'4:45 & C','Camp Contact':'6:45 & F','Lunars Camp':'2:00 & H','Dreamery':'5:15 & B','Reverbia':'9:00 & Esplanade','Soulshakers':'3:00 & F','PLAYGROUND':'2:00 & C','The Man':'Epicenter','People of Color Camp':'5:00 & B','Disorient':'2:45 & Esplanade','Rogue Nation (SEAWeed)':'4:45 & G','Illumination Village':'2:00 & Esplanade','Center Camp':'Center Camp Plaza','Deep Playa':'Deep Playa','Deep playa':'Deep Playa'};
  const timeParts=iso=>{const m=String(iso||'').match(/T(\d{2}):(\d{2})/);return m?`${m[1]}:${m[2]}`:null};
  const dateParts=iso=>String(iso||'').slice(0,10)||null;
  const cleanString=v=>typeof v==='string'?v.trim():'';
  const nameKey=v=>cleanString(v).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const idString=v=>{if(v==null)return '';if(typeof v==='string'||typeof v==='number')return String(v).trim();if(typeof v==='object')return String(v.uid||v.id||v.camp_uid||v.hosted_by_camp||'').trim();return ''};
  const campName=camp=>cleanString(camp?.name||camp?.title||camp?.camp_name);
  const normalizeLocation=v=>{
    let s=cleanString(v);if(!s)return '';
    s=s.replace(/[–—]/g,'-').replace(/\s+/g,' ').trim().replace(/\b(?:ESP|ESPL|ESPLANADE ST)\b/ig,'Esplanade');
    const m=s.match(/(?:^|\b)(\d{1,2}(?::\d{2})?)\s*(?:&|and|at|@)\s*(Esplanade|[A-K])\b/i)||s.match(/(?:^|\b)(Esplanade|[A-K])\s*(?:&|and|at|@)\s*(\d{1,2}(?::\d{2})?)(?:\b|$)/i);
    if(m){const time=/^\d/.test(m[1])?m[1]:m[2],street=/^\d/.test(m[1])?m[2]:m[1];return `${time.includes(':')?time:`${Number(time)}:00`} & ${street}`}
    return s;
  };
  const campLocation=camp=>{
    if(!camp)return '';
    if(cleanString(camp.location_string))return normalizeLocation(camp.location_string);
    const l=camp.location;
    if(typeof l==='string')return normalizeLocation(l);
    if(l&&typeof l==='object'){
      if(cleanString(l.location_string))return normalizeLocation(l.location_string);
      const front=l.frontage||l.street||'',inter=l.intersection||l.cross_street||'',type=l.intersection_type||'&';
      if(front&&inter)return normalizeLocation(`${front} ${type} ${inter}`);
    }
    return '';
  };
  const eventLocation=e=>{
    const candidates=[e?.location,e?.location_string,e?.location_data,e?.other_location];
    for(const v of candidates){
      if(cleanString(v))return normalizeLocation(v);
      if(v&&typeof v==='object'){
        if(cleanString(v.location_string))return normalizeLocation(v.location_string);
        if(cleanString(v.location))return normalizeLocation(v.location);
        const front=v.frontage||v.street||'',inter=v.intersection||v.cross_street||'',type=v.intersection_type||'&';
        if(front&&inter)return normalizeLocation(`${front} ${type} ${inter}`);
      }
    }
    return '';
  };
  const normalize=(raw,camps,seedMap)=>{
    const byUid=new Map(),byName=new Map(),out=[];
    for(const c of camps){const uid=idString(c?.uid||c?.id||c?.camp_uid);if(uid)byUid.set(uid,c);const name=nameKey(campName(c));if(name)byName.set(name,c)}
    for(const e of asArray(raw)){
      const occ=Array.isArray(e.occurrence_set)?e.occurrence_set:[],occurrences=occ.length?occ:[{start_time:e.start_time,end_time:e.end_time}];
      const hostedUid=idString(e.hosted_by_camp||e.hosted_by_camp_uid||e.camp_uid||e.camp_id);
      const hostedName=nameKey(e.hosted_by_camp_name||e.camp_name||e.hosted_by_camp?.name);
      const rawLocation=eventLocation(e);
      const locationName=nameKey(e.other_location||e.location_string||'');
      const camp=byUid.get(hostedUid)||byName.get(hostedName)||byName.get(locationName)||null;
      const location=campLocation(camp)||rawLocation;
      for(let i=0;i<occurrences.length;i++){
        const o=occurrences[i]||{},start=timeParts(o.start_time),end=timeParts(o.end_time),date=dateParts(o.start_time);if(!date||!start)continue;
        const key=`${String(e.title||'').trim().toLowerCase()}|${date}|${start}`,seed=seedMap.get(key);
        const seedLocation=normalizeLocation(seed?.location||seed?.location_string||'');
        const resolvedLocation=location||seedLocation;
        out.push({id:seed?.id||`api-${e.uid||e.event_id||e.slug||e.title||'event'}-${date}-${start}-${i}`,date,start,end:end||start,title:e.title||'Untitled event',description:e.description||e.print_description||'',camp:campName(camp)||e.other_location||'Location TBD',location:resolvedLocation,location_source:camp?'official_camp_api':resolvedLocation?'event_or_seed':'unresolved',category:e.event_type?.abbr||e.category||'other',priority:seed?.priority||'normal',status:'verified',source_url:e.url||'https://playaevents.burningman.org/',source_type:'burningman_public_api',source_id:e.uid||e.event_id,hosted_by_camp:e.hosted_by_camp||null,location_data:camp?.location||null,official_api:true});
      }
    }return out;
  };
  const enrichSeed=payload=>{const copy=JSON.parse(JSON.stringify(payload)),events=asArray(copy);for(const e of events){if(eventLocation(e))continue;const hint=normalizeLocation(seedLocations[e.camp]);if(hint){e.location=hint;e.location_source='approximate_camp_directory'}}if(copy&&Array.isArray(copy.events))copy.events=events;else if(Array.isArray(copy))return events;else if(copy&&Array.isArray(copy.data))copy.data=events;return copy};
  window.fetch=async(input,init)=>{
    const url=typeof input==='string'?input:(input?.url||'');if(!/data\/events\.json(?:\?|$)/.test(url))return originalFetch(input,init);
    try{
      const [er,cr,sr]=await Promise.all([api('./data/api/events.json'),api('./data/api/camps.json'),api('./data/events.json')]);
      if(!er.ok||!cr.ok)throw new Error('official cache unavailable');
      const [events,camps,seedPayload]=await Promise.all([er.json(),cr.json(),sr.ok?sr.json():Promise.resolve({events:[]})]);
      const seedMap=new Map(asArray(seedPayload).map(e=>[`${String(e.title||'').trim().toLowerCase()}|${e.date}|${e.start}`,e]));
      const normalized=normalize(events,asArray(camps),seedMap);if(normalized.length)return new Response(JSON.stringify({schema_version:'2.3.0',source:'Burning Man Public API',events:normalized}),{status:200,headers:{'Content-Type':'application/json'}});
    }catch(_){/* use seed dataset */}
    const response=await originalFetch(input,init);if(!response.ok)return response;try{return new Response(JSON.stringify(enrichSeed(await response.json())),{status:response.status,statusText:response.statusText,headers:{'Content-Type':'application/json'}})}catch(_){return response}
  };
})();