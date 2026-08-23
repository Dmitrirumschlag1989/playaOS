(function(){
  function sync(){
    const day=document.querySelector('#day');
    const head=document.querySelector('.nextHead');
    const next=document.querySelector('#nextUp');
    if(!day||!head||!next)return;
    const selected=day.value&&day.value!=='all';
    head.hidden=selected;
    next.hidden=selected;
  }
  const start=()=>{
    sync();
    const day=document.querySelector('#day');
    if(day)day.addEventListener('change',sync);
    const next=document.querySelector('#nextUp');
    if(next)new MutationObserver(sync).observe(next,{childList:true,subtree:true});
    const head=document.querySelector('.nextHead');
    if(head)new MutationObserver(sync).observe(head,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
