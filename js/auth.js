/* =====================================================================
   Agroscope · auth.js — Supabase authentication
   ---------------------------------------------------------------------
   Sign up · Log in · Remember me · Forgot / reset password · Sign out
   Validation, friendly errors and a session that survives refreshes.

   Notes
   · Passwords are never stored or read by this file — Supabase Auth
     holds them server-side (modern hashed storage).
   · Password recovery is a REAL flow: resetPasswordForEmail() sends a
     secure, time-limited, single-use link; the new password is written
     through auth.updateUser() only after Supabase validates the token.
   · Remember me = localStorage (survives browser restart).
     No remember me  = sessionStorage (survives refresh, not restart).
   ===================================================================== */
(function () {
  var cfg = window.AG_CONFIG || {};
  var client = null;
  var activeStorage = "localStorage";   /* where the next session is written */

  var state = {
    ready: false,
    configured: false,
    mode: null,        /* "supabase" | "demo" | "off" | "unconfigured" */
    loading: true,
    user: null,
    session: null,
    error: null
  };

  /* ---------------- helpers ---------------- */
  function fire(detail) {
    try { document.dispatchEvent(new CustomEvent("agro:auth", { detail: detail || {} })); }
    catch (e) {}
  }

  function configured() {
    return !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
              window.supabase && window.supabase.createClient);
  }

  function redirectUrl() {
    if (cfg.RESET_REDIRECT) return cfg.RESET_REDIRECT;
    return window.location.origin + window.location.pathname + "#recovery";
  }

  /* Read from persistent storage first (a "remember me" session), then from
     the tab session, so both kinds of login are restored on refresh. */
  function sessionStore() {
    var mem = {};
    return {
      getItem: function (k) {
        var v = null;
        try { v = window.localStorage.getItem(k); } catch (e) {}
        if (v == null) { try { v = window.sessionStorage.getItem(k); } catch (e) {} }
        if (v == null) v = (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null);
        return v;
      },
      setItem: function (k, v) {
        try { window[activeStorage].setItem(k, v); }
        catch (e) { mem[k] = v; }
      },
      removeItem: function (k) {
        try { window.localStorage.removeItem(k); } catch (e) {}
        try { window.sessionStorage.removeItem(k); } catch (e) {}
        delete mem[k];
      }
    };
  }

  /* ---------------- validation ---------------- */
  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
  }
  function passwordProblems(pw) {
    var out = [];
    pw = String(pw || "");
    if (pw.length < 8) out.push("auth.errPwLen");
    if (!/[A-Za-z]/.test(pw)) out.push("auth.errPwLetter");
    if (!/[0-9]/.test(pw)) out.push("auth.errPwNum");
    return out;
  }

  /* Turn Supabase's raw messages into translatable keys. */
  function mapError(err) {
    var m = String((err && (err.message || err.error_description || err.error)) || err || "");
    var low = m.toLowerCase();
    if (low.indexOf("already registered") > -1 || low.indexOf("already exists") > -1 ||
        low.indexOf("user_already_exists") > -1) return "auth.errTaken";
    if (low.indexOf("invalid login credentials") > -1) return "auth.errCreds";
    if (low.indexOf("email not confirmed") > -1) return "auth.errUnconfirmed";
    if (low.indexOf("password should be at least") > -1 || low.indexOf("password") > -1 && low.indexOf("weak") > -1) return "auth.errPwLen";
    if (low.indexOf("rate limit") > -1 || low.indexOf("too many") > -1) return "auth.errRate";
    if (low.indexOf("not authorized") > -1 || low.indexOf("not allowed") > -1) return "auth.errBlocked";
    if (low.indexOf("token has expired") > -1 || low.indexOf("invalid") > -1 && low.indexOf("token") > -1) return "auth.errToken";
    if (low.indexOf("fetch") > -1 || low.indexOf("network") > -1) return "auth.errNetwork";
    return "auth.errGeneric";
  }

  /* ---------------- local demo backend ----------------
     Runs when AUTH_MODE is "auto" and no Supabase project is configured:
     accounts, farm profile, analyses and plans live in this browser only.
     A tiny supabase-js-shaped client keeps profile.js / history.js /
     ui-auth.js working completely unchanged.  (Demo passwords use a weak
     local digest — there is no server, so this is convenience, not
     security. Never reuse a real password here.) */
  var DEMO_USERS = "agro-demo-users", DEMO_DB = "agro-demo-db", DEMO_SESS = "agro-demo-session";

  function demoRead(key, fb) {
    try { var v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch (e) { return fb; }
  }
  function demoWrite(key, val) { try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function demoHash(pw) {
    var s = "agro-demo::" + String(pw), h1 = 5381, h2 = 52711;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      h1 = ((h1 << 5) + h1 + c) | 0;
      h2 = ((h2 << 5) + h2 + c * 31) | 0;
    }
    return (h1 >>> 0).toString(36) + "-" + (h2 >>> 0).toString(36);
  }
  function demoId() {
    return "demo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  function demoUsers() { return demoRead(DEMO_USERS, {}); }
  function demoSession() {
    try { var v = window.localStorage.getItem(DEMO_SESS); if (v) return JSON.parse(v); } catch (e) {}
    try { var v2 = window.sessionStorage.getItem(DEMO_SESS); if (v2) return JSON.parse(v2); } catch (e) {}
    return null;
  }
  function demoPutSession(sess) {
    try { window[activeStorage].setItem(DEMO_SESS, JSON.stringify(sess)); } catch (e) {}
  }
  function demoClearSession() {
    try { window.localStorage.removeItem(DEMO_SESS); } catch (e) {}
    try { window.sessionStorage.removeItem(DEMO_SESS); } catch (e) {}
  }
  function demoPublic(rec) {
    return { id: rec.id, email: rec.email, created_at: rec.created_at,
             user_metadata: { full_name: rec.name } };
  }
  function demoEnter(rec) {
    state.user = demoPublic(rec);
    state.session = { user: state.user };
    demoPutSession({ email: rec.email });
    fire({ event: "SIGNED_IN", user: state.user });
  }

  /* supabase-js-compatible subset: from().select/insert/upsert/delete()
     with .eq/.order/.limit/.maybeSingle() — everything the app uses. */
  function demoClient() {
    function load(name) { var db = demoRead(DEMO_DB, {}); return db[name] || []; }
    function save(name, rows) { var db = demoRead(DEMO_DB, {}); db[name] = rows; demoWrite(DEMO_DB, db); }
    function exec(q) {
      return new Promise(function (resolve) {
        try {
          var rows = load(q.name), data = null, i, j;
          if (q.op === "select") {
            var got = rows.filter(function (r) {
              for (var i = 0; i < q.conds.length; i++) if (r[q.conds[i][0]] !== q.conds[i][1]) return false;
              return true;
            });
            if (q.by) {
              var k = q.by[0], asc = !q.by[1] || q.by[1].ascending !== false;
              got = got.slice().sort(function (a, b) {
                if (a[k] === b[k]) return 0;
                return (a[k] > b[k] ? 1 : -1) * (asc ? 1 : -1);
              });
            }
            if (q.n != null) got = got.slice(0, q.n);
            data = q.one ? (got[0] || null) : got;
          } else if (q.op === "insert") {
            var row = Object.assign({}, q.row);
            if (row.id == null) row.id = demoId();
            rows.push(row); save(q.name, rows);
          } else if (q.op === "upsert") {
            var keys = String((q.opt && q.opt.onConflict) || "id").split(",").map(function (s) { return s.trim(); });
            var at = -1;
            for (i = 0; i < rows.length; i++) {
              var hit = true;
              for (j = 0; j < keys.length; j++) if (rows[i][keys[j]] !== q.row[keys[j]]) { hit = false; break; }
              if (hit) { at = i; break; }
            }
            if (at >= 0) rows[at] = Object.assign({}, rows[at], q.row);
            else rows.push(Object.assign({}, q.row));
            save(q.name, rows);
          } else if (q.op === "delete") {
            save(q.name, rows.filter(function (r) {
              for (var i = 0; i < q.conds.length; i++) if (r[q.conds[i][0]] === q.conds[i][1]) return false;
              return true;
            }));
          }
          resolve({ data: data, error: null });
        } catch (e) { resolve({ data: null, error: { message: String(e) } }); }
      });
    }
    function Q(name) { this.name = name; this.op = "select"; this.conds = []; this.by = null; this.n = null; this.one = false; this.row = null; this.opt = null; }
    Q.prototype.select = function () { this.op = "select"; return this; };
    Q.prototype.eq = function (k, v) { this.conds.push([k, v]); return this; };
    Q.prototype.order = function (k, o) { this.by = [k, o]; return this; };
    Q.prototype.limit = function (n) { this.n = n; return this; };
    Q.prototype.maybeSingle = function () { this.one = true; return exec(this); };
    Q.prototype.insert = function (row) { this.op = "insert"; this.row = row; return this; };
    Q.prototype.upsert = function (row, opt) { this.op = "upsert"; this.row = row; this.opt = opt; return this; };
    Q.prototype.delete = function () { this.op = "delete"; return this; };
    Q.prototype.then = function (ok, err) { return exec(this).then(ok, err); };
    return { from: function (name) { return new Q(name); } };
  }

  function startDemo() {
    state.mode = "demo";
    state.configured = true;
    state.loading = false;
    client = demoClient();
    var sess = demoSession(), users = demoUsers(), rec = sess ? users[sess.email] : null;
    /* defer the events: ui-auth registers its listeners right after boot() */
    setTimeout(function () {
      if (rec) { state.user = demoPublic(rec); fire({ event: "SIGNED_IN", user: state.user }); }
      else { state.user = null; fire({ event: "SIGNED_OUT", user: null }); }
      fire({ event: "ready", mode: "demo" });
    }, 0);
  }

  /* ---------------- lifecycle ---------------- */
  function init() {
    if (state.ready) return;
    state.ready = true;

    var want = cfg.AUTH_MODE || "auto";

    if (want === "off") {
      state.mode = "off"; state.configured = false; state.loading = false;
      fire({ event: "not-configured", mode: "off" });
      return;
    }

    if (!configured()) {
      if (want === "supabase") {
        /* a live project was demanded but the keys are missing */
        state.mode = "unconfigured"; state.configured = false; state.loading = false;
        fire({ event: "not-configured", mode: "unconfigured" });
        return;
      }
      startDemo();                 /* auto + no keys → local demo backend */
      return;
    }

    try {
      client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: sessionStore()
        }
      });
    } catch (e) {
      if (want === "supabase") {
        state.configured = false;
        state.mode = "unconfigured";
        state.error = "auth.errGeneric";
        state.loading = false;
        fire({ event: "error", error: state.error });
        return;
      }
      startDemo();                 /* unusable keys must not break the site */
      return;
    }

    state.mode = "supabase";
    state.configured = true;
    fire({ event: "ready", mode: "supabase" });

    client.auth.getSession().then(function (res) {
      state.session = res && res.data ? res.data.session : null;
      state.user = state.session ? state.session.user : null;
      state.loading = false;
      fire({ event: state.user ? "SIGNED_IN" : "SIGNED_OUT", user: state.user });
    }).catch(function (e) {
      state.loading = false;
      state.error = mapError(e);
      fire({ event: "error", error: state.error });
    });

    client.auth.onAuthStateChange(function (event, session) {
      state.session = session;
      state.user = session ? session.user : null;
      state.loading = false;
      fire({ event: event, user: state.user });
    });
  }

  /* ---------------- public API ---------------- */
  var AGAuth = {
    init: init,
    state: state,
    client: function () { return client; },
    configured: function () { return state.configured; },
    mode: function () { return state.mode || "unconfigured"; },
    user: function () { return state.user; },
    ready: function () { return state.ready; },
    loading: function () { return state.loading; },

    /* ---- validation, exposed so the UI can show errors before sending ---- */
    isEmail: isEmail,
    passwordProblems: passwordProblems,

    /* -------------------------------- sign up ---------------------------- */
    signUp: function (name, email, password, confirm) {
      return new Promise(function (resolve) {
        if (state.mode === "demo") {
          var dErrs = [];
          if (!name || String(name).trim().length < 2) dErrs.push("auth.errName");
          if (!isEmail(email)) dErrs.push("auth.errEmail");
          passwordProblems(password).forEach(function (k) { dErrs.push(k); });
          if (password !== confirm) dErrs.push("auth.errMatch");
          if (dErrs.length) return resolve({ ok: false, errors: dErrs });
          var all = demoUsers(), em = String(email).trim().toLowerCase();
          if (all[em]) return resolve({ ok: false, errors: ["auth.errTaken"] });
          var rec = { id: demoId(), name: String(name).trim(), email: em,
                      pw: demoHash(password), created_at: new Date().toISOString() };
          all[em] = rec; demoWrite(DEMO_USERS, all);
          activeStorage = "localStorage";
          demoEnter(rec);
          return resolve({ ok: true, needsConfirm: false, user: demoPublic(rec) });
        }
        if (!state.configured || !client) return resolve({ ok: false, errors: ["auth.notReady"] });
        var errors = [];
        if (!name || String(name).trim().length < 2) errors.push("auth.errName");
        if (!isEmail(email)) errors.push("auth.errEmail");
        passwordProblems(password).forEach(function (k) { errors.push(k); });
        if (password !== confirm) errors.push("auth.errMatch");
        if (errors.length) return resolve({ ok: false, errors: errors });

        client.auth.signUp({
          email: String(email).trim(),
          password: password,
          options: { data: { full_name: String(name).trim() }, emailRedirectTo: redirectUrl() }
        }).then(function (res) {
          if (res.error) return resolve({ ok: false, errors: [mapError(res.error)] });
          var data = res.data || {};
          state.session = data.session || null;
          state.user = data.user || null;
          /* No session => the project requires confirming the e-mail first. */
          resolve({ ok: true, needsConfirm: !data.session, user: data.user });
        }).catch(function (e) {
          resolve({ ok: false, errors: [mapError(e)] });
        });
      });
    },

    /* -------------------------------- log in ---------------------------- */
    signIn: function (email, password, remember) {
      return new Promise(function (resolve) {
        if (state.mode === "demo") {
          var sErrs = [];
          if (!isEmail(email)) sErrs.push("auth.errEmail");
          if (!password) sErrs.push("auth.errPwReq");
          if (sErrs.length) return resolve({ ok: false, errors: sErrs });
          activeStorage = remember === false ? "sessionStorage" : "localStorage";
          var users = demoUsers(), em = String(email).trim().toLowerCase(), urec = users[em];
          if (!urec || urec.pw !== demoHash(password)) return resolve({ ok: false, errors: ["auth.errCreds"] });
          demoEnter(urec);
          return resolve({ ok: true, user: demoPublic(urec) });
        }
        if (!state.configured || !client) return resolve({ ok: false, errors: ["auth.notReady"] });
        var errors = [];
        if (!isEmail(email)) errors.push("auth.errEmail");
        if (!password) errors.push("auth.errPwReq");
        if (errors.length) return resolve({ ok: false, errors: errors });

        activeStorage = remember === false ? "sessionStorage" : "localStorage";

        client.auth.signInWithPassword({
          email: String(email).trim(),
          password: password
        }).then(function (res) {
          if (res.error) return resolve({ ok: false, errors: [mapError(res.error)] });
          state.session = res.data.session;
          state.user = res.data.user;
          resolve({ ok: true, user: res.data.user });
        }).catch(function (e) {
          resolve({ ok: false, errors: [mapError(e)] });
        });
      });
    },

    /* ------------------------- forgot / reset --------------------------- */
    /* Step 1+2 of recovery: sends the secure, expiring, single-use link. */
    requestReset: function (email) {
      return new Promise(function (resolve) {
        if (state.mode === "demo") return resolve({ ok: false, errors: ["auth.demoNoMail"] });
        if (!state.configured || !client) return resolve({ ok: false, errors: ["auth.notReady"] });
        if (!isEmail(email)) return resolve({ ok: false, errors: ["auth.errEmail"] });
        client.auth.resetPasswordForEmail(String(email).trim(), {
          redirectTo: redirectUrl()
        }).then(function (res) {
          if (res.error) return resolve({ ok: false, errors: [mapError(res.error)] });
          resolve({ ok: true });
        }).catch(function (e) {
          resolve({ ok: false, errors: [mapError(e)] });
        });
      });
    },

    /* Step 4+5: only reachable from the e-mail link — Supabase validates
       the reset token before updateUser() is allowed to run. */
    updatePassword: function (pw, confirm) {
      return new Promise(function (resolve) {
        if (state.mode === "demo") {
          var pErrs = passwordProblems(pw);
          if (pw !== confirm) pErrs.push("auth.errMatch");
          if (pErrs.length) return resolve({ ok: false, errors: pErrs });
          if (!state.user) return resolve({ ok: false, errors: ["auth.demoNoMail"] });
          var us = demoUsers(), rec = us[state.user.email];
          if (rec) { rec.pw = demoHash(pw); demoWrite(DEMO_USERS, us); }
          return resolve({ ok: !!rec });
        }
        if (!state.configured || !client) return resolve({ ok: false, errors: ["auth.notReady"] });
        var errors = passwordProblems(pw);
        if (pw !== confirm) errors.push("auth.errMatch");
        if (errors.length) return resolve({ ok: false, errors: errors });
        client.auth.updateUser({ password: pw }).then(function (res) {
          if (res.error) return resolve({ ok: false, errors: [mapError(res.error)] });
          resolve({ ok: true });
        }).catch(function (e) {
          resolve({ ok: false, errors: [mapError(e)] });
        });
      });
    },

    /* ------------------------- profile helpers -------------------------- */
    updateProfileMeta: function (fullName) {
      return new Promise(function (resolve) {
        if (state.mode === "demo" && state.user) {
          var us = demoUsers(), rec = us[state.user.email];
          if (rec) { rec.name = fullName; demoWrite(DEMO_USERS, us); state.user = demoPublic(rec); }
          return resolve({ ok: !!rec });
        }
        if (!client) return resolve({ ok: false });
        client.auth.updateUser({ data: { full_name: fullName } }).then(function (res) {
          resolve({ ok: !res.error, error: res.error ? mapError(res.error) : null });
        }).catch(function () { resolve({ ok: false }); });
      });
    },

    signOut: function () {
      return new Promise(function (resolve) {
        if (state.mode === "demo") {
          demoClearSession(); state.session = null; state.user = null;
          fire({ event: "SIGNED_OUT", user: null });
          return resolve({ ok: true });
        }
        if (!client) return resolve({ ok: true });
        client.auth.signOut({ scope: "local" }).then(function () {
          state.session = null; state.user = null;
          resolve({ ok: true });
        }).catch(function () {
          state.session = null; state.user = null;
          resolve({ ok: true });
        });
      });
    },

    /* ------------------------- OAuth providers ------------------------- */
    signInOAuth: function (provider) {
      return new Promise(function (resolve) {
        if (state.mode !== "supabase" || !client) return resolve({ ok: false, errors: ["auth.demoOAuth"] });
        client.auth.signInWithOAuth({
          provider: provider || "google",
          options: { redirectTo: redirectUrl() }
        }).then(function (res) {
          if (res.error) return resolve({ ok: false, errors: [mapError(res.error)] });
          resolve({ ok: true });
        }).catch(function (e) { resolve({ ok: false, errors: [mapError(e)] }); });
      });
    },

    mapError: mapError
  };

  window.AGAuth = AGAuth;

  /* Load the Supabase client library, then start. The script tag in
     index.html calls this; if it fails we stay in "not configured".
     The library is only worth downloading when a project is actually
     configured — an unnecessary 220 KB request would otherwise hold the
     whole page in "loading" every time the CDN is slow or unreachable. */
  AGAuth.boot = function () {
    if (window.supabase) { init(); return; }
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !cfg.SUPABASE_SCRIPT) { init(); return; }
    var s = document.createElement("script");
    var settled = false;
    var done = function () { if (settled) return; settled = true; init(); };
    s.src = cfg.SUPABASE_SCRIPT;
    s.async = true;
    s.onload = done;
    s.onerror = function () { done(); };      /* offline => configured() stays false */
    document.head.appendChild(s);
    /* a stalled CDN must never leave the window stuck loading forever */
    setTimeout(function () {
      if (settled) return;
      try { s.src = ""; if (s.parentNode) s.parentNode.removeChild(s); } catch (e) {}
      done();
    }, 8000);
  };
})();
