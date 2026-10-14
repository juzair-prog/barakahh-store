(function () {
  "use strict";
  const frame = document.getElementById("workspaceFrame");
  const loading = document.getElementById("frameLoading");
  const title = document.getElementById("pageTitle");
  const welcomeTitle = document.getElementById("welcomeTitle");
  const sidebar = document.getElementById("sidebar");
  const mobileMenu = document.getElementById("mobileMenu");
  const signOut = document.getElementById("signOut");
  const views = {
    dashboard: { label: "Dashboard", url: "./admin-dashboard.html#dashboard" },
    manage: { label: "Manage Orders", url: "./admin-dashboard.html#manage" },
    manual: { label: "Manual Order", url: "./admin-dashboard.html#manual" },
    history: { label: "Order History", url: "./admin-dashboard.html#history" },
    products: { label: "Product Management", url: "./product.html" }
  };
  let activeView = "dashboard";
  let loadTimer = null;

  function setLoading(message) {
    loading.classList.remove("hidden");
    loading.replaceChildren();
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    const text = document.createElement("span");
    text.textContent = message || "Opening workspace…";
    loading.append(spinner, text);
  }
  function hideLoading() {
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = null;
    loading.classList.add("hidden");
  }
  function showLoadError() {
    loadTimer = null;
    loading.classList.remove("hidden");
    loading.replaceChildren();
    const box = document.createElement("div");
    box.style.cssText = "max-width:360px;padding:24px;text-align:center;line-height:1.6";
    const heading = document.createElement("strong");
    heading.textContent = "This section is taking too long to load.";
    const detail = document.createElement("p");
    detail.textContent = "Try refreshing this page. If it continues, send a screenshot so we can check the deployment.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry section";
    retry.style.cssText = "margin-top:10px;padding:10px 14px;border:1px solid #9ca3af;border-radius:9px;background:transparent;color:inherit";
    retry.addEventListener("click", () => showView(activeView, true));
    box.append(heading, detail, retry);
    loading.append(box);
  }
  function decorateFrame() {
    hideLoading();
    try {
      const doc = frame.contentDocument;
      if (!doc || !doc.head) return;
      if (!doc.getElementById("barakahh-embedded-workspace-style")) {
        const style = doc.createElement("style");
        style.id = "barakahh-embedded-workspace-style";
        

style.textContent = `
  html,body{background:#f4f6f9!important;color:#111827!important}
  body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important}
  .nav,.sidebar,.topbar{display:none!important}
  main,.dashboard{display:block!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:16px!important;box-sizing:border-box!important}
  .hero{display:none!important}
  .card{border-radius:13px!important;box-shadow:none!important;margin-bottom:14px!important}
  @media(max-width:600px){main,.dashboard{padding:10px!important}.card{padding:14px!important}.grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.order-form{grid-template-columns:minmax(0,1fr)!important}}
`;


        doc.head.appendChild(style);
      }
      if (doc.defaultView && doc.defaultView.applyAdminSection) doc.defaultView.applyAdminSection(activeView);
    } catch (error) {
      console.warn("Barakahh workspace style adjustment skipped:", error);
    }
  }
  function showView(view, forceReload) {
    const config = views[view];
    if (!config) return;
    activeView = view;
    title.textContent = config.label;
    welcomeTitle.textContent = config.label;
    document.querySelectorAll("[data-view]").forEach(element => {
      element.classList.toggle("active", element.dataset.view === view);
    });
    sidebar.classList.remove("open");
    const desired = new URL(config.url, window.location.href);
    let current;
    try { current = new URL(frame.contentWindow.location.href); }
    catch (_) { current = new URL(frame.src, window.location.href); }
    if (!forceReload && desired.pathname === current.pathname && view !== "products" && frame.contentDocument && frame.contentDocument.readyState === "complete") {
      setLoading("Opening " + config.label + "…");
      if (frame.contentWindow.applyAdminSection) frame.contentWindow.applyAdminSection(view);
      else frame.contentWindow.location.hash = desired.hash;
      decorateFrame();
      return;
    }
    setLoading("Opening " + config.label + "…");
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = setTimeout(showLoadError, 12000);
    frame.src = config.url;
  }
  document.querySelectorAll("[data-view]").forEach(element => {
    element.addEventListener("click", event => {
      event.preventDefault();
      showView(element.dataset.view, false);
    });
  });
  frame.addEventListener("load", decorateFrame);
  frame.addEventListener("error", showLoadError);
  if (mobileMenu) mobileMenu.addEventListener("click", () => sidebar.classList.toggle("open"));
  document.addEventListener("click", event => {
    if (window.innerWidth <= 680 && sidebar.classList.contains("open") && !sidebar.contains(event.target) && event.target !== mobileMenu) sidebar.classList.remove("open");
  });
  if (signOut) signOut.addEventListener("click", () => {
    try {
      const logoutButton = frame.contentDocument && frame.contentDocument.getElementById("logout");
      if (logoutButton) logoutButton.click();
      else window.location.href = "./admin.html";
    } catch (_) { window.location.href = "./admin.html"; }
    setTimeout(() => { if (!window.location.pathname.endsWith("/admin.html")) window.location.href = "./admin.html"; }, 700);
  });
  showView("dashboard", false);
})();
