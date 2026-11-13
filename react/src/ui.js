/* ===== Agroscope React · shared UI + reactive GIF mascots ===== */
(function () {
  var R = window.React, html = window.Ag.html, h = R.createElement;
  var useState = R.useState, useEffect = R.useEffect, useRef = R.useRef;
  var useI18n = window.AgI18n.use, useStore = window.AgStore.use;

  /* ---------- icons ---------- */
  var PATHS = {
    leaf: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6",
    pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
    user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M12 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
    close: "M18 6 6 18 M6 6l12 12",
    arrow: "M5 12h14 M12 5l7 7-7 7",
    chart: "M3 3v18h18 M7 16v-5 M12 16V8 M17 16v-8",
    globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3 12h18 M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9Z",
    drop: "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z",
    sprout: "M12 22V9 M12 9C12 5 9 2 5 2c0 4 3 7 7 7Z M12 12c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6Z",
    check: "M20 6 9 17l-5-5",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.3-4.3",
    trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    menu: "M4 6h16 M4 12h16 M4 18h16",
    scan: "M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v2 M7 12h10",
    target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M12 2v3 M12 19v3 M2 12h3 M19 12h3",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z M17 21v-8H7v8 M7 3v5h8",
    sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M12 1v2 M12 21v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M1 12h2 M21 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4"
  };
  function Icon(props) {
    var d = PATHS[props.name] || PATHS.leaf;
    return h("svg", {
      className: "ico" + (props.className ? " " + props.className : ""),
      viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      strokeWidth: props.sw || 1.8, strokeLinecap: "round", strokeLinejoin: "round",
      "aria-hidden": true, width: props.size || 18, height: props.size || 18
    }, d.split(" M").map(function (seg, i) { return h("path", { key: i, d: (i ? "M" : "") + seg }); }));
  }

  /* ---------- reveal on scroll ---------- */
  function useReveal() {
    var ref = useRef(null);
    useEffect(function () {
      var el = ref.current; if (!el) return;
      if (!("IntersectionObserver" in window)) { el.classList.add("in"); return; }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { el.classList.add("in"); io.unobserve(el); } });
      }, { rootMargin: "0px 0px -8% 0px" });
      io.observe(el);
      return function () { io.disconnect(); };
    }, []);
    return ref;
  }
  function Reveal(props) {
    var ref = useReveal();
    return h("div", { ref: ref, className: "rv " + (props.className || ""), style: props.style }, props.children);
  }

  /* ---------- section heading ---------- */
  function SecHead(props) {
    var ref = useReveal();
    return html`<div className="sec-head rv" ref=${ref}>
      <span className="sec-num">${props.num}</span>
      <div><h2>${props.title}</h2>${props.sub ? html`<p className="sec-sub">${props.sub}</p>` : null}</div>
    </div>`;
  }

  /* ---------- segmented control ---------- */
  function Seg(props) {
    return html`<div className=${"seg " + (props.className || "")} role="tablist">
      ${props.options.map(function (o) {
        return html`<button key=${o.v} type="button" role="tab" aria-selected=${props.value === o.v}
          className=${props.value === o.v ? "on" : ""} onClick=${function () { props.onChange(o.v); }}>${o.label}</button>`;
      })}
    </div>`;
  }

  /* ---------- results lock ---------- */
  function Lock() {
    var s = useStore(), i = useI18n();
    return html`<div className="lock">
      <${Icon} name="chart" size=${30} sw=${1.6} />
      <p className="lock-msg">${i.t("ui.lockMsg")}</p>
      <button type="button" className="btn primary" onClick=${s.gotoInputs}>${i.t("f.run")}</button>
    </div>`;
  }
  function Gated(props) {
    var s = useStore();
    return html`<div className=${"gate" + (s.analyzed ? "" : " is-locked")}>
      <div className="gate-body">${props.children}</div>
      ${!s.analyzed ? html`<${Lock} />` : null}
    </div>`;
  }

  /* ---------- toast ---------- */
  function Toast() {
    var s = useStore(), i = useI18n();
    if (!s.toast) return null;
    return html`<div className="toast" role="status">${i.t(s.toast)}</div>`;
  }

  /* ---------- animated bar (fills on mount) ---------- */
  function Bar(props) {
    var st = useState(0), w = st[0], setW = st[1];
    useEffect(function () {
      var id = requestAnimationFrame(function () { setW(props.value); });
      return function () { cancelAnimationFrame(id); };
    }, [props.value]);
    return html`<div className=${"bar " + (props.className || "")}>
      <i className=${props.kind || ""} style=${{ width: w + "%", background: props.color }}></i>
      ${props.target != null ? html`<u style=${{ left: props.target + "%" }}></u>` : null}
    </div>`;
  }

  /* ============================================================
     FIELD HELPER — teal farmer GIF that reacts to input & results
     ============================================================ */
  function stepFor(state) { return state === "busy" ? 3 : state === "done" ? 4 : 1; }
  function Buddy() {
    var s = useStore(), i = useI18n();
    var KEY = { idle: "buddy.idle", typing: "buddy.typing", busy: "buddy.busy", done: "buddy.done" };
    var active = stepFor(s.buddy);
    var overlay = s.authModal || s.dashOpen || s.drawer;
    if (s.buddyDismissed) {
      return html`<button className="buddy-tab" onClick=${function () { s.setBuddyDismissed(false); }}
        aria-label=${i.t("buddy.show")} title=${i.t("buddy.show")}>
        <img src="assets/mascot-farmer.gif" alt="" />
      </button>`;
    }
    return html`<div className=${"buddy" + (s.buddyOpen ? " open" : "") + (overlay ? " gone" : "")} data-state=${s.buddy}>
      <div className="buddy-stack">
        <div className=${"buddy-info" + (s.buddyOpen ? " open" : "")} aria-hidden=${s.buddyOpen ? "false" : "true"}>
          <div className="bi-head"><b>${i.t("buddy.infoTag")}</b>
            <button className="bi-x" type="button" aria-label=${i.t("ui.close")} onClick=${function (e) { e.stopPropagation(); s.setBuddyOpen(false); }}>×</button>
          </div>
          <ol>
            ${[1, 2, 3, 4].map(function (n) {
              return html`<li key=${n} data-step=${n} className=${(n === active ? "on " : "") + (n < active ? "done" : "")}>
                <i className="n">${i.nfmt(n)}</i><p>${i.t("buddy.step" + n)}</p></li>`;
            })}
          </ol>
          <div className="bi-foot">${i.t("buddy.infoFoot")}</div>
        </div>
        <button className="buddy-bubble" type="button" aria-expanded=${s.buddyOpen}
          onClick=${function (e) { e.stopPropagation(); s.setBuddyOpen(!s.buddyOpen); }}>
          <b>${i.t("buddy.tag")}</b>
          <span>${i.t(KEY[s.buddy] || "buddy.idle")}</span>
          <i className="buddy-more"><span>${i.t("buddy.more")}</span>
            <svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 6l5-4 5 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </i>
        </button>
      </div>
      <div className="buddy-art" role="button" tabIndex="0" aria-label=${i.t("buddy.tag")}
        onClick=${function (e) { if (e.target.closest && e.target.closest(".buddy-x")) return; e.stopPropagation(); s.setBuddyOpen(!s.buddyOpen); }}
        onKeyDown=${function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); s.setBuddyOpen(!s.buddyOpen); } }}>
        <img className="m-fig" src="assets/mascot-farmer.gif" alt="" aria-hidden="true" />
        ${s.buddy === "done" ? html`<span className="buddy-confetti" aria-hidden="true">${[0,1,2,3,4,5].map(function(n){return html`<i key=${n} style=${{"--ci":n}}></i>`})}</span>` : null}
        <button className="buddy-x" type="button" aria-label=${i.t("buddy.hide")} title=${i.t("buddy.hide")}
          onClick=${function (e) { e.stopPropagation(); s.setBuddyDismissed(true); s.setBuddyOpen(false); }}>×</button>
      </div>
    </div>`;
  }

  /* ---------- SHOBUJ — yellow explorer GIF, globe companion ---------- */
  function MapBuddy() {
    var i = useI18n();
    var st = useState(0), idx = st[0], setIdx = st[1];
    var boxRef = useRef(null);
    useEffect(function () {
      var id = setInterval(function () {
        if (document.hidden) return;
        var el = boxRef.current;
        if (el && !el.offsetParent) return;
        setIdx(function (x) { return (x + 1) % 4; });
      }, 7000);
      return function () { clearInterval(id); };
    }, []);
    function advance(e) { if (e) { e.stopPropagation(); } setIdx(function (x) { return (x + 1) % 4; }); }
    return html`<div className="map-buddy" ref=${boxRef} role="button" tabIndex="0" onClick=${advance}
      onKeyDown=${function (e) { if (e.key === "Enter" || e.key === " ") advance(e); }} aria-label=${i.t("mapbuddy.tag")}>
      <div className="mb-bubble"><b>${i.t("mapbuddy.tag")}</b><span key=${idx} className="tip-in">${i.t("mapbuddy.t" + (idx + 1))}</span></div>
      <div className="mb-art"><img className="m-fig" src="assets/mascot-guide.gif" alt="" aria-hidden="true" /></div>
    </div>`;
  }

  /* ---------- result payoff buddy ---------- */
  function RecoBuddy() {
    var i = useI18n();
    return html`<div className="reco-buddy">
      <div className="rb-art"><img className="m-fig" src="assets/mascot-farmer.gif" alt="" aria-hidden="true" /></div>
      <div className="rb-txt"><b>${i.t("buddy.readyTag")}</b><p>${i.t("buddy.readyLong")}</p></div>
    </div>`;
  }

  window.AgUI = {
    Icon: Icon, Reveal: Reveal, useReveal: useReveal, SecHead: SecHead, Seg: Seg,
    Lock: Lock, Gated: Gated, Toast: Toast, Bar: Bar, Buddy: Buddy, MapBuddy: MapBuddy, RecoBuddy: RecoBuddy
  };
})();