/* ============================================================
   Agroscope · fx — hero motion + the field-helper mascot
   Depends on: i18n.js (window.t), app.js (window.__applyI18n)
   ============================================================ */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function t(k) { try { return window.t ? window.t(k) : k; } catch (e) { return k; } }

  /* ----------------------------------------------------------
     1 · HERO — pointer parallax
     ---------------------------------------------------------- */
  function heroMotion() {
    var hero = $(".hero");
    if (!hero) return;
    var fine = !(window.matchMedia && window.matchMedia("(hover: none)").matches);
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    var raf = 0;
    hero.addEventListener("pointermove", function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = hero.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        var y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        hero.style.setProperty("--px", x.toFixed(3));
        hero.style.setProperty("--py", y.toFixed(3));
      });
    });
    hero.addEventListener("pointerleave", function () {
      hero.style.setProperty("--px", "0");
      hero.style.setProperty("--py", "0");
    });
  }

  /* ----------------------------------------------------------
     1b · HERO — ambient video texture
     Decorative footage: it is dropped entirely under reduced motion and
     paused whenever it cannot be seen (hidden tab, scrolled past), so it
     never costs decode on a page that already runs a WebGL globe.
     ---------------------------------------------------------- */
  function heroVideo() {
    var v = $("#heroVideo");
    if (!v) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      try { v.pause(); v.removeAttribute("autoplay"); v.removeAttribute("src"); v.load(); } catch (e) {}
      return;
    }
    function play() {
      if (document.hidden) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    play();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { try { v.pause(); } catch (e) {} } else play();
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) play();
          else { try { v.pause(); } catch (err) {} }
        });
      }, { threshold: 0.05 }).observe(v);
    }
  }

  /* ----------------------------------------------------------
     1c · DECOR — pause offscreen artwork, motion-path fallback
     The hero contours and the #input telemetry motif run a dozen small
     keyframes; once either block scrolls away nothing needs repainting,
     so they are frozen mid-phase and resumed when they come back.
     ---------------------------------------------------------- */
  function decorMotion() {
    var targets = $$(".hero-art, .sec-deco");
    if (!targets.length) return;

    /* progressive enhancement — the deco satellite is drawn on 0,0 and
       placed by offset-path; without motion-path support pin it back
       onto the end of its trajectory so it never sits in the corner */
    if (!(window.CSS && CSS.supports && CSS.supports("offset-path", 'path("M0 0")'))) {
      var sat = $(".sec-deco .d-sat");
      if (sat) sat.setAttribute("transform", "translate(206 46)");
    }

    if (!window.IntersectionObserver) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle("is-idle", !e.isIntersecting);
      });
    }, { threshold: 0 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------
     2 · FIELD HELPER — reacts to input, analysis and results
     ---------------------------------------------------------- */
  var buddy, msgEl, tagEl, artEl, tabEl, bubble, infoEl, mbBox, mbMsg;
  var state = "idle";
  var mbIdx = 0;
  var KEY = { idle: "buddy.idle", typing: "buddy.typing", busy: "buddy.busy", done: "buddy.done" };
  var settleTimer = 0;
  var openInfo = false;

  function resultsReady() {
    var reco = $("#recommend");
    return !!reco && !reco.classList.contains("is-locked");
  }
  function resting() { return resultsReady() ? "done" : "idle"; }
  function stepFor(s) { return s === "busy" ? 3 : s === "done" ? 4 : 1; }

  function paintSteps() {
    if (!infoEl) return;
    var active = stepFor(state);
    $$("li", infoEl).forEach(function (li) {
      var n = parseInt(li.getAttribute("data-step"), 10) || 0;
      li.classList.toggle("on", n === active);
      li.classList.toggle("done", n < active);
    });
  }

  function paint() {
    if (mbMsg) mbMsg.textContent = t("mapbuddy.t" + (mbIdx + 1));
    if (!buddy) return;
    buddy.setAttribute("data-state", state);
    if (tagEl) tagEl.textContent = t("buddy.tag");
    if (msgEl && !openInfo) msgEl.textContent = t(KEY[state] || "buddy.idle");
    paintSteps();
  }

  function setState(s) {
    if (!buddy) return;
    if (s === state) { paint(); return; }
    state = s;
    paint();
    /* replay the bubble entrance so the change feels alive */
    if (bubble) {
      bubble.style.animation = "none";
      void bubble.offsetWidth;
      bubble.style.animation = "";
    }
  }

  function settle() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { setState(resting()); }, 1500);
  }

  /* --- click to open the transitional info panel --- */
  function setOpen(v) {
    openInfo = !!v;
    if (infoEl) {
      infoEl.classList.toggle("open", openInfo);
      infoEl.setAttribute("aria-hidden", openInfo ? "false" : "true");
    }
    if (buddy) buddy.classList.toggle("open", openInfo);
    if (bubble) bubble.setAttribute("aria-expanded", openInfo ? "true" : "false");
    if (openInfo) {
      paintSteps();
      if (msgEl) msgEl.textContent = t(KEY[state] || "buddy.idle");
    } else if (msgEl) {
      msgEl.textContent = t(KEY[state] || "buddy.idle");
    }
  }
  function toggleInfo() { setOpen(!openInfo); }

  function overlayOpen() {
    var ids = ["#authModal", "#dashModal", "#drawer"];
    for (var i = 0; i < ids.length; i++) {
      var el = $(ids[i]);
      if (el && !el.hidden) return true;
    }
    return false;
  }

  var dismissed = false;
  function syncVisibility() {
    if (!buddy || !tabEl) return;
    var hide = dismissed || overlayOpen();
    buddy.classList.toggle("gone", hide);
    /* Only write when the value changes: a same-value `hidden` set still
       queues a mutation record, which re-runs this observer callback and
       starves the event loop (page never reaches `load`). */
    var wantHidden = !hide;
    if (tabEl.hidden !== wantHidden) tabEl.hidden = wantHidden;
    if (hide && openInfo) setOpen(false);
    try {
      if (dismissed) localStorage.setItem("agroscope-buddy", "0");
      else localStorage.removeItem("agroscope-buddy");
    } catch (e) {}
  }

  function wireBuddy() {
    buddy = $("#buddy"); msgEl = $("#buddyMsg"); tagEl = $("#buddyTag");
    artEl = $("#buddyArt"); tabEl = $("#buddyTab");
    bubble = $("#buddyBubble"); infoEl = $("#buddyInfo");
    if (!buddy) return;

    try { dismissed = localStorage.getItem("agroscope-buddy") === "0"; } catch (e) {}

    /* --- reacts to typing in the field form --- */
    var inputSec = $("#input");
    if (inputSec) {
      inputSec.addEventListener("input", function () { setState("typing"); settle(); }, true);
      inputSec.addEventListener("change", function () { setState("typing"); settle(); }, true);
    }

    /* --- reacts to the analysis run --- */
    var loader = $("#loader");
    if (loader && window.MutationObserver) {
      new MutationObserver(function () {
        if (!loader.hidden) { clearTimeout(settleTimer); setState("busy"); }
        else setState(resting());
      }).observe(loader, { attributes: true, attributeFilter: ["hidden"] });
    }
    document.addEventListener("agro:analysis", function () {
      clearTimeout(settleTimer);
      setState("done");
      setTimeout(syncVisibility, 400);
    });
    var runBtn = $("#runBtn");
    if (runBtn) runBtn.addEventListener("click", function () { setState("busy"); });

    /* --- reacts to the results gate unlocking --- */
    if (window.MutationObserver) {
      var reco = $("#recommend");
      if (reco) new MutationObserver(function () {
        if (!reco.classList.contains("is-locked") && state !== "busy") setState("done");
      }).observe(reco, { attributes: true, attributeFilter: ["class"] });
    }

    /* --- click targets: bubble + mascot both open the panel --- */
    if (bubble) bubble.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleInfo();
    });
    if (artEl) {
      artEl.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("#buddyX")) return;
        e.stopPropagation();
        toggleInfo();
      });
      artEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleInfo(); }
      });
    }
    var infoX = $("#buddyInfoX");
    if (infoX) infoX.addEventListener("click", function (e) { e.stopPropagation(); setOpen(false); });

    /* --- dismiss / restore --- */
    var x = $("#buddyX");
    if (x) x.addEventListener("click", function (e) { e.stopPropagation(); dismissed = true; syncVisibility(); });
    if (tabEl) tabEl.addEventListener("click", function () { dismissed = false; syncVisibility(); });

    /* --- close the panel on Escape or an outside click --- */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openInfo) setOpen(false);
      syncVisibility();
    });
    document.addEventListener("click", function (e) {
      var el = e.target;
      if (openInfo && buddy && el && el.closest && !el.closest("#buddy")) setOpen(false);
      if (el && el.closest && el.closest("[data-close]")) setTimeout(syncVisibility, 30);
    });

    if (window.MutationObserver) {
      new MutationObserver(syncVisibility).observe(document.body, {
        subtree: true, attributes: true, attributeFilter: ["hidden"]
      });
    }

    setState(resting());
    syncVisibility();
  }

  /* ----------------------------------------------------------
     2b · SHOBUJ — the map companion, rotating field tips
     ---------------------------------------------------------- */
  function showTip(n, animate) {
    if (!mbMsg) return;
    mbIdx = ((n % 4) + 4) % 4;
    if (animate) {
      mbMsg.classList.remove("tip-in");
      void mbMsg.offsetWidth;
    }
    mbMsg.textContent = t("mapbuddy.t" + (mbIdx + 1));
    if (animate) {
      mbMsg.classList.add("tip-in");
      if (mbBox) {
        mbBox.classList.add("pop");
        clearTimeout(mbBox._pop);
        mbBox._pop = setTimeout(function () { mbBox.classList.remove("pop"); }, 800);
      }
    }
  }

  function wireMapBuddy() {
    mbBox = $("#mapBuddy");
    mbMsg = $("#mbMsg");
    if (!mbBox || !mbMsg) return;

    var advance = function (e) {
      if (e) { e.stopPropagation(); if (e.preventDefault) e.preventDefault(); }
      showTip(mbIdx + 1, true);
    };
    mbBox.addEventListener("click", advance);
    mbBox.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") advance(e);
    });

    setInterval(function () {
      if (document.hidden) return;
      if (mbBox.closest && !mbBox.offsetParent) return;   /* section not on screen */
      showTip(mbIdx + 1, true);
    }, 7000);

    showTip(0, false);
  }

  /* ----------------------------------------------------------
     3 · LANGUAGE — repaint helper copy after the site re-renders
     ---------------------------------------------------------- */
  function wrapI18n() {
    var orig = window.__applyI18n;
    if (typeof orig !== "function" || orig._fxWrapped) return;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
      try { paint(); } catch (e) {}
      return r;
    };
    wrapped._fxWrapped = true;
    window.__applyI18n = wrapped;
  }

  /* ----------------------------------------------------------
     4 · OPTIONAL ARTWORK — drop a GIF/PNG in /assets to override
         assets/mascot-farmer.gif  (teal reactive farmer: dock + result)
         assets/mascot-guide.gif   (yellow explorer: globe companion)
     ---------------------------------------------------------- */
  function tryPng(url, holderSel) {
    var holder = $(holderSel);
    if (!holder) return;
    if (!holder.querySelector("svg")) return;
    var img = new Image();
    img.onload = function () {
      var s = holder.querySelector("svg");
      if (!s) return;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      var cls = s.getAttribute("class");
      if (cls) img.setAttribute("class", cls);
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      if (s.parentNode) s.parentNode.replaceChild(img, s);
    };
    img.src = url;
  }

  /* ---------------------------------------------------------- */
  function init() {
    heroMotion();
    heroVideo();
    decorMotion();
    wireBuddy();
    wireMapBuddy();
    wrapI18n();
    tryPng("assets/mascot-farmer.gif", "#buddyArt");
    tryPng("assets/mascot-farmer.gif", "#recoBuddy .rb-art");
    tryPng("assets/mascot-guide.gif", "#mapBuddy .mb-art");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
