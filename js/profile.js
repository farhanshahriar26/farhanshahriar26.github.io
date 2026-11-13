/* =====================================================================
   Agroscope · profile.js — persistent farmer information
   ---------------------------------------------------------------------
   Remembers, per signed-in user:
     · farmer profile   (farm name, location, division, district, upazila,
                         land size, language, crop, soil, priorities)
     · saved inputs     (autofill preference, raw form values, map layer)
   and repopulates the existing form on the next visit.

   Rules honoured here
     · Only fields that already exist in Agroscope are persisted.
     · Nothing is written while the farmer is typing — saves happen on
       "Analyse this field" or when they press Save in the dashboard.
     · Autofill never overwrites a form the farmer has already touched.
   ===================================================================== */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var S = null;                     /* window.__AG, read lazily */

  var cache = { profile: null, settings: null, inputs: null };
  var status = "idle";              /* idle | loading | ready | error */
  var formTouched = false;
  var applying = false;
  var lastError = null;

  var DEFAULTS = { autofill: true };

  function client() { return window.AGAuth && window.AGAuth.client(); }
  function uid() {
    var u = window.AGAuth && window.AGAuth.user();
    return u ? u.id : null;
  }
  function state() { return S || (S = window.__AG); }
  function emit(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {}
  }
  function fail(e) {
    lastError = window.AGAuth ? window.AGAuth.mapError(e) : "auth.errGeneric";
    status = "error";
    emit("agro:profile", { status: status, error: lastError });
  }

  /* ------------------------------------------------- read what's on screen */
  function readForm() {
    var s = state();
    var p = function (id) { var el = $(id); return el ? String(el.value || "").trim() : ""; };
    return {
      location_text: p("#locInput") || null,
      division: $("#divSel") && $("#divSel").value !== "" ? +$("#divSel").value : null,
      district: $("#distSel") && $("#distSel").value !== "" ? +$("#distSel").value : null,
      farm_size: (function () {
        var n = parseFloat(String(p("#areaInput")).replace(/[০-৯]/g, function (c) {
          return "০১২৩৪৫৬৭৮৯".indexOf(c);
        }));
        return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
      })(),
      current_crop: p("#cropInput") || null,
      soil_type: p("#soilType") || null,
      soil_texture: p("#soilTexture") || null,
      soil_ph: p("#soilPh") ? +p("#soilPh") : null,
      soil_om: p("#soilOm") ? +p("#soilOm") : null,
      priorities: s && s.prios ? Array.prototype.slice.call(s.prios) : []
    };
  }

  /* ------------------------------------------- rebuild district <select> */
  function fillDistricts(di) {
    var bd = window.DATA && window.DATA.bd, ds = $("#distSel");
    if (!bd || !ds || di == null) return;
    ds.innerHTML = bd.districts.map(function (x, i) { return { x: x, i: i }; })
      .filter(function (o) { return o.x.d === +di; })
      .map(function (o) { return '<option value="' + o.i + '">' + window.T(o.x.n) + "</option>"; })
      .join("");
  }

  /* ---------------------------------------------------- push data → form */
  function applyToForm() {
    var s = state();
    if (!cache.profile || !s) return false;
    if (!settings().autofill) return false;
    if (formTouched) return false;              /* the farmer already started */

    var p = cache.profile;
    applying = true;
    try {
      if (p.location_text != null && $("#locInput")) $("#locInput").value = p.location_text;
      if (p.division != null && $("#divSel")) { $("#divSel").value = String(p.division); fillDistricts(p.division); }
      if (p.district != null && $("#distSel") && $("#distSel").querySelector('option[value="' + p.district + '"]')) {
        $("#distSel").value = String(p.district);
      }
      if (p.farm_size != null && $("#areaInput")) {
        $("#areaInput").value = p.farm_size;
        /* same effect as the app's own setArea(), without firing events */
        window.DATA.field.area = p.farm_size;
        if (window.MAP && window.MAP.refresh) window.MAP.refresh();
      }
      if (p.current_crop && $("#cropInput")) { $("#cropInput").value = p.current_crop; s.crop = p.current_crop; }
      if (p.soil_type != null && $("#soilType")) $("#soilType").value = p.soil_type;
      if (p.soil_texture != null && $("#soilTexture")) $("#soilTexture").value = p.soil_texture;
      if (p.soil_ph != null && $("#soilPh")) $("#soilPh").value = p.soil_ph;
      if (p.soil_om != null && $("#soilOm")) $("#soilOm").value = p.soil_om;
      if (p.priorities && p.priorities.length) s.prios = new Set(p.priorities);

      /* rebuild chips, placeholders and geo selects (values are preserved) */
      if (window.__applyI18n) window.__applyI18n();

      /* fly the globe back to the saved farm, if there is one */
      if (p.district != null && window.MAP && window.MAP.goTo && window.DATA.bd.districts[p.district]) {
        var d = window.DATA.bd.districts[p.district];
        window.MAP.goTo(d.pos[0], d.pos[1], 46000);
      }

      formTouched = false;
      return true;
    } catch (e) {
      return false;
    } finally {
      applying = false;
    }
  }

  /* ---------------------------------------------------- pull form → cache */
  function saveForm() {
    return new Promise(function (resolve) {
      if (!client() || !uid()) return resolve({ ok: false, skipped: true });
      var row = readForm();
      row.user_id = uid();
      row.updated_at = new Date().toISOString();
      status = "loading";
      emit("agro:profile", { status: status });
      client().from("farmer_profiles").upsert(row, { onConflict: "user_id" })
        .then(function (res) {
          if (res.error) { fail(res.error); return resolve({ ok: false, error: lastError }); }
          cache.profile = Object.assign({}, cache.profile || {}, row);
          status = "ready"; lastError = null;
          emit("agro:profile", { status: status, saved: true });
          resolve({ ok: true });
        }).catch(function (e) { fail(e); resolve({ ok: false, error: lastError }); });
    });
  }

  /* --------------------------------------------------------------- load */
  function load() {
    return new Promise(function (resolve) {
      if (!client() || !uid()) { cache.profile = null; cache.settings = null; status = "idle"; return resolve(null); }
      status = "loading"; lastError = null;
      emit("agro:profile", { status: status });

      var me = uid();
      Promise.all([
        client().from("farmer_profiles").select("*").eq("user_id", me).maybeSingle(),
        client().from("saved_inputs").select("category,payload").eq("user_id", me)
      ]).then(function (res) {
        var profErr = res[0].error, listErr = res[1].error;
        if (profErr) { fail(profErr); return resolve(null); }
        if (listErr) { fail(listErr); return resolve(null); }

        cache.profile = res[0].data || null;
        cache.settings = Object.assign({}, DEFAULTS);
        cache.inputs = {};
        (res[1].data || []).forEach(function (r) {
          if (r.category === "settings") cache.settings = Object.assign({}, DEFAULTS, r.payload || {});
          else cache.inputs[r.category] = r.payload || {};
        });
        status = "ready";
        emit("agro:profile", { status: status, profile: cache.profile, settings: cache.settings });
        resolve(cache.profile);
      }).catch(function (e) { fail(e); resolve(null); });
    });
  }

  function settings() {
    if (!cache.settings) cache.settings = Object.assign({}, DEFAULTS);
    return cache.settings;
  }

  function setSetting(key, value) {
    settings()[key] = value;
    if (!client() || !uid()) { try { localStorage.setItem("agro-set-" + key, JSON.stringify(value)); } catch (e) {} return Promise.resolve({ ok: true }); }
    return client().from("saved_inputs").upsert({
      user_id: uid(), category: "settings",
      payload: JSON.parse(JSON.stringify(settings())),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,category" }).then(function (res) {
      emit("agro:profile", { status: status, settings: settings() });
      return { ok: !res.error, error: res.error ? window.AGAuth.mapError(res.error) : null };
    }).catch(function () { return { ok: false }; });
  }

  /* ------------------------------------------------- clear one field */
  var FIELD_MAP = {
    location_text: "#locInput", division: "#divSel", district: "#distSel",
    farm_size: "#areaInput", current_crop: "#cropInput",
    soil_type: "#soilType", soil_texture: "#soilTexture",
    soil_ph: "#soilPh", soil_om: "#soilOm"
  };

  function clearField(key) {
    if (!cache.profile || !client() || !uid()) return Promise.resolve({ ok: false });
    var patch = { user_id: uid(), updated_at: new Date().toISOString() };
    if (key === "priorities") patch.priorities = [];
    else patch[key] = null;
    if (key === "farm_size") window.DATA.field.area = 1.8;

    var sel = FIELD_MAP[key];
    if (sel && $(sel)) $(sel).value = "";
    if (key === "current_crop") { state().crop = ""; if (window.renderCrops) window.renderCrops(); }
    if (key === "priorities") { state().prios = new Set(); if (window.__applyI18n) window.__applyI18n(); }
    if (key === "farm_size" && window.MAP && window.MAP.refresh) window.MAP.refresh();

    return client().from("farmer_profiles").upsert(patch, { onConflict: "user_id" }).then(function (res) {
      if (!res.error && cache.profile) Object.assign(cache.profile, patch);
      emit("agro:profile", { status: status, cleared: key });
      return { ok: !res.error };
    }).catch(function () { return { ok: false }; });
  }

  /* ------------------------------------------------- reset everything */
  function resetPreferences() {
    if (!client() || !uid()) return Promise.resolve({ ok: false });
    var me = uid();
    cache.profile = null; cache.settings = Object.assign({}, DEFAULTS);
    return Promise.all([
      client().from("farmer_profiles").delete().eq("user_id", me),
      client().from("saved_inputs").delete().eq("user_id", me)
    ]).then(function () {
      /* recreate the empty profile row the trigger normally makes */
      return client().from("farmer_profiles").upsert({ user_id: me, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    }).then(function () {
      formTouched = false;
      emit("agro:profile", { status: "ready", reset: true });
      return { ok: true };
    }).catch(function () { return { ok: false }; });
  }

  function deleteAllData() {
    if (!client() || !uid()) return Promise.resolve({ ok: false });
    var me = uid();
    return Promise.all([
      client().from("analysis_history").delete().eq("user_id", me),
      client().from("saved_plans").delete().eq("user_id", me)
    ]).then(function () { return resetPreferences(); })
      .then(function () { return { ok: true }; })
      .catch(function () { return { ok: false }; });
  }

  /* ------------------------------------------------------------- wiring */
  function init() {
    /* the farmer has started typing — never overwrite their work */
    document.addEventListener("input", function () { if (!applying) formTouched = true; }, true);
    document.addEventListener("change", function () { if (!applying) formTouched = true; }, true);

    document.addEventListener("agro:auth", function (e) {
      var ev = e.detail && e.detail.event;
      if (ev === "SIGNED_IN" || ev === "PASSWORD_RECOVERY") {
        load().then(function (p) { if (p) applyToForm(); });
      } else if (ev === "SIGNED_OUT") {
        cache.profile = null; cache.settings = null; cache.inputs = null;
        status = "idle"; formTouched = false;
        emit("agro:profile", { status: status });
      }
    });

    /* every completed analysis is stored for this account */
    document.addEventListener("agro:analysis", function () {
      if (!client() || !uid()) return;
      saveForm();
    });
  }

  window.AGProfile = {
    init: init,
    load: load,
    applyToForm: applyToForm,
    readForm: readForm,
    saveForm: saveForm,
    settings: settings,
    setSetting: setSetting,
    clearField: clearField,
    resetPreferences: resetPreferences,
    deleteAllData: deleteAllData,
    get: function () { return cache.profile; },
    status: function () { return status; },
    error: function () { return lastError; },
    touched: function () { return formTouched; },
    markTouched: function () { formTouched = true; },
    inputs: function () { return cache.inputs || {}; },
    saveCategory: function (category, payload) {
      if (!client() || !uid()) return Promise.resolve({ ok: false, skipped: true });
      return client().from("saved_inputs").upsert({
        user_id: uid(), category: category, payload: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,category" }).then(function (res) {
        if (!res.error && cache.inputs) cache.inputs[category] = payload;
        return { ok: !res.error };
      }).catch(function () { return { ok: false }; });
    }
  };
})();
