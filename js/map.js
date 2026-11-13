/* ===== Agroscope · 3D geography map (CesiumJS) ===== */
(function () {
  var viewer = null, host = null, box = null, legendBox = null, fallback = null, zoomBox = null;
  var baseLayer = null, baseWhich = null, eoLayer = null, fieldLine = null;
  var coverPolys = [], dynLabels = [];
  var ready = false, mode = "live", eoKey = "ndvi", lastLang = null, hasTerrain = false;
  /* last mode actually painted — used to fly the camera when the layer the
     user picks is only visible from close up and no pin has been dropped yet */
  var lastMode = null;
  /* flatView mirrors the provider actually installed — we start on the
     ellipsoid, so it starts true. terrainDead latches when ArcGIS refuses a
     tile: one refused elevation tile = one hole punched through the planet,
     so we drop to the ellipsoid for good rather than show a void. */
  var arcgisTerrain = null, flatView = true, terrainTimer = null, terrainDead = false;
  /* real elevation only when genuinely close in; a globe/regional view runs
     on the ellipsoid, which is visually identical at that size */
  var TERRAIN_MAX_H = 500000;

  var CENTER = { lat: 25.6285, lng: 88.6395 };
  var FIELD0 = [[25.6342,88.6312],[25.6348,88.6462],[25.6248,88.6478],[25.6226,88.6338]];
  var EO_BOX0 = { w: 88.610, s: 25.610, e: 88.670, n: 25.648 };
  var COVER0 = [
    { c:"#5c7f4a", o:.34, n:{en:"Vegetation fringe",bn:"গাছপালা বর্ত"}, p:[[25.6445,88.6165],[25.6450,88.6635],[25.6385,88.6635],[25.6380,88.6165]] },
    { c:"#A3F286", o:.5,  n:{en:"Paddy field",bn:"ধান ক্ষেত"}, p:[[25.6380,88.6165],[25.6385,88.6405],[25.6275,88.6405],[25.6272,88.6300],[25.6272,88.6165]] },
    { c:"#c9b06a", o:.46, n:{en:"Upland cropland",bn:"স্থল কৃষিভূমি"}, p:[[25.6385,88.6405],[25.6390,88.6635],[25.6272,88.6635],[25.6272,88.6405]] },
    { c:"#6f8f86", o:.55, n:{en:"Water body / canal",bn:"জলাশয়/খাল"}, p:[[25.6272,88.6165],[25.6272,88.6335],[25.6215,88.6360],[25.6165,88.6270],[25.6165,88.6165]] },
    { c:"#9d7f52", o:.42, n:{en:"Homestead / fallow",bn:"গ্রাম ও পড়ে থাকা জমি"}, p:[[25.6272,88.6335],[25.6272,88.6635],[25.6165,88.6635],[25.6165,88.6270],[25.6215,88.6360]] }
  ];
  var EO_LEG = {
    ndvi:{ lo:0, hi:.9, ramp:"g", k:"legend.ndvi" }, evi:{ lo:0, hi:.8, ramp:"g", k:"legend.evi" },
    npwi:{ lo:0, hi:.7, ramp:"b", k:"legend.npwi" }, lai:{ lo:0, hi:6, ramp:"g", k:"legend.lai" },
    et:{ lo:0, hi:7, ramp:"b", k:"legend.et" }, lst:{ lo:18, hi:44, ramp:"w", k:"legend.lst" },
    sm:{ lo:.05, hi:.45, ramp:"b", k:"legend.sm" }
  };
  var RAMPS = {
    g:["#FAF5DD","#dfe3ae","#b9c877","#88a04a","#54732f","#2f4a22"],
    b:["#FAF5DD","#d8e3d3","#a9cfc4","#74ada6","#487f7c","#2c5754"],
    w:["#FAF5DD","#f0d9a8","#e5ab6a","#d47d3f","#b1552a","#7d3218"]
  };
  var ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";

  /* live geometry — starts from the sample block, moves with the user's pin */
  function cloneRing(r) { return r.map(function (p) { return p.slice(); }); }
  var FIELD = cloneRing(FIELD0);
  var EO_BOX = { w: EO_BOX0.w, s: EO_BOX0.s, e: EO_BOX0.e, n: EO_BOX0.n };
  var COVER = COVER0.map(function (c) { return { c: c.c, o: c.o, n: c.n, p: cloneRing(c.p) }; });
  var PINS = (window.DATA && window.DATA.mapPins) ? window.DATA.mapPins.slice() : [];
  var PLACES = (window.DATA && window.DATA.mapLabels) ? window.DATA.mapLabels.slice() : [];
  var located = false, picking = false;
  function inBD(lat, lng) { return lat >= 20.4 && lat <= 26.9 && lng >= 87.9 && lng <= 92.8; }

  /* ---- label zoom ranges (camera distance, metres) ---- */
  var DH = null;
  function ddc(a, b) { try { return new Cesium.DistanceDisplayCondition(a, b); } catch (e) { return undefined; } }
  function dh() {
    if (!DH) DH = { close: ddc(0, 45000), mid: ddc(0, 260000), town: ddc(0, 950000),
                    dist: ddc(0, 640000), cover: ddc(0, 170000),
                    region: ddc(120000, 5000000), country: ddc(350000, 150000000) };
    return DH;
  }
  var PLACE = {
    local:   { font:"500 11px Inter, sans-serif",  fill:"#16351A", out:"#FEFAE0", ow:3, bg:true,  d:"close" },
    town:    { font:"600 13.5px Inter, sans-serif",fill:"#112915", out:"#FEFAE0", ow:3, bg:true,  d:"town" },
    dist:    { font:"500 10.5px Inter, sans-serif",fill:"#112915", out:"#FEFAE0", ow:3, bg:true,  d:"dist" },
    region:  { font:"600 15px Inter, sans-serif",  fill:"#FEFAE0", out:"#112915", ow:5, bg:false, d:"region" },
    country: { font:"700 23px Inter, sans-serif",  fill:"#FEFAE0", out:"#112915", ow:6, bg:false, d:"country" }
  };

  function pins() { return PINS; }
  function places() { return PLACES; }

  function rampColor(ramp, v) {
    var arr = RAMPS[ramp], x = Math.max(0, Math.min(.9999, v)) * (arr.length - 1);
    var i = Math.floor(x), f = x - i, a = hx(arr[i]), b = hx(arr[i + 1]);
    return "rgb(" + Math.round(a[0]+(b[0]-a[0])*f) + "," + Math.round(a[1]+(b[1]-a[1])*f) + "," + Math.round(a[2]+(b[2]-a[2])*f) + ")";
  }
  function hx(h){ return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]; }
  function rng(seed){ var s = seed; return function(){ s = (s*1664525+1013904223)%4294967296; return s/4294967296; }; }

  /* ---- generated EO raster (one image stretched over the field area) ---- */
  function overlayURL(key) {
    var conf = EO_LEG[key] || EO_LEG.ndvi, c = document.createElement("canvas");
    c.width = c.height = 512;
    var x = c.getContext("2d"), r = rng(key.split("").reduce(function(a,ch){return a+ch.charCodeAt(0)*31;},7));
    x.clearRect(0,0,512,512);
    for (var i = 0; i < 52; i++) {
      var cx = r()*552-20, cy = r()*552-20, rad = 54 + r()*126, v = .12 + r()*.88;
      var g = x.createRadialGradient(cx,cy,0,cx,cy,rad);
      g.addColorStop(0, rampColor(conf.ramp, v));
      g.addColorStop(1, rampColor(conf.ramp, v).replace("rgb(","rgba(").replace(")",",0)"));
      x.fillStyle = g; x.beginPath(); x.arc(cx,cy,rad,0,7); x.fill();
    }
    return c.toDataURL("image/png");
  }

  function legendHTML(m, key) {
    if (m === "cover") {
      var items = COVER.map(function(c){ return '<span style="display:inline-flex;align-items:center;gap:5px;margin-right:9px"><i style="width:10px;height:10px;border-radius:3px;background:' + c.c + ';opacity:.75;display:inline-block"></i>' + window.T(c.n) + '</span>'; }).join("");
      return '<div>' + window.t("ui.legend") + '</div><div style="margin-top:4px">' + items + '</div>';
    }
    if (m === "eo") {
      var cf = EO_LEG[key] || EO_LEG.ndvi, arr = RAMPS[cf.ramp];
      var stops = arr.map(function(c,i){ return c + " " + (i/(arr.length-1)*100).toFixed(0) + "%"; }).join(",");
      return '<div>' + window.t(cf.k) + '</div><div class="ramp" style="background:linear-gradient(90deg,' + stops + ')"></div>' +
        '<div class="ends"><span>' + cf.lo + '</span><span>' + cf.hi + '</span></div>';
    }
    var a = window.__fmt ? window.__fmt(window.DATA.field.area, 1) : window.DATA.field.area;
    return '<div>' + (located ? window.t("ui.mapLive").replace("{a}", a) : window.t("ui.mapArea")) + '</div>';
  }

  /* ---- drawn fallback when Cesium / WebGL is unavailable ---- */
  function areaText() {
    var out = window.DATA.field.area;
    if (window.__fmt) out = window.__fmt(window.DATA.field.area, 1);
    out += " " + (window.t ? window.t("ui.ha") : "ha");
    return out;
  }
  function drawFallback() {
    if (!fallback) return;
    fallback.innerHTML = '<svg viewBox="0 0 800 460" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">' +
      '<rect width="800" height="460" fill="#FAF5DD"/>' +
      '<path d="M0 330 C160 300 300 350 430 325 C560 300 680 340 800 315 L820 460 L-20 460 Z" fill="#E9E1BC"/>' +
      '<path d="M0 390 C170 365 320 405 460 385 C600 365 700 395 800 380 L820 460 L-20 460 Z" fill="#E9E1BC"/>' +
      '<path d="M-10 120 C120 90 190 170 320 150 C450 130 520 60 660 90 C720 103 770 96 810 80" fill="none" stroke="#9fb6c4" stroke-width="14" opacity=".65"/>' +
      '<g stroke="#b7ae90" stroke-width="1.2" fill="none" opacity=".8">' +
      '<path d="M0 210 C140 185 260 235 400 210 C540 185 660 230 800 205"/>' +
      '<path d="M0 265 C150 240 270 288 410 264 C550 240 670 282 800 258"/>' +
      '<path d="M0 155 C130 132 250 178 390 155 C530 132 650 172 800 148"/></g>' +
      '<g stroke="#a89e7d" stroke-width="1"><path d="M120 0 V460"/><path d="M300 0 V460"/><path d="M520 0 V460"/><path d="M690 0 V460"/></g>' +
      '<polygon points="250,140 570,132 590,330 240,340" fill="rgba(254,250,224,.2)" stroke="#16351A" stroke-width="3" stroke-dasharray="9 6"/>' +
      '<text x="300" y="368" font-size="15" fill="#16351A" font-family="Inter,sans-serif">' + areaText() + '</text></svg>';
  }
  function paintFallback() {
    if (!fallback) return;
    var arr = RAMPS[(EO_LEG[eoKey] || EO_LEG.ndvi).ramp];
    if (mode === "eo") {
      var stops = arr.map(function (c, i) { return c + " " + (i / (arr.length - 1) * 100).toFixed(0) + "%"; }).join(",");
      fallback.style.background = "linear-gradient(150deg," + stops + ")";
    } else if (mode === "cover") {
      fallback.style.background = "linear-gradient(160deg,#E9E1BC,#FAF5DD 55%,#E9E1BC)";
    } else {
      fallback.style.background = "linear-gradient(160deg,#b9c39a,#d8d2b8 55%,#c3bda4)";
    }
  }
  function showFallback() {
    ready = false; viewer = null; baseWhich = null;
    if (fallback) { fallback.hidden = false; drawFallback(); paintFallback(); }
    if (host) host.style.display = "none";
    if (zoomBox) zoomBox.style.display = "none";
    var hb = document.getElementById("mapHint"); if (hb) hb.hidden = true;
    var mp = document.getElementById("mapPop"); if (mp) mp.hidden = true;
    var pr = document.getElementById("mapPrompt"); if (pr) pr.hidden = true;
    if (legendBox) legendBox.innerHTML = legendHTML(mode, eoKey);
  }

  /* ---- imagery providers (no API key, no Cesium Ion asset) ---- */
  function providerFor(m) {
    if (m === "cover") {
      return new Cesium.UrlTemplateImageryProvider({
        url: ESRI + "Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        maximumLevel: 18, credit: "Basemap © Esri"
      });
    }
    if (m === "eo-topo") {
      return new Cesium.UrlTemplateImageryProvider({
        url: ESRI + "World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        maximumLevel: 18, credit: "Basemap © Esri"
      });
    }
    return new Cesium.UrlTemplateImageryProvider({
      url: ESRI + "World_Imagery/MapServer/tile/{z}/{y}/{x}",
      maximumLevel: 18, credit: "Imagery © Esri, NASA"
    });
  }
  function setBase(which) {
    if (!viewer) return;
    if (baseWhich === which && baseLayer) return;
    if (baseLayer) { try { viewer.imageryLayers.remove(baseLayer, true); } catch (e) {} baseLayer = null; }
    try { baseLayer = viewer.imageryLayers.addImageryProvider(providerFor(which)); } catch (e) { baseLayer = null; }
    baseWhich = which;
  }
  function clearEo() {
    if (eoLayer && viewer) { try { viewer.imageryLayers.remove(eoLayer, true); } catch (e) {} }
    eoLayer = null;
  }
  function addEo() {
    if (!viewer) return;
    clearEo();
    try {
      eoLayer = viewer.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({
        url: overlayURL(eoKey),
        rectangle: Cesium.Rectangle.fromDegrees(EO_BOX.w, EO_BOX.s, EO_BOX.e, EO_BOX.n),
        hasAlphaChannel: true
      }));
      if (eoLayer) eoLayer.alpha = 0.72;
    } catch (e) { eoLayer = null; }
  }

  /* ---- globe geometry ---- */
  function ringOf(pts, close) {
    var a = [];
    pts.forEach(function (p) { a.push(p[1], p[0]); });
    if (close) { a.push(pts[0][1], pts[0][0]); }
    return a;
  }
  function ringHeights(pts, close, h) {
    var a = [];
    pts.forEach(function (p) { a.push(p[1], p[0], h); });
    if (close) { a.push(pts[0][1], pts[0][0], h); }
    return a;
  }
  function centreOf(pts) {
    var la = 0, ln = 0;
    pts.forEach(function (p) { la += p[0]; ln += p[1]; });
    return { lat: la / pts.length, lng: ln / pts.length };
  }
  function cream() { return Cesium.Color.fromCssColorString("#FEFAE0"); }

  /* label entities are rebuilt on language change (safe: fresh entities) */
  function addLabel(make, always) {
    var o = make();
    if (!always) o.show = (mode === "cover");
    var ent = viewer.entities.add(o);
    dynLabels.push({ make: make, always: always, ent: ent });
    return ent;
  }
  function refreshLabels() {
    if (!viewer) return;
    dynLabels.forEach(function (d) {
      try { viewer.entities.remove(d.ent); } catch (e) {}
      var o = d.make();
      if (!d.always) o.show = (mode === "cover");
      d.ent = viewer.entities.add(o);
    });
  }

  /* terrain-safe heights (Dinajpur ground ≈ 35 m, ×1.2 exaggeration ≈ 42-54 m) */
  var H_COVER = 64, H_FILL = 70, H_LINE = 76, H_MARK = 80, H_PIN_A = 58, H_PIN_B = 150;

  function addPins() {
    var cr = cream();
    pins().forEach(function (p, i) {
      var col = Cesium.Color.fromCssColorString(p.c);
      var base = Cesium.Cartesian3.fromDegrees(p.pos[1], p.pos[0], H_PIN_A);
      var top = Cesium.Cartesian3.fromDegrees(p.pos[1], p.pos[0], H_PIN_B);
      viewer.entities.add({
        id: "pin:" + i + ":mast",
        polyline: { positions: [base, top], width: 2, material: col.withAlpha(0.95) }
      });
      viewer.entities.add({
        id: "pin:" + i + ":dot",
        position: top,
        point: { pixelSize: 9, color: col, outlineColor: cr, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY }
      });
      addLabel(function () {
        return {
          id: "pin:" + i + ":lbl",
          position: top,
          label: {
            text: window.T(p.name), font: "600 11.5px Inter, sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#112915"),
            showBackground: true, backgroundColor: cr.withAlpha(0.93),
            backgroundPadding: new Cesium.Cartesian2(7, 4),
            pixelOffset: new Cesium.Cartesian2(0, -18),
            distanceDisplayCondition: dh().mid,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        };
      }, true);
    });
  }

  function placeLabel(pl, id) {
    var conf = PLACE[pl.k] || PLACE.local;
    return {
      id: id,
      position: Cesium.Cartesian3.fromDegrees(pl.pos[1], pl.pos[0], conf.bg ? H_COVER : 0),
      label: {
        text: window.T(pl.name), font: conf.font,
        fillColor: Cesium.Color.fromCssColorString(conf.fill),
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineColor: Cesium.Color.fromCssColorString(conf.out),
        outlineWidth: conf.ow,
        showBackground: !!conf.bg,
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        backgroundColor: cream().withAlpha(0.86),
        distanceDisplayCondition: dh()[conf.d],
        translucencyByDistance: pl.k === "dist"
          ? new Cesium.NearFarScalar(230000, 1.0, 640000, 0.25) : undefined,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    };
  }

  function addPlaces() {
    /* village names travel with the chosen point */
    places().forEach(function (pl, i) {
      if (pl.k === "local" && !located) return;
      addLabel(function () { return placeLabel(pl, "plc:" + i); }, true);
    });
    /* all 8 divisions + all 64 districts of Bangladesh */
    var bd = (window.DATA && window.DATA.bd) || {};
    (bd.divisions || []).forEach(function (dv, i) {
      var pl = { k: "region", pos: dv.pos, name: dv.n };
      addLabel(function () { return placeLabel(pl, "div:" + i); }, true);
    });
    (bd.districts || []).forEach(function (ds, i) {
      var pl = { k: "dist", pos: ds.pos, name: ds.n };
      addLabel(function () { return placeLabel(pl, "dst:" + i); }, true);
    });
  }

  function addEntities() {
    var c = centreOf(FIELD), cr = cream();

    if (located) {
    viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(ringOf(FIELD, false)),
        material: cr.withAlpha(0.14), height: H_FILL
      }
    });
    fieldLine = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(ringHeights(FIELD, true, H_LINE)),
        width: 3,
        material: new Cesium.PolylineDashMaterialProperty({ color: cr, dashLength: 16 })
      }
    });
    addLabel(function () {
      return {
        id: "pin:field:dot",
        position: Cesium.Cartesian3.fromDegrees(c.lng, c.lat, H_MARK),
        label: {
          text: window.T(window.DATA.field.name) + "\n" + areaText(),
          font: "600 13px Inter, sans-serif",
          fillColor: Cesium.Color.fromCssColorString("#112915"),
          showBackground: true, backgroundColor: cream().withAlpha(0.92),
          backgroundPadding: new Cesium.Cartesian2(9, 5),
          pixelOffset: new Cesium.Cartesian2(0, -24),
          distanceDisplayCondition: dh().mid,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        point: {
          pixelSize: 8, color: Cesium.Color.fromCssColorString("#A3F286"),
          outlineColor: cr, outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      };
    }, true);

    addPins();
    } /* located */

    /* land-cover classes are sample data like the EO box: they belong to the
       "Land cover / soil" tab whether or not a pin has been dropped, so the
       legend and the map always agree. They travel with the pin (setLocation
       rebuilds this), and their labels hide until the camera is close enough
       for them not to pile up on top of each other at country zoom. */
    COVER.forEach(function (cu) {
      coverPolys.push(viewer.entities.add({
        show: false,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(ringOf(cu.p, false)),
          material: Cesium.Color.fromCssColorString(cu.c).withAlpha(cu.o), height: H_COVER
        }
      }));
      var cc = centreOf(cu.p);
      addLabel(function () {
        return {
          show: false,
          position: Cesium.Cartesian3.fromDegrees(cc.lng, cc.lat, H_MARK),
          label: {
            text: window.T(cu.n), font: "500 11px Inter, sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#16351A"),
            showBackground: true, backgroundColor: cream().withAlpha(0.82),
            backgroundPadding: new Cesium.Cartesian2(7, 4),
            distanceDisplayCondition: dh().cover,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        };
      }, false);
    });

    addPlaces();
    lastLang = window.LANG;
  }

  function homePosition() {
    /* no field chosen yet → frame the whole of Bangladesh */
    if (!located) {
      return {
        destination: Cesium.Cartesian3.fromDegrees(90.3, 23.0, 1000000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-78), roll: 0 }
      };
    }
    var c = centreOf(FIELD);
    return {
      destination: Cesium.Cartesian3.fromDegrees(c.lng, c.lat - 0.027, 3000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 }
    };
  }
  function flyHome(instant) {
    if (!viewer) return;
    var v = homePosition();
    try {
      if (instant) viewer.camera.setView(v);
      else viewer.camera.flyTo({ destination: v.destination, orientation: v.orientation, duration: 1.7 });
    } catch (e) {
      try { viewer.camera.setView(v); } catch (e2) {}
    }
  }
  /* frame the sample block the cover / EO overlays are drawn on. Sits south
     of it and looks north, matching homePosition()'s -45° trick, so the whole
     ~6 km overlay lands inside the viewport instead of being sub-pixel. */
  function flyToSample() {
    if (!viewer) return;
    try {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(CENTER.lng, CENTER.lat - 0.044, 7000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
        duration: 1.6
      });
    } catch (e) {}
  }

  /* ---- choose the field location with a pin on the map ---- */
  function fireEvent(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {}
  }
  function updatePrompt() {
    var el = document.getElementById("mapPrompt"); if (!el) return;
    if (picking) { el.textContent = window.t("map.picking"); el.hidden = false; }
    else if (!located) { el.textContent = window.t("map.prompt"); el.hidden = false; }
    else { el.hidden = true; }
  }
  function setPick(on) {
    picking = !!on;
    if (box) box.classList.toggle("picking", picking);
    updatePrompt();
  }
  function rebuild() {
    if (!viewer) return;
    try { viewer.entities.removeAll(); } catch (e) {}
    dynLabels = []; coverPolys = []; fieldLine = null;
    drawEnts = []; previewEnt = null;      /* removeAll took them too */
    addEntities();
    paintDraw();
    setLayer(mode, eoKey);
  }
  function setLocation(lat, lng) {
    if (!inBD(lat, lng)) { fireEvent("agro:pickfail", { reason: "outside" }); return false; }
    var dLat = lat - CENTER.lat, dLng = lng - CENTER.lng;
    CENTER = { lat: lat, lng: lng };
    FIELD = cloneRing(FIELD0).map(function (p) { return [p[0] + dLat, p[1] + dLng]; });
    EO_BOX = { w: EO_BOX0.w + dLng, s: EO_BOX0.s + dLat, e: EO_BOX0.e + dLng, n: EO_BOX0.n + dLat };
    COVER = COVER0.map(function (c) { return { c: c.c, o: c.o, n: c.n, p: cloneRing(c.p).map(function (q) { return [q[0] + dLat, q[1] + dLng]; }) }; });
    PINS = ((window.DATA && window.DATA.mapPins) || []).map(function (p) {
      return { c: p.c, pos: [p.pos[0] + dLat, p.pos[1] + dLng], name: p.name, info: p.info };
    });
    PLACES = ((window.DATA && window.DATA.mapLabels) || []).map(function (pl) {
      if (pl.k !== "local") return pl;
      return { k: pl.k, pos: [pl.pos[0] + dLat, pl.pos[1] + dLng], name: pl.name };
    });
    if (window.DATA && window.DATA.field) window.DATA.field.coord = coordText(lat, lng);
    located = true;
    setPick(false);
    updatePrompt();
    if (viewer) { rebuild(); flyHome(false); }
    fireEvent("agro:location", { lat: lat, lng: lng });
    return true;
  }
  function coordText(lat, lng) {
    return Math.abs(lat).toFixed(3) + "°" + (lat >= 0 ? "N" : "S") + " " +
           Math.abs(lng).toFixed(3) + "°" + (lng >= 0 ? "E" : "W");
  }
  function tryPick(win) {
    if (!viewer) return;
    var scene = viewer.scene, cart = null;
    try { var ray = viewer.camera.getPickRay(win); if (ray) cart = scene.globe.pick(ray, scene); } catch (e) {}
    if (!cart) { try { cart = viewer.camera.pickEllipsoid(win, scene.globe.ellipsoid); } catch (e) {} }
    if (!cart) return;
    var c = Cesium.Cartographic.fromCartesian(cart);
    var lat = Cesium.Math.toDegrees(c.latitude), lng = Cesium.Math.toDegrees(c.longitude);
    if (!inBD(lat, lng)) { fireEvent("agro:pickfail", { reason: "outside" }); return; }
    setLocation(lat, lng);
  }

  /* ---- clickable pointer cards ---- */
  var popKey = null;
  function popData(key) {
    if (key === "field") {
      var f = window.DATA.field;
      return { c: "#A3F286", name: window.T(f.name),
               info: areaText() + " · " + f.coord + " · " + window.T(f.soilType),
               pos: centreOf(FIELD) };
    }
    var p = pins()[Number(key)];
    if (!p) return null;
    return { c: p.c, name: window.T(p.name), info: window.T(p.info), pos: { lat: p.pos[0], lng: p.pos[1] } };
  }
  function showPop(key) {
    var el = document.getElementById("mapPop"); if (!el) return;
    var d = popData(key); if (!d) return;
    popKey = key;
    el.innerHTML = '<button class="pop-x" id="popX" type="button" aria-label="Close">×</button>' +
      '<b><i class="dot" style="background:' + d.c + '"></i>' + d.name + '</b><span>' + d.info + '</span>';
    el.hidden = false;
    var x = document.getElementById("popX");
    if (x) x.onclick = function (ev) { ev.stopPropagation(); hidePop(); };
    repositionPop();
  }
  function hidePop() {
    popKey = null;
    var el = document.getElementById("mapPop"); if (el) el.hidden = true;
  }
  function repositionPop() {
    if (popKey == null || !viewer || !box) return;
    var el = document.getElementById("mapPop"); if (!el || el.hidden) return;
    var d = popData(popKey); if (!d) return;
    var rect = box.getBoundingClientRect();
    var x = rect.width / 2, y = rect.height * 0.7, placed = false;
    try {
      var S = Cesium.SceneTransforms;
      var fn = S && (S.wgs84ToWindowCoordinates || S.worldToWindowCoordinates);
      var s = fn ? fn(viewer.scene, Cesium.Cartesian3.fromDegrees(d.pos.lng, d.pos.lat, H_PIN_B)) : null;
      if (s && isFinite(s.x) && isFinite(s.y)) { x = s.x - rect.left; y = s.y - rect.top - 26; placed = true; }
    } catch (e) {}
    if (placed) {
      x = Math.max(130, Math.min(rect.width - 130, x));
      y = Math.max(64, Math.min(rect.height - 20, y));
    }
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.transform = "translate(-50%,-100%)";
  }
  function wirePicking() {
    try {
      viewer.screenSpaceEventHandler.setInputAction(function (movement) {
        if (draw.on) { if (!draw.closed) drawAddPoint(movement.position); return; }
        if (picking) { tryPick(movement.position); return; }
        var picked = null;
        try { picked = viewer.scene.pick(movement.position); } catch (e) {}
        var ent = picked && picked.id;
        var id = (typeof ent === "string") ? ent : (ent && typeof ent.id === "string" ? ent.id : null);
        if (id && id.indexOf("pin:") === 0) showPop(id.split(":")[1]);
        else hidePop();
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      viewer.scene.postRender.addEventListener(repositionPop);
    } catch (e) {}
  }

  /* ---- public: switch base layer / EO layer ---- */
  function setLayer(m, key) {
    if (m) mode = m;
    if (key) eoKey = key;
    if (legendBox) legendBox.innerHTML = legendHTML(mode, eoKey);
    if (box) box.classList.toggle("eo", mode === "eo");
    if (fallback && fallback.hidden === false) { drawFallback(); paintFallback(); }
    if (!ready || !viewer) return;

    if (window.LANG !== lastLang) {
      lastLang = window.LANG;
      refreshLabels();
      if (popKey != null) showPop(popKey);
      updatePrompt();
      renderDrawPanel();          /* unit names + stats are translated */
      if (draw.on) drawPrompt("draw.on");
      else if (draw.closed) drawPrompt("draw.done");
    }

    setBase(mode === "cover" ? "cover" : (mode === "eo" ? "eo-topo" : "live"));
    if (mode === "eo") addEo(); else clearEo();
    coverPolys.forEach(function (e) { e.show = (mode === "cover"); });
    dynLabels.forEach(function (d) { if (!d.always) d.ent.show = (mode === "cover"); });

    /* only react to a real layer change, and only while no pin is dropped —
       once a location exists the camera already frames the field, and language
       switches / EO sub-tab clicks must not yank the view around */
    var prev = lastMode;
    lastMode = mode;
    if (!located && prev !== null && prev !== mode) {
      if (mode === "live") flyHome(false);
      else if (prev === "live") flyToSample();
    }
    try { if (viewer.scene.requestRender) viewer.scene.requestRender(); } catch (e) {}
  }
  function setEo(key) { setLayer("eo", key); }

  /* ---- public: rebuild labels/legend after data changes (e.g. new land size) ---- */
  function refresh() {
    if (legendBox) legendBox.innerHTML = legendHTML(mode, eoKey);
    if (fallback && fallback.hidden === false) drawFallback();
    if (viewer) refreshLabels();
    if (popKey != null) showPop(popKey);
    try { if (viewer && viewer.scene.requestRender) viewer.scene.requestRender(); } catch (e) {}
  }
  /* ---- public: fly the camera to a division / district ---- */
  function goTo(lat, lng, h) {
    if (!viewer) return;
    try {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, h || 46000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-62), roll: 0 },
        duration: 1.6
      });
    } catch (e) {}
  }

  /* ===================== field drawing =====================
     Click the map to drop corners, watch the preview snap shut, then finish
     to lock the boundary. Area / perimeter / centroid are computed on the
     sphere (not a flat projection) and reported in Acres, Bigha, Hectares
     or square metres. */
  var draw = { on:false, pts:[], unit:"acres", hover:null, closed:false };
  var drawEnts = [], previewEnt = null;
  var UNITS = {
    acres: { m2: 4046.8564224, k: "draw.unitAcres", dp: 2 },
    /* Bangladesh: 1 bigha = 1600 sq yards = 14,400 sq ft ≈ 1337.80 m²
       (and, locally, 1 acre ≈ 3 bigha — which this value reproduces) */
    bigha: { m2: 1337.80484,   k: "draw.unitBigha", dp: 2 },
    ha:    { m2: 10000,        k: "draw.unitHa",    dp: 3 },
    m2:    { m2: 1,            k: "draw.unitM2",    dp: 1 }
  };
  var R_EARTH = 6378137;

  function toRad(d) { return d * Math.PI / 180; }
  function haversine(a, b) {
    var dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  /* spherical polygon area — Chamberlain & Duquette, exact for the
     meridian/parallel case and accurate to well under 0.1% at field scale.
     When turf.js is present we prefer its geodesic area() (spec: compute
     exact area with turf.js), falling back to this implementation offline. */
  function polyAreaM2(pts) {
    /* --- turf.js path (preferred): build a GeoJSON polygon ring --- */
    try {
      if (window.turf && typeof turf.area === "function" && pts.length >= 3) {
        var ring = pts.map(function (p) { return [p[1], p[0]]; }); /* [lng,lat] */
        ring.push(ring[0].slice());                               /* close ring */
        var a = turf.area(turf.polygon([ring]));
        if (isFinite(a) && a > 0) return a;
      }
    } catch (e) { /* fall through to the local geodesic implementation */ }

    var sum = 0, n = pts.length;
    for (var i = 0; i < n; i++) {
      var p = pts[i], q = pts[(i + 1) % n];
      sum += (toRad(q[1]) - toRad(p[1])) * (Math.sin(toRad(p[0])) + Math.sin(toRad(q[0])));
    }
    return Math.abs(sum) * R_EARTH * R_EARTH / 2;
  }
  function polyPerimM(pts) {
    var s = 0, n = pts.length;
    for (var i = 0; i < n; i++) s += haversine(pts[i], pts[(i + 1) % n]);
    return s;
  }
  function polyCentroid(pts) {
    var a = 0, cx = 0, cy = 0, n = pts.length;
    for (var i = 0; i < n; i++) {
      var p = pts[i], q = pts[(i + 1) % n];
      var f = p[1] * q[0] - q[1] * p[0];
      a += f; cx += (p[1] + q[1]) * f; cy += (p[0] + q[0]) * f;
    }
    if (Math.abs(a) < 1e-12) return centreOf(pts);
    a *= 0.5;
    return { lat: cy / (6 * a), lng: cx / (6 * a) };
  }
  function fmtNum(v, dp) {
    var s = v.toFixed(dp), parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
  function fmtLen(m) {
    return m >= 1000 ? fmtNum(m / 1000, 2) + " km" : fmtNum(m, 1) + " m";
  }

  function clearDrawEnts() {
    if (viewer) drawEnts.forEach(function (e) { try { viewer.entities.remove(e); } catch (err) {} });
    drawEnts = []; previewEnt = null;
  }

  /* full repaint of the drawn geometry (points added, cleared, layer rebuilt) */
  function paintDraw() {
    if (!viewer) return;
    clearDrawEnts();
    var n = draw.pts.length, cr = cream();

    if (n >= 3) {
      drawEnts.push(viewer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(ringOf(draw.pts, false)),
          material: Cesium.Color.fromCssColorString("#A3F286").withAlpha(0.3),
          height: H_FILL, outline: false
        }
      }));
      /* border reads as dark evergreen under a terracotta stroke */
      drawEnts.push(viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(ringHeights(draw.pts, true, H_LINE)),
          width: 6, material: Cesium.Color.fromCssColorString("#1E4826")
        }
      }));
      drawEnts.push(viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(ringHeights(draw.pts, true, H_LINE)),
          width: 3, material: Cesium.Color.fromCssColorString("#CE6E3D")
        }
      }));
    } else if (n > 0) {
      var open = [];
      draw.pts.forEach(function (p) { open.push(p[1], p[0], H_LINE); });
      drawEnts.push(viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(open), width: 3,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString("#CE6E3D"), dashLength: 14
          })
        }
      }));
    }

    draw.pts.forEach(function (p, i) {
      drawEnts.push(viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p[1], p[0], H_MARK),
        point: {
          pixelSize: i === 0 ? 10 : 7,
          color: Cesium.Color.fromCssColorString(i === 0 ? "#CE6E3D" : "#1E4826"),
          outlineColor: cr, outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      }));
    });
    updatePreview();
  }

  /* the rubber band from the last corner back to the pointer (and to the
     first corner, so the shape visibly closes before you commit it) */
  function updatePreview() {
    if (!viewer) return;
    if (previewEnt) { try { viewer.entities.remove(previewEnt); } catch (e) {} previewEnt = null; }
    if (!draw.on || draw.closed || !draw.hover || !draw.pts.length) return;
    var chain = draw.pts.slice();
    chain.push(draw.hover);
    if (draw.pts.length >= 3) chain.push(draw.pts[0]);
    var pos = [];
    chain.forEach(function (p) { pos.push(p[1], p[0], H_LINE); });
    previewEnt = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(pos), width: 2, clampToGround: false,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString("#FEFAE0").withAlpha(0.9), dashLength: 12
        })
      }
    });
    drawEnts.push(previewEnt);
  }

  function renderDrawPanel() {
    var panel = document.getElementById("drawPanel");
    if (!panel || panel.hidden) return;
    var n = draw.pts.length;
    var aEl = document.getElementById("dpArea"), pEl = document.getElementById("dpPerim"),
        cEl = document.getElementById("dpCentre"), nEl = document.getElementById("dpPts");
    if (nEl) nEl.textContent = String(n);
    var und = document.getElementById("drawUndo");
    if (und) und.disabled = !n;
    if (n < 3) {
      if (aEl) aEl.textContent = window.t("draw.need3");
      if (pEl) pEl.textContent = "—";
      if (cEl) cEl.textContent = "—";
      var allOff = document.getElementById("dpAll");
      if (allOff) allOff.hidden = true;
      return;
    }
    var u = UNITS[draw.unit] || UNITS.acres;
    var m2 = polyAreaM2(draw.pts), m = polyPerimM(draw.pts), c = polyCentroid(draw.pts);
    if (aEl) aEl.innerHTML = fmtNum(m2 / u.m2, u.dp) + "<small>" + window.t(u.k) + "</small>";
    if (pEl) pEl.textContent = fmtLen(m);
    if (cEl) cEl.textContent = Math.abs(c.lat).toFixed(4) + "°" + (c.lat >= 0 ? "N" : "S") + " " +
                              Math.abs(c.lng).toFixed(4) + "°" + (c.lng >= 0 ? "E" : "W");
    /* simultaneous Acres / Bigha / Hectares — turf-derived area converted live */
    var all = document.getElementById("dpAll");
    if (all) {
      all.hidden = false;
      var set = function (id, unit) {
        var el = document.getElementById(id);
        if (el) el.textContent = fmtNum(m2 / UNITS[unit].m2, UNITS[unit].dp);
      };
      set("dpAcres", "acres"); set("dpBigha", "bigha"); set("dpHa", "ha");
    }
  }

  function drawPrompt(textKey) {
    var el = document.getElementById("mapPrompt");
    if (!el) return;
    if (!textKey) { el.hidden = true; return; }
    el.textContent = window.t(textKey);
    el.hidden = false;
  }

  function setDrawOn(on) {
    draw.on = !!on;
    if (draw.on) { draw.closed = false; setPick(false); hidePop(); }
    if (box) box.classList.toggle("drawing", draw.on);
    var btn = document.getElementById("drawField");
    if (btn) btn.classList.toggle("on", draw.on);
    var panel = document.getElementById("drawPanel");
    if (panel) panel.hidden = !draw.on;
    drawPrompt(draw.on ? "draw.on" : null);
    if (draw.on) renderDrawPanel();
    else { draw.closed = false; updatePreview(); }
    try { if (viewer && viewer.scene.requestRender) viewer.scene.requestRender(); } catch (e) {}
  }

  function drawAddPoint(win) {
    if (!viewer) return;
    var cart = null;
    try { var ray = viewer.camera.getPickRay(win); if (ray) cart = viewer.scene.globe.pick(ray, viewer.scene); } catch (e) {}
    if (!cart) { try { cart = viewer.camera.pickEllipsoid(win, viewer.scene.globe.ellipsoid); } catch (e) {}
    }
    if (!cart) return;
    var c = Cesium.Cartographic.fromCartesian(cart);
    var lat = Cesium.Math.toDegrees(c.latitude), lng = Cesium.Math.toDegrees(c.longitude);
    if (!inBD(lat, lng)) { fireEvent("agro:pickfail", { reason: "outside" }); return; }
    draw.pts.push([lat, lng]);
    draw.closed = false;
    paintDraw();
    renderDrawPanel();
    fireEvent("agro:drawpoint", { n: draw.pts.length });
  }

  function drawMove(win) {
    if (!viewer || !draw.on || draw.closed) return;
    var cart = null;
    try { var ray = viewer.camera.getPickRay(win); if (ray) cart = viewer.scene.globe.pick(ray, viewer.scene); } catch (e) {}
    if (!cart) { try { cart = viewer.camera.pickEllipsoid(win, viewer.scene.globe.ellipsoid); } catch (e) {}
    }
    if (!cart) return;
    var c = Cesium.Cartographic.fromCartesian(cart);
    var h = [Cesium.Math.toDegrees(c.latitude), Cesium.Math.toDegrees(c.longitude)];
    if (draw.hover && Math.abs(h[0] - draw.hover[0]) < 1e-7 && Math.abs(h[1] - draw.hover[1]) < 1e-7) return;
    draw.hover = h;
    updatePreview();
    try { if (viewer.scene.requestRender) viewer.scene.requestRender(); } catch (e) {}
  }

  function drawFinish() {
    if (draw.pts.length < 3) { drawPrompt("draw.need3"); return; }
    draw.closed = true;
    draw.hover = null;
    paintDraw();
    renderDrawPanel();
    drawPrompt("draw.done");
    flyToDraw();
    fireEvent("agro:drawn", {
      area_m2: polyAreaM2(draw.pts), perimeter_m: polyPerimM(draw.pts),
      centroid: polyCentroid(draw.pts), points: draw.pts.length
    });
  }

  function flyToDraw() {
    if (!viewer || draw.pts.length < 3) return;
    try {
      var cs = draw.pts.map(function (p) { return Cesium.Cartesian3.fromDegrees(p[1], p[0], H_FILL); });
      var bs = Cesium.BoundingSphere.fromPoints(cs);
      viewer.camera.flyToBoundingSphere(bs, {
        duration: 1.6,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-48), Math.max(bs.radius * 4.5, 430))
      });
    } catch (e) {}
  }

  function drawClear() {
    draw.pts = []; draw.hover = null; draw.closed = false;
    paintDraw();
    renderDrawPanel();
    drawPrompt(draw.on ? "draw.on" : null);
    fireEvent("agro:drawclear", {});
  }

  /* drop the most recent corner — one mis-click should not cost the whole
     shape. Also reopens a finished boundary so it can be edited again. */
  function drawUndo() {
    if (!draw.pts.length) return;
    draw.pts.pop();
    draw.hover = null;
    draw.closed = false;
    paintDraw();
    renderDrawPanel();
    drawPrompt(draw.on ? (draw.pts.length === 2 ? "draw.need3" : "draw.on") : null);
    try { if (viewer && viewer.scene.requestRender) viewer.scene.requestRender(); } catch (e) {}
    fireEvent("agro:drawundo", { n: draw.pts.length });
  }

  function wireDraw() {
    var btn = document.getElementById("drawField");
    if (btn) btn.addEventListener("click", function () { setDrawOn(!draw.on); });

    var finish = document.getElementById("drawFinish");
    if (finish) finish.addEventListener("click", drawFinish);
    var clr = document.getElementById("drawClear");
    if (clr) clr.addEventListener("click", function () { drawClear(); });
    var und = document.getElementById("drawUndo");
    if (und) und.addEventListener("click", drawUndo);
    var red = document.getElementById("drawRedraw");
    if (red) red.addEventListener("click", function () {
      draw.pts = []; draw.hover = null; draw.closed = false;
      if (!draw.on) setDrawOn(true); else { drawPrompt("draw.on"); paintDraw(); renderDrawPanel(); }
    });
    var x = document.getElementById("drawClose");
    if (x) x.addEventListener("click", function () { setDrawOn(false); });

    var units = document.getElementById("drawUnits");
    if (units) units.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("button[data-unit]") : null;
      if (!b) return;
      draw.unit = b.getAttribute("data-unit");
      Array.prototype.forEach.call(units.querySelectorAll("button"), function (o) {
        o.classList.toggle("on", o === b);
      });
      renderDrawPanel();
    });

    /* double-click commits the shape; Cesium's own double-click zoom is
       removed while drawing so it cannot fight the gesture */
    if (viewer && viewer.screenSpaceEventHandler) {
      try {
        viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      } catch (e) {}
      viewer.screenSpaceEventHandler.setInputAction(function () {
        if (draw.on && !draw.closed && draw.pts.length >= 3) drawFinish();
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      viewer.screenSpaceEventHandler.setInputAction(function (m) {
        if (draw.on && !draw.closed) drawMove(m.endPosition);
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
  }

  function wireZoom() {
    zoomBox = document.getElementById("mapZoom");
    var zi = document.getElementById("zoomIn"), zo = document.getElementById("zoomOut"),
        zh = document.getElementById("zoomHome"), zg = document.getElementById("zoomGlobe");
    if (!zi || !zo) return;
    var MAXH = 100000000; /* 100,000 km — far enough to see the whole Earth in space */
    var step = function (dir) {
      if (!viewer) return;
      var h = 3000;
      try { h = viewer.camera.positionCartographic.height; } catch (e) {}
      if (!isFinite(h)) { flyHome(true); return; }
      if (dir < 0 && h > MAXH) return;
      if (dir > 0 && h < 260) return;
      var mag = Math.max(150, h * 0.38);
      try { if (dir > 0) viewer.camera.zoomIn(mag); else viewer.camera.zoomOut(mag); } catch (e) {}
    };
    zi.onclick = function () { step(1); };
    zo.onclick = function () { step(-1); };
    if (zh) zh.onclick = function () { flyHome(false); };
    if (zg) zg.onclick = function () {
      if (!viewer) return;
      try {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(CENTER.lng, 24.5, 24000000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
          duration: 2.2
        });
      } catch (e) {}
    };
  }

  function init(hostEl, legendEl) {
    host = hostEl; legendBox = legendEl;
    box = (host && host.closest) ? host.closest(".map-box") : document.querySelector(".map-box");
    fallback = document.getElementById("mapFallback");
    if (legendBox) legendBox.innerHTML = legendHTML(mode, eoKey);
    wireZoom();

    if (!window.Cesium) { showFallback(); return; }
    try {
      if (Cesium.Ion) Cesium.Ion.defaultAccessToken = "";
      viewer = new Cesium.Viewer(host, {
        baseLayer: false,
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        animation: false, timeline: false, baseLayerPicker: false, geocoder: false,
        homeButton: false, sceneModePicker: false, navigationHelpButton: false,
        fullscreenButton: false, infoBox: false, selectionIndicator: false,
        shouldAnimate: false
      });
      if (viewer.imageryLayers.length) viewer.imageryLayers.removeAll();
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#E9E1BC");
      try { viewer.scene.globe.showGroundAtmosphere = true; } catch (e) {}
      /* --- make it feel like a real 3D planet: sun shading + fixed noon light --- */
      try {
        viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2026-03-10T06:30:00Z");
        viewer.clock.shouldAnimate = false;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.terrainExaggeration = 1.2;
        if (viewer.scene.fog) viewer.scene.fog.enabled = true;
      } catch (e) {}
      /* --- real 3D terrain (free ArcGIS world elevation, no token needed) ---
         Terrain is only attached while zoomed in. At globe or regional scale a
         single missing elevation tile — the deep Bay of Bengal has none —
         punches a star-filled black hole straight through the planet, because
         the hole shows space rather than the sand-coloured globe base colour.
         The far view therefore always renders on the ellipsoid, which is
         visually identical at that size but can never develop a gap. */
      function syncTerrain(force) {
        if (!viewer) return;
        var h = NaN;
        try { h = viewer.camera.positionCartographic.height; } catch (e) {}
        var wantFlat = terrainDead || !isFinite(h) || h > TERRAIN_MAX_H || !arcgisTerrain;
        if (!force && wantFlat === flatView) return;
        flatView = wantFlat;
        try {
          viewer.terrainProvider = (wantFlat || !arcgisTerrain)
            ? new Cesium.EllipsoidTerrainProvider()
            : arcgisTerrain;
        } catch (e) {}
      }
      function scheduleTerrain() {
        if (terrainTimer) return;
        terrainTimer = setTimeout(function () { terrainTimer = null; syncTerrain(false); }, 140);
      }
      window.__syncTerrain = syncTerrain;

      /* --- backstop: a hole shows space through the planet, so scan the
             globe and retire 3D terrain the moment one is actually visible.
             Pick against the mathematical ellipsoid first: if the ellipsoid
             is there but the rendered surface is not, that pixel is a hole.
             One miss can simply be a tile still arriving, so it takes a run
             of them before we give up the relief for a flat, gap-free globe. */
      var holeStreak = 0, lastHoleCheck = 0;
      function killTerrain() {
        if (terrainDead) return;
        terrainDead = true; hasTerrain = false; arcgisTerrain = null;
        try { if (viewer) syncTerrain(true); } catch (e) {}
      }
      function holeWatch() {
        if (!viewer || terrainDead || flatView) return;
        var scene = viewer.scene, cv = scene && scene.canvas;
        if (!cv || !cv.getBoundingClientRect) return;
        var cr = cv.getBoundingClientRect();
        if (!cr || !cr.width || !cr.height) return;
        var pts = [[cr.width * .5, cr.height * .45], [cr.width * .34, cr.height * .36],
                   [cr.width * .66, cr.height * .36], [cr.width * .5,  cr.height * .66]];
        var bad = false;
        for (var i = 0; i < pts.length; i++) {
          var win = new Cesium.Cartesian2(pts[i][0], pts[i][1]);
          var onEllipsoid = null;
          try { onEllipsoid = scene.camera.pickEllipsoid(win, scene.globe.ellipsoid); } catch (e) {}
          if (!onEllipsoid) continue;                       /* that pixel is sky */
          var hit = null;
          try { var ray = scene.camera.getPickRay(win); if (ray) hit = scene.globe.pick(ray, scene); } catch (e) {}
          if (!hit) { bad = true; break; }
        }
        if (!bad) { holeStreak = 0; return; }
        holeStreak++;
        if (holeStreak >= 3) killTerrain();
      }
      try {
        setInterval(function () {
          try {
            var now = Date.now();
            if (now - lastHoleCheck < 1500) return;
            lastHoleCheck = now;
            holeWatch();
          } catch (e) {}
        }, 1600);
      } catch (e) {}

      try {
        var AG = Cesium.ArcGISTiledElevationTerrainProvider;
        var turl = "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer";
        var gotTerrain = function (tp) {
          if (!viewer || !tp) return;
          try {
            /* a refused elevation tile renders as a hole straight through the
               globe, so the first error retires 3D terrain for the session */
            if (!tp._agroHooked) {
              var errEvt = tp.errorEvent || tp._errorEvent;
              if (errEvt && errEvt.addEventListener) {
                tp._agroHooked = true;
                errEvt.addEventListener(function () { killTerrain(); });
              }
            }
            arcgisTerrain = tp; hasTerrain = true; syncTerrain(true);
          } catch (e) {}
        };
        if (AG) {
          if (AG.fromUrl) AG.fromUrl(turl).then(gotTerrain).catch(function () {});
          else { try { gotTerrain(new AG({ url: turl })); } catch (e) {} }
        }
      } catch (e) {}
      try {
        viewer.camera.percentageChanged = 0.02;
        viewer.camera.changed.addEventListener(scheduleTerrain);
      } catch (e) {}
      try {
        var ssc = viewer.scene.screenSpaceCameraController;
        ssc.minimumZoomDistance = 120;
        ssc.maximumZoomDistance = 100000000;
      } catch (e) {}
      /* self-heal: if the camera goes invalid or ends up underground, snap back */
      setInterval(function () {
        if (!viewer) return;
        var p = viewer.camera.position;
        if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) { flyHome(true); return; }
        try {
          var h = viewer.camera.positionCartographic.height;
          if (isFinite(h) && h < 0) flyHome(true);
          else syncTerrain(false);
        } catch (e) {}
      }, 1500);
      addEntities();
      wirePicking();
      wireDraw();
      ready = true;
      setLayer(mode, eoKey);
      updatePrompt();
      flyHome();
      setTimeout(function () { try { viewer.resize(); } catch (e) {} }, 260);
      setTimeout(function () { try { viewer.resize(); } catch (e) {} }, 1400);
    } catch (e) {
      showFallback();
    }
  }

  window.MAP = {
    init: init,
    viewer: function () { return viewer; },
    setLayer: setLayer,
    setEo: setEo,
    pickMode: setPick,
    setLocation: setLocation,
    refresh: refresh,
    goTo: goTo,
    draw: {
      on: function (v) { if (v === undefined) return draw.on; setDrawOn(v); },
      add: function (lat, lng) { draw.pts.push([lat, lng]); paintDraw(); renderDrawPanel(); },
      finish: drawFinish,
      clear: function () { drawClear(); },
      unit: function (u) { if (u && UNITS[u]) draw.unit = u; renderDrawPanel(); return draw.unit; },
      points: function () { return draw.pts.map(function (p) { return p.slice(); }); },
      area: function () { return draw.pts.length >= 3 ? polyAreaM2(draw.pts) : null; },
      perimeter: function () { return draw.pts.length >= 3 ? polyPerimM(draw.pts) : null; },
      centroid: function () { return draw.pts.length >= 3 ? polyCentroid(draw.pts) : null; },
      units: function () { return Object.keys(UNITS); },
      entityCount: function () { return drawEnts.length; }
    },
    state: function () {
      var cam = null;
      try {
        var p = viewer.camera.positionCartographic;
        cam = { lon: +Cesium.Math.toDegrees(p.longitude).toFixed(3), lat: +Cesium.Math.toDegrees(p.latitude).toFixed(3), h: Math.round(p.height) };
      } catch (e) {}
      return {
        cesium: !!window.Cesium, ready: ready, mode: mode, eo: eoKey,
        layers: viewer ? viewer.imageryLayers.length : 0,
        entities: viewer ? viewer.entities.values.length : 0,
        labels: dynLabels.length, pins: pins().length, terrain: (hasTerrain && !terrainDead),
        located: located, picking: picking,
        drawing: draw.on, drawPts: draw.pts.length, drawUnit: draw.unit,
        cam: cam
      };
    }
  };
})();
