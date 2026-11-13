/* =====================================================================
   Agroscope · history.js — previous analyses & saved rotation plans
   ---------------------------------------------------------------------
   Every completed run of "Analyse this field" is stored against the
   signed-in account together with the inputs that produced it, so the
   farmer can come back days later and reload or compare old work.
   All rows are filtered by user_id and protected by Row Level Security.
   ===================================================================== */
(function () {
  var cache = { analyses: [], plans: [] };
  var status = "idle";          /* idle | loading | ready | empty | error */
  var lastError = null;

  function client() { return window.AGAuth && window.AGAuth.client(); }
  function uid() { var u = window.AGAuth && window.AGAuth.user(); return u ? u.id : null; }
  function emit(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {}
  }
  function fail(e) {
    lastError = window.AGAuth ? window.AGAuth.mapError(e) : "auth.errGeneric";
    status = "error";
    emit("agro:history", { status: status, error: lastError });
  }
  function ready(list, which) {
    status = list.length ? "ready" : "empty";
    emit("agro:history", { status: status, which: which });
  }

  /* ------------------------------------------------------- read the form */
  function snapshot() {
    var S = window.__AG || {};
    var p = function (id) {
      var el = document.querySelector(id);
      return el ? String(el.value || "").trim() : "";
    };
    var soil = {
      type: p("#soilType") || null,
      texture: p("#soilTexture") || null,
      ph: p("#soilPh") || null,
      om: p("#soilOm") || null
    };
    return {
      location: p("#locInput") || null,
      division: document.querySelector("#divSel") && document.querySelector("#divSel").value !== ""
        ? +document.querySelector("#divSel").value : null,
      district: document.querySelector("#distSel") && document.querySelector("#distSel").value !== ""
        ? +document.querySelector("#distSel").value : null,
      crop: p("#cropInput") || S.crop || null,
      soil: soil,
      priorities: S.prios ? Array.prototype.slice.call(S.prios) : [],
      /* a compact result summary so the dashboard can show something useful */
      results: {
        layer: S.layer || "live",
        eo: S.eo || "ndvi",
        located: !!S.located,
        analyzed: !!S.analyzed
      }
    };
  }

  /* ------------------------------------------------------------- save */
  function saveAnalysis() {
    return new Promise(function (resolve) {
      if (!client() || !uid()) return resolve({ ok: false, skipped: true });
      var row = snapshot();
      row.user_id = uid();
      row.created_at = new Date().toISOString();

      status = "loading";
      emit("agro:history", { status: status });

      client().from("analysis_history").insert(row).then(function (res) {
        if (res.error) { fail(res.error); return resolve({ ok: false, error: lastError }); }
        cache.analyses.unshift({ id: null, created_at: row.created_at, location: row.location,
          division: row.division, district: row.district, crop: row.crop,
          priorities: row.priorities, soil: row.soil, results: row.results });
        status = "ready";
        emit("agro:history", { status: status, saved: true, which: "analyses" });
        resolve({ ok: true });
      }).catch(function (e) { fail(e); resolve({ ok: false, error: lastError }); });
    });
  }

  function savePlan(plan, recommendations) {
    return new Promise(function (resolve) {
      if (!client() || !uid()) return resolve({ ok: false, skipped: true });
      var row = {
        user_id: uid(),
        created_at: new Date().toISOString(),
        plan: plan || {},
        recommendations: recommendations || {}
      };
      client().from("saved_plans").insert(row).then(function (res) {
        if (res.error) { fail(res.error); return resolve({ ok: false, error: lastError }); }
        cache.plans.unshift({ id: null, created_at: row.created_at, plan: row.plan, recommendations: row.recommendations });
        emit("agro:history", { status: "ready", saved: true, which: "plans" });
        resolve({ ok: true });
      }).catch(function (e) { fail(e); resolve({ ok: false }); });
    });
  }

  /* -------------------------------------------------------------- list */
  function load() {
    return new Promise(function (resolve) {
      if (!client() || !uid()) {
        cache.analyses = []; cache.plans = []; status = "idle";
        return resolve(null);
      }
      status = "loading"; lastError = null;
      emit("agro:history", { status: status });

      var me = uid();
      Promise.all([
        client().from("analysis_history")
          .select("id,created_at,location,division,district,crop,priorities,soil,results")
          .eq("user_id", me).order("created_at", { ascending: false }).limit(30),
        client().from("saved_plans")
          .select("id,created_at,plan,recommendations")
          .eq("user_id", me).order("created_at", { ascending: false }).limit(30)
      ]).then(function (res) {
        if (res[0].error) { fail(res[0].error); return resolve(null); }
        if (res[1].error) { fail(res[1].error); return resolve(null); }
        cache.analyses = res[0].data || [];
        cache.plans = res[1].data || [];
        status = (cache.analyses.length || cache.plans.length) ? "ready" : "empty";
        emit("agro:history", { status: status });
        resolve({ analyses: cache.analyses, plans: cache.plans });
      }).catch(function (e) { fail(e); resolve(null); });
    });
  }

  /* ---------------------------------------------------- reload a record */
  function applyAnalysis(rec) {
    var S = window.__AG;
    if (!rec || !S) return false;
    try {
      /* let profile.js know this is an intentional overwrite, not typing */
      if (window.AGProfile && window.AGProfile.markTouched) window.AGProfile.markTouched();

      var loc = document.querySelector("#locInput");
      if (loc && rec.location) loc.value = rec.location;

      if (rec.division != null && document.querySelector("#divSel")) {
        document.querySelector("#divSel").value = String(rec.division);
        var ds = document.querySelector("#distSel");
        if (ds && window.DATA && window.DATA.bd) {
          ds.innerHTML = window.DATA.bd.districts.map(function (x, i) { return { x: x, i: i }; })
            .filter(function (o) { return o.x.d === +rec.division; })
            .map(function (o) { return '<option value="' + o.i + '">' + window.T(o.x.n) + "</option>"; })
            .join("");
          if (rec.district != null) ds.value = String(rec.district);
        }
      }

      if (rec.crop && document.querySelector("#cropInput")) {
        document.querySelector("#cropInput").value = rec.crop;
        S.crop = rec.crop;
      }
      if (rec.soil) {
        var set = function (id, v) { var el = document.querySelector(id); if (el && v != null) el.value = v; };
        set("#soilType", rec.soil.type); set("#soilTexture", rec.soil.texture);
        set("#soilPh", rec.soil.ph); set("#soilOm", rec.soil.om);
      }
      if (rec.priorities && rec.priorities.length) S.prios = new Set(rec.priorities);

      if (window.__applyI18n) window.__applyI18n();
      emit("agro:history", { applied: rec });
      return true;
    } catch (e) { return false; }
  }

  function remove(which, id) {
    if (!client() || !uid() || !id) return Promise.resolve({ ok: false });
    var table = which === "plans" ? "saved_plans" : "analysis_history";
    var list = which === "plans" ? "plans" : "analyses";
    return client().from(table).delete().eq("id", id).eq("user_id", uid()).then(function (res) {
      if (!res.error) cache[list] = cache[list].filter(function (r) { return r.id !== id; });
      emit("agro:history", { status: cache[list].length ? "ready" : "empty", which: list });
      return { ok: !res.error };
    }).catch(function () { return { ok: false }; });
  }

  function init() {
    document.addEventListener("agro:auth", function (e) {
      var ev = e.detail && e.detail.event;
      if (ev === "SIGNED_IN" || ev === "PASSWORD_RECOVERY") load();
      else if (ev === "SIGNED_OUT") {
        cache.analyses = []; cache.plans = []; status = "idle";
        emit("agro:history", { status: status });
      }
    });
    /* fires from app.js the moment an analysis finishes */
    document.addEventListener("agro:analysis", function () { saveAnalysis(); });
  }

  window.AGHistory = {
    init: init,
    load: load,
    saveAnalysis: saveAnalysis,
    savePlan: savePlan,
    applyAnalysis: applyAnalysis,
    remove: remove,
    snapshot: snapshot,
    analyses: function () { return cache.analyses; },
    plans: function () { return cache.plans; },
    status: function () { return status; },
    error: function () { return lastError; }
  };
})();
