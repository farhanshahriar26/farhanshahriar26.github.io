/* =====================================================================
   Agroscope · ui-auth.js — account interface
   ---------------------------------------------------------------------
   Top-bar avatar/menu · log in · create account · forgot & reset
   · dashboard (profile, farm, previous analyses, saved plans, settings)
   · loading / empty / error / success states · EN <-> বাংলা aware.
   Depends on: i18n.js, auth.js, profile.js, history.js
   ===================================================================== */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var mode = "login";            /* login | signup | forgot | reset | done | setup */
  var dashTab = "profile";
  var busy = false;
  var rendering = false;
  var user = null;

  function t(k) { return window.t ? window.t(k) : k; }
  function L() { return window.LANG || "en"; }

  /* ---------------------------------------------------------- helpers */
  function toast(msg) {
    var el = $("#toast"); if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(el._t); el._t = setTimeout(function () { el.hidden = true; }, 2800);
  }

  function openOvl(el) {
    if (!el) return;
    el.hidden = false;
    document.body.classList.add("ovl-open");
    var f = el.querySelector("input:not([hidden]), select, button:not(.ovl-x)");
    if (f && el.id === "authModal") setTimeout(function () { try { f.focus(); } catch (e) {} }, 40);
  }
  function closeOvl(el) {
    if (!el) return;
    el.hidden = true;
    if (!$$(".ovl:not([hidden])").length) document.body.classList.remove("ovl-open");
  }
  function closeAll() { $$(".ovl").forEach(closeOvl); }

  function msg(id, text, kind) {
    var el = $(id); if (!el) return;
    if (!text) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    el.className = "auth-msg " + (kind || "err");
    el.textContent = text;
  }
  function fieldErr(id, text) {
    var el = $(id); if (!el) return;
    el.textContent = text || "";
    var inp = el.closest ? el.closest(".af") : null;
    if (inp) inp.classList.toggle("bad", !!text);
  }
  function clearErrors() {
    ["#errName", "#errEmail", "#errPass", "#errPass2", "#errFg", "#errRs", "#errRs2"]
      .forEach(function (k) { fieldErr(k, ""); });
    msg("#authMsg", ""); msg("#fgMsg", ""); msg("#rsMsg", "");
  }
  function setBusy(btn, on, labelKey) {
    busy = on;
    if (!btn) return;
    btn.disabled = on;
    if (on) { btn.dataset.old = btn.textContent; btn.textContent = t(labelKey || "auth.working"); }
    else if (btn.dataset.old) { btn.textContent = btn.dataset.old; delete btn.dataset.old; }
  }

  /* -------------------------------------------------- account button */
  function initials(name) {
    var p = String(name || "?").trim().split(/\s+/);
    return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  }

  function renderAccount() {
    var label = $("#authBtnLabel"), btn = $("#authBtn");
    if (!label || !btn) return;
    if (user) {
      var name = (user.user_metadata && user.user_metadata.full_name) || user.email || "—";
      label.textContent = String(name).split(/\s+/)[0];
      btn.classList.add("in");
      $("#acctHead").innerHTML =
        "<b></b><span></span>";
      $("#acctHead").querySelector("b").textContent = name;
      $("#acctHead").querySelector("span").textContent = user.email || "";
      $("#dashAvatar").textContent = initials(name);
      $("#dashName").textContent = name;
      $("#dashMail").textContent = user.email || "";
      $("#dashSince").textContent = user.created_at
        ? new Date(user.created_at).toLocaleDateString(L() === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
        : "";
    } else {
      label.textContent = t("auth.login");
      btn.classList.remove("in");
      $("#authMenu").hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }
  }

  /* ------------------------------------------------------- auth modal */
  /* service status pill: "Supabase connected" / "Demo mode" / "not connected" */
  function renderSvc() {
    if (!window.AGAuth || !window.AGAuth.mode) return;
    var m = window.AGAuth.mode();
    var cls = m === "supabase" ? "on" : m === "demo" ? "demo" : "off";
    var pillKey = m === "supabase" ? "auth.svcSupabase" : m === "demo" ? "auth.svcDemoShort" : "auth.svcOff";
    var bigKey = m === "supabase" ? "auth.svcSupabase" : m === "demo" ? "auth.svcDemo" : "auth.svcOff";
    var p = $("#svcPill");
    if (p) { p.hidden = false; p.className = "svc-pill " + cls; p.textContent = t(pillKey); }
    var b = $("#svcBadge");
    if (b) { b.hidden = false; b.className = "svc-badge " + cls; b.textContent = t(bigKey); }
  }

  function setMode(m) {
    mode = m;
    clearErrors();
    var isAuth = m === "login" || m === "signup";
    $("#authTabs").hidden = !isAuth;
    $("#authTitle").hidden = !isAuth;
    $("#authSub").hidden = !isAuth;
    $("#authForm").hidden = !isAuth;
    $("#forgotForm").hidden = m !== "forgot";
    $("#resetForm").hidden = m !== "reset";
    $("#authDone").hidden = m !== "done";
    $("#authSetup").hidden = m !== "setup";

    if (isAuth) {
      $$("#authTabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.mode === m); });
      var showG = !!(window.AG_CONFIG && window.AG_CONFIG.GOOGLE_OAUTH &&
                     window.AGAuth && window.AGAuth.mode() === "supabase");
      var g = $("#googleBtn"), or = $("#authOr");
      if (g) g.hidden = !showG;
      if (or) or.hidden = !showG;
      var up = m === "signup";
      $("#afName").hidden = !up;
      $("#afConfirm").hidden = !up;
      $("#loginExtras").hidden = !up ? false : true;
      $("#authAlt").hidden = false;
      $("#auPass").setAttribute("autocomplete", up ? "new-password" : "current-password");
      $("#authTitle").textContent = up ? t("auth.titleSignup") : t("auth.titleLogin");
      $("#authSub").textContent = up ? t("auth.subSignup") : t("auth.subLogin");
      $("#authSubmit").textContent = up ? t("auth.goCreate") : t("auth.goLogin");
      delete $("#authSubmit").dataset.old;
      $("#authSubmit").disabled = false;
      $("#authAlt").innerHTML = up
        ? '<span data-i18n="auth.haveAccount">' + t("auth.haveAccount") + '</span> <button type="button" class="linkbtn" data-mode-jump="login">' + t("auth.login") + "</button>"
        : '<span data-i18n="auth.noAccount">' + t("auth.noAccount") + '</span> <button type="button" class="linkbtn" data-mode-jump="signup">' + t("auth.signup") + "</button>";
    }
  }

  function openAuth(m) {
    if (!window.AGAuth) return;
    if (!window.AGAuth.configured() && m !== "reset") { m = "setup"; }
    setMode(m || "login");
    openOvl($("#authModal"));
  }

  function submitAuth(e) {
    if (e) e.preventDefault();
    if (busy || !window.AGAuth) return;
    clearErrors();

    if (mode === "login") {
      var em = $("#auEmail").value, pw = $("#auPass").value;
      var bad = false;
      if (!window.AGAuth.isEmail(em)) { fieldErr("#errEmail", t("auth.errEmail")); bad = true; }
      if (!pw) { fieldErr("#errPass", t("auth.errPwReq")); bad = true; }
      if (bad) return;
      setBusy($("#authSubmit"), true, "auth.signing");
      window.AGAuth.signIn(em, pw, $("#auRemember").checked).then(function (r) {
        setBusy($("#authSubmit"), false);
        if (!r.ok) { msg("#authMsg", r.errors.map(t).join(" · "), "err"); return; }
        closeOvl($("#authModal"));
        toast(t("auth.welcome"));
      });
      return;
    }

    var nm = $("#auName").value, e2 = $("#auEmail").value,
        p1 = $("#auPass").value, p2 = $("#auPass2").value;
    var errs = [];
    if (!nm || nm.trim().length < 2) { fieldErr("#errName", t("auth.errName")); errs.push(1); }
    if (!window.AGAuth.isEmail(e2)) { fieldErr("#errEmail", t("auth.errEmail")); errs.push(1); }
    var pwErr = window.AGAuth.passwordProblems(p1);
    if (pwErr.length) { fieldErr("#errPass", pwErr.map(t).join(" · ")); errs.push(1); }
    if (p1 !== p2) { fieldErr("#errPass2", t("auth.errMatch")); errs.push(1); }
    if (errs.length) return;

    setBusy($("#authSubmit"), true, "auth.creating");
    window.AGAuth.signUp(nm, e2, p1, p2).then(function (r) {
      setBusy($("#authSubmit"), false);
      if (!r.ok) { msg("#authMsg", r.errors.map(t).join(" · "), "err"); return; }
      if (r.needsConfirm) {
        mode = "done";
        $("#authTabs").hidden = true;
        $("#authTitle").hidden = true; $("#authSub").hidden = true;
        $("#authForm").hidden = true; $("#authDone").hidden = false;
        $("#doneTitle").textContent = t("auth.sentTitle");
        $("#doneBody").textContent = t("auth.sentBody");
        return;
      }
      closeOvl($("#authModal"));
      toast(t("auth.welcome"));
    });
  }

  function submitForgot(e) {
    if (e) e.preventDefault();
    if (busy || !window.AGAuth) return;
    clearErrors();
    var em = $("#fgEmail").value;
    if (!window.AGAuth.isEmail(em)) { fieldErr("#errFg", t("auth.errEmail")); return; }
    setBusy($("#fgSubmit"), true, "auth.sending");
    window.AGAuth.requestReset(em).then(function (r) {
      setBusy($("#fgSubmit"), false);
      if (!r.ok) { msg("#fgMsg", r.errors.map(t).join(" · "), "err"); return; }
      msg("#fgMsg", t("auth.sentBody"), "ok");
      $("#fgSubmit").disabled = true;
    });
  }

  function submitReset(e) {
    if (e) e.preventDefault();
    if (busy || !window.AGAuth) return;
    clearErrors();
    var p1 = $("#rsPass").value, p2 = $("#rsPass2").value, bad = false;
    var pe = window.AGAuth.passwordProblems(p1);
    if (pe.length) { fieldErr("#errRs", pe.map(t).join(" · ")); bad = true; }
    if (p1 !== p2) { fieldErr("#errRs2", t("auth.errMatch")); bad = true; }
    if (bad) return;
    setBusy($("#rsSubmit"), true, "auth.saving");
    window.AGAuth.updatePassword(p1, p2).then(function (r) {
      setBusy($("#rsSubmit"), false);
      if (!r.ok) { msg("#rsMsg", r.errors.map(t).join(" · "), "err"); return; }
      toast(t("auth.pwSaved"));
      closeOvl($("#authModal"));
    });
  }

  /* ------------------------------------------------------ dashboard */
  function showState(sel, kind, text) {
    var el = $(sel); if (!el) return;
    if (!text) { el.hidden = true; return; }
    el.hidden = false;
    el.className = "dash-state " + kind;
    el.textContent = text;
  }

  function districtName(i) {
    var d = window.DATA && window.DATA.bd && window.DATA.bd.districts[i];
    return d ? window.T(d.n) : null;
  }
  function divisionName(i) {
    var d = window.DATA && window.DATA.bd && window.DATA.bd.divisions[i];
    return d ? window.T(d.n) : null;
  }
  function prioLabels(list) {
    return (list || []).map(function (k) { return t("prio." + k); });
  }
  function dateLabel(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(L() === "bn" ? "bn-BD" : "en-GB",
        { day: "numeric", month: "short", year: "numeric" });
    } catch (e) { return ""; }
  }

  function renderProfile() {
    var box = $("#profKv"); if (!box) return;
    var st = window.AGProfile ? window.AGProfile.status() : "idle";
    var p = window.AGProfile ? window.AGProfile.get() : null;

    if (st === "loading") { showState("#profState", "loading", t("dash.loading")); box.innerHTML = ""; return; }
    if (st === "error") {
      showState("#profState", "error", t("dash.error") + " — " + t(window.AGProfile.error() || "auth.errGeneric"));
      box.innerHTML = ""; return;
    }
    if (!user) { showState("#profState", "empty", t("auth.notSigned")); box.innerHTML = ""; return; }
    showState("#profState", "", "");

    var name = (user.user_metadata && user.user_metadata.full_name) || "";
    var rows = [
      [t("auth.name"), name || t("dash.none")],
      [t("auth.email"), user.email || "—"],
      [t("dash.memberSince"), dateLabel(user.created_at)],
      [t("dash.farmName"), (p && p.farm_name) || t("dash.none")],
      [t("f.div"), (p && p.division != null ? [divisionName(p.division), p.district != null ? districtName(p.district) : null].filter(Boolean).join(" › ") : t("dash.none"))],
      [t("f.area"), p && p.farm_size != null ? p.farm_size + " " + t("ui.ha") : t("dash.none")],
      [t("f.crop"), (p && p.current_crop) || t("dash.none")],
      [t("dash.lang"), (p && p.preferred_language === "bn") ? "বাংলা" : "English"]
    ];
    box.innerHTML = rows.map(function (r) {
      return '<div class="kv-row"><dt>' + r[0] + "</dt><dd>" + r[1] + "</dd></div>";
    }).join("");
  }

  /* --- farm tab: dashboard form <-> saved profile --- */
  function fillDashSelects(divIdx, distIdx) {
    var bd = window.DATA && window.DATA.bd; if (!bd) return;
    $("#pfDivision").innerHTML = bd.divisions.map(function (d, i) {
      return '<option value="' + i + '">' + window.T(d.n) + "</option>";
    }).join("");
    if (divIdx != null) $("#pfDivision").value = String(divIdx);
    var di = divIdx == null ? 0 : +divIdx;
    $("#pfDistrict").innerHTML = bd.districts.map(function (x, i) { return { x: x, i: i }; })
      .filter(function (o) { return o.x.d === di; })
      .map(function (o) { return '<option value="' + o.i + '">' + window.T(o.x.n) + "</option>"; })
      .join("");
    if (distIdx != null) $("#pfDistrict").value = String(distIdx);
  }

  function renderPrios() {
    var box = $("#pfPrios"); if (!box) return;
    var sel = window.__AG && window.__AG.prios;
    box.innerHTML = "";
    if (!sel || !sel.size) { box.innerHTML = '<span class="pf-none">' + t("dash.noPrio") + "</span>"; return; }
    Array.prototype.forEach.call(sel, function (k) {
      var s = document.createElement("span");
      s.className = "pf-chip on";
      s.textContent = t("prio." + k);
      box.appendChild(s);
    });
  }

  function renderFarm() {
    var st = window.AGProfile ? window.AGProfile.status() : "idle";
    var p = window.AGProfile ? window.AGProfile.get() : null;
    if (st === "loading") { showState("#farmState", "loading", t("dash.loading")); return; }
    if (st === "error") { showState("#farmState", "error", t("dash.error")); return; }
    showState("#farmState", "", "");

    /* fall back to what is currently in the field form for a new user */
    var f = window.AGProfile ? window.AGProfile.readForm() : {};
    var v = function (k) { return p && p[k] != null ? p[k] : f[k]; };
    var g = function (id, val) { var el = $(id); if (el) el.value = val == null ? "" : val; };

    g("#pfFarmName", p && p.farm_name);
    g("#pfLocation", v("location_text"));
    fillDashSelects(v("division"), v("district"));
    g("#pfUpazila", p && p.upazila);
    g("#pfArea", v("farm_size"));
    g("#pfLang", (p && p.preferred_language) || (window.__AG && window.__AG.lang) || "en");
    g("#pfCrop", v("current_crop"));
    g("#pfSoilType", v("soil_type"));
    g("#pfSoilTexture", v("soil_texture"));
    g("#pfSoilPh", v("soil_ph"));
    g("#pfSoilOm", v("soil_om"));
    renderPrios();
  }

  function saveFarm() {
    if (!window.AGProfile || !user) return;
    var num = function (s) { s = String(s || "").replace(/[০-৯]/g, function (c) { return "০১২৩৪৫৬৭৮৯".indexOf(c); }); var n = parseFloat(s.replace(/,/g, "")); return isFinite(n) ? n : null; };
    var row = {
      user_id: user.id,
      farm_name: $("#pfFarmName").value.trim() || null,
      location_text: $("#pfLocation").value.trim() || null,
      division: $("#pfDivision").value === "" ? null : +$("#pfDivision").value,
      district: $("#pfDistrict").value === "" ? null : +$("#pfDistrict").value,
      upazila: $("#pfUpazila").value.trim() || null,
      farm_size: num($("#pfArea").value),
      preferred_language: $("#pfLang").value || "en",
      current_crop: $("#pfCrop").value.trim() || null,
      soil_type: $("#pfSoilType").value.trim() || null,
      soil_texture: $("#pfSoilTexture").value.trim() || null,
      soil_ph: num($("#pfSoilPh").value),
      soil_om: num($("#pfSoilOm").value),
      priorities: window.__AG && window.__AG.prios ? Array.prototype.slice.call(window.__AG.prios) : [],
      updated_at: new Date().toISOString()
    };
    if (!window.AGAuth.client()) return;
    var btn = $("#farmSave");
    btn.disabled = true;
    window.AGAuth.client().from("farmer_profiles").upsert(row, { onConflict: "user_id" })
      .then(function (res) {
        btn.disabled = false;
        if (res.error) { showState("#farmState", "error", t(window.AGAuth.mapError(res.error))); return; }
        var ok = $("#farmOk");
        ok.hidden = false; ok.textContent = t("dash.saved");
        setTimeout(function () { ok.hidden = true; }, 2600);
        /* keep the visible field form in step with the saved profile */
        window.AGProfile.markTouched();
        if (window.AGProfile.load) window.AGProfile.load();
        toast(t("dash.saved"));
      }).catch(function () { btn.disabled = false; showState("#farmState", "error", t("dash.error")); });
  }

  /* --- previous analyses --- */
  function renderHistory() {
    var box = $("#histList"); if (!box) return;
    var st = window.AGHistory ? window.AGHistory.status() : "idle";
    var list = window.AGHistory ? window.AGHistory.analyses() : [];

    if (st === "loading") { showState("#histState", "loading", t("dash.loading")); box.innerHTML = ""; return; }
    if (st === "error") { showState("#histState", "error", t("dash.error")); box.innerHTML = ""; return; }
    if (!list.length) {
      showState("#histState", "empty", t("dash.emptyAna"));
      box.innerHTML = '<button class="btn ghost" type="button" id="goRun">' + t("dash.goRun") + "</button>";
      $("#goRun").onclick = function () { closeAll(); var s = document.getElementById("input"); if (s) s.scrollIntoView({ behavior: "instant" }); };
      return;
    }
    showState("#histState", "", "");
    box.innerHTML = list.map(function (r, i) {
      var where = r.location || [divisionName(r.division), districtName(r.district)].filter(Boolean).join(" › ") || t("map.bd");
      var pr = prioLabels(r.priorities);
      return '<article class="rec">' +
        '<div class="rec-top"><b>' + (r.crop || t("dash.noCrop")) + "</b><span>" + dateLabel(r.created_at) + "</span></div>" +
        '<p class="rec-where">' + where + "</p>" +
        (pr.length ? '<p class="rec-tags">' + pr.map(function (x) { return "<i>" + x + "</i>"; }).join("") + "</p>" : "") +
        '<div class="rec-acts">' +
        '<button type="button" class="mini" data-load="' + i + '">' + t("dash.load") + "</button>" +
        (r.id ? '<button type="button" class="mini ghost" data-del="analyses:' + r.id + '">' + t("dash.delete") + "</button>" : "") +
        "</div></article>";
    }).join("");

    $$("[data-load]", box).forEach(function (b) {
      b.onclick = function () {
        if (window.AGHistory.applyAnalysis(list[+b.dataset.load])) {
          closeAll();
          var s = document.getElementById("input"); if (s) s.scrollIntoView({ behavior: "instant" });
          toast(t("dash.loaded"));
        } else toast(t("dash.error"));
      };
    });
    $$("[data-del]", box).forEach(function (b) {
      b.onclick = function () {
        var parts = b.dataset.del.split(":");
        window.AGHistory.remove(parts[0], parts[1]).then(function () { renderHistory(); });
      };
    });
  }

  /* --- saved plans --- */
  function renderPlans() {
    var box = $("#planList"); if (!box) return;
    var st = window.AGHistory ? window.AGHistory.status() : "idle";
    var list = window.AGHistory ? window.AGHistory.plans() : [];

    var head = '<button class="btn ghost" type="button" id="savePlan">' + t("dash.saveCurrent") + "</button>";

    if (st === "loading") { showState("#planState", "loading", t("dash.loading")); box.innerHTML = head; wireSavePlan(); return; }
    if (st === "error") { showState("#planState", "error", t("dash.error")); box.innerHTML = head; wireSavePlan(); return; }
    if (!list.length) {
      showState("#planState", "empty", t("dash.emptyPlan"));
      box.innerHTML = head;
      wireSavePlan();
      return;
    }
    showState("#planState", "", "");
    box.innerHTML = head + list.map(function (r, i) {
      var pl = r.plan || {};
      var rec = String((r.recommendations && r.recommendations.text) || "").slice(0, 180);
      return '<article class="rec">' +
        '<div class="rec-top"><b>' + (pl.name || t("dash.plan")) + "</b><span>" + dateLabel(r.created_at) + "</span></div>" +
        (pl.crop ? '<p class="rec-where">' + t("f.crop") + ": " + pl.crop + "</p>" : "") +
        (pl.priorities && pl.priorities.length ? '<p class="rec-tags">' + prioLabels(pl.priorities).map(function (x) { return "<i>" + x + "</i>"; }).join("") + "</p>" : "") +
        (rec ? '<p class="rec-note">' + rec + (rec.length >= 180 ? "…" : "") + "</p>" : "") +
        '<div class="rec-acts">' +
        '<button type="button" class="mini" data-open="' + i + '">' + t("dash.view") + "</button>" +
        '<button type="button" class="mini ghost" data-pdel="' + (r.id || "") + '">' + t("dash.delete") + "</button>" +
        "</div></article>";
    }).join("");

    wireSavePlan();
    $$("[data-open]", box).forEach(function (b) {
      b.onclick = function () { closeAll(); var s = document.getElementById("recommend"); if (s) s.scrollIntoView({ behavior: "instant" }); };
    });
    $$("[data-pdel]", box).forEach(function (b) {
      b.onclick = function () { window.AGHistory.remove("plans", b.dataset.pdel).then(function () { renderPlans(); }); };
    });
  }

  function wireSavePlan() {
    var b = $("#savePlan"); if (!b) return;
    b.onclick = function () {
      if (!user) { toast(t("auth.notSigned")); return; }
      var S = window.__AG || {};
      var reco = $("#recoWindow");
      var plan = {
        name: t("dash.plan") + " · " + (S.rot || ""),
        rot: S.rot || null,
        crop: S.crop || null,
        priorities: S.prios ? Array.prototype.slice.call(S.prios) : [],
        layer: S.layer || "live"
      };
      window.AGHistory.savePlan(plan, { text: reco ? String(reco.innerText || "").replace(/\s+/g, " ").trim() : "" })
        .then(function (r) {
          if (r.ok) { toast(t("dash.planSaved")); renderPlans(); }
          else toast(t("dash.error"));
        });
    };
  }

  /* --- settings --- */
  function renderSettings() {
    var on = window.AGProfile ? !!window.AGProfile.settings().autofill : true;
    var sw = $("#setAutofill");
    if (sw) { sw.classList.toggle("on", on); sw.setAttribute("aria-checked", on ? "true" : "false"); }
    $$("#setLang button").forEach(function (b) { b.classList.toggle("on", b.dataset.setlang === (window.LANG || "en")); });
  }

  function renderDash() {
    if (!user) return;
    $$("#dashNav button").forEach(function (b) { b.classList.toggle("on", b.dataset.tab === dashTab); });
    $$(".dash-body section").forEach(function (s) { s.hidden = s.dataset.panel !== dashTab; });
    if (dashTab === "profile") renderProfile();
    else if (dashTab === "farm") renderFarm();
    else if (dashTab === "analyses") renderHistory();
    else if (dashTab === "plans") renderPlans();
    else renderSettings();
  }

  function openDash(tab) {
    if (!user) { openAuth("login"); return; }
    dashTab = tab || "profile";
    renderDash();
    openOvl($("#dashModal"));
    if (dashTab === "analyses" || dashTab === "plans") {
      showState("#histState", "loading", t("dash.loading"));
      if (window.AGHistory) window.AGHistory.load().then(renderDash);
    }
  }

  /* re-render everything that holds translatable text */
  function renderDynamic() {
    if (rendering) return;
    rendering = true;
    try {
      renderAccount();
      renderSvc();
      if (user && !$("#dashModal").hidden) renderDash();
      if (!$("#authModal").hidden && (mode === "login" || mode === "signup")) setMode(mode);
    } finally { rendering = false; }
  }

  /* --------------------------------------------------------- wiring */
  function init() {
    /* --- boot the backend modules --- */
    if (window.AGProfile) window.AGProfile.init();
    if (window.AGHistory) window.AGHistory.init();
    if (window.AGAuth) window.AGAuth.boot();

    /* --- top-bar account button --- */
    var btn = $("#authBtn"), menu = $("#authMenu");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (user) {
        var open = menu.hidden;
        menu.hidden = !open;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      } else openAuth("login");
    });
    document.addEventListener("click", function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        menu.hidden = true; btn.setAttribute("aria-expanded", "false");
      }
    });
    $$("#authMenu [data-dash]").forEach(function (b) {
      b.addEventListener("click", function () { menu.hidden = true; openDash(b.dataset.dash); });
    });
    $("#logoutBtn").addEventListener("click", function () {
      menu.hidden = true;
      if (window.AGAuth) window.AGAuth.signOut().then(function () { toast(t("dash.loggedOut")); });
    });

    /* --- overlays --- */
    $$(".ovl").forEach(function (ov) {
      ov.addEventListener("click", function (e) {
        if (e.target.hasAttribute && e.target.hasAttribute("data-close")) closeOvl(ov);
        if (e.target.closest && e.target.closest("[data-close]")) closeOvl(ov);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeAll(); menu.hidden = true; }
    });

    /* --- auth modal --- */
    $$("#authTabs button").forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.dataset.mode); });
    });
    $("#authForm").addEventListener("submit", submitAuth);
    $("#forgotForm").addEventListener("submit", submitForgot);
    $("#resetForm").addEventListener("submit", submitReset);
    $("#forgotBtn").addEventListener("click", function () { setMode("forgot"); });
    var gBtn = $("#googleBtn");
    if (gBtn) gBtn.addEventListener("click", function () {
      if (busy || !window.AGAuth) return;
      clearErrors();
      gBtn.disabled = true;
      window.AGAuth.signInOAuth("google").then(function (r) {
        gBtn.disabled = false;
        if (!r.ok) { msg("#authMsg", (r.errors || []).map(t).join(" · "), "err"); return; }
        toast(t("auth.working"));
      });
    });
    $("#authModal").addEventListener("click", function (e) {
      var j = e.target.closest && e.target.closest("[data-mode-jump]");
      if (j) setMode(j.dataset.modeJump);
    });
    [["#auEye", "#auPass"], ["#auEye2", "#auPass2"], ["#auEye3", "#rsPass"]].forEach(function (pair) {
      var eye = $(pair[0]), inp = $(pair[1]);
      if (!eye || !inp) return;
      eye.addEventListener("click", function () {
        var show = inp.type === "password";
        inp.type = show ? "text" : "password";
        eye.querySelector("span").textContent = show ? t("auth.hide") : t("auth.show");
      });
    });
    ["#auEmail", "#auPass", "#auPass2", "#auName"].forEach(function (id) {
      var el = $(id); if (el) el.addEventListener("input", function () { clearErrors(); });
    });

    /* --- dashboard --- */
    $$("#dashNav button").forEach(function (b) {
      b.addEventListener("click", function () {
        dashTab = b.dataset.tab; renderDash();
        if ((dashTab === "analyses" || dashTab === "plans") && window.AGHistory) {
          showState("#histState", "loading", t("dash.loading"));
          window.AGHistory.load().then(renderDash);
        }
      });
    });
    $("#pfDivision").addEventListener("change", function () { fillDashSelects(+this.value, null); });
    $("#farmSave").addEventListener("click", saveFarm);
    $("#profRename").addEventListener("click", function () {
      var cur = (user.user_metadata && user.user_metadata.full_name) || "";
      var name = window.prompt(t("auth.name"), cur);
      if (name == null) return;
      window.AGAuth.updateProfileMeta(name.trim()).then(function (r) {
        if (!r.ok) { toast(t("dash.error")); return; }
        user.user_metadata = Object.assign({}, user.user_metadata, { full_name: name.trim() });
        renderAccount(); renderProfile(); toast(t("dash.saved"));
      });
    });
    $$("#farmForm [data-clear]").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.dataset.clear;
        window.AGProfile.clearField(key).then(function () {
          var map = {
            farm_name: "#pfFarmName", location_text: "#pfLocation", upazila: "#pfUpazila",
            farm_size: "#pfArea", current_crop: "#pfCrop", soil_type: "#pfSoilType",
            soil_texture: "#pfSoilTexture", soil_ph: "#pfSoilPh", soil_om: "#pfSoilOm"
          };
          if (map[key] && $(map[key])) $(map[key]).value = "";
          if (key === "division") { $("#pfDivision").value = "0"; fillDashSelects(0, null); }
          if (key === "district") $("#pfDistrict").value = "";
          if (key === "preferred_language") $("#pfLang").value = "en";
          if (key === "priorities") renderPrios();
          toast(t("dash.cleared"));
        });
      });
    });
    $("#pfEditPrio").addEventListener("click", function () {
      closeAll();
      var s = document.getElementById("input"); if (s) s.scrollIntoView({ behavior: "instant" });
    });
    $("#setAutofill").addEventListener("click", function () {
      var on = !this.classList.contains("on");
      window.AGProfile.setSetting("autofill", on).then(function () { renderSettings(); });
    });
    $$("#setLang button").forEach(function (b) {
      b.addEventListener("click", function () {
        var target = document.querySelector('.lang button[data-lang="' + b.dataset.setlang + '"]');
        if (target) target.click();
        renderSettings();
      });
    });
    $("#resetPrefs").addEventListener("click", function () {
      if (!window.confirm(t("dash.resetAsk"))) return;
      window.AGProfile.resetPreferences().then(function () {
        toast(t("dash.resetDone")); renderDash();
      });
    });
    $("#wipeData").addEventListener("click", function () {
      if (!window.confirm(t("dash.wipeAsk"))) return;
      window.AGProfile.deleteAllData().then(function () {
        toast(t("dash.wipeDone"));
        if (window.AGHistory) window.AGHistory.load().then(renderDash);
      });
    });

    /* --- auth state changes --- */
    document.addEventListener("agro:auth", function (e) {
      var d = e.detail || {};
      if (d.event === "not-configured") { renderSvc(); return; }   /* no backend: stays signed out */
      if (d.event === "ready") {
        renderSvc();
        /* the backend finished initialising while the setup help panel was
           showing → swap it for the real log-in form */
        if (!$("#authModal").hidden && !$("#authSetup").hidden) setMode("login");
        return;
      }
      user = d.user || null;
      renderAccount();
      if (d.event === "SIGNED_IN") {
        closeOvl($("#authModal"));
      } else if (d.event === "SIGNED_OUT") {
        closeAll();
      } else if (d.event === "PASSWORD_RECOVERY") {
        setMode("reset");
        openOvl($("#authModal"));
      } else if (d.event === "error") {
        /* stay silent: the site works without an account */
      }
    });

    document.addEventListener("agro:profile", function (e) {
      if ($("#dashModal").hidden) return;
      var d = e.detail || {};
      if (d.saved) { var ok = $("#farmOk"); if (ok) { ok.hidden = false; ok.textContent = t("dash.saved"); setTimeout(function () { ok.hidden = true; }, 2600); } }
      renderDash();
    });
    document.addEventListener("agro:history", function (e) {
      if ($("#dashModal").hidden) return;
      var d = e.detail || {};
      /* a fresh record has no id yet — refetch so Load/Delete work */
      if (d.saved && window.AGHistory) { window.AGHistory.load().then(renderDash); return; }
      renderDash();
    });

    /* --- keep dynamic text in the active language --- */
    var orig = window.__applyI18n;
    if (orig) {
      window.__applyI18n = function () {
        orig();
        try { renderDynamic(); } catch (e) {}
      };
    }

    renderAccount();
    renderSvc();
    setMode("login");

    /* deep link: #recovery (the password-reset e-mail target) */
    if (window.location.hash === "#recovery") openAuth("reset");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.AGUI = { openAuth: openAuth, openDash: openDash, toast: toast, render: renderDynamic };
})();
