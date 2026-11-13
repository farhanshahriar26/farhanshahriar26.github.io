/* ===== Agroscope React · app root + mount ===== */
(function () {
  var R = window.React, html = window.Ag.html;
  var useEffect = R.useEffect;
  var useStore = window.AgStore.use, useI18n = window.AgI18n.use;
  var Nav = window.AgHero.Nav, Hero = window.AgHero.Hero;
  var InputForm = window.AgForm.InputForm;
  var S = window.AgSections, A = window.AgAuth;
  var Buddy = window.AgUI.Buddy, Toast = window.AgUI.Toast;

  function Loader() {
    var s = useStore(), i = useI18n();
    if (!s.analyzing) return null;
    var pct = Math.min(s.loadStep + 1, 5) / 5 * 100;
    return html`<div className="loader-overlay" role="status" aria-live="polite">
      <div className="loader">
        <div className="loader-orb"><span></span></div>
        <b>${i.t("load.title")}</b>
        <div className="load-bar"><i style=${{ width: pct + "%" }}></i></div>
        <ul>${[1, 2, 3, 4, 5].map(function (n) {
          var idx = n - 1, cls = idx === s.loadStep ? "on" : idx < s.loadStep ? "done" : "";
          return html`<li key=${n} className=${cls}><span className="ls-dot"></span>${i.t("load.s" + n)}</li>`;
        })}</ul>
      </div>
    </div>`;
  }

  function Shell() {
    var s = useStore();
    useEffect(function () {
      document.body.style.overflow = (s.drawer || s.authModal || s.dashOpen) ? "hidden" : "";
    }, [s.drawer, s.authModal, s.dashOpen]);
    useEffect(function () {
      function onKey(e) {
        if (e.key !== "Escape") return;
        if (s.drawer) s.closeDrawer();
        else if (s.dashOpen) s.setDashOpen(false);
        else if (s.authModal) s.setAuthModal(null);
      }
      window.addEventListener("keydown", onKey);
      return function () { window.removeEventListener("keydown", onKey); };
    }, [s.drawer, s.dashOpen, s.authModal]);

    return html`<div className="app-root">
      <${Nav} />
      <main>
        <${Hero} />
        <${InputForm} />
        <${S.Geography} />
        <${S.Crops} />
        <${S.Risk} />
        <${S.Rotations} />
        <${S.Reco} />
        <${S.Help} />
      </main>
      <${S.Footer} />
      <${Buddy} />
      <${Toast} />
      <${Loader} />
      <${S.Drawer} />
      ${s.authModal ? html`<${A.AuthModal} />` : null}
      ${s.dashOpen && s.user ? html`<${A.Dashboard} />` : null}
    </div>`;
  }

  function App() {
    return html`<${window.AgI18n.Provider}><${window.AgStore.Provider}><${Shell} /><//><//>`;
  }

  var mount = document.getElementById("root");
  if (mount && window.ReactDOM && window.ReactDOM.createRoot) {
    window.ReactDOM.createRoot(mount).render(html`<${App} />`);
  }
})();