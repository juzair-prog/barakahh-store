(function(){
  const frame=document.getElementById("workspaceFrame");
  const loading=document.getElementById("frameLoading");
  const title=document.getElementById("pageTitle");
  const welcomeTitle=document.getElementById("welcomeTitle");
  const sidebar=document.getElementById("sidebar");
  const mobileMenu=document.getElementById("mobileMenu");
  const labels={dashboard:"Dashboard",manual:"Manual Order",history:"Order History",products:"Product Management"};
  const urls={dashboard:"./admin-dashboard.html",manual:"./admin-dashboard.html#manualOrderForm",history:"./admin-dashboard.html#orderHistoryList",products:"./product.html"};
  let activeView="dashboard";

  function decorateFrame(){
    loading.classList.add("hidden");
    try{
      const doc=frame.contentDocument;
      if(!doc)return;
      const style=doc.createElement("style");
      style.textContent=`
        html,body{background:#f4f6f9!important;color:#111827!important}
        body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important}
        .nav,.sidebar,.topbar{display:none!important}
        .app{display:block!important;min-height:0!important}
        .workspace{min-width:0!important}
        main,.dashboard{width:100%!important;max-width:none!important;margin:0!important;padding:16px!important;gap:14px!important}
        .hero{margin-bottom:14px!important}
        .card{border-radius:13px!important;box-shadow:none!important;margin-bottom:14px!important}
        @media(max-width:600px){main,.dashboard{padding:10px!important}.card{padding:14px!important}.grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.order-form{grid-template-columns:minmax(0,1fr)!important}}
      `;
      doc.head.appendChild(style);
      if(activeView==="manual"){
        const target=doc.getElementById("manualOrderForm");
        if(target)setTimeout(()=>target.scrollIntoView({block:"start",behavior:"smooth"}),120);
      }else if(activeView==="history"){
        const target=doc.getElementById("orderHistoryList");
        if(target)setTimeout(()=>target.scrollIntoView({block:"start",behavior:"smooth"}),120);
      }
    }catch(e){console.warn("Could not style embedded page",e);}
  }

  function showView(view){
    if(!urls[view])return;
    activeView=view;
    title.textContent=labels[view];
    welcomeTitle.textContent=labels[view];
    document.querySelectorAll("[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
    loading.classList.remove("hidden");
    const desired=new URL(urls[view],location.href);
    const current=new URL(frame.src,location.href);
    if(desired.pathname===current.pathname && desired.hash===current.hash){
      decorateFrame();
    }else{
      frame.src=urls[view];
    }
    sidebar.classList.remove("open");
  }

  document.querySelectorAll("[data-view]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();showView(el.dataset.view)}));
  frame.addEventListener("load",()=>setTimeout(decorateFrame,60));
  mobileMenu.addEventListener("click",()=>sidebar.classList.toggle("open"));
  document.addEventListener("click",e=>{if(window.innerWidth<=680&&sidebar.classList.contains("open")&&!sidebar.contains(e.target)&&e.target!==mobileMenu)sidebar.classList.remove("open")});
  document.getElementById("signOut").addEventListener("click",()=>{
    try{frame.contentWindow.document.getElementById("logout")?.click()}catch(e){location.href="./admin.html"}
    setTimeout(()=>{location.href="./admin.html"},500);
  });
  showView("dashboard");
})();