/* ===== Agroscope React · fixed nav + animated hero ===== */
(function () {
  var R = window.React, html = window.Ag.html, h = R.createElement;
  var useState = R.useState, useEffect = R.useEffect, useRef = R.useRef, useMemo = R.useMemo;
  var useI18n = window.AgI18n.use, useStore = window.AgStore.use;
  var Icon = window.AgUI.Icon;

  var NAV = [
    { id: "input", k: "nav.input" }, { id: "geography", k: "nav.geo" },
    { id: "suitability", k: "nav.crops" }, { id: "risk", k: "nav.risk" },
    { id: "rotations", k: "nav.rot" }, { id: "recommend", k: "nav.reco" }, { id: "help", k: "nav.help" }
  ];

  function goto(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains("is-locked") || (el.querySelector && el.querySelector(".gate.is-locked"))) {
      var inp = document.getElementById("input"); if (inp) inp.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function Nav() {
    var i = useI18n(), s = useStore();
    var act = useState("input"), active = act[0], setActive = act[1];
    var prog = useState(0), progress = prog[0], setProgress = prog[1];
    var mob = useState(false), mobileOpen = mob[0], setMobileOpen = mob[1];

    useEffect(function () {
      function onScroll() {
        var hh = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(hh > 0 ? (window.scrollY / hh) * 100 : 0);
      }
      window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
      }, { rootMargin: "-45% 0px -50% 0px" });
      NAV.forEach(function (n) { var el = document.getElementById(n.id); if (el) io.observe(el); });
      return function () { window.removeEventListener("scroll", onScroll); io.disconnect(); };
    }, []);

    function onNav(id) { setMobileOpen(false); goto(id); }
    var initial = s.user ? s.user.name.trim().charAt(0).toUpperCase() : "";

    return html`<header className="topbar">
      <div className="progress" style=${{ width: progress + "%" }}></div>
      <div className="topbar-in">
        <a className="brand" href="#top" onClick=${function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <span className="brand-mark"><${Icon} name="sprout" size=${20} /></span>
          <span className="brand-name">Agroscope</span>
        </a>
        <nav className=${"jumpnav" + (mobileOpen ? " open" : "")}>
          ${NAV.map(function (n) {
            return html`<button key=${n.id} type="button" className=${active === n.id ? "on" : ""} onClick=${function () { onNav(n.id); }}>${i.t(n.k)}</button>`;
          })}
        </nav>
        <div className="top-acts">
          <div className="lang" role="group" aria-label="Language">
            <button type="button" className=${i.lang === "en" ? "on" : ""} onClick=${function () { i.setLang("en"); }}>EN</button>
            <button type="button" className=${i.lang === "bn" ? "on" : ""} onClick=${function () { i.setLang("bn"); }}>বাং</button>
          </div>
          ${s.user
            ? html`<button className="acct-btn in" type="button" onClick=${function () { s.setDashOpen(true); }} title=${s.user.name}>
                <span className="avatar-sm">${initial}</span><span className="acct-name">${s.user.name.split(" ")[0]}</span></button>`
            : html`<button className="acct-btn" type="button" onClick=${function () { s.setAuthModal("login"); }}>
                <${Icon} name="user" size=${15} /><span className="acct-name">${i.t("auth.login")}</span></button>`}
          <button className="nav-burger" type="button" aria-label="Menu" onClick=${function () { setMobileOpen(!mobileOpen); }}><${Icon} name=${mobileOpen ? "close" : "menu"} /></button>
        </div>
      </div>
    </header>`;
  }

  /* ---------- hero animated background ---------- */
  function HeroFx() {
    var motes = useMemo(function () {
      var arr = [];
      for (var n = 0; n < 22; n++) {
        arr.push({ left: (n * 4.6 + (n % 3) * 2) % 100, delay: (n * 0.7) % 9, dur: 9 + (n % 5) * 2.4, r: 1.4 + (n % 4) * 0.7 });
      }
      return arr;
    }, []);
    return html`<div className="hero-fx" aria-hidden="true">
      <div className="orb orb-a"></div><div className="orb orb-b"></div><div className="orb orb-c"></div>
      <svg className="motes" preserveAspectRatio="none">
        ${motes.map(function (m, n) {
          return h("circle", { key: n, cx: m.left + "%", cy: "100%", r: m.r, style: { animationDelay: m.delay + "s", animationDuration: m.dur + "s" } });
        })}
      </svg>
      <div className="hero-vignette"></div>
    </div>`;
  }

  /* ---------- layered field illustration ---------- */
  function HeroArt() {
    return html`<div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 520 420" className="hero-ill">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d4a2a"/><stop offset="1" stopColor="#0e2413"/>
          </linearGradient>
          <linearGradient id="fieldA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7d9a3f"/><stop offset="1" stopColor="#4e7a35"/>
          </linearGradient>
          <linearGradient id="fieldB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c9a24a"/><stop offset="1" stopColor="#a9762f"/>
          </linearGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe9a8"/><stop offset="0.6" stopColor="#f4a24e"/><stop offset="1" stopColor="#f4a24e" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="392" cy="92" r="120" fill="url(#sun)" opacity="0.55"/>
        <circle cx="392" cy="92" r="34" fill="#ffe9a8" opacity="0.9"/>
        <g className="ha-hills">
          <path d="M0 250C90 210 150 232 230 214s150-40 290-10v216H0Z" fill="#16351d"/>
          <path d="M0 286C120 250 210 274 320 256s140-22 200-6v170H0Z" fill="#1d4423"/>
        </g>
        <g className="ha-fields">
          <path d="M0 320L180 292 300 312 520 288v132H0Z" fill="url(#fieldA)"/>
          <path d="M0 356L160 336 340 352 520 332v88H0Z" fill="url(#fieldB)" opacity="0.92"/>
          <g stroke="#0e2413" strokeWidth="1.4" opacity="0.28">
            <path d="M40 332L120 420 M120 320L210 420 M210 312L300 420 M310 312L400 420 M410 300L500 420"/>
          </g>
        </g>
        <g className="ha-sat">
          <rect x="96" y="70" width="30" height="20" rx="4" fill="#dfe6cf"/>
          <rect x="70" y="74" width="22" height="12" rx="2" fill="#5f8fa0"/>
          <rect x="130" y="74" width="22" height="12" rx="2" fill="#5f8fa0"/>
          <path d="M111 90v18" stroke="#dfe6cf" strokeWidth="2"/>
          <path d="M111 108l-26 60M111 108l26 60" stroke="#A3F286" strokeWidth="1.4" opacity="0.5" strokeDasharray="4 5"/>
        </g>
        <g className="ha-pin">
          <path d="M300 250c0-16-13-29-29-29s-29 13-29 29c0 20 29 44 29 44s29-24 29-44Z" fill="#CE6E3D"/>
          <circle cx="271" cy="250" r="11" fill="#FDFEEB"/>
        </g>
      </svg>
    </div>`;
  }

  function Hero() {
    var i = useI18n();
    var heroRef = useRef(null);
    useEffect(function () {
      var hero = heroRef.current; if (!hero) return;
      var fine = !(window.matchMedia && window.matchMedia("(hover: none)").matches);
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!fine || reduce) return;
      var raf = 0;
      function move(e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = hero.getBoundingClientRect();
          var x = ((e.clientX - r.left) / r.width - 0.5) * 2;
          var y = ((e.clientY - r.top) / r.height - 0.5) * 2;
          hero.style.setProperty("--px", x.toFixed(3));
          hero.style.setProperty("--py", y.toFixed(3));
        });
      }
      function leave() { hero.style.setProperty("--px", "0"); hero.style.setProperty("--py", "0"); }
      hero.addEventListener("pointermove", move);
      hero.addEventListener("pointerleave", leave);
      return function () { hero.removeEventListener("pointermove", move); hero.removeEventListener("pointerleave", leave); };
    }, []);

    var btns = [
      { k: "hero.b1", id: "input", primary: true }, { k: "hero.b2", id: "geography" },
      { k: "hero.b3", id: "suitability" }, { k: "hero.b4", id: "risk" },
      { k: "hero.b5", id: "rotations" }, { k: "hero.b6", id: "help" }
    ];
    var stats = [
      { v: "7", k: "hero.stat1" }, { v: "64", k: "hero.stat2" }, { v: "4", k: "hero.stat3" }
    ];
    return html`<section className="hero" id="top" ref=${heroRef}>
      <${HeroFx} />
      <div className="hero-in">
        <div className="hero-copy">
          <span className="eyebrow">${i.t("hero.eyebrow")}</span>
          <h1><span>${i.t("hero.title1")}</span><br/><span className="hl2">${i.t("hero.title2")}</span></h1>
          <p className="hero-lede">${i.t("hero.lede")}</p>
          <div className="hero-btns">
            ${btns.map(function (b) {
              return html`<button key=${b.id} type="button" className=${"btn" + (b.primary ? " primary" : " ghost")}
                onClick=${function () { goto(b.id); }}>${i.t(b.k)}${b.primary ? html`<${Icon} name="arrow" size=${16} />` : null}</button>`;
            })}
          </div>
          <div className="hero-stats">
            ${stats.map(function (st) {
              return html`<div key=${st.k} className="hstat"><b>${i.nfmt(st.v)}</b><span>${i.t(st.k)}</span></div>`;
            })}
          </div>
          <span className="hero-src"><${Icon} name="globe" size=${14} /> ${i.t("hero.src")}</span>
        </div>
        <${HeroArt} />
      </div>
      <button className="scrollhint" type="button" onClick=${function () { goto("input"); }}>
        <span>${i.t("hero.scroll")}</span><i></i>
      </button>
    </section>`;
  }

  window.AgHero = { Nav: Nav, Hero: Hero, goto: goto };
})();