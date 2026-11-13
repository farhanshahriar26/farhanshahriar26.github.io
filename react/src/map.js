/* ===== Agroscope React · interactive SVG Bangladesh map ===== */
(function () {
  var R = window.React, html = window.Ag.html, h = R.createElement;
  var useState = R.useState, useEffect = R.useEffect, useRef = R.useRef;
  var useI18n = window.AgI18n.use, useStore = window.AgStore.use;
  var Icon = window.AgUI.Icon, Seg = window.AgUI.Seg, MapBuddy = window.AgUI.MapBuddy;

  var W = 400, H = 480, LAT0 = 26.7, LAT1 = 20.5, LNG0 = 88.0, LNG1 = 92.7;
  function proj(lat, lng) { return { x: (lng - LNG0) / (LNG1 - LNG0) * W, y: (LAT0 - lat) / (LAT0 - LAT1) * H }; }
  function unproj(x, y) { return { lat: LAT0 - y / H * (LAT0 - LAT1), lng: LNG0 + x / W * (LNG1 - LNG0) }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var COUNTRY = "M40 12C70 30 90 26 110 44C130 60 150 50 168 70C150 96 176 120 168 150C140 160 120 150 96 168C70 186 80 210 60 232C80 258 70 286 92 312C80 344 96 372 124 388C156 372 180 396 210 384C240 404 268 388 292 410C318 398 340 424 362 452C372 424 356 396 372 366C392 340 380 306 396 276C380 244 398 214 376 186C392 158 372 132 344 120C312 104 280 96 248 80C214 64 180 52 148 36C116 22 80 16 40 12Z";

  var EO_COLORS = { ndvi: "#2F6B2C", evi: "#6a9a3d", npwi: "#2F6B52", lai: "#5f8fa0", et: "#7d8f57", lst: "#CE6E3D", sm: "#5b7f9a" };
  var EO_KEYS = ["ndvi", "evi", "npwi", "lai", "et", "lst", "sm"];
  var BLOBS = [
    { x: 150, y: 90, r: 70, o: 0.5 }, { x: 90, y: 180, r: 60, o: 0.42 },
    { x: 200, y: 200, r: 80, o: 0.55 }, { x: 300, y: 160, r: 64, o: 0.4 },
    { x: 250, y: 320, r: 78, o: 0.5 }, { x: 130, y: 320, r: 66, o: 0.45 },
    { x: 350, y: 380, r: 56, o: 0.38 }
  ];

  function MapView() {
    var i = useI18n(), s = useStore();
    var svgRef = useRef(null), wrapRef = useRef(null);
    var vw = useState({ z: 1, x: 0, y: 0 }), view = vw[0], setView = vw[1];
    var viewRef = useRef(view); viewRef.current = view;
    var pk = useState(false), picking = pk[0], setPicking = pk[1];
    var pop = useState(null), popup = pop[0], setPopup = pop[1];
    var drag = useRef(null);

    var layer = s.layer, eoSel = s.eoSel;
    var district = window.DATA.bd.districts[s.form.dist] || window.DATA.bd.districts[0];
    var dpt = proj(district.pos[0], district.pos[1]);

    useEffect(function () {
      function onPick() { setPicking(true); setPopup(null); }
      document.addEventListener("agro:pick", onPick);
      return function () { document.removeEventListener("agro:pick", onPick); };
    }, []);

    /* native non-passive wheel zoom about the pointer */
    useEffect(function () {
      var svg = svgRef.current; if (!svg) return;
      function toUser(e) {
        var ctm = svg.getScreenCTM(); if (!ctm) return null;
        var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        return pt.matrixTransform(ctm.inverse());
      }
      function onWheel(e) {
        e.preventDefault();
        var u = toUser(e); if (!u) return;
        var v = viewRef.current, nz = clamp(v.z * (e.deltaY < 0 ? 1.18 : 0.85), 1, 9);
        var bx = (u.x - v.x) / v.z, by = (u.y - v.y) / v.z;
        setView({ z: nz, x: u.x - bx * nz, y: u.y - by * nz });
      }
      svg.addEventListener("wheel", onWheel, { passive: false });
      return function () { svg.removeEventListener("wheel", onWheel); };
    }, []);

    function toBase(e) {
      var svg = svgRef.current, ctm = svg.getScreenCTM(); if (!ctm) return null;
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      var u = pt.matrixTransform(ctm.inverse()), v = viewRef.current;
      return { x: (u.x - v.x) / v.z, y: (u.y - v.y) / v.z };
    }
    function onDown(e) {
      if (e.button != null && e.button !== 0) return;
      e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
      var v = viewRef.current;
      drag.current = { sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y, moved: false };
    }
    function onMove(e) {
      var d = drag.current; if (!d) return;
      var rect = svgRef.current.getBoundingClientRect(), k = W / rect.width;
      var dx = (e.clientX - d.sx) * k, dy = (e.clientY - d.sy) * k;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      setView(function (v) { return { z: v.z, x: d.ox + dx, y: d.oy + dy }; });
    }
    function onUp(e) {
      var d = drag.current; drag.current = null;
      if (!d || d.moved) return;
      if (!picking) return;
      var b = toBase(e); if (!b) return;
      var ll = unproj(b.x, b.y);
      if (ll.lat < LAT1 - 0.4 || ll.lat > LAT0 + 0.4 || ll.lng < LNG0 - 0.4 || ll.lng > LNG1 + 0.4) { s.showToast("map.outside"); return; }
      s.setMapPin(ll.lat, ll.lng);
      setPicking(false);
    }
    function zoomTo(bx, by, z) { setView({ z: z, x: W / 2 - bx * z, y: H / 2 - by * z }); }
    function zoomBtn(f) {
      var v = viewRef.current, nz = clamp(v.z * f, 1, 9), cx = W / 2, cy = H / 2;
      var bx = (cx - v.x) / v.z, by = (cy - v.y) / v.z;
      setView({ z: nz, x: cx - bx * nz, y: cy - by * nz });
    }
    function reset() { setView({ z: 1, x: 0, y: 0 }); setPopup(null); }

    var eoColor = EO_COLORS[eoSel] || "#2F6B2C";
    var showPins = view.z >= 2;
    var pinPt = s.pin ? proj(s.pin.lat, s.pin.lng) : null;

    var layerOpts = [
      { v: "live", label: i.t("map.live") }, { v: "cover", label: i.t("map.cover") }, { v: "eo", label: i.t("map.eo") }
    ];
    var eoOpts = EO_KEYS.map(function (k) { return { v: k, label: k.toUpperCase() }; });

    return html`<div className="map-wrap" ref=${wrapRef}>
      <div className="map-top">
        <${Seg} options=${layerOpts} value=${layer} onChange=${function (v) { s.setLayer(v); }} />
        ${layer === "eo" ? html`<${Seg} className="eo-seg" options=${eoOpts} value=${eoSel} onChange=${function (v) { s.setEoSel(v); }} />` : null}
      </div>

      <div className=${"map-stage" + (picking ? " picking" : "")}>
        <svg ref=${svgRef} viewBox="0 0 ${W} ${H}" className="bd-map" preserveAspectRatio="xMidYMid meet"
          onPointerDown=${onDown} onPointerMove=${onMove} onPointerUp=${onUp} onPointerLeave=${function () { drag.current = null; }}>
          <defs>
            <clipPath id="bdClip"><path d=${COUNTRY} /></clipPath>
            <radialGradient id="eoGrad"><stop offset="0" stopColor=${eoColor} stopOpacity="0.85" /><stop offset="1" stopColor=${eoColor} stopOpacity="0" /></radialGradient>
            <linearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#cfe0a8" /><stop offset="0.5" stopColor="#a9c47f" /><stop offset="1" stopColor="#8fae6a" />
            </linearGradient>
            <linearGradient id="coverGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7d9a3f" /><stop offset="1" stopColor="#5c7a35" />
            </linearGradient>
          </defs>

          <g transform=${"translate(" + view.x + " " + view.y + ") scale(" + view.z + ")"}>
            <path d=${COUNTRY} fill=${layer === "cover" ? "url(#coverGrad)" : "url(#landGrad)"} stroke="#3D5B45" strokeWidth=${1.4 / view.z} />
            <g clipPath="url(#bdClip)">
              ${layer === "cover" ? html`<g opacity="0.85">
                <ellipse cx="150" cy="120" rx="70" ry="50" fill="#93a862" />
                <ellipse cx="240" cy="240" rx="90" ry="60" fill="#c9a24a" opacity="0.7" />
                <ellipse cx="120" cy="320" rx="60" ry="46" fill="#2F6B52" opacity="0.55" />
                <ellipse cx="320" cy="360" rx="56" ry="44" fill="#5f8fa0" opacity="0.5" />
              </g>` : null}
              ${layer === "eo" ? html`<g>${BLOBS.map(function (b, n) {
                return h("circle", { key: n, cx: b.x, cy: b.y, r: b.r, fill: "url(#eoGrad)", opacity: b.o });
              })}</g>` : null}
              <g className="rivers" fill="none" stroke="#4d8fa8" strokeWidth=${2.4 / view.z} opacity="0.7" strokeLinecap="round">
                <path d="M168 70C176 130 188 180 196 230C200 260 210 300 220 340" />
                <path d="M96 168C140 190 180 210 210 240C240 270 270 320 292 360" />
                <path d="M344 120C320 160 300 200 280 240C260 280 250 330 258 388" />
              </g>
            </g>

            ${window.DATA.bd.divisions.map(function (d, n) {
              var p = proj(d.pos[0], d.pos[1]);
              return html`<g key=${n} className="div-marker" onPointerDown=${function (e) { e.stopPropagation(); }}
                onClick=${function (e) { e.stopPropagation(); zoomTo(p.x, p.y, 3.4); }}>
                <circle cx=${p.x} cy=${p.y} r=${4 / view.z} fill="#112915" opacity="0.8" />
                <text x=${p.x} y=${p.y - 8 / view.z} textAnchor="middle" fontSize=${11 / view.z} fill="#112915" fontWeight="600">${i.T(d.n)}</text>
              </g>`;
            })}

            <g className="sel-ring">
              <circle cx=${dpt.x} cy=${dpt.y} r=${13 / view.z} fill="none" stroke="#CE6E3D" strokeWidth=${2 / view.z} />
              <circle cx=${dpt.x} cy=${dpt.y} r=${13 / view.z} fill="none" stroke="#CE6E3D" strokeWidth=${2 / view.z} className="ring-pulse" />
            </g>

            ${showPins ? window.DATA.mapPins.map(function (mp, n) {
              var p = proj(mp.pos[0], mp.pos[1]);
              return html`<g key=${n} className="map-pin" onPointerDown=${function (e) { e.stopPropagation(); }}
                onClick=${function (e) { e.stopPropagation(); setPopup(mp); }}>
                <circle cx=${p.x} cy=${p.y} r=${6 / view.z} fill=${mp.c} stroke="#FDFEEB" strokeWidth=${1.6 / view.z} />
              </g>`;
            }) : null}

            ${pinPt ? html`<g className="user-pin" transform=${"translate(" + pinPt.x + " " + pinPt.y + ") scale(" + (1 / view.z) + ")"}>
              <path d="M0 0 L-8 -18 A11 11 0 1 1 8 -18 Z" fill="#CE6E3D" stroke="#FDFEEB" strokeWidth="1.6" />
              <circle cx="0" cy="-23" r="4.5" fill="#FDFEEB" />
            </g>` : null}
          </g>
        </svg>

        <div className="map-tools">
          <button type="button" onClick=${function () { zoomBtn(1.3); }} aria-label="Zoom in">+</button>
          <button type="button" onClick=${function () { zoomBtn(0.77); }} aria-label="Zoom out">−</button>
          <button type="button" onClick=${reset} aria-label="Reset view" className="map-reset"><${Icon} name="globe" size=${15} /></button>
        </div>

        <button type="button" className=${"map-pick-btn" + (picking ? " on" : "")} onClick=${function () { setPicking(!picking); setPopup(null); }}>
          <${Icon} name="pin" size=${15} /><span>${picking ? i.t("map.picking") : i.t("map.pick")}</span>
        </button>

        ${popup ? html`<div className="map-popup">
          <button type="button" className="mp-x" onClick=${function () { setPopup(null); }} aria-label=${i.t("ui.close")}><${Icon} name="close" size=${14} /></button>
          <b style=${{ color: popup.c }}>${i.T(popup.name)}</b>
          <p>${i.T(popup.info)}</p>
        </div>` : null}

        <${MapBuddy} />
      </div>

      <div className="map-legend">
        <span className="lg-title">${i.t("ui.legend")}</span>
        ${layer === "eo"
          ? html`<span className="lg-item"><i style=${{ background: eoColor }}></i>${i.t("legend." + eoSel)}</span>
            <span className="lg-ramp">${[0.15, 0.35, 0.55, 0.75, 0.95].map(function (o, n) { return html`<i key=${n} style=${{ background: eoColor, opacity: o }}></i>`; })}</span>`
          : layer === "cover"
            ? html`<span className="lg-item"><i style=${{ background: "#7d9a3f" }}></i>${i.t("legend.cover")}</span>
              <span className="lg-item"><i style=${{ background: "#c9a24a" }}></i>${i.t("legend.soil")}</span>
              <span className="lg-item"><i style=${{ background: "#5f8fa0" }}></i>Water</span>`
            : html`<span className="lg-item"><i style=${{ background: "#CE6E3D" }}></i>${i.t("map.bd")}</span>
              <span className="lg-item"><i style=${{ background: "#4d8fa8" }}></i>Rivers</span>
              <span className="lg-item"><i style=${{ background: "#112915" }}></i>${i.t("dash.district")}</span>`}
      </div>
      <p className="map-hint">${i.t("map.hint")}</p>
    </div>`;
  }

  window.AgMap = { MapView: MapView, proj: proj };
})();