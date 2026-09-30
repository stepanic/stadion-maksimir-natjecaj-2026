// Zajednička jezgra offline prototipa glasanja.
//
// Svaka varijanta (dvoboj, swipe, MaxDiff, žetoni, brzi izbor) je samo drugačiji način da se
// složi ISTI kanonski listić: cijeli brojevi bodova po šifri rada, zbroj točno 100. Taj listić
// je jedino što bi prava aplikacija predala (Certilia → ZK dokaz → Gnosis). Ovdje se ništa ne šalje.

(function () {
  const RADOVI = window.RADOVI || [];
  const BY = Object.fromEntries(RADOVI.map((r) => [r.code, r]));

  // ── nasumičnost (sjeme po sesiji, kao mulberry32 na maksimirski-stadion.org) ──
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Sjeme je po stranici: tko isproba više varijanti, ne vidi svaki put iste radove prve.
  function seed() {
    const key = "ux-seed:" + location.pathname;
    let s = null;
    try { s = sessionStorage.getItem(key); } catch (e) {}
    if (!s) {
      s = String(crypto.getRandomValues(new Uint32Array(1))[0]);
      try { sessionStorage.setItem(key, s); } catch (e) {}
    }
    return Number(s);
  }
  const rnd = mulberry32(seed());
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ── slijepi mod: imena timova skrivena dok se bira ──
  function isBlind() { try { return localStorage.getItem("ux-blind") !== "0"; } catch (e) { return true; } }
  function setBlind(v) {
    try { localStorage.setItem("ux-blind", v ? "1" : "0"); } catch (e) {}
    document.body.classList.toggle("blind", v);
  }

  // ── mjerenje (za razgovor s ljudima: koliko je trajalo, koliko odluka) ──
  const T0 = Date.now();
  let actions = 0;
  const act = () => { actions++; };
  const stats = () => ({ seconds: Math.round((Date.now() - T0) / 1000), actions });

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
    return e;
  }

  function header(title, meta) {
    const box = el("input", { type: "checkbox" });
    box.checked = isBlind();
    box.addEventListener("change", () => setBlind(box.checked));
    const bar = el("div", { class: "top" },
      el("a", { class: "back", href: "index.html" }, "←"),
      el("div", { class: "title" }, title),
      el("div", { class: "meta", id: "meta" }, meta || ""),
      el("label", { class: "toggle", title: "Sakrij imena timova dok biraš" }, box, "slijepo"));
    document.body.prepend(bar);
    setBlind(isBlind());
  }
  const setMeta = (t) => { const m = document.getElementById("meta"); if (m) m.textContent = t; };

  function card(code, opts = {}) {
    const r = BY[code];
    const c = el("div", { class: "work" + (opts.cls ? " " + opts.cls : ""), "data-code": code },
      el("img", { src: r.img, alt: "Rad " + code, draggable: "false" }),
      el("div", { class: "cap" },
        el("div", { class: "code" }, code),
        el("div", { class: "team" }, r.team + " · " + r.countries.join(", "))));
    if (opts.onclick) c.addEventListener("click", opts.onclick);
    return c;
  }

  // ── iz težina u bodove: najveći ostatak, cijeli brojevi, zbroj 100 ──
  function allocate(weights, total = 100) {
    const e = Object.entries(weights).filter(([, w]) => w > 0);
    const W = e.reduce((s, [, w]) => s + w, 0);
    if (!W) return {};
    const raw = e.map(([c, w]) => [c, (w / W) * total]);
    const out = Object.fromEntries(raw.map(([c, x]) => [c, Math.floor(x)]));
    let left = total - Object.values(out).reduce((s, x) => s + x, 0);
    raw.sort((a, b) => (b[1] % 1) - (a[1] % 1));
    for (let i = 0; left > 0; i = (i + 1) % raw.length, left--) out[raw[i][0]]++;
    for (const c of Object.keys(out)) if (!out[c]) delete out[c];
    return out;
  }
  // Borda nad prvih k: 1. mjesto k bodova težine, zadnje 1.
  function bordaWeights(ordered, k = 5) {
    const top = ordered.slice(0, k);
    return Object.fromEntries(top.map((c, i) => [c, top.length - i]));
  }
  const bordaTop = (ordered, k = 5) => allocate(bordaWeights(ordered, k));
  // Kanonski oblik, isti kao items_canon u lancu faze 1: "ŠIFRA:bodovi,…" sortirano po šifri, bez nula.
  const canon = (b) => Object.keys(b).filter((c) => b[c] > 0).sort().map((c) => `${c}:${b[c]}`).join(",");

  // ── zajednički završni korak: pregled i uređivanje listića ──
  //
  // Prijedlog je nacrt, ne odluka (efekt zadane vrijednosti, automation bias): uz njega su jednako
  // istaknuti „od nule” i „ravnomjerno”, klizač koncentracije vraća korisniku odluku o intenzitetu,
  // a bilježi se je li prijedlog uopće mijenjan.
  function ballotEditor(root, ballot, variant, why, opts = {}) {
    const base = opts.base || null;                  // težine iz kojih je prijedlog nastao (za klizač)
    let codes = Object.keys(base || ballot).sort((x, y) => (ballot[y] || 0) - (ballot[x] || 0));
    const b = Object.fromEntries(codes.map((c) => [c, ballot[c] || 0]));
    let edited = false;
    const touch = () => { edited = true; act(); };

    root.innerHTML = "";
    const list = el("div");
    const sum = el("span", { class: "sum" });
    const submit = el("button", { class: "btn red", onclick: done }, "Predaj eOsobnom");
    const out = el("div");
    const set = (w) => { for (const c of codes) b[c] = 0; Object.assign(b, allocate(w)); draw(); };

    const tools = el("div", { class: "row", style: "margin:8px 0 10px" },
      el("button", { class: "btn", onclick: () => { touch(); for (const c of codes) b[c] = 0; if (slider) slider.value = 1; draw(); } }, "Od nule, raspodijelit ću sam"),
      el("button", { class: "btn", onclick: () => { touch(); set(Object.fromEntries(codes.map((c) => [c, 1]))); } }, "Ravnomjerno"),
      el("button", { class: "btn", id: "fit", onclick: () => { touch(); set({ ...b }); } }, "Svedi na 100"));
    let slider = null;
    const conc = el("div", { class: "row muted", style: "font-size:14px;margin-bottom:6px" });
    if (base) {
      slider = el("input", { type: "range", min: "0", max: "3", step: "0.25", value: "1", style: "flex:1;min-width:140px", "aria-label": "koncentracija bodova" });
      slider.addEventListener("input", () => { touch(); const q = Number(slider.value); set(Object.fromEntries(codes.map((c) => [c, (base[c] || 0) ** q || (q === 0 ? 1 : 0)]))); });
      conc.append("raširi", slider, "koncentriraj");
    }

    root.append(
      el("h2", {}, "Tvoj listić"),
      el("div", { class: "why" }, why, codes.some((c) => b[c] > 0)
        ? " Ovo je prijedlog: bodove možeš mijenjati, pomaknuti klizač ili krenuti od nule. Listić je tvoj, a ne algoritmov."
        : " Upiši bodove ili koristi + i −. Ispod popisa piše koliko ti je bodova preostalo."),
      tools, conc,
      el("div", { class: "ballot" }, list),
      el("div", { class: "row", style: "margin-top:12px" }, sum, el("div", { class: "spacer" }), submit),
      out);

    function draw() {
      list.innerHTML = "";
      if (!codes.length) list.append(el("p", { class: "muted" }, "Listić je prazan."));
      for (const c of codes) {
        const r = BY[c];
        const inp = el("input", { type: "number", min: "0", max: "100", value: String(b[c]), style: "width:52px;text-align:center;font-weight:700;font-size:16px;border:1px solid var(--line);border-radius:8px;padding:3px", "aria-label": "bodovi za " + c });
        inp.addEventListener("change", () => { touch(); b[c] = Math.max(0, Math.min(100, Math.round(Number(inp.value) || 0))); draw(); });
        list.append(el("div", { class: "line" },
          el("img", { src: r.img, alt: "" }),
          el("div", {},
            el("div", {}, el("span", { class: "code" }, c), " ", el("span", { class: "team muted" }, "· " + r.team)),
            el("div", { class: "bar" }, el("i", { style: `width:${b[c]}%` }))),
          el("div", { class: "pts" },
            el("button", { onclick: () => { touch(); b[c] = Math.max(0, b[c] - 1); draw(); }, "aria-label": "manje" }, "−"),
            inp,
            el("button", { onclick: () => { touch(); b[c] = Math.min(100, b[c] + 1); draw(); }, "aria-label": "više" }, "+"),
            el("button", { onclick: () => { touch(); codes = codes.filter((x) => x !== c); delete b[c]; draw(); }, "aria-label": "makni s listića", title: "makni s listića" }, "✕"))));
      }
      const s = codes.reduce((x, c) => x + b[c], 0);
      // Stalno vidljiv ostatak bodova (Wellings i sur. 2023: 68 % bira sučelje s preostalim bodovima uživo)
      sum.textContent = s === 100 ? "Zbroj: 100 ✓" : s < 100 ? `Preostalo još ${100 - s} bodova` : `Previše za ${s - 100} bodova`;
      sum.className = "sum " + (s === 100 ? "ok" : "bad");
      submit.disabled = s !== 100;
      tools.querySelector("#fit").classList.toggle("hidden", s === 100 || s === 0);
    }

    function done() {
      act();
      submit.disabled = true;
      out.innerHTML = "";
      out.append(
        el("div", { class: "why" }, "U pravoj aplikaciji ovdje slijedi prijava (Certilia), ZK dokaz u pregledniku i zapis na Gnosis Chain. Isti korak za sve varijante. Ovo je prototip: ništa nije poslano."),
        el("div", { class: "muted" }, "Kanonski listić (ovo bi se potpisalo):"),
        el("pre", { class: "json" }, canon(b)),
        el("div", { class: "muted", style: "font-size:13px" }, edited ? "Prijedlog si mijenjao/la." : "Prijedlog si prihvatio/la bez promjene."));
      feedback(out, variant, b, { edited, conc: slider ? Number(slider.value) : null });
    }
    draw();
  }

  // ── povratna informacija: sprema se samo na ovom uređaju ──
  function feedback(root, variant, ballot, meta = {}) {
    const qs = [["jasno", "Koliko je bilo jasno što treba raditi?"], ["odgovara", "Koliko listić odgovara tvom mišljenju?"], ["zabavno", "Koliko je bilo ugodno ili zabavno?"]];
    const ans = {};
    const note = el("textarea", { placeholder: "Što ti se svidjelo, što je smetalo? (neobavezno)" });
    const saveBtn = el("button", { class: "btn primary", onclick: save }, "Spremi odgovor");
    const box = el("div", { class: "fb" }, el("h2", {}, "Kako ti se svidio ovaj način?"));
    for (const [k, q] of qs) {
      const stars = el("span", { class: "stars" });
      for (let i = 1; i <= 5; i++) stars.append(el("button", { "aria-label": `${i} od 5`, onclick: () => { ans[k] = i; [...stars.children].forEach((s, j) => s.classList.toggle("on", j < i)); } }, "★"));
      box.append(el("div", { style: "margin:6px 0" }, el("div", {}, q), stars));
    }
    const st = stats();
    box.append(note, el("div", { class: "row", style: "margin-top:8px" }, el("span", { class: "muted" }, `Trajanje: ${Math.floor(st.seconds / 60)} min ${st.seconds % 60} s · odluka: ${st.actions}`), el("div", { class: "spacer" }), saveBtn));
    root.append(box);
    function save() {
      const rec = { variant, ...ans, comment: note.value.trim(), ...stats(), ...meta, ballot: canon(ballot), ts: new Date().toISOString() };
      let all = [];
      try { all = JSON.parse(localStorage.getItem("ux-fb") || "[]"); } catch (e) {}
      all.push(rec);
      try { localStorage.setItem("ux-fb", JSON.stringify(all)); } catch (e) {}
      saveBtn.disabled = true;
      saveBtn.textContent = "Spremljeno ✓";
      box.append(el("p", {}, "Hvala! ", el("a", { href: "index.html" }, "Isprobaj drugi način"), " ili ", el("a", { href: "index.html#odgovori" }, "pogledaj sve odgovore s ovog uređaja"), "."));
    }
  }

  window.UX = { RADOVI, BY, rnd, shuffle, el, header, setMeta, card, allocate, bordaWeights, bordaTop, canon, ballotEditor, act, stats };
})();
