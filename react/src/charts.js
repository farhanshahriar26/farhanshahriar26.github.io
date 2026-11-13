/* ===== Agroscope React · SVG chart kit (ported as components) ===== */
(function () {
  var R = window.React, h = R.createElement;
  var INK = "#112915", MUT = "#3D5B45";
  var uid = 0;
  function nid() { return "g" + (++uid); }

  function Spark(props) {
    var vals = props.vals, color = props.color, hh = props.h || 26;
    var w = 100, mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), r = (mx - mn) || 1;
    var pts = vals.map(function (v, i) {
      return [(i / (vals.length - 1)) * w, hh - 3 - ((v - mn) / r) * (hh - 7)];
    });
    var str = pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    var last = pts[pts.length - 1];
    return h("svg", { viewBox: "0 0 " + w + " " + hh, preserveAspectRatio: "none", "aria-hidden": true },
      h("polyline", { points: str, fill: "none", stroke: color, strokeWidth: 1.6, vectorEffect: "non-scaling-stroke", strokeLinejoin: "round" }),
      h("circle", { cx: w, cy: last[1], r: 2, fill: color }));
  }

  function LineChart(props) {
    var W = 760, H = props.height || 290, L = 48, Rr = 14, T = 18, B = 36;
    var labels = props.labels || [], series = props.series || [];
    var all = [];
    series.forEach(function (s) { all = all.concat(s.values); });
    var mn = props.min != null ? props.min : Math.min.apply(null, all);
    var mx = props.max != null ? props.max : Math.max.apply(null, all);
    var padv = (mx - mn) * 0.18 || 1; mx += padv; if (props.min == null) mn -= padv * 0.6;
    if (props.zero) mn = 0;
    var iw = W - L - Rr, ih = H - T - B;
    function X(i) { return L + (labels.length < 2 ? iw / 2 : (i / (labels.length - 1)) * iw); }
    function Y(v) { return T + ih - ((v - mn) / (mx - mn)) * ih; }
    var els = [];
    for (var k = 0; k <= 4; k++) {
      var v = mn + (mx - mn) * (k / 4), y = Y(v);
      els.push(h("line", { key: "gl" + k, x1: L, y1: y, x2: W - Rr, y2: y, stroke: "rgba(17,41,21,.12)", strokeWidth: 1 }));
      els.push(h("text", { key: "gt" + k, x: L - 8, y: y + 4, textAnchor: "end", fontSize: 11, fill: MUT, opacity: .8 }, (Math.round(v * 10) / 10) + (props.ySuffix || "")));
    }
    labels.forEach(function (l, i) {
      if (labels.length > 8 && i % 2) return;
      els.push(h("text", { key: "xl" + i, x: X(i), y: H - 12, textAnchor: "middle", fontSize: 11, fill: MUT, opacity: .8 }, l));
    });
    series.forEach(function (s, si) {
      if (s.type === "bar") {
        var bw = Math.max(6, iw / labels.length * 0.55);
        s.values.forEach(function (v, i) {
          var x = X(i) - bw / 2, y = Y(Math.max(v, mn)), hh = Math.max(1, T + ih - y);
          els.push(h("rect", { key: "b" + si + "-" + i, x: x, y: y, width: bw, height: hh, rx: 3, fill: s.color, opacity: .9 },
            h("title", null, labels[i] + ": " + v + (props.ySuffix || ""))));
        });
      } else {
        var id = nid();
        var d = s.values.map(function (v, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); }).join(" ");
        if (s.area !== false) {
          els.push(h("defs", { key: "d" + si }, h("linearGradient", { id: id, x1: 0, y1: 0, x2: 0, y2: 1 },
            h("stop", { offset: 0, stopColor: s.color, stopOpacity: .34 }),
            h("stop", { offset: 1, stopColor: s.color, stopOpacity: 0 }))));
          els.push(h("path", { key: "a" + si, d: d + " L" + X(s.values.length - 1).toFixed(1) + " " + (T + ih) + " L" + X(0).toFixed(1) + " " + (T + ih) + " Z", fill: "url(#" + id + ")" }));
        }
        els.push(h("path", { key: "l" + si, d: d, fill: "none", stroke: s.color, strokeWidth: 2.4, strokeLinejoin: "round", strokeLinecap: "round" }));
        s.values.forEach(function (v, i) {
          els.push(h("circle", { key: "h" + si + "-" + i, cx: X(i), cy: Y(v), r: 7, fill: "transparent" },
            h("title", null, labels[i] + ": " + v + (props.ySuffix || ""))));
        });
        var li = s.values.length - 1;
        els.push(h("circle", { key: "e" + si, cx: X(li), cy: Y(s.values[li]), r: 3.6, fill: s.color }));
      }
    });
    return h("svg", { viewBox: "0 0 " + W + " " + H, role: "img", className: "chart-svg" }, els);
  }

  function Radar(props) {
    var W = 380, H = 300, cx = W / 2, cy = H / 2 - 6, Rr = 104;
    var labels = props.labels, vals = props.values, n = labels.length;
    function ang(i) { return (Math.PI * 2 * i) / n - Math.PI / 2; }
    function pt(i, r) { return [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r]; }
    function pstr(i, r) { var p = pt(i, r); return p[0].toFixed(1) + " " + p[1].toFixed(1); }
    var els = [];
    for (var r = 1; r <= 4; r++) {
      var ring = [];
      for (var i = 0; i < n; i++) ring.push(pstr(i, (Rr * r) / 4));
      els.push(h("polygon", { key: "r" + r, points: ring.join(" "), fill: "none", stroke: "rgba(17,41,21,.14)", strokeWidth: 1 }));
    }
    for (var i2 = 0; i2 < n; i2++) {
      var ex = cx + Math.cos(ang(i2)) * Rr, ey = cy + Math.sin(ang(i2)) * Rr;
      els.push(h("line", { key: "s" + i2, x1: cx, y1: cy, x2: ex, y2: ey, stroke: "rgba(17,41,21,.14)" }));
      var lr = Rr + 20, ax = cx + Math.cos(ang(i2)) * lr, ay = cy + Math.sin(ang(i2)) * lr;
      var anch = Math.abs(Math.cos(ang(i2))) < 0.25 ? "middle" : (Math.cos(ang(i2)) > 0 ? "start" : "end");
      els.push(h("text", { key: "t" + i2, x: ax, y: ay + 4, textAnchor: anch, fontSize: 11.5, fill: MUT }, labels[i2]));
    }
    var poly = vals.map(function (v, i) { return pstr(i, (Math.max(4, Math.min(100, v)) / 100) * Rr); });
    els.push(h("polygon", { key: "poly", points: poly.join(" "), fill: props.color, fillOpacity: .26, stroke: props.color, strokeWidth: 2.2, strokeLinejoin: "round" }));
    vals.forEach(function (v, i) {
      var p = pt(i, (Math.max(4, Math.min(100, v)) / 100) * Rr);
      els.push(h("circle", { key: "c" + i, cx: p[0], cy: p[1], r: 3.4, fill: props.color }, h("title", null, labels[i] + ": " + v)));
    });
    return h("svg", { viewBox: "0 0 " + W + " " + H, role: "img", className: "chart-svg" }, els);
  }

  var RAMP = ["#F6FAE6", "#dfe0b6", "#c9cf8a", "#a8a95a", "#7d8b3d", "#5c6b2c"];
  var RAMP_WARN = ["#F6FAE6", "#efd9b6", "#e7bb85", "#d69a58", "#CE6E3D", "#652D2F"];
  function Heat(props) {
    var cols = props.cols, rows = props.rows, LW = props.labelW || 150, CW = (760 - LW - 6) / cols.length, CH = props.cell || 26, HH = 22;
    var ramp = props.warn ? RAMP_WARN : RAMP, els = [];
    cols.forEach(function (c, i) {
      els.push(h("text", { key: "c" + i, x: LW + CW * i + CW / 2, y: 14, textAnchor: "middle", fontSize: 10.5, fill: MUT, opacity: .85 }, c));
    });
    rows.forEach(function (r, ri) {
      var y = HH + ri * (CH + 4);
      els.push(h("text", { key: "rl" + ri, x: 0, y: y + CH / 2 + 4, fontSize: 11.5, fill: MUT }, r.label));
      r.values.forEach(function (v, ci) {
        var x = LW + ci * CW;
        els.push(h("rect", { key: "cell" + ri + "-" + ci, x: x, y: y, width: CW - 3, height: CH, rx: 4, fill: ramp[Math.max(0, Math.min(5, v))] },
          h("title", null, r.label + " · " + cols[ci] + " · " + (props.levelText ? props.levelText(v) : v))));
      });
    });
    var Ht = HH + rows.length * (CH + 4) + 4;
    return h("svg", { viewBox: "0 0 760 " + Ht, role: "img", className: "chart-svg" }, els);
  }

  function Dial(props) {
    var S = props.size || 120, c = S / 2, r = S / 2 - 12, sw = props.sw || 10;
    var pct = Math.max(0, Math.min(1, props.value / (props.max || 100)));
    var circ = Math.PI * r;
    var arc = "M" + (c - r) + " " + c + " A" + r + " " + r + " 0 0 1 " + (c + r) + " " + c;
    return h("svg", { viewBox: "0 0 " + S + " " + (S * 0.66), role: "img", className: "chart-svg" },
      h("path", { d: arc, fill: "none", stroke: props.track || "#EDF5DA", strokeWidth: sw, strokeLinecap: "round" }),
      h("path", { d: arc, fill: "none", stroke: props.color, strokeWidth: sw, strokeLinecap: "round", strokeDasharray: circ, strokeDashoffset: circ * (1 - pct), className: "dial-arc" }),
      h("text", { x: c, y: c - 4, textAnchor: "middle", fontSize: S / 4.6, fontFamily: "Fraunces,Georgia,serif", fill: INK }, props.label),
      props.sub ? h("text", { x: c, y: c + 14, textAnchor: "middle", fontSize: 10, fill: MUT, opacity: .8 }, props.sub) : null);
  }

  function Panels(props) {
    var PW = 170, PH = 168, PAD = 24, BW = 22, items = props.items, n = items.length;
    var mx = Math.max.apply(null, items.map(function (i) { return i.value; })) * 1.12;
    var step = (PW - PAD) / n, els = [];
    els.push(h("text", { key: "ti", x: 0, y: 12, fontSize: 10, fontFamily: "Inter,sans-serif", fill: MUT, letterSpacing: 1 }, props.title));
    els.push(h("line", { key: "base", x1: 0, y1: PH - 22, x2: PW, y2: PH - 22, stroke: "rgba(17,41,21,.2)" }));
    items.forEach(function (it, i) {
      var hh = Math.max(2, (it.value / mx) * (PH - 56));
      var x = PAD / 2 + i * step + (step - BW) / 2, y = PH - 22 - hh;
      els.push(h("rect", { key: "b" + i, x: x, y: y, width: BW, height: hh, rx: 4, fill: it.color, opacity: .92 },
        h("title", null, it.label + ": " + it.value + (it.unit || ""))));
      els.push(h("text", { key: "v" + i, x: x + BW / 2, y: y - 6, textAnchor: "middle", fontSize: 10, fontFamily: "Fraunces,Georgia,serif", fill: INK }, it.value));
      els.push(h("text", { key: "l" + i, x: x + BW / 2, y: PH - 7, textAnchor: "middle", fontSize: 9.5, fill: MUT }, it.label));
    });
    return h("svg", { viewBox: "0 0 " + PW + " " + PH, className: "chart-svg" }, els);
  }

  window.AgChart = { Spark: Spark, LineChart: LineChart, Radar: Radar, Heat: Heat, Dial: Dial, Panels: Panels };
})();