/* ===== Agroscope React · i18n (ported) + React context ===== */
window.I18N = {
  en: {
    "nav.input":"Field input","nav.geo":"Geography","nav.crops":"Crops","nav.risk":"Risk",
    "nav.rot":"Rotations","nav.reco":"Advice","nav.help":"Help",
    "hero.eyebrow":"Earth observation · soil · climate",
    "hero.title1":"Read your land.","hero.title2":"Shift your seasons.",
    "hero.lede":"See what your land can carry. Plan the next three seasons in one view.",
    "hero.b1":"Start with a field","hero.b2":"Maps & data","hero.b3":"Crop fit","hero.b4":"Risks",
    "hero.b5":"Rotations","hero.b6":"Help","hero.src":"Built on NASA Earth Observation data","hero.scroll":"Scroll",
    "hero.stat1":"Earth-observation layers","hero.stat2":"Bangladesh districts","hero.stat3":"Rotation plans scored",
    "buddy.tag":"Field helper",
    "buddy.idle":"Tell me about your field — I will follow along.",
    "buddy.typing":"Nice — keep going. Location, land, crop…",
    "buddy.busy":"Reading your field from orbit…",
    "buddy.done":"Results are ready — your plan is waiting below.",
    "buddy.infoTag":"How it works","buddy.more":"How it works",
    "buddy.step1":"Fill in the location, land size and current crop.",
    "buddy.step2":"Choose a few priorities so the advice fits your farm.",
    "buddy.step3":"Press Analyse — NASA Earth data reads your field.",
    "buddy.step4":"Open the plan to see cost, risk and the full rotation.",
    "buddy.infoFoot":"Tap me any time for a recap.",
    "buddy.readyTag":"Plan ready",
    "buddy.readyLong":"Short answer first — this is the rotation we would plant. Open it to see every input, cost and risk behind the choice.",
    "buddy.hide":"Hide helper","buddy.show":"Show helper",
    "mapbuddy.tag":"SHOBUJ · সবুজ",
    "mapbuddy.t1":"Tip: check NDVI weekly — a sudden dip can reveal pest stress before it's visible.",
    "mapbuddy.t2":"Tip: set your pin first — every reading on this page follows that point.",
    "mapbuddy.t3":"Tip: switch to the EO layer to read vegetation and soil moisture.",
    "mapbuddy.t4":"Tip: drag to tilt — the 3D view shows slope, flood paths and field edges.",
    "sec.input":"Tell us about the field","sec.inputSub":"Fill this in, then run the analysis — the results below appear after it.",
    "f.loc":"Location","f.locPh":"District, village or coordinates","f.locMe":"Use my location",
    "f.div":"Division / district","f.divPh":"Select a district",
    "f.area":"Land size","f.areaPh":"e.g. 1.8",
    "f.crop":"Current crop","f.cropPh":"e.g. Boro rice, wheat, maize","f.cam":"Scan","f.clear":"Remove",
    "f.soil":"Soil information","f.optional":"optional","f.soilType":"Soil type","f.texture":"Texture",
    "f.skip":"Use satellite estimate","f.prio":"Farmer priority","f.prioHint":"Select a few options from below",
    "f.selected":"selected","f.run":"Analyse this field",
    "sec.geo":"Geography analysis","sec.geoSub":"Switch the map. The side readings follow it.",
    "map.live":"Live field / region","map.cover":"Land cover / soil","map.eo":"EO layer",
    "map.hint":"Set a location pin · drag to pan · wheel to zoom · click a pointer for details",
    "map.bd":"Bangladesh","map.pick":"Set location on map",
    "map.picking":"Click anywhere on the map to drop your pin…",
    "map.prompt":"No field selected — set a location to analyse",
    "map.set":"Location pinned — analysis follows this point",
    "map.outside":"That point is outside Bangladesh — pick a location inside the border",
    "legend.ndvi":"NDVI · vegetation greenness","legend.evi":"EVI · enhanced greenness",
    "legend.npwi":"NPWI · surface water","legend.lai":"LAI · leaf area",
    "legend.et":"ET · evapotranspiration","legend.lst":"LST · surface temperature",
    "legend.sm":"SM · soil moisture","legend.cover":"Land cover","legend.soil":"Soil / fallow",
    "f.pickMap":"Pick on map",
    "geo.climate":"Climate data","geo.temp":"Temperature","geo.hum":"Humidity","geo.rain":"Rainfall",
    "geo.hazard":"Climate hazard / risk · next 12 months","geo.soil":"Soil report",
    "geo.soilSrc":"field sample + satellite estimate",
    "sec.crops":"Crop suitability","sec.cropsSub":"Ranked for this field. Tap one to see why.",
    "sec.risk":"Risk to this land","sec.riskSub":"What is threatening the field right now, and when.",
    "risk.cal":"Threat calendar · severity by month",
    "sec.rot":"Rotation comparison","sec.rotSub":"Four options, scored against your priorities. Click one to open it.",
    "sec.reco":"Final recommendation","sec.recoSub":"One short answer. Click the plan to open everything behind it.",
    "sec.help":"Help & support","sec.helpSub":"Practical next steps for this field.",
    "foot.note":"Prototype interface. Values shown are representative estimates from NASA Earth Observation datasets (MODIS, SMAP, Landsat, GPM, POWER) combined with local soil records.",
    "foot.support":"Support","foot.data":"Data sources","foot.built":"Field Shift · NASA Space Apps",
    "load.title":"Reading your field",
    "load.s1":"Locating field boundary","load.s2":"Pulling NASA Earth observation layers",
    "load.s3":"Reading soil profile","load.s4":"Scoring climate & hazard","load.s5":"Matching your priorities",
    "prio.disaster":"Disaster avoidance","prio.yield":"Yield","prio.pest":"Pest protection",
    "prio.water":"Water requirement","prio.cost":"Cost requirement","prio.early":"Early harvest",
    "prio.soil":"Soil quality","prio.profit":"Profit","prio.longer":"Longer storage",
    "ui.why":"Why it suits this field","ui.pros":"Pros","ui.cons":"Cons","ui.factors":"Suitability factors",
    "ui.suit":"Suitability","ui.scores":"Scored out of 100","ui.rank":"Rank","ui.open":"Open",
    "ui.sustain":"Sustainability","ui.match":"Priority match","ui.risk":"Risk","ui.profit":"Profit",
    "ui.riskLv":"Risk level","ui.low":"Low","ui.med":"Medium","ui.high":"High",
    "ui.econ":"Economic factors","ui.cost":"Cost","ui.output":"Output / yield","ui.benefits":"Benefits",
    "ui.calendar":"Crop calendar","ui.perHa":"per hectare / season","ui.vs":"vs. current practice",
    "ui.matchTitle":"Priority match","ui.matchNote":"Your selected priorities only. Unselected are greyed.",
    "ui.recoTag":"Recommended","ui.alt1":"Best for balance","ui.alt2":"Lowest risk",
    "ui.openPlan":"Click the plan to open cost, yield, profit, calendar and risks",
    "ui.helpful":"Practical tips","ui.irrigation":"Irrigation recommendation","ui.soilTips":"Soil management tips",
    "ui.general":"Other tips","ui.waterNeed":"Water need","ui.deficit":"Deficit irrigation saves water at little yield cost",
    "ui.support":"Talk to an agronomist","ui.docs":"Read the data guide","ui.feedback":"Send feedback",
    "ui.close":"Close","ui.month":"Month","ui.now":"Now","ui.ha":"ha","ui.matched":"matched",
    "ui.locSet":"Location set from your device","ui.locNone":"Location unavailable — using demo field",
    "ui.camErr":"Could not read that photo","ui.needPrio":"Pick at least one priority",
    "ui.needCrop":"Enter a current crop first","ui.analysing":"Analysing…",
    "ui.lockMsg":"Results appear here after you run the analysis in step 01.","ui.dirty":"Inputs changed — run the analysis again.",
    "ui.legend":"Legend","ui.detect":"Detected","ui.conf":"match",
    "clim.max":"Year high","clim.min":"Year low","clim.rain":"Annual rainfall","clim.hum":"Mean humidity",
    "clim.unitT":"°C","clim.unitR":"mm","clim.unitH":"%",
    "auth.login":"Log in","auth.signup":"Create account","auth.name":"Full name",
    "auth.namePh":"e.g. Rahim Uddin","auth.email":"Email address","auth.emailPh":"you@example.com",
    "auth.password":"Password","auth.passPh":"At least 8 characters","auth.show":"Show","auth.hide":"Hide",
    "auth.confirm":"Confirm password","auth.remember":"Remember me","auth.forgot":"Forgot password?",
    "auth.goLogin":"Log in","auth.goCreate":"Create account","auth.noAccount":"No account yet?",
    "auth.haveAccount":"Already have an account?","auth.titleLogin":"Welcome back",
    "auth.subLogin":"Your saved farm and earlier analyses are waiting for you.",
    "auth.titleSignup":"Create your account","auth.subSignup":"Agroscope will remember your land, soil and priorities for next time.",
    "auth.errName":"Please enter your full name","auth.errEmail":"Enter a valid e-mail address",
    "auth.errTaken":"That e-mail already has an account","auth.errPwLen":"Use at least 8 characters",
    "auth.errMatch":"The two passwords do not match","auth.errCreds":"Wrong e-mail or password",
    "auth.errPwReq":"Enter your password","auth.welcome":"Welcome back to Agroscope",
    "auth.created":"Account created — welcome to Agroscope","auth.logout":"Log out",
    "auth.demoHint":"Demo accounts run locally in your browser. Try rahim@farm.bd / harvest123.",
    "dash.profile":"My profile","dash.farm":"My farm","dash.analyses":"Previous analyses",
    "dash.plans":"Saved plans","dash.settings":"Account settings","dash.logout":"Log out",
    "dash.farmName":"Farm name","dash.district":"District","dash.upazila":"Upazila",
    "dash.lang":"Preferred language","dash.soilPh":"Soil pH","dash.soilOm":"Organic matter %",
    "dash.save":"Save changes","dash.saved":"Saved to your account","dash.loading":"Loading…",
    "dash.empty":"Nothing saved yet","dash.none":"not set","dash.noPrio":"No priorities saved yet",
    "dash.emptyAna":"No analyses yet. Run one on your field and it will be kept here.",
    "dash.emptyPlan":"No saved rotation plans yet.",
    "dash.goRun":"Start an analysis","dash.load":"Load into form","dash.loaded":"Loaded into the field form",
    "dash.delete":"Delete","dash.view":"View","dash.saveCurrent":"Save the current rotation plan",
    "dash.plan":"Rotation plan","dash.planSaved":"Rotation plan saved","dash.memberSince":"Member since",
    "dash.search":"Search analyses…","dash.sort":"Sort","dash.newest":"Newest","dash.oldest":"Oldest",
    "dash.undo":"Undo","dash.deleted":"Deleted","dash.autofill":"Fill my form automatically",
    "dash.autofillHint":"On login, Agroscope restores your saved location, land size, crop, soil and priorities.",
    "dash.wipe":"Delete all my data","dash.wipeAsk":"Delete ALL your analyses and saved plans? This cannot be undone.",
    "dash.wipeDone":"All your data was deleted","dash.title":"Your farm dashboard","dash.loggedOut":"You are logged out"
  },
  bn: {
    "nav.input":"খামার তথ্য","nav.geo":"ভূগোল","nav.crops":"ফসল","nav.risk":"ঝুঁকি","nav.rot":"ঘূর্ণন","nav.reco":"পরামর্শ","nav.help":"সাহায্য",
    "hero.eyebrow":"পৃথিবী পর্যবেক্ষণ · মাটি · জলবায়ু",
    "hero.title1":"আপনার জমি পড়ুন।","hero.title2":"মৌসুম বদলান।",
    "hero.lede":"আপনার জমি কতটুকু বহন করতে পারে দেখুন। পরবর্তী তিন মৌসুম এক পর্দায় পরিকল্পনা করুন।",
    "hero.b1":"খামার দিয়ে শুরু","hero.b2":"মানচিত্র ও তথ্য","hero.b3":"ফসলের উপযোগিতা","hero.b4":"ঝুঁকি","hero.b5":"ঘূর্ণন","hero.b6":"সাহায্য",
    "hero.src":"NASA পৃথিবী পর্যবেক্ষণ তথ্যের উপর ভিত্তি","hero.scroll":"স্ক্রল",
    "hero.stat1":"পৃথিবী-পর্যবেক্ষণ স্তর","hero.stat2":"বাংলাদেশের জেলা","hero.stat3":"ঘূর্ণন পরিকল্পনা মাপা",
    "buddy.tag":"ক্ষেতের সহকারী",
    "buddy.idle":"আপনার জমির কথা বলুন — আমি সাথে থাকব।",
    "buddy.typing":"ভালো হচ্ছে — এগিয়ে যান। অবস্থান, জমি, ফসল…",
    "buddy.busy":"কক্ষপথ থেকে আপনার জমি পড়া হচ্ছে…",
    "buddy.done":"ফলাফল প্রস্তুত — নিচে আপনার পরিকল্পনা অপেক্ষা করছে।",
    "buddy.infoTag":"কীভাবে কাজ করে","buddy.more":"কীভাবে কাজ করে",
    "buddy.step1":"অবস্থান, জমির পরিমাণ ও বর্তমান ফসল লিখুন।",
    "buddy.step2":"পরামর্শ আপনার খামারের মতো হতে কয়েকটি অগ্রাধিকার বেছে নিন।",
    "buddy.step3":"বিশ্লেষণ চাপুন — NASA পৃথিবী তথ্য আপনার জমি পড়ে।",
    "buddy.step4":"খরচ, ঝুঁকি ও পুরো আবর্তন দেখতে পরিকল্পনাটি খুলুন।",
    "buddy.infoFoot":"পুনরায় দেখতে যেকোনো সময় আমাকে চাপুন।",
    "buddy.readyTag":"পরিকল্পনা প্রস্তুত",
    "buddy.readyLong":"আগে সংক্ষিপ্ত উত্তর — এটিই আমরা করতে বলব ফসল আবর্তন। খরচ ও ঝুঁকির হিসাব খুলে দেখুন।",
    "buddy.hide":"সহকারী লুকান","buddy.show":"সহকারী দেখান",
    "mapbuddy.tag":"SHOBUJ · সবুজ",
    "mapbuddy.t1":"টিপ: প্রতি সপ্তাহে NDVI দেখুন — হঠাৎ নামলে পোকা আক্রমণ বোঝা যায় দৃশ্যমান হওয়ার আগেই।",
    "mapbuddy.t2":"টিপ: আগে পিন দিন — এই পাতার প্রতিটি রিডিং সেই বিন্দু অনুসরণ করে।",
    "mapbuddy.t3":"টিপ: সবুজ ও মাটির আর্দ্রতা পড়তে EO স্তরে যান।",
    "mapbuddy.t4":"টিপ: টিল্ট করে ঘুরান — ৩ডি ভিউয়ে ঢাল, বন্যার পথ ও জমির সীমা দেখা যায়।",
    "sec.input":"খামার সম্পর্কে বলুন","sec.inputSub":"তথ্য দিয়ে বিশ্লেষণ চালান — নিচের ফলাফল তারপরই দেখা যাবে।",
    "f.loc":"অবস্থান","f.locPh":"জেলা, গ্রাম বা স্থানাঙ্ক","f.locMe":"আমার অবস্থান নিন",
    "f.div":"বিভাগ / জেলা","f.divPh":"একটি জেলা বাছুন","f.area":"জমির পরিমাণ","f.areaPh":"যেমন: ১.৮",
    "f.crop":"বর্তমান ফসল","f.cropPh":"যেমন: বোরো ধান, গম, ভুট্টা","f.cam":"স্ক্যান","f.clear":"সরান",
    "f.soil":"মাটির তথ্য","f.optional":"ঐচ্ছিক","f.soilType":"মাটির ধরন","f.texture":"গঠন",
    "f.skip":"স্যাটেলাইট থেকে আনুমানিক","f.prio":"খামারীর অগ্রাধিকার","f.prioHint":"নিচ থেকে কয়েকটি বেছে নিন",
    "f.selected":"টি নির্বাচিত","f.run":"এই খামার বিশ্লেষণ করুন",
    "sec.geo":"ভূগোল বিশ্লেষণ","sec.geoSub":"মানচিত্র বদলান। পাশের তথ্যও সেই অনুযায়ী বদলাবে।",
    "map.live":"সরাসরি খামার/অঞ্চল","map.cover":"ভূমি আবরণ / মাটি","map.eo":"EO স্তর",
    "map.hint":"অবস্থানের পিন দিন · টেনে সরান · জুমের জন্য চাকা · পয়েন্টারে ক্লিক করুন",
    "map.bd":"বাংলাদেশ","map.pick":"মানচিত্রে অবস্থান দিন","map.picking":"পিন রাখতে মানচিত্রে যেকোনো জায়গায় ক্লিক করুন…",
    "map.prompt":"কোনো মাঠ নির্বাচিত নয় — বিশ্লেষণের জন্য অবস্থান দিন","map.set":"অবস্থান পিন করা হয়েছে — এই পয়েন্ট অনুযায়ী বিশ্লেষণ",
    "map.outside":"এই পয়েন্ট বাংলাদেশের বাইরে — সীমানার ভেতরে অবস্থান দিন",
    "legend.ndvi":"NDVI · গাছপালার সবুজ","legend.evi":"EVI · উন্নত সবুজ",
    "legend.npwi":"NPWI · ভূপৃষ্ঠের পানি","legend.lai":"LAI · পাতার ক্ষেত্রফল",
    "legend.et":"ET · বাষ্পীভবন","legend.lst":"LST · ভূপৃষ্ঠের তাপমাত্রা",
    "legend.sm":"SM · মাটির আর্দ্রতা","legend.cover":"ভূমি আবরণ","legend.soil":"মাটি / পতিত",
    "f.pickMap":"মানচিত্রে বাছুন",
    "geo.climate":"জলবায়ু তথ্য","geo.temp":"তাপমাত্রা","geo.hum":"আর্দ্রতা","geo.rain":"বৃষ্টিপাত",
    "geo.hazard":"জলবায়ু বিপদ/ঝুঁকি · আগামী ১২ মাস","geo.soil":"মাটি প্রতিবেদন","geo.soilSrc":"খামারের নমুনা + স্যাটেলাইট আনুমান",
    "sec.crops":"ফসলের উপযোগিতা","sec.cropsSub":"এই খামারের জন্য সাজানো। কারণ দেখতে একটিতে চাপ দিন।",
    "sec.risk":"এই জমির ঝুঁকি","sec.riskSub":"এখন খামারকে কী হুমকি, আর কবে।","risk.cal":"হুমকির পাতা · মাস অনুযায়ী তীব্রতা",
    "sec.rot":"ঘূর্ণন তুলনা","sec.rotSub":"চারটি বিকল্প, আপনার অগ্রাধিকার অনুযায়ী মাপা। খুলতে ক্লিক করুন।",
    "sec.reco":"চূড়ান্ত সুপারিশ","sec.recoSub":"একটি ছোট উত্তর। পরিকল্পনায় ক্লিক করলে পুরো হিসাব খুলবে।",
    "sec.help":"সাহায্য ও সমর্থন","sec.helpSub":"এই খামারের জন্য ব্যবহারিক পরবর্তী ধাপ।",
    "foot.note":"প্রোটোটাইপ ইন্টারফেস। দেখানো মানগুলো NASA পৃথিবী পর্যবেক্ষণ ডেটা (MODIS, SMAP, Landsat, GPM, POWER) ও স্থানীয় মাটির রেকর্ড মিলিয়ে তৈরি আনুমানিক মান।",
    "foot.support":"সহায়তা","foot.data":"তথ্যের উৎস","foot.built":"ফিল্ড শিফট · নাসা স্পেস অ্যাপস",
    "load.title":"আপনার খামার পড়া হচ্ছে",
    "load.s1":"খামারের সীমানা চিহ্নিত","load.s2":"NASA পৃথিবী পর্যবেক্ষণ তুলছে","load.s3":"মাটির প্রোফাইল পড়া","load.s4":"জলবায়ু ও বিপদ মাপা","load.s5":"আপনার অগ্রাধিকার মেলানো",
    "prio.disaster":"দুর্যোগ এড়ানো","prio.yield":"উৎপাদন","prio.pest":"পোকামাকড় রক্ষা","prio.water":"পানির চাহিদা","prio.cost":"খরচ","prio.early":"তাড়াতাড়ি ফসল","prio.soil":"মাটির গুণ","prio.profit":"লাভ","prio.longer":"দীর্ঘ সংরক্ষণ",
    "ui.why":"কেন এই খামারে উপযোগী","ui.pros":"সুবিধা","ui.cons":"অসুবিধা","ui.factors":"উপযোগিতার উপাদান",
    "ui.suit":"উপযোগিতা","ui.scores":"১০০ এর মধ্যে","ui.rank":"অবস্থান","ui.open":"খুলুন",
    "ui.sustain":"স্থায়িত্ব","ui.match":"অগ্রাধিকার মিল","ui.risk":"ঝুঁকি","ui.profit":"লাভ",
    "ui.riskLv":"ঝুঁকির মাত্রা","ui.low":"কম","ui.med":"মাঝারি","ui.high":"উচ্চ",
    "ui.econ":"অর্থনৈতিক দিক","ui.cost":"খরচ","ui.output":"উৎপাদন","ui.benefits":"সুবিধা",
    "ui.calendar":"ফসল ক্যালেন্ডার","ui.perHa":"প্রতি হেক্টর / মৌসুম","ui.vs":"বর্তমান চর্চার তুলনায়",
    "ui.matchTitle":"অগ্রাধিকার মিল","ui.matchNote":"শুধু আপনার বাছাই করা অগ্রাধিকার। না বাছাই সব ধূসর।",
    "ui.recoTag":"সুপারিশকৃত","ui.alt1":"ভারসাম্যের জন্য ভালো","ui.alt2":"সর্বনিম্ন ঝুঁকি",
    "ui.openPlan":"পরিকল্পনায় ক্লিক করলে খরচ, উৎপাদন, লাভ, ক্যালেন্ডার ও ঝুঁকি দেখা যাবে",
    "ui.helpful":"ব্যবহারিক পরামর্শ","ui.irrigation":"সেচের পরামর্শ","ui.soilTips":"মাটি ব্যবস্থাপনা","ui.general":"অন্যান্য পরামর্শ",
    "ui.waterNeed":"পানির চাহিদা","ui.deficit":"অল্প পানি দিলেও উৎপাদন প্রায় একই থাকে",
    "ui.support":"কৃষি বিশেষজ্ঞের সঙ্গে কথা বলুন","ui.docs":"তথ্য গাইড পড়ুন","ui.feedback":"মতামত পাঠান",
    "ui.close":"বন্ধ","ui.month":"মাস","ui.now":"এখন","ui.ha":"হেক্টর","ui.matched":"মিলেছে",
    "ui.locSet":"ডিভাইস থেকে অবস্থান নেওয়া হয়েছে","ui.locNone":"অবস্থান পাওয়া যায়নি — ডেমো খামার দেখানো হচ্ছে",
    "ui.camErr":"ছবিটি পড়া যায়নি","ui.needPrio":"অন্তত একটি অগ্রাধিকার বেছে নিন","ui.needCrop":"আগে বর্তমান ফসল লিখুন","ui.analysing":"বিশ্লেষণ হচ্ছে…",
    "ui.lockMsg":"ধাপ ০১-এ বিশ্লেষণ চালানোর পর এখানে ফলাফল দেখা যাবে।","ui.dirty":"ইনপুট বদলেছে — আবার বিশ্লেষণ চালান।",
    "ui.legend":"তথ্যবলি","ui.detect":"শনাক্ত","ui.conf":"মিল",
    "clim.max":"বছরে সর্বোচ্চ","clim.min":"বছরে সর্বনিম্ন","clim.rain":"বার্ষিক বৃষ্টি","clim.hum":"গড় আর্দ্রতা",
    "clim.unitT":"°C","clim.unitR":"মিমি","clim.unitH":"%",
    "auth.login":"লগ ইন","auth.signup":"নতুন অ্যাকাউন্ট","auth.name":"পুরো নাম","auth.namePh":"যেমন: রহিম উদ্দিন",
    "auth.email":"ইমেইল ঠিকানা","auth.emailPh":"you@example.com","auth.password":"পাসওয়ার্ড","auth.passPh":"অন্তত ৮ অক্ষর",
    "auth.show":"দেখুন","auth.hide":"লুকান","auth.confirm":"পাসওয়ার্ড আবার লিখুন","auth.remember":"মনে রাখুন","auth.forgot":"পাসওয়ার্ড ভুলে গেছেন?",
    "auth.goLogin":"লগ ইন","auth.goCreate":"অ্যাকাউন্ট খুলুন","auth.noAccount":"এখনো অ্যাকাউন্ট নেই?","auth.haveAccount":"আগে থেকেই অ্যাকাউন্ট আছে?",
    "auth.titleLogin":"ফিরে আসায় স্বাগতম","auth.subLogin":"আপনার সংরক্ষিত খামার ও আগের বিশ্লেষণ অপেক্ষায় আছে।",
    "auth.titleSignup":"অ্যাকাউন্ট খুলুন","auth.subSignup":"Agroscope আপনার জমি, মাটি ও অগ্রাধিকার মনে রাখবে।",
    "auth.errName":"অনুগ্রহ করে পুরো নাম লিখুন","auth.errEmail":"সঠিক ইমেইল ঠিকানা লিখুন","auth.errTaken":"এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে",
    "auth.errPwLen":"অন্তত ৮ অক্ষর ব্যবহার করুন","auth.errMatch":"দুটি পাসওয়ার্ড মিলছে না","auth.errCreds":"ইমেইল বা পাসওয়ার্ড ভুল",
    "auth.errPwReq":"আপনার পাসওয়ার্ড লিখুন","auth.welcome":"Agroscope-এ ফিরে আসায় স্বাগতম","auth.created":"অ্যাকাউন্ট তৈরি হয়েছে — স্বাগতম",
    "auth.logout":"লগ আউট","auth.demoHint":"ডেমো অ্যাকাউন্ট আপনার ব্রাউজারে চলে। চেষ্টা করুন rahim@farm.bd / harvest123।",
    "dash.profile":"আমার প্রোফাইল","dash.farm":"আমার খামার","dash.analyses":"আগের বিশ্লেষণ","dash.plans":"সংরক্ষিত পরিকল্পনা","dash.settings":"অ্যাকাউন্ট সেটিংস","dash.logout":"লগ আউট",
    "dash.farmName":"খামারের নাম","dash.district":"জেলা","dash.upazila":"উপজেলা","dash.lang":"পছন্দের ভাষা","dash.soilPh":"মাটির pH","dash.soilOm":"জৈব পদার্থ %",
    "dash.save":"পরিবর্তন সংরক্ষণ","dash.saved":"অ্যাকাউন্টে সংরক্ষিত","dash.loading":"আনা হচ্ছে…","dash.empty":"এখনো কিছু সংরক্ষিত নেই","dash.none":"নেই","dash.noPrio":"কোনো অগ্রাধিকার সংরক্ষিত নেই",
    "dash.emptyAna":"এখনো কোনো বিশ্লেষণ নেই। আপনার খামারে একটি চালান — এখানে জমা থাকবে।","dash.emptyPlan":"এখনো কোনো সংরক্ষিত ঘূর্ণন পরিকল্পনা নেই।",
    "dash.goRun":"বিশ্লেষণ শুরু করুন","dash.load":"ফর্মে বসান","dash.loaded":"ফর্মে বসানো হয়েছে","dash.delete":"মুছুন","dash.view":"দেখুন",
    "dash.saveCurrent":"বর্তমান ঘূর্ণন পরিকল্পনা সংরক্ষণ","dash.plan":"ঘূর্ণন পরিকল্পনা","dash.planSaved":"ঘূর্ণন পরিকল্পনা সংরক্ষিত","dash.memberSince":"সদস্য হয়েছেন",
    "dash.search":"বিশ্লেষণ খুঁজুন…","dash.sort":"সাজান","dash.newest":"নতুন","dash.oldest":"পুরোনো","dash.undo":"ফেরান","dash.deleted":"মুছে ফেলা হয়েছে",
    "dash.autofill":"ফর্ম স্বয়ংক্রিয়ভাবে পূরণ হোক","dash.autofillHint":"লগ ইন করলে Agroscope সংরক্ষিত অবস্থান, জমি, ফসল, মাটি ও অগ্রাধিকার ফিরিয়ে আনবে।",
    "dash.wipe":"আমার সব তথ্য মুছুন","dash.wipeAsk":"আপনার সব বিশ্লেষণ ও পরিকল্পনা মুছে ফেলবেন? এটি আর ফিরানো যাবে না।","dash.wipeDone":"আপনার সব তথ্য মুছে ফেলা হয়েছে","dash.title":"আপনার খামার ড্যাশবোর্ড","dash.loggedOut":"আপনি লগ আউট হয়েছেন"
  }
};

(function () {
  var R = window.React;
  var Ctx = R.createContext(null);
  var BN_DIGITS = "০১২৩৪৫৬৭৮৯";

  function makeApi(lang) {
    var dict = window.I18N[lang] || window.I18N.en;
    function t(k) {
      var v = dict[k];
      if (v !== undefined && v !== "") return v;
      return window.I18N.en[k] !== undefined ? window.I18N.en[k] : k;
    }
    function T(o) {
      if (o == null) return "";
      if (typeof o === "string") return o;
      return o[lang] != null ? o[lang] : o.en;
    }
    function nfmt(v, d) {
      var s = Number(v).toFixed(d == null ? 0 : d);
      if (lang === "bn") s = s.replace(/[0-9]/g, function (c) { return BN_DIGITS[+c]; });
      return s;
    }
    function months() { return lang === "bn" ? window.DATA.monthsBn : window.DATA.months; }
    return { lang: lang, t: t, T: T, nfmt: nfmt, months: months };
  }

  function I18nProvider(props) {
    var saved = "en";
    try { var s = localStorage.getItem("agroscope-lang"); if (s === "bn" || s === "en") saved = s; } catch (e) {}
    var st = R.useState(saved);
    var lang = st[0], setLangState = st[1];
    var api = R.useMemo(function () { return makeApi(lang); }, [lang]);
    function setLang(l) {
      setLangState(l);
      try { localStorage.setItem("agroscope-lang", l); } catch (e) {}
      document.documentElement.lang = l === "bn" ? "bn" : "en";
      document.body.classList.toggle("bn", l === "bn");
    }
    R.useEffect(function () {
      document.documentElement.lang = lang === "bn" ? "bn" : "en";
      document.body.classList.toggle("bn", lang === "bn");
    }, [lang]);
    var value = R.useMemo(function () { return Object.assign({}, api, { setLang: setLang }); }, [api]);
    return R.createElement(Ctx.Provider, { value: value }, props.children);
  }

  function useI18n() { return R.useContext(Ctx); }
  window.AgI18n = { Provider: I18nProvider, use: useI18n, makeApi: makeApi };
})();