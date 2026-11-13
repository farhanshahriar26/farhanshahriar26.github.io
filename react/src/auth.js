/* ===== Agroscope React · auth modal + farm dashboard (local accounts) ===== */
(function () {
  var R = window.React, html = window.Ag.html;
  var useState = R.useState, useEffect = R.useEffect;
  var useI18n = window.AgI18n.use, useStore = window.AgStore.use;
  var Icon = window.AgUI.Icon, Bar = window.AgUI.Bar;
  var PRIO = window.AgStore.PRIO, rotById = window.AgStore.rotById, ROT_COLORS = window.AgStore.ROT_COLORS;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------------- Auth modal ---------------- */
  function AuthModal() {
    var i = useI18n(), s = useStore();
    var mode = s.authModal;
    var fm = useState({ name: "", email: "", password: "", confirm: "" }), form = fm[0], setForm = fm[1];
    var er = useState(""), err = er[0], setErr = er[1];
    var show = useState(false), showPw = show[0], setShowPw = show[1];

    useEffect(function () { setErr(""); }, [mode]);
    if (!mode) return null;
    var signup = mode === "signup";
    function set(k, v) { setForm(function (f) { var n = Object.assign({}, f); n[k] = v; return n; }); }
    function close() { s.setAuthModal(null); }
    function submit(e) {
      e.preventDefault(); setErr("");
      if (signup) {
        if (form.name.trim().length < 2) { setErr("auth.errName"); return; }
        if (!EMAIL_RE.test(form.email)) { setErr("auth.errEmail"); return; }
        if (form.password.length < 8) { setErr("auth.errPwLen"); return; }
        if (form.password !== form.confirm) { setErr("auth.errMatch"); return; }
        var res = s.signup(form.name.trim(), form.email.trim(), form.password);
        if (res.err) { setErr(res.err); return; }
        s.showToast("auth.created"); close();
      } else {
        if (!EMAIL_RE.test(form.email)) { setErr("auth.errEmail"); return; }
        if (!form.password) { setErr("auth.errPwReq"); return; }
        var r2 = s.login(form.email.trim(), form.password);
        if (r2.err) { setErr(r2.err); return; }
        s.showToast("auth.welcome"); close();
      }
    }
    return html`<div className="modal-overlay" onClick=${function (e) { if (e.target === e.currentTarget) close(); }}>
      <div className="auth-modal" role="dialog" aria-modal="true">
        <button type="button" className="modal-x" onClick=${close} aria-label=${i.t("ui.close")}><${Icon} name="close" size=${19} /></button>
        <div className="auth-brand"><span className="brand-mark"><${Icon} name="sprout" size=${22} /></span><b>Agroscope</b></div>
        <h2>${signup ? i.t("auth.titleSignup") : i.t("auth.titleLogin")}</h2>
        <p className="auth-sub">${signup ? i.t("auth.subSignup") : i.t("auth.subLogin")}</p>
        <form onSubmit=${submit} noValidate>
          ${signup ? html`<div className="field"><label htmlFor="au-name">${i.t("auth.name")}</label>
            <input id="au-name" type="text" value=${form.name} onChange=${function (e) { set("name", e.target.value); }} placeholder=${i.t("auth.namePh")} autoComplete="name" /></div>` : null}
          <div className="field"><label htmlFor="au-email">${i.t("auth.email")}</label>
            <input id="au-email" type="email" value=${form.email} onChange=${function (e) { set("email", e.target.value); }} placeholder=${i.t("auth.emailPh")} autoComplete="email" /></div>
          <div className="field"><label htmlFor="au-pw">${i.t("auth.password")}</label>
            <div className="pw-row">
              <input id="au-pw" type=${showPw ? "text" : "password"} value=${form.password} onChange=${function (e) { set("password", e.target.value); }} placeholder=${i.t("auth.passPh")} autoComplete=${signup ? "new-password" : "current-password"} />
              <button type="button" className="pw-toggle" onClick=${function () { setShowPw(!showPw); }}>${showPw ? i.t("auth.hide") : i.t("auth.show")}</button>
            </div></div>
          ${signup ? html`<div className="field"><label htmlFor="au-cf">${i.t("auth.confirm")}</label>
            <input id="au-cf" type=${showPw ? "text" : "password"} value=${form.confirm} onChange=${function (e) { set("confirm", e.target.value); }} placeholder=${i.t("auth.passPh")} autoComplete="new-password" /></div>` : null}
          ${err ? html`<p className="auth-err" role="alert">${i.t(err)}</p>` : null}
          <button type="submit" className="btn primary auth-go">${signup ? i.t("auth.goCreate") : i.t("auth.goLogin")} <${Icon} name="arrow" size=${15} /></button>
        </form>
        <p className="auth-switch">
          ${signup ? i.t("auth.haveAccount") : i.t("auth.noAccount")}
          <button type="button" onClick=${function () { s.setAuthModal(signup ? "login" : "signup"); }}>${signup ? i.t("auth.goLogin") : i.t("auth.goCreate")}</button>
        </p>
        <p className="auth-demo"><${Icon} name="user" size=${13} /> ${i.t("auth.demoHint")}</p>
      </div>
    </div>`;
  }

  /* ---------------- Dashboard ---------------- */
  function fmtDate(at, lang) {
    try { return new Date(at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return new Date(at).toLocaleDateString(); }
  }

  function Dashboard() {
    var i = useI18n(), s = useStore();
    var tb = useState("farm"), tab = tb[0], setTab = tb[1];
    var u = s.user;
    var farm0 = u && u.farm ? u.farm : {};
    var ff = useState(function () {
      return {
        name: farm0.name || "", district: farm0.district || "", upazila: farm0.upazila || "",
        soilPh: farm0.soilPh || "", soilOm: farm0.soilOm || "", area: farm0.area || "", crop: farm0.crop || "",
        prios: (farm0.prios || []).slice()
      };
    }), farm = ff[0], setFarm = ff[1];
    var se = useState(""), search = se[0], setSearch = se[1];
    var so = useState("newest"), sort = so[0], setSort = so[1];
    var un = useState(null), undo = un[0], setUndo = un[1];
    var cf = useState(false), confirmWipe = cf[0], setConfirmWipe = cf[1];

    useEffect(function () {
      if (!undo) return;
      var id = setTimeout(function () { setUndo(null); }, 6000);
      return function () { clearTimeout(id); };
    }, [undo]);

    if (!u) return null;
    function setF(k, v) { setFarm(function (f) { var n = Object.assign({}, f); n[k] = v; return n; }); }
    function toggleF(k) { setFarm(function (f) {
      var has = f.prios.indexOf(k) >= 0, next = has ? f.prios.filter(function (x) { return x !== k; }) : f.prios.concat([k]);
      return Object.assign({}, f, { prios: next.length ? next : f.prios });
    }); }
    function saveFarm() {
      var acct = Object.assign({}, u); acct.farm = Object.assign({}, u.farm, farm);
      s.updateUser(acct); s.showToast("dash.saved");
    }
    function delAnalysis(id) { var removed = s.deleteAnalysis(id); if (removed) setUndo({ kind: "analysis", entry: removed }); }
    function delPlan(id) {
      var removed = (u.plans || []).filter(function (p) { return p.id === id; })[0];
      s.deletePlan(id); if (removed) setUndo({ kind: "plan", entry: removed });
    }
    function doUndo() {
      if (!undo) return;
      if (undo.kind === "analysis") s.restoreAnalysis(undo.entry);
      else { var acct = Object.assign({}, s.user); acct.plans = [undo.entry].concat(acct.plans || []).sort(function (a, b) { return b.at - a.at; }); s.updateUser(acct); }
      setUndo(null);
    }
    function wipe() {
      var acct = Object.assign({}, u); acct.analyses = []; acct.plans = [];
      s.updateUser(acct); setConfirmWipe(false); s.showToast("dash.wipeDone");
    }
    function setPrefLang(l) { i.setLang(l); var acct = Object.assign({}, u); acct.prefs = Object.assign({}, u.prefs, { lang: l }); s.updateUser(acct); }
    function toggleAutofill() { var acct = Object.assign({}, u); acct.prefs = Object.assign({}, u.prefs, { autofill: !u.prefs.autofill }); s.updateUser(acct); }
    function saveCurrent() { if (s.savePlan(window.DATA.reco.main.id, "")) s.showToast("dash.planSaved"); }

    var analyses = (u.analyses || []).filter(function (a) {
      if (!search.trim()) return true;
      var q = search.toLowerCase();
      return (a.loc || "").toLowerCase().indexOf(q) >= 0 || (a.crop || "").toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return sort === "newest" ? b.at - a.at : a.at - b.at; });

    var initial = u.name.trim().charAt(0).toUpperCase();
    var tabs = [
      { v: "farm", k: "dash.farm", icon: "sprout" }, { v: "analyses", k: "dash.analyses", icon: "chart" },
      { v: "plans", k: "dash.plans", icon: "save" }, { v: "settings", k: "dash.settings", icon: "user" }
    ];

    return html`<div className="modal-overlay dash-overlay" onClick=${function (e) { if (e.target === e.currentTarget) s.setDashOpen(false); }}>
      <div className="dashboard" role="dialog" aria-modal="true" aria-label=${i.t("dash.title")}>
        <div className="dash-head">
          <span className="avatar-lg">${initial}</span>
          <div className="dash-id"><b>${u.name}</b><span>${u.email}</span>
            <small>${i.t("dash.memberSince")} ${fmtDate(u.since, i.lang)}</small></div>
          <button type="button" className="btn ghost sm dash-logout" onClick=${function () { s.logout(); s.showToast("dash.loggedOut"); }}><${Icon} name="logout" size=${15} /> ${i.t("dash.logout")}</button>
          <button type="button" className="modal-x" onClick=${function () { s.setDashOpen(false); }} aria-label=${i.t("ui.close")}><${Icon} name="close" size=${19} /></button>
        </div>
        <div className="dash-tabs">
          ${tabs.map(function (t) { return html`<button key=${t.v} type="button" className=${tab === t.v ? "on" : ""} onClick=${function () { setTab(t.v); }}><${Icon} name=${t.icon} size=${15} /> ${i.t(t.k)}</button>`; })}
        </div>

        <div className="dash-body">
          ${tab === "farm" ? html`<div className="dash-farm">
            <div className="dash-form">
              <div className="field"><label>${i.t("dash.farmName")}</label><input type="text" value=${farm.name} onChange=${function (e) { setF("name", e.target.value); }} placeholder=${i.T({ en: "e.g. Barwaisa Field", bn: "যেমন: বড়বৈশ্যা মাঠ" })} /></div>
              <div className="field"><label>${i.t("dash.district")}</label><input type="text" value=${farm.district} onChange=${function (e) { setF("district", e.target.value); }} /></div>
              <div className="field"><label>${i.t("dash.upazila")}</label><input type="text" value=${farm.upazila} onChange=${function (e) { setF("upazila", e.target.value); }} /></div>
              <div className="field"><label>${i.t("f.area")}</label><input type="number" step="0.1" value=${farm.area} onChange=${function (e) { setF("area", e.target.value); }} /></div>
              <div className="field"><label>${i.t("dash.soilPh")}</label><input type="number" step="0.1" value=${farm.soilPh} onChange=${function (e) { setF("soilPh", e.target.value); }} /></div>
              <div className="field"><label>${i.t("dash.soilOm")}</label><input type="number" step="0.1" value=${farm.soilOm} onChange=${function (e) { setF("soilOm", e.target.value); }} /></div>
              <div className="field span-2"><label>${i.t("f.crop")}</label><input type="text" value=${farm.crop} onChange=${function (e) { setF("crop", e.target.value); }} /></div>
            </div>
            <div className="dash-prio"><b>${i.t("f.prio")}</b>
              <div className="prio-chips">${PRIO.map(function (k) {
                var on = farm.prios.indexOf(k) >= 0;
                return html`<button key=${k} type="button" className=${"chip" + (on ? " on" : "")} onClick=${function () { toggleF(k); }}><span className="tick">${on ? html`<${Icon} name="check" size=${12} sw=${2.6} />` : null}</span><span>${i.t("prio." + k)}</span></button>`;
              })}</div>
            </div>
            <button type="button" className="btn primary" onClick=${saveFarm}><${Icon} name="save" size=${16} /> ${i.t("dash.save")}</button>
          </div>` : null}

          ${tab === "analyses" ? html`<div className="dash-analyses">
            <div className="dash-toolbar">
              <div className="search-box"><${Icon} name="search" size=${15} /><input type="text" value=${search} onChange=${function (e) { setSearch(e.target.value); }} placeholder=${i.t("dash.search")} /></div>
              <label className="sort-box">${i.t("dash.sort")}
                <select value=${sort} onChange=${function (e) { setSort(e.target.value); }}>
                  <option value="newest">${i.t("dash.newest")}</option><option value="oldest">${i.t("dash.oldest")}</option>
                </select></label>
            </div>
            ${analyses.length === 0 ? html`<p className="dash-empty">${i.t("dash.emptyAna")}</p>` : html`<ul className="ana-list">
              ${analyses.map(function (a) {
                var r = rotById(a.top);
                return html`<li key=${a.id} className="ana-item">
                  <div className="ana-main"><b>${a.crop}</b><span>${a.loc} · ${i.nfmt(a.area, 1)} ${i.t("ui.ha")}</span>
                    <small>${fmtDate(a.at, i.lang)}</small></div>
                  <div className="ana-rot"><span className="dot" style=${{ background: ROT_COLORS[a.top] }}></span>${i.T(r.name)}<b className="match-pill">${i.nfmt(a.match)}</b></div>
                  <div className="ana-acts">
                    <button type="button" className="icon-btn" title=${i.t("dash.load")} onClick=${function () { s.loadAnalysisIntoForm(a); }}><${Icon} name="arrow" size=${15} /></button>
                    <button type="button" className="icon-btn" title=${i.t("dash.view")} onClick=${function () { s.setDashOpen(false); s.openDrawer(a.top); }}><${Icon} name="chart" size=${15} /></button>
                    <button type="button" className="icon-btn danger" title=${i.t("dash.delete")} onClick=${function () { delAnalysis(a.id); }}><${Icon} name="trash" size=${15} /></button>
                  </div>
                </li>`;
              })}</ul>`}
          </div>` : null}

          ${tab === "plans" ? html`<div className="dash-plans">
            <button type="button" className="btn primary sm save-current" onClick=${saveCurrent}><${Icon} name="save" size=${15} /> ${i.t("dash.saveCurrent")}</button>
            ${(u.plans || []).length === 0 ? html`<p className="dash-empty">${i.t("dash.emptyPlan")}</p>` : html`<ul className="plan-list">
              ${u.plans.map(function (p) {
                var r = rotById(p.rot);
                return html`<li key=${p.id} className="plan-item">
                  <span className="plan-dot" style=${{ background: ROT_COLORS[p.rot] }}></span>
                  <div className="plan-main"><b>${i.T(r.name)}</b>${p.note ? html`<span>${p.note}</span>` : null}<small>${fmtDate(p.at, i.lang)}</small></div>
                  <div className="ana-acts">
                    <button type="button" className="icon-btn" title=${i.t("dash.view")} onClick=${function () { s.setDashOpen(false); s.openDrawer(p.rot); }}><${Icon} name="chart" size=${15} /></button>
                    <button type="button" className="icon-btn danger" title=${i.t("dash.delete")} onClick=${function () { delPlan(p.id); }}><${Icon} name="trash" size=${15} /></button>
                  </div>
                </li>`;
              })}</ul>`}
          </div>` : null}

          ${tab === "settings" ? html`<div className="dash-settings">
            <div className="set-row"><div><b>${i.t("dash.lang")}</b><span>${i.t("dash.autofillHint")}</span></div>
              <div className="lang">
                <button type="button" className=${i.lang === "en" ? "on" : ""} onClick=${function () { setPrefLang("en"); }}>EN</button>
                <button type="button" className=${i.lang === "bn" ? "on" : ""} onClick=${function () { setPrefLang("bn"); }}>বাং</button>
              </div></div>
            <div className="set-row"><div><b>${i.t("dash.autofill")}</b><span>${i.t("dash.autofillHint")}</span></div>
              <button type="button" role="switch" aria-checked=${u.prefs && u.prefs.autofill ? "true" : "false"}
                className=${"toggle" + (u.prefs && u.prefs.autofill ? " on" : "")} onClick=${toggleAutofill}><i></i></button></div>
            <div className="set-row danger-row"><div><b>${i.t("dash.wipe")}</b><span>${i.t("dash.wipeAsk")}</span></div>
              ${confirmWipe
                ? html`<div className="wipe-confirm"><button type="button" className="btn ghost sm" onClick=${function () { setConfirmWipe(false); }}>${i.t("ui.close")}</button>
                    <button type="button" className="btn danger sm" onClick=${wipe}><${Icon} name="trash" size=${14} /> ${i.t("dash.delete")}</button></div>`
                : html`<button type="button" className="btn danger sm" onClick=${function () { setConfirmWipe(true); }}><${Icon} name="trash" size=${14} /> ${i.t("dash.wipe")}</button>`}</div>
          </div>` : null}
        </div>

        ${undo ? html`<div className="undo-bar"><span>${i.t("dash.deleted")}</span>
          <button type="button" onClick=${doUndo}><${Icon} name="arrow" size=${14} /> ${i.t("dash.undo")}</button></div>` : null}
      </div>
    </div>`;
  }

  window.AgAuth = { AuthModal: AuthModal, Dashboard: Dashboard };
})();