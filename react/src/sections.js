/* ===== Agroscope React · result sections, drawer, footer ===== */
(function () {
  var R = window.React, html = window.Ag.html, h = R.createElement;
  var useState = R.useState;
  var useI18n = window.AgI18n.use, useStore = window.AgStore.use;
  var Icon = window.AgUI.Icon, SecHead = window.AgUI.SecHead, Seg = window.AgUI.Seg;
  var Reveal = window.AgUI.Reveal, Gated = window.Gated || window.AgUI.Gated, Bar = window.AgUI.Bar;
  var RecoBuddy = window.AgUI.RecoBuddy;
  var C = window.AgChart, MapView = window.AgMap.MapView;
  var PRIO = window.AgStore.PRIO, ROT_COLORS = window.AgStore.ROT_COLORS;
  var rotById = window.AgStore.rotById, matchOf = window.AgStore.matchOf, riskWord = window.AgStore.riskWord;

  /* ---------- 12-month crop calendar ---------- */
  function Calendar(props) {
    var i = useI18n(), months = i.months();
    return html`<div className="cal">
      <div className="cal-months">${months.map(function (m, n) { return html`<span key=${n}>${m}</span>`; })}</div>
      ${props.cal.map(function (row, n) {
        return html`<div className="cal-row" key=${n}>
          <div className="cal-bar" style=${{ gridColumn: (row.s + 1) + " / " + (row.e + 2), background: row.col }}>
            <span>${i.T(row.c)}</span>
          </div>
        </div>`;
      })}
    </div>`;
  }

  /* ---------- EO strip ---------- */
  function EOStrip() {
    var i = useI18n();
    return html`<div className="eo-strip">
      ${window.DATA.eo.map(function (m) {
        var up = m.up >= 0;
        return html`<div className="eo-item" key=${m.k}>
          <div className="eo-k">${m.k}</div>
          <div className="eo-v">${i.nfmt(m.v, m.d)}${m.u ? html`<small>${m.u}</small>` : null}</div>
          <${C.Spark} vals=${m.s} color=${m.color} h=${28} />
          <div className=${"eo-trend" + (up ? "" : " down")}>${up ? "▲" : "▼"} ${i.nfmt(Math.abs(m.up))}% · ${i.T(m.name)}</div>
        </div>`;
      })}
    </div>`;
  }

  /* ---------- climate ---------- */
  function ClimateCard() {
    var i = useI18n(), s = useStore(), D = window.DATA, Cl = D.climate, mode = s.clim;
    var ySuf = "", series = [];
    if (mode === "temp") { ySuf = "°C"; series = [{ name: i.t("geo.temp"), values: Cl.temp, color: "#CE6E3D" }]; }
    else if (mode === "hum") { ySuf = "%"; series = [{ name: i.t("geo.hum"), values: Cl.hum, color: "#5f8fa0" }]; }
    else { ySuf = "mm"; series = [{ name: i.t("geo.rain"), values: Cl.rain, color: "#2F6B52", type: "bar" }]; }
    var Rd = Cl.readout;
    var opts = [{ v: "temp", label: i.t("geo.temp") }, { v: "hum", label: i.t("geo.hum") }, { v: "rain", label: i.t("geo.rain") }];
    return html`<div className="card climate-card">
      <div className="card-head"><h3><${Icon} name="sun" size=${16} /> ${i.t("geo.climate")}</h3>
        <${Seg} options=${opts} value=${mode} onChange=${function (v) { s.setClim(v); }} /></div>
      <${C.LineChart} labels=${i.months()} series=${series} ySuffix=${ySuf} height=${280} zero=${mode === "rain"} />
      <div className="clim-readout">
        <div><span className="k">${i.t("clim.max")}</span><b>${i.nfmt(Rd.max, 1)}<small>°C</small></b></div>
        <div><span className="k">${i.t("clim.min")}</span><b>${i.nfmt(Rd.min, 1)}<small>°C</small></b></div>
        <div><span className="k">${i.t("clim.rain")}</span><b>${i.nfmt(Rd.annual)}<small>mm</small></b></div>
        <div><span className="k">${i.t("clim.hum")}</span><b>${i.nfmt(Rd.humMean)}<small>%</small></b></div>
      </div>
    </div>`;
  }

  function HazardCard() {
    var i = useI18n(), rows = window.DATA.hazard.rows;
    var LV = [{ en: "None", bn: "নেই" }, { en: "Low", bn: "কম" }, { en: "Moderate", bn: "মাঝারি" }, { en: "High", bn: "উচ্চ" }, { en: "Very high", bn: "খুব উচ্চ" }, { en: "Severe", bn: "তীব্র" }];
    var heatRows = rows.map(function (r) { return { label: i.lang === "bn" ? r.bn : r.k, values: r.v }; });
    return html`<div className="card hazard-card">
      <div className="card-head"><h3><${Icon} name="chart" size=${16} /> ${i.t("geo.hazard")}</h3></div>
      <${C.Heat} cols=${i.months()} rows=${heatRows} warn=${true} cell=${30} labelW=${150}
        levelText=${function (v) { return i.T(LV[Math.max(0, Math.min(5, v))]); }} />
    </div>`;
  }

  /* ---------- soil ---------- */
  function SoilCard() {
    var i = useI18n(), soil = window.DATA.soil;
    var total = soil.profile.reduce(function (a, p) { return a + p.h; }, 0);
    var dialColor = { N: "#2F6B2C", P: "#CE6E3D", K: "#5f8fa0" };
    return html`<div className="card soil-card">
      <div className="card-head"><h3><${Icon} name="drop" size=${16} /> ${i.t("geo.soil")}</h3>
        <span className="src-tag">${i.t("geo.soilSrc")}</span></div>
      <div className="soil-body">
        <div className="soil-profile">
          ${soil.profile.map(function (p, n) {
            return html`<div className="sp-layer" key=${n} style=${{ height: (p.h / total * 100) + "%", background: p.c }}>
              <span>${i.T(p.lbl)}</span></div>`;
          })}
        </div>
        <div className="soil-bars">
          ${soil.bars.map(function (b, n) {
            var col = b.s === "warn" ? "#CE6E3D" : "#2F6B52";
            var dec = b.v < 1 ? 2 : (b.v % 1 ? 1 : 0);
            return html`<div className="soil-bar" key=${n}>
              <div className="sb-top"><span>${i.T(b.k)}</span><b>${i.nfmt(b.v, dec)}<small>${b.u}</small></b></div>
              <${Bar} value=${b.pct} target=${b.target} color=${col} kind=${b.s} />
              <span className=${"sb-note " + b.s}>${i.T(b.note)}</span>
            </div>`;
          })}
        </div>
      </div>
      <div className="soil-dials">
        ${soil.dials.map(function (d) {
          return html`<div className="sdial" key=${d.k}>
            <${C.Dial} value=${d.v} max=${100} color=${dialColor[d.k]} label=${i.nfmt(d.v)} sub=${d.k} size=${110} sw=${9} />
            <span>${i.T(d.name)}</span>
          </div>`;
        })}
      </div>
    </div>`;
  }

  /* ---------- geography ---------- */
  function Geography() {
    var i = useI18n();
    return html`<section className="section" id="geography">
      <${SecHead} num="02" title=${i.t("sec.geo")} sub=${i.t("sec.geoSub")} />
      <${Gated}>
        <${Reveal}><${EOStrip} /><//>
        <div className="geo-grid">
          <${Reveal} className="geo-map"><${MapView} /><//>
          <${Reveal} className="geo-side"><${ClimateCard} /><//>
        </div>
        <div className="geo-grid2">
          <${Reveal}><${SoilCard} /><//>
          <${Reveal}><${HazardCard} /><//>
        </div>
      <//>
    </section>`;
  }

  /* ---------- crop suitability ---------- */
  function Crops() {
    var i = useI18n(), s = useStore();
    var crops = window.DATA.crops.slice().sort(function (a, b) { return b.sc - a.sc; });
    var sel = null; crops.forEach(function (c) { if (c.id === s.cropSel) sel = c; });
    if (!sel) sel = crops[0];
    var labels = window.DATA.factorLabels.map(function (f) { return i.T(f); });
    return html`<section className="section" id="suitability">
      <${SecHead} num="03" title=${i.t("sec.crops")} sub=${i.t("sec.cropsSub")} />
      <${Gated}>
        <div className="crop-split">
          <${Reveal} className="crop-list">
            ${crops.map(function (c, n) {
              var on = c.id === sel.id;
              return html`<button type="button" key=${c.id} className=${"crop-row" + (on ? " on" : "")}
                onClick=${function () { s.setCropSel(c.id); }}>
                <span className="crop-rank">${i.nfmt(n + 1)}</span>
                <span className="crop-main"><b>${i.T(c.name)}</b><small>${i.T(c.season)}</small>
                  <${Bar} value=${c.sc} color=${on ? "#2F6B2C" : "#7d8f57"} /></span>
                <span className="crop-sc">${i.nfmt(c.sc)}</span>
              </button>`;
            })}
          <//>
          <${Reveal} className="crop-detail">
            <div className="cd-head"><h3>${i.T(sel.name)}</h3><span className="cd-sc">${i.nfmt(sel.sc)}<small>/100</small></span></div>
            <p className="cd-why"><b>${i.t("ui.why")}</b> ${i.T(sel.why)}</p>
            <${C.Radar} labels=${labels} values=${sel.f} color="#2F6B2C" />
            <div className="cd-procon">
              <div className="pros"><h4><${Icon} name="check" size=${14} /> ${i.t("ui.pros")}</h4>
                <ul>${(sel.pro[i.lang] || sel.pro.en).map(function (p, n) { return html`<li key=${n}>${p}</li>`; })}</ul></div>
              <div className="cons"><h4><${Icon} name="close" size=${14} /> ${i.t("ui.cons")}</h4>
                <ul>${(sel.con[i.lang] || sel.con.en).map(function (p, n) { return html`<li key=${n}>${p}</li>`; })}</ul></div>
            </div>
          <//>
        </div>
      <//>
    </section>`;
  }

  /* ---------- risk ---------- */
  function Risk() {
    var i = useI18n(), s = useStore(), risk = window.DATA.risk;
    var heatRows = risk.domains.map(function (d) { return { label: i.T(d.name), values: d.m }; });
    var sevCol = { high: "#652D2F", mid: "#CE6E3D", low: "#2F6B2C" };
    var sevWord = { high: i.t("ui.high"), mid: i.t("ui.med"), low: i.t("ui.low") };
    return html`<section className="section" id="risk">
      <${SecHead} num="04" title=${i.t("sec.risk")} sub=${i.t("sec.riskSub")} />
      <${Gated}>
        <div className="risk-domains">
          ${risk.domains.map(function (d) {
            var on = d.k === s.riskSel;
            return html`<button type="button" key=${d.k} className=${"risk-card" + (on ? " on" : "")}
              onClick=${function () { s.setRiskSel(d.k); }}>
              <${C.Dial} value=${d.lv} max=${100} color=${window.AgStore.sevColor(d.lv)} label=${i.nfmt(d.lv)} size=${104} sw=${9} />
              <div className="rc-txt"><b>${i.T(d.name)}</b><span>${i.T(d.say)}</span></div>
            </button>`;
          })}
        </div>
        <${Reveal} className="card risk-cal">
          <div className="card-head"><h3><${Icon} name="chart" size=${16} /> ${i.t("risk.cal")}</h3></div>
          <${C.Heat} cols=${i.months()} rows=${heatRows} warn=${true} cell=${30} labelW=${130} />
        <//>
        <div className="threats">
          ${risk.threats.map(function (t, n) {
            return html`<${Reveal} className="threat" key=${n} style=${{ "--sev": sevCol[t.sev] }}>
              <span className="threat-sev" style=${{ background: sevCol[t.sev] }}>${sevWord[t.sev]}</span>
              <b>${i.T(t.k)}</b><span className="threat-when"><${Icon} name="chart" size=${12} /> ${i.T(t.when)}</span>
              <p>${i.T(t.d)}</p>
            <//>`;
          })}
        </div>
      <//>
    </section>`;
  }

  /* ---------- rotations ---------- */
  function Rotations() {
    var i = useI18n(), s = useStore(), rots = window.DATA.rotations;
    var recoId = window.DATA.reco.main.id;
    return html`<section className="section" id="rotations">
      <${SecHead} num="05" title=${i.t("sec.rot")} sub=${i.t("sec.rotSub")} />
      <${Gated}>
        <div className="rot-compare">
          ${rots.map(function (r) {
            var match = matchOf(r, s.form.prios), col = ROT_COLORS[r.id];
            return html`<${Reveal} className=${"rot-card" + (r.id === recoId ? " reco" : "")} key=${r.id}>
              ${r.id === recoId ? html`<span className="rot-flag">${i.t("ui.recoTag")}</span>` : null}
              <h3 style=${{ color: col }}>${i.T(r.name)}</h3>
              <span className="rot-tag">${i.T(r.tag)}</span>
              <div className="rot-seq">${r.seq.map(function (q, n) {
                return html`<span key=${n} className="seq-chip">${i.T(q)}${n < 2 ? html`<${Icon} name="arrow" size=${12} />` : null}</span>`;
              })}</div>
              <div className="rot-match"><b>${i.nfmt(match)}</b><span>${i.t("ui.match")}</span></div>
              <div className="rot-mini">
                <div><span>${i.t("ui.sustain")}</span><${Bar} value=${r.sustain} color="#2F6B2C" /></div>
                <div><span>${i.t("ui.risk")}</span><${Bar} value=${r.risk} color="#CE6E3D" /></div>
                <div><span>${i.t("ui.profit")}</span><${Bar} value=${r.profit / 2.6} color="#5f8fa0" /></div>
              </div>
              <button type="button" className="btn ghost sm" onClick=${function () { s.openDrawer(r.id); }}>${i.t("ui.open")} <${Icon} name="arrow" size=${14} /></button>
            <//>`;
          })}
        </div>
        <${Reveal} className="rot-table-wrap">
          <table className="rot-table">
            <thead><tr>
              <th>${i.t("dash.plan")}</th><th>${i.t("ui.sustain")}</th><th>${i.t("ui.risk")}</th>
              <th>${i.t("ui.profit")} (৳k)</th><th>${i.t("ui.cost")} (৳k)</th><th>${i.t("ui.output")} (t)</th>
              <th>${i.t("ui.match")}</th><th></th>
            </tr></thead>
            <tbody>${rots.map(function (r) {
              var match = matchOf(r, s.form.prios);
              return html`<tr key=${r.id} className=${r.id === recoId ? "reco" : ""} onClick=${function () { s.openDrawer(r.id); }}>
                <td><b style=${{ color: ROT_COLORS[r.id] }}>${i.T(r.name)}</b></td>
                <td>${i.nfmt(r.sustain)}</td><td>${i.nfmt(r.risk)}</td><td>${i.nfmt(r.profit)}</td>
                <td>${i.nfmt(r.cost)}</td><td>${i.nfmt(r.yield, 1)}</td>
                <td><span className="match-pill">${i.nfmt(match)}</span></td>
                <td><${Icon} name="arrow" size=${14} /></td>
              </tr>`;
            })}</tbody>
          </table>
        <//>
      <//>
    </section>`;
  }

  /* ---------- recommendation ---------- */
  function Reco() {
    var i = useI18n(), s = useStore(), reco = window.DATA.reco;
    var main = rotById(reco.main.id), a1 = rotById(reco.alt1.id), a2 = rotById(reco.alt2.id);
    var match = matchOf(main, s.form.prios);
    return html`<section className="section" id="recommend">
      <${SecHead} num="06" title=${i.t("sec.reco")} sub=${i.t("sec.recoSub")} />
      <${Gated}>
        <${Reveal}><${RecoBuddy} /><//>
        <div className="reco-window">
          <${Reveal} className="reco-main">
            <span className="reco-tag"><${Icon} name="check" size=${14} /> ${i.T(reco.main.tag)}</span>
            <h3>${i.T(main.name)}</h3>
            <div className="reco-stats">
              <div><b>${i.nfmt(reco.main.fit)}%</b><span>${i.t("ui.match")}</span></div>
              <div><b>${i.nfmt(match)}</b><span>${i.t("ui.scores")}</span></div>
              <div><b>${i.T(reco.main.riskLv)}</b><span>${i.t("ui.riskLv")}</span></div>
            </div>
            <p className="reco-why">${i.T(reco.main.why)}</p>
            <${Calendar} cal=${main.cal} />
            <button type="button" className="btn primary" onClick=${function () { s.openDrawer(main.id); }}>
              <${Icon} name="chart" size=${16} /> ${i.t("ui.openPlan")} <${Icon} name="arrow" size=${15} /></button>
          <//>
          <div className="reco-others">
            ${[{ r: a1, a: reco.alt1 }, { r: a2, a: reco.alt2 }].map(function (o, n) {
              return html`<${Reveal} className="reco-alt" key=${n}>
                <span className="alt-k">${i.T(o.a.k)}</span>
                <h4>${i.T(o.r.name)}</h4>
                <p className="alt-s">${i.T(o.a.s)}</p>
                <p className="alt-q">${i.T(o.a.q)}</p>
                <button type="button" className="btn ghost sm" onClick=${function () { s.openDrawer(o.r.id); }}>${i.t("ui.open")} <${Icon} name="arrow" size=${13} /></button>
              <//>`;
            })}
          </div>
        </div>
      <//>
    </section>`;
  }

  /* ---------- help ---------- */
  function Help() {
    var i = useI18n(), s = useStore(), help = window.DATA.help;
    var st = useState(null), panel = st[0], setPanel = st[1];
    var fb = useState(""), feedback = fb[0], setFeedback = fb[1];
    var sent = useState(false), isSent = sent[0], setSent = sent[1];
    var irrSeries = [{ name: i.t("ui.irrigation"), values: help.irr.map(function (x) { return x.v; }), color: "#5f8fa0", type: "bar" }];
    var DATASETS = [
      { k: "MODIS", d: { en: "Vegetation indices (NDVI/EVI), leaf area and land surface temperature.", bn: "গাছপালার সূচক, পাতার ক্ষেত্রফল ও ভূপৃষ্ঠের তাপমাত্রা।" } },
      { k: "SMAP", d: { en: "Surface soil moisture at 9 km resolution, every 2–3 days.", bn: "৯ কিমি রেজোলিউশনে মাটির আর্দ্রতা, প্রতি ২–৩ দিনে।" } },
      { k: "Landsat", d: { en: "30 m field imagery for land cover and boundary mapping.", bn: "৩০ মিটার ছবিতে ভূমি আবরণ ও সীমানা নির্ণয়।" } },
      { k: "GPM", d: { en: "Half-hourly global precipitation for the hazard calendar.", bn: "বিপদ ক্যালেন্ডারের জন্য বৈশ্বিক বৃষ্টিপাত।" } },
      { k: "NASA POWER", d: { en: "Daily temperature, humidity and solar radiation for climate normals.", bn: "জলবায়ু স্বাভাবিকের জন্য দৈনিক তাপমাত্রা, আর্দ্রতা ও সৌর বিকিরণ।" } }
    ];
    function toggle(p) { setPanel(panel === p ? null : p); }
    function sendFeedback(e) { e.preventDefault(); if (!feedback.trim()) return; setSent(true); setFeedback(""); }

    return html`<section className="section" id="help">
      <${SecHead} num="07" title=${i.t("sec.help")} sub=${i.t("sec.helpSub")} />
      <${Gated}>
        <div className="help-grid">
          <${Reveal} className="card help-water">
            <div className="card-head"><h3><${Icon} name="drop" size=${16} /> ${i.t("ui.irrigation")}</h3></div>
            <${C.LineChart} labels=${i.months()} series=${irrSeries} ySuffix="mm" height=${210} zero=${true} />
            <div className="water-stats">
              <div><b>${i.nfmt(help.water.need)}<small>mm</small></b><span>${i.t("ui.waterNeed")}</span></div>
              <div><b>${i.nfmt(help.water.save)}<small>%</small></b><span>${i.T(help.water.note)}</span></div>
            </div>
            <p className="deficit"><${Icon} name="check" size=${14} /> ${i.t("ui.deficit")}</p>
          <//>
          <${Reveal} className="card help-tips">
            <div className="card-head"><h3><${Icon} name="sprout" size=${16} /> ${i.t("ui.soilTips")}</h3></div>
            <ul className="tip-list">${help.soilTips.map(function (t, n) {
              return html`<li key=${n}><b>${i.T(t.t)}</b><span>${i.T(t.d)}</span></li>`; })}</ul>
          <//>
          <${Reveal} className="card help-tips">
            <div className="card-head"><h3><${Icon} name="leaf" size=${16} /> ${i.t("ui.general")}</h3></div>
            <ul className="tip-list">${help.genTips.map(function (t, n) {
              return html`<li key=${n}><b>${i.T(t.t)}</b><span>${i.T(t.d)}</span></li>`; })}</ul>
          <//>
        </div>

        <${Reveal} className="card help-support">
          <div className="support-btns">
            <button type="button" className=${"btn ghost" + (panel === "call" ? " on" : "")} onClick=${function () { toggle("call"); }}><${Icon} name="user" size=${16} /> ${i.t("ui.support")}</button>
            <button type="button" className=${"btn ghost" + (panel === "data" ? " on" : "")} onClick=${function () { toggle("data"); }}><${Icon} name="globe" size=${16} /> ${i.t("ui.docs")}</button>
            <button type="button" className=${"btn ghost" + (panel === "fb" ? " on" : "")} onClick=${function () { toggle("fb"); }}><${Icon} name="save" size=${16} /> ${i.t("ui.feedback")}</button>
          </div>
          ${panel === "call" ? html`<div className="support-panel">
            <b>${i.T({ en: "Agriculture Call Centre", bn: "কৃষি কল সেন্টার" })}</b>
            <p>${i.T({ en: "Dial 16123 from any mobile in Bangladesh — free advice on seed, fertiliser, pest and irrigation, 8am–8pm every day.", bn: "বাংলাদেশের যেকোনো মোবাইল থেকে ১৬১২৩ ডায়াল করুন — বীজ, সার, পোকা ও সেচ বিষয়ে বিনামূল্যে পরামর্শ, প্রতিদিন সকাল ৮টা–রাত ৮টা।" })}</p>
            <a className="btn primary sm" href="tel:16123"><${Icon} name="user" size=${15} /> 16123</a>
          </div>` : null}
          ${panel === "data" ? html`<div className="support-panel">
            <ul className="data-list">${DATASETS.map(function (d) { return html`<li key=${d.k}><b>${d.k}</b><span>${i.T(d.d)}</span></li>`; })}</ul>
          </div>` : null}
          ${panel === "fb" ? html`<div className="support-panel">
            ${isSent
              ? html`<p className="fb-thanks"><${Icon} name="check" size=${16} /> ${i.T({ en: "Thank you — your feedback was noted.", bn: "ধন্যবাদ — আপনার মতামত গ্রহণ করা হয়েছে।" })}</p>`
              : html`<form className="fb-form" onSubmit=${sendFeedback}>
                  <textarea value=${feedback} onChange=${function (e) { setFeedback(e.target.value); }} rows="3"
                    placeholder=${i.T({ en: "What could make this plan better for your field?", bn: "আপনার খামারের জন্য এই পরিকল্পনা আরও ভালো করতে কী সাহায্য করবে?" })}></textarea>
                  <button type="submit" className="btn primary sm">${i.t("ui.feedback")} <${Icon} name="arrow" size=${14} /></button>
                </form>`}
          </div>` : null}
        <//>
      <//>
    </section>`;
  }

  /* ---------- rotation drawer ---------- */
  function Drawer() {
    var i = useI18n(), s = useStore();
    if (!s.drawer) return null;
    var r = rotById(s.drawer), col = ROT_COLORS[r.id], match = matchOf(r, s.form.prios);
    function save() { if (s.savePlan(r.id, "")) s.showToast("dash.planSaved"); }
    return html`<div className="drawer-overlay" onClick=${function (e) { if (e.target === e.currentTarget) s.closeDrawer(); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label=${i.T(r.name)}>
        <div className="drawer-head" style=${{ "--rc": col }}>
          <div><span className="drawer-tag">${i.T(r.tag)}</span><h2>${i.T(r.name)}</h2></div>
          <button type="button" className="drawer-x" onClick=${s.closeDrawer} aria-label=${i.t("ui.close")}><${Icon} name="close" size=${20} /></button>
        </div>
        <div className="drawer-body">
          <div className="drawer-seq">${r.seq.map(function (q, n) {
            return html`<span key=${n} className="seq-chip" style=${{ borderColor: col }}>${i.T(q)}${n < 2 ? html`<${Icon} name="arrow" size=${12} />` : null}</span>`; })}</div>

          <h3 className="db-h">${i.t("ui.calendar")}</h3>
          <${Calendar} cal=${r.cal} />

          <h3 className="db-h">${i.t("ui.econ")}</h3>
          <div className="econ-grid">
            <div className="econ"><span>${i.t("ui.cost")}</span><b>৳${i.nfmt(r.cost)}k</b><small>${i.t("ui.perHa")}</small></div>
            <div className="econ"><span>${i.t("ui.output")}</span><b>${i.nfmt(r.yield, 1)}<small>t</small></b><small>${i.t("ui.perHa")}</small></div>
            <div className="econ profit"><span>${i.t("ui.profit")}</span><b>৳${i.nfmt(r.profit)}k</b><small>${i.t("ui.perHa")}</small></div>
            <div className="econ"><span>${i.t("ui.vs")}</span><b>+${i.nfmt(r.change)}%</b><small>${i.t("ui.profit")}</small></div>
          </div>

          <h3 className="db-h">${i.t("ui.matchTitle")} <span className="match-big">${i.nfmt(match)}</span></h3>
          <p className="match-note">${i.t("ui.matchNote")}</p>
          <div className="match-bars">
            ${PRIO.map(function (k) {
              var on = s.form.prios.indexOf(k) >= 0;
              return html`<div className=${"mb-row" + (on ? "" : " off")} key=${k}>
                <span className="mb-k">${i.t("prio." + k)}</span>
                <${Bar} value=${r.scores[k]} color=${on ? col : "#c8cdbb"} />
                <b>${i.nfmt(r.scores[k])}</b>
              </div>`;
            })}
          </div>

          <div className="cd-procon drawer-procon">
            <div className="pros"><h4><${Icon} name="check" size=${14} /> ${i.t("ui.pros")}</h4>
              <ul>${(r.pro[i.lang] || r.pro.en).map(function (p, n) { return html`<li key=${n}>${p}</li>`; })}</ul></div>
            <div className="cons"><h4><${Icon} name="close" size=${14} /> ${i.t("ui.cons")}</h4>
              <ul>${(r.con[i.lang] || r.con.en).map(function (p, n) { return html`<li key=${n}>${p}</li>`; })}</ul></div>
          </div>
          <p className="drawer-why"><b>${i.t("ui.why")}</b> ${i.T(r.why)}</p>
        </div>
        <div className="drawer-foot">
          <button type="button" className="btn ghost" onClick=${s.closeDrawer}>${i.t("ui.close")}</button>
          <button type="button" className="btn primary" onClick=${save}><${Icon} name="save" size=${16} /> ${i.t("dash.saveCurrent")}</button>
        </div>
      </aside>
    </div>`;
  }

  /* ---------- footer ---------- */
  function Footer() {
    var i = useI18n();
    return html`<footer className="footer">
      <div className="footer-in">
        <div className="footer-brand"><span className="brand-mark"><${Icon} name="sprout" size=${20} /></span>
          <div><b>Agroscope</b><span>${i.t("foot.built")}</span></div></div>
        <p className="foot-note">${i.t("foot.note")}</p>
        <div className="foot-links">
          <button type="button" onClick=${function () { window.AgHero.goto("help"); }}>${i.t("foot.support")}</button>
          <button type="button" onClick=${function () { window.AgHero.goto("help"); }}>${i.t("foot.data")}</button>
        </div>
      </div>
    </footer>`;
  }

  window.AgSections = {
    Geography: Geography, Crops: Crops, Risk: Risk, Rotations: Rotations,
    Reco: Reco, Help: Help, Drawer: Drawer, Footer: Footer, Calendar: Calendar
  };
})();