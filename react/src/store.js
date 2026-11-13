/* ===== Agroscope React · central store, analysis flow, local accounts ===== */
(function () {
  var R = window.React;
  var html = window.htm.bind(R.createElement);
  window.Ag = { html: html, h: R.createElement };

  var PRIO = ["disaster", "yield", "pest", "water", "cost", "early", "soil", "profit", "longer"];
  var ROT_COLORS = { r1: "#2F6B2C", r2: "#5f8fa0", r3: "#2F6B2C", r4: "#CE6E3D" };

  function rotById(id) {
    var r = null;
    window.DATA.rotations.forEach(function (x) { if (x.id === id) r = x; });
    return r || window.DATA.rotations[0];
  }
  function matchOf(rot, prios) {
    var keys = prios && prios.length ? prios : PRIO, sum = 0;
    keys.forEach(function (k) { sum += rot.scores[k] || 50; });
    return Math.round(sum / keys.length);
  }
  function sevColor(v) { return v >= 70 ? "#652D2F" : v >= 50 ? "#CE6E3D" : "#2F6B2C"; }
  function riskWord(risk, t) { return risk < 35 ? t("ui.low") : risk < 50 ? t("ui.med") : t("ui.high"); }
  function dinajpurIndex() {
    var idx = 0;
    window.DATA.bd.districts.forEach(function (x, i) { if (x.n.en === "Dinajpur") idx = i; });
    return idx;
  }

  /* ---------- local accounts (demo, browser-only) ---------- */
  var AC_KEY = "agroscope-accounts-v1", SES_KEY = "agroscope-session-v1";
  function loadAccounts() {
    try { var a = JSON.parse(localStorage.getItem(AC_KEY)); if (Array.isArray(a) && a.length) return a; } catch (e) {}
    return null;
  }
  function saveAccounts(a) { try { localStorage.setItem(AC_KEY, JSON.stringify(a)); } catch (e) {} }
  function seedAccounts() {
    var now = Date.now(), day = 86400000;
    var demo = {
      name: "Rahim Uddin", email: "rahim@farm.bd", password: "harvest123",
      since: now - 120 * day,
      farm: { name: "Barwaisa Field", district: "Dinajpur", upazila: "Sadar", soilPh: "6.4", soilOm: "1.9", area: "1.8", crop: "Boro rice", loc: "Dinajpur", prios: ["soil", "profit"] },
      prefs: { autofill: true, lang: "en" },
      analyses: [
        { id: "a1", at: now - 2 * day, loc: "Dinajpur", area: 1.8, crop: "Boro rice", prios: ["soil", "profit"], top: "r3", match: 87 },
        { id: "a2", at: now - 16 * day, loc: "Rangpur", area: 2.4, crop: "Maize", prios: ["profit", "yield"], top: "r4", match: 81 },
        { id: "a3", at: now - 40 * day, loc: "Dinajpur", area: 1.8, crop: "Mustard", prios: ["cost", "water"], top: "r2", match: 74 }
      ],
      plans: [
        { id: "p1", at: now - 2 * day, rot: "r3", note: "Soil-first plan for the north field" },
        { id: "p2", at: now - 16 * day, rot: "r1", note: "Balance plan before monsoon" }
      ]
    };
    var a = [demo]; saveAccounts(a); return a;
  }
  function getAccounts() { return loadAccounts() || seedAccounts(); }
  function getSession() { try { return localStorage.getItem(SES_KEY) || null; } catch (e) { return null; } }
  function setSession(email) { try { if (email) localStorage.setItem(SES_KEY, email); else localStorage.removeItem(SES_KEY); } catch (e) {} }
  function findAccount(email) {
    var a = getAccounts(), f = null;
    a.forEach(function (x) { if (x.email.toLowerCase() === String(email).toLowerCase()) f = x; });
    return f;
  }
  function persistAccount(acct) {
    var a = getAccounts();
    var out = a.map(function (x) { return x.email === acct.email ? acct : x; });
    if (out.indexOf(acct) === -1 && !out.some(function (x) { return x.email === acct.email; })) out.push(acct);
    saveAccounts(out);
  }

  /* ---------- store ---------- */
  var StoreCtx = R.createContext(null);

  function useAgStore() {
    var di = dinajpurIndex();
    var form0 = {
      loc: "Dinajpur", div: 6, dist: di, area: "1.8", crop: "Boro rice",
      soilType: "", soilTexture: "", soilPh: "", soilOm: "",
      prios: ["soil", "profit"], detected: null
    };
    var fs = R.useState(form0), form = fs[0], setForm = fs[1];
    var an = R.useState(false), analyzed = an[0], setAnalyzed = an[1];
    var ay = R.useState(false), analyzing = ay[0], setAnalyzing = ay[1];
    var ls = R.useState(-1), loadStep = ls[0], setLoadStep = ls[1];
    var cs = R.useState("boro"), cropSel = cs[0], setCropSel = cs[1];
    var rs = R.useState("climate"), riskSel = rs[0], setRiskSel = rs[1];
    var ly = R.useState("live"), layer = ly[0], setLayer = ly[1];
    var eo = R.useState("ndvi"), eoSel = eo[0], setEoSel = eo[1];
    var cl = R.useState("temp"), clim = cl[0], setClim = cl[1];
    var dw = R.useState(null), drawer = dw[0], setDrawer = dw[1];
    var bd = R.useState("idle"), buddy = bd[0], setBuddy = bd[1];
    var bdis = R.useState(false), buddyDismissed = bdis[0], setBuddyDismissed = bdis[1];
    var bop = R.useState(false), buddyOpen = bop[0], setBuddyOpen = bop[1];
    var pn = R.useState(null), pin = pn[0], setPin = pn[1];
    var tt = R.useState(null), toast = tt[0], setToast = tt[1];
    var auth = R.useState(null), authModal = auth[0], setAuthModal = auth[1];
    var dash = R.useState(false), dashOpen = dash[0], setDashOpen = dash[1];
    var us = R.useState(function () { var e = getSession(); return e ? findAccount(e) : null; }), user = us[0], setUser = us[1];

    var settleRef = R.useRef(0), toastRef = R.useRef(0), runRef = R.useRef(false);

    function showToast(msg) {
      setToast(msg);
      clearTimeout(toastRef.current);
      toastRef.current = setTimeout(function () { setToast(null); }, 2600);
    }
    function resting() { return analyzed ? "done" : "idle"; }
    function buddyTyping() {
      setBuddy("typing");
      clearTimeout(settleRef.current);
      settleRef.current = setTimeout(function () { setBuddy(analyzed ? "done" : "idle"); }, 1500);
    }
    function updateForm(patch, dirty) {
      setForm(function (f) { return Object.assign({}, f, patch); });
      buddyTyping();
      if (dirty !== false && analyzed) { setAnalyzed(false); }
    }
    function togglePrio(k) {
      setForm(function (f) {
        var has = f.prios.indexOf(k) >= 0, next;
        if (has) { next = f.prios.filter(function (x) { return x !== k; }); if (!next.length) next = f.prios; }
        else next = f.prios.concat([k]);
        return Object.assign({}, f, { prios: next });
      });
      buddyTyping();
      if (analyzed) setAnalyzed(false);
    }

    function recordAnalysis(snapshot) {
      if (!user) return;
      var acct = findAccount(user.email); if (!acct) return;
      var entry = {
        id: "a" + Date.now(), at: Date.now(), loc: snapshot.loc, area: parseFloat(snapshot.area) || 0,
        crop: snapshot.crop, prios: snapshot.prios.slice(), top: window.DATA.reco.main.id,
        match: matchOf(rotById(window.DATA.reco.main.id), snapshot.prios)
      };
      acct.analyses = [entry].concat(acct.analyses || []);
      persistAccount(acct); setUser(Object.assign({}, acct));
    }

    function runAnalysis() {
      if (runRef.current) return;
      if (!form.prios.length) { showToast("ui.needPrio"); return; }
      if (!String(form.crop).trim()) { showToast("ui.needCrop"); return; }
      runRef.current = true;
      setAnalyzing(true); setLoadStep(0); setBuddy("busy");
      clearTimeout(settleRef.current);
      var steps = 5, i = 0;
      function tick() {
        setLoadStep(i);
        i++;
        if (i <= steps) { setTimeout(tick, 340); }
        else {
          setTimeout(function () {
            setAnalyzing(false); setLoadStep(-1); setAnalyzed(true); setBuddy("done");
            runRef.current = false;
            recordAnalysis(form);
            var geo = document.getElementById("geography");
            if (geo) geo.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 420);
        }
      }
      tick();
    }

    function gotoInputs() {
      var sec = document.getElementById("input");
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function openDrawer(id) { setDrawer(id); }
    function closeDrawer() { setDrawer(null); }

    function setMapPin(lat, lng, name) {
      setPin({ lat: lat, lng: lng, name: name || "" });
      updateForm({ loc: lat.toFixed(4) + ", " + lng.toFixed(4) });
      showToast("map.set");
    }

    /* auth actions */
    function login(email, password) {
      var acct = findAccount(email);
      if (!acct || acct.password !== password) return { err: "auth.errCreds" };
      setSession(acct.email); setUser(Object.assign({}, acct));
      if (acct.prefs && acct.prefs.autofill && acct.farm) {
        var f = acct.farm;
        setForm(function (cur) {
          return Object.assign({}, cur, {
            loc: f.loc || cur.loc, area: f.area || cur.area, crop: f.crop || cur.crop,
            soilPh: f.soilPh || "", soilOm: f.soilOm || "", prios: (f.prios && f.prios.length) ? f.prios.slice() : cur.prios
          });
        });
      }
      return { ok: true, name: acct.name };
    }
    function signup(name, email, password) {
      if (findAccount(email)) return { err: "auth.errTaken" };
      var acct = {
        name: name, email: email, password: password, since: Date.now(),
        farm: { name: "", district: "", upazila: "", soilPh: "", soilOm: "", area: form.area, crop: form.crop, loc: form.loc, prios: form.prios.slice() },
        prefs: { autofill: true, lang: "en" }, analyses: [], plans: []
      };
      var a = getAccounts(); a.push(acct); saveAccounts(a);
      setSession(email); setUser(Object.assign({}, acct));
      return { ok: true, name: name };
    }
    function logout() { setSession(null); setUser(null); setDashOpen(false); }
    function updateUser(acct) { persistAccount(acct); setUser(Object.assign({}, acct)); }

    function savePlan(rotId, note) {
      if (!user) { setAuthModal("login"); return false; }
      var acct = findAccount(user.email); if (!acct) return false;
      acct.plans = [{ id: "p" + Date.now(), at: Date.now(), rot: rotId, note: note || "" }].concat(acct.plans || []);
      persistAccount(acct); setUser(Object.assign({}, acct)); return true;
    }
    function deleteAnalysis(id) {
      if (!user) return null;
      var acct = findAccount(user.email); if (!acct) return null;
      var removed = (acct.analyses || []).filter(function (x) { return x.id === id; })[0] || null;
      acct.analyses = (acct.analyses || []).filter(function (x) { return x.id !== id; });
      persistAccount(acct); setUser(Object.assign({}, acct)); return removed;
    }
    function restoreAnalysis(entry) {
      if (!user || !entry) return;
      var acct = findAccount(user.email); if (!acct) return;
      acct.analyses = [entry].concat(acct.analyses || []);
      persistAccount(acct); setUser(Object.assign({}, acct));
    }
    function deletePlan(id) {
      if (!user) return;
      var acct = findAccount(user.email); if (!acct) return;
      acct.plans = (acct.plans || []).filter(function (x) { return x.id !== id; });
      persistAccount(acct); setUser(Object.assign({}, acct));
    }
    function loadAnalysisIntoForm(entry) {
      updateForm({ loc: entry.loc, area: String(entry.area), crop: entry.crop, prios: entry.prios.slice() }, false);
      setDashOpen(false); gotoInputs(); showToast("dash.loaded");
    }

    return {
      form: form, setForm: setForm, updateForm: updateForm, togglePrio: togglePrio,
      analyzed: analyzed, analyzing: analyzing, loadStep: loadStep, runAnalysis: runAnalysis, gotoInputs: gotoInputs,
      cropSel: cropSel, setCropSel: setCropSel, riskSel: riskSel, setRiskSel: setRiskSel,
      layer: layer, setLayer: setLayer, eoSel: eoSel, setEoSel: setEoSel, clim: clim, setClim: setClim,
      drawer: drawer, openDrawer: openDrawer, closeDrawer: closeDrawer,
      buddy: buddy, setBuddy: setBuddy, buddyDismissed: buddyDismissed, setBuddyDismissed: setBuddyDismissed,
      buddyOpen: buddyOpen, setBuddyOpen: setBuddyOpen,
      pin: pin, setMapPin: setMapPin, toast: toast, showToast: showToast,
      authModal: authModal, setAuthModal: setAuthModal, dashOpen: dashOpen, setDashOpen: setDashOpen,
      user: user, login: login, signup: signup, logout: logout, updateUser: updateUser,
      savePlan: savePlan, deleteAnalysis: deleteAnalysis, restoreAnalysis: restoreAnalysis,
      deletePlan: deletePlan, loadAnalysisIntoForm: loadAnalysisIntoForm
    };
  }

  function StoreProvider(props) {
    var store = useAgStore();
    return R.createElement(StoreCtx.Provider, { value: store }, props.children);
  }
  function useStore() { return R.useContext(StoreCtx); }

  window.AgStore = {
    Provider: StoreProvider, use: useStore, PRIO: PRIO, ROT_COLORS: ROT_COLORS,
    rotById: rotById, matchOf: matchOf, sevColor: sevColor, riskWord: riskWord,
    getAccounts: getAccounts, findAccount: findAccount
  };
})();