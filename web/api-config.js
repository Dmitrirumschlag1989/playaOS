(()=>{
  const base='https://playa-companion-api.dmitrirumschlag1989.workers.dev'.replace(/\/$/,'');
  window.PLAYA_API={base,async request(path,options={}){const r=await fetch(base+path,{...options,headers:{Accept:'application/json',...(options.headers||{})}});if(!r.ok)throw new Error(`Playa API ${r.status}`);return r},async health(){try{const r=await fetch(base+'/',{cache:'no-store'});return r.ok}catch(_){return false}}};
})();