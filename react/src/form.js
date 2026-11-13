/* ===== Agroscope React · field input form + analysis trigger ===== */
(function () {
  var R = window.React, html = window.Ag.html;
  var useRef = R.useRef;
  var useI18n = window.AgI18n.use, useStore = window.AgStore.use;
  var Icon = window.AgUI.Icon, SecHead = window.AgUI.SecHead, Reveal = window.AgUI.Reveal;
  var PRIO = window.AgStore.PRIO;

  var SOIL_TYPES = [
    { en: "Clay loam", bn: "ক্লে লোম" }, { en: "Sandy loam", bn: "বেলে দোআঁশ" },
    { en: "Silt loam", bn: "পলি দোআঁশ" }, { en: "Clay", bn: "এঁটেল" }, { en: "Loam", bn: "দোআঁশ" }
  ];
  var TEXTURES = [
    { en: "Fine", bn: "সূক্ষ্ম" }, { en: "Medium", bn: "মাঝারি" }, { en: "Coarse", bn: "মোটা" }
  ];

  function matchPlace(v, T) {
    var bd = window.DATA.bd, key = String(v || "").split(",")[0].trim().toLowerCase();
    if (!key) return null;
    for (var i = 0; i < bd.districts.length; i++)
      if (T(bd.districts[i].n).toLowerCase() === key || bd.districts[i].n.en.toLowerCase() === key)
        return { div: bd.districts[i].d, dist: i };
    for (var j = 0; j < bd.divisions.length; j++)
      if (T(bd.divisions[j].n).toLowerCase() === key || bd.divisions[j].n.en.toLowerCase() === key)
        return { div: j };
    return null;
  }

  function InputForm() {
    var i = useI18n(), s = useStore();
    var f = s.form, bd = window.DATA.bd;
    var fileRef = useRef(null);

    var districts = bd.districts.map(function (x, idx) { return { x: x, idx: idx }; })
      .filter(function (o) { return o.x.d === +f.div; });

    var places = bd.divisions.map(function (d) { return i.T(d.n); })
      .concat(bd.districts.map(function (x) { return i.T(x.n); }));
    var seen = {}, uniq = places.filter(function (n) { if (seen[n]) return false; seen[n] = 1; return true; });

    function onLoc(e) {
      var v = e.target.value, m = matchPlace(v, i.T);
      var patch = { loc: v };
      if (m) { patch.div = m.div; if (m.dist != null) patch.dist = m.dist; }
      s.updateForm(patch);
    }
    function onDiv(e) {
      var dv = +e.target.value;
      var first = bd.districts.map(function (x, idx) { return { x: x, idx: idx }; })
        .filter(function (o) { return o.x.d === dv; })[0].idx;
      s.updateForm({ div: dv, dist: first, loc: i.T(bd.districts[first].n) });
    }
    function onDist(e) {
      var idx = +e.target.value;
      s.updateForm({ dist: idx, loc: i.T(bd.districts[idx].n) });
    }
    function useMyLocation() {
      if (!navigator.geolocation) { s.showToast("ui.locNone"); return; }
      s.showToast("ui.analysing");
      navigator.geolocation.getCurrentPosition(function (p) {
        s.setMapPin(p.coords.latitude, p.coords.longitude);
      }, function () { s.showToast("ui.locNone"); }, { timeout: 6000 });
    }
    function pickOnMap() {
      var geo = document.getElementById("geography");
      if (geo) geo.scrollIntoView({ behavior: "smooth", block: "start" });
      document.dispatchEvent(new CustomEvent("agro:pick"));
    }
    function triggerScan() { if (fileRef.current) fileRef.current.click(); }
    function handleScan(e) {
      var file = e.target.files && e.target.files[0]; if (!file) return;
      var url = URL.createObjectURL(file);
      var names = ["Boro rice", "Maize", "Mustard", "Wheat", "Mung bean", "Potato"];
      var hsh = 0; for (var k = 0; k < file.name.length; k++) hsh = (hsh * 31 + file.name.charCodeAt(k)) % 997;
      var pick = names[hsh % names.length];
      s.updateForm({ crop: pick, detected: { name: pick, conf: 89 + (hsh % 9), url: url } });
    }
    function clearScan() { s.updateForm({ detected: null, crop: "" }); if (fileRef.current) fileRef.current.value = ""; }
    function skipSoil() { s.updateForm({ soilType: "", soilTexture: "", soilPh: "", soilOm: "" }); s.showToast("geo.soilSrc"); }
    function submit(e) { e.preventDefault(); s.runAnalysis(); }

    return html`<section className="section input-section" id="input">
      <${SecHead} num="01" title=${i.t("sec.input")} sub=${i.t("sec.inputSub")} />
      <${Reveal} className="form-wrap">
        <form className="form-card" onSubmit=${submit} noValidate>
          <div className="form-grid">
            <div className="field span-2">
              <label htmlFor="locInput"><${Icon} name="pin" size=${14} /> ${i.t("f.loc")}</label>
              <div className="loc-row">
                <input id="locInput" type="text" list="places" value=${f.loc} onChange=${onLoc} placeholder=${i.t("f.locPh")} autoComplete="off" />
                <button type="button" className="mini-btn" onClick=${useMyLocation} title=${i.t("f.locMe")}><${Icon} name="target" size=${15} /><span>${i.t("f.locMe")}</span></button>
                <button type="button" className="mini-btn" onClick=${pickOnMap} title=${i.t("f.pickMap")}><${Icon} name="pin" size=${15} /><span>${i.t("f.pickMap")}</span></button>
              </div>
              <datalist id="places">${uniq.map(function (n) { return html`<option key=${n} value=${n}></option>`; })}</datalist>
            </div>

            <div className="field">
              <label htmlFor="divSel"><${Icon} name="globe" size=${14} /> ${i.t("f.div")}</label>
              <select id="divSel" value=${f.div} onChange=${onDiv}>
                ${bd.divisions.map(function (d, idx) { return html`<option key=${idx} value=${idx}>${i.T(d.n)}</option>`; })}
              </select>
            </div>
            <div className="field">
              <label htmlFor="distSel">${i.t("dash.district")}</label>
              <select id="distSel" value=${f.dist} onChange=${onDist}>
                ${districts.map(function (o) { return html`<option key=${o.idx} value=${o.idx}>${i.T(o.x.n)}</option>`; })}
              </select>
            </div>

            <div className="field">
              <label htmlFor="areaInput"><${Icon} name="chart" size=${14} /> ${i.t("f.area")}</label>
              <div className="area-row">
                <input id="areaInput" type="number" step="0.1" min="0" value=${f.area}
                  onChange=${function (e) { s.updateForm({ area: e.target.value }); }} placeholder=${i.t("f.areaPh")} />
                <span className="unit">${i.t("ui.ha")}</span>
              </div>
            </div>

            <div className="field span-2">
              <label htmlFor="cropInput"><${Icon} name="sprout" size=${14} /> ${i.t("f.crop")}</label>
              <div className="crop-row">
                <input id="cropInput" type="text" value=${f.crop} onChange=${function (e) { s.updateForm({ crop: e.target.value }); }} placeholder=${i.t("f.cropPh")} autoComplete="off" />
                <button type="button" className="mini-btn" onClick=${triggerScan}><${Icon} name="scan" size=${15} /><span>${i.t("f.cam")}</span></button>
                <input ref=${fileRef} type="file" accept="image/*" hidden onChange=${handleScan} />
              </div>
              ${f.detected ? html`<div className="detect-box">
                <img src=${f.detected.url} alt="" />
                <div className="detect-txt"><span className="detect-tag">${i.t("ui.detect")}</span>
                  <b>${f.detected.name}</b><small>${i.nfmt(f.detected.conf)}% ${i.t("ui.conf")}</small></div>
                <button type="button" className="detect-x" onClick=${clearScan} aria-label=${i.t("f.clear")}><${Icon} name="close" size=${15} /></button>
              </div>` : null}
            </div>
          </div>

          <div className="soil-block">
            <div className="soil-head">
              <b><${Icon} name="drop" size=${15} /> ${i.t("f.soil")}</b>
              <span className="opt">${i.t("f.optional")}</span>
              <button type="button" className="link-btn" onClick=${skipSoil}>${i.t("f.skip")}</button>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="soilType">${i.t("f.soilType")}</label>
                <select id="soilType" value=${f.soilType} onChange=${function (e) { s.updateForm({ soilType: e.target.value }); }}>
                  <option value="">—</option>
                  ${SOIL_TYPES.map(function (o) { return html`<option key=${o.en} value=${o.en}>${i.T(o)}</option>`; })}
                </select>
              </div>
              <div className="field">
                <label htmlFor="soilTexture">${i.t("f.texture")}</label>
                <select id="soilTexture" value=${f.soilTexture} onChange=${function (e) { s.updateForm({ soilTexture: e.target.value }); }}>
                  <option value="">—</option>
                  ${TEXTURES.map(function (o) { return html`<option key=${o.en} value=${o.en}>${i.T(o)}</option>`; })}
                </select>
              </div>
              <div className="field">
                <label htmlFor="soilPh">${i.t("dash.soilPh")}</label>
                <input id="soilPh" type="number" step="0.1" min="0" max="14" value=${f.soilPh}
                  onChange=${function (e) { s.updateForm({ soilPh: e.target.value }); }} placeholder="6.4" />
              </div>
              <div className="field">
                <label htmlFor="soilOm">${i.t("dash.soilOm")}</label>
                <input id="soilOm" type="number" step="0.1" min="0" value=${f.soilOm}
                  onChange=${function (e) { s.updateForm({ soilOm: e.target.value }); }} placeholder="1.9" />
              </div>
            </div>
          </div>

          <div className="prio-block">
            <div className="prio-head">
              <b><${Icon} name="check" size=${15} /> ${i.t("f.prio")}</b>
              <span className="prio-hint">${i.t("f.prioHint")}</span>
              <span className="prio-count"><b>${i.nfmt(f.prios.length)}</b> ${i.t("f.selected")}</span>
            </div>
            <div className="prio-chips">
              ${PRIO.map(function (k) {
                var on = f.prios.indexOf(k) >= 0;
                return html`<button key=${k} type="button" className=${"chip" + (on ? " on" : "")}
                  aria-pressed=${on} onClick=${function () { s.togglePrio(k); }}>
                  <span className="tick">${on ? html`<${Icon} name="check" size=${12} sw=${2.6} />` : null}</span>
                  <span>${i.t("prio." + k)}</span>
                </button>`;
              })}
            </div>
          </div>

          <div className="run-row">
            <button type="submit" className=${"btn primary run-btn" + (s.analyzing ? " busy" : "")} disabled=${s.analyzing}>
              ${s.analyzing ? html`<span className="spin"></span>` : html`<${Icon} name="chart" size=${17} />`}
              <span>${s.analyzing ? i.t("ui.analysing") : i.t("f.run")}</span>
              ${!s.analyzing ? html`<${Icon} name="arrow" size=${16} />` : null}
            </button>
          </div>
        </form>
      <//>
    </section>`;
  }

  window.AgForm = { InputForm: InputForm };
})();