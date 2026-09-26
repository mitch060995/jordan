/* =========================================================
   Shared site behaviour + the index "lay the floor" scroll scene
   ========================================================= */
(function () {
  const S = window.SITE || {};
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Fill in business details from config.js ---------- */
  const telHref = "tel:" + (S.phone || "").replace(/[^\d+]/g, "");
  document.querySelectorAll("[data-site]").forEach((el) => {
    const key = el.dataset.site;
    if (S[key]) el.textContent = S[key];
  });
  document.querySelectorAll("[data-tel]").forEach((a) => (a.href = telHref));
  document.querySelectorAll("[data-mail]").forEach((a) => (a.href = "mailto:" + S.email));
  document.querySelectorAll("[data-abn]").forEach((el) => {
    if (S.abn) el.textContent = "ABN " + S.abn; else el.remove();
  });
  if (S.name) document.title = document.title.replace(/^[^|–—]+/, S.name + " ");
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- Nav ---------- */
  const nav = document.querySelector(".nav");
  const onScrollNav = () => nav && nav.classList.toggle("scrolled", window.scrollY > 30);
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
    nav.querySelectorAll(".nav-links a").forEach((a) =>
      a.addEventListener("click", () => { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", false); })
    );
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- Pattern canvases (lazy) ---------- */
  const drawn = new WeakSet();
  const drawCanvas = (c) => {
    if (!window.TilePatterns || drawn.has(c)) return;
    drawn.add(c);
    TilePatterns.draw(c, c.dataset.pattern, { seed: +c.dataset.seed || 11, scale: +c.dataset.scale || 1 });
  };
  const cio = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { drawCanvas(e.target); cio.unobserve(e.target); } }),
    { rootMargin: "300px" }
  );
  document.querySelectorAll("canvas[data-pattern]").forEach((c) => cio.observe(c));
  let rT;
  window.addEventListener("resize", () => {
    clearTimeout(rT);
    rT = setTimeout(() => document.querySelectorAll("canvas[data-pattern]").forEach((c) => {
      if (drawn.has(c)) { drawn.delete(c); drawCanvas(c); }
    }), 250);
  });

  /* ---------- Pattern studio ---------- */
  const studio = document.querySelector("[data-studio]");
  if (studio && window.TilePatterns) {
    const box = studio.querySelector(".studio-canvas");
    const desc = studio.querySelector(".pattern-desc");
    const tabs = [...studio.querySelectorAll("[data-p]")];
    let current = box.querySelector("canvas");
    const show = (btn, first) => {
      tabs.forEach((b) => b.setAttribute("aria-selected", b === btn));
      desc.innerHTML = `<strong>${btn.textContent}</strong>${btn.dataset.desc}`;
      box.classList.toggle("pool", btn.dataset.p === "pool");
      const next = document.createElement("canvas");
      next.setAttribute("aria-hidden", "true");
      next.className = first ? "" : "out";
      box.appendChild(next);
      TilePatterns.draw(next, btn.dataset.p, { seed: 21 + tabs.indexOf(btn) });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        next.classList.remove("out");
        if (current && current !== next) {
          const old = current;
          old.classList.add("out");
          setTimeout(() => old.remove(), 600);
        }
        current = next;
      }));
    };
    tabs.forEach((b) => b.addEventListener("click", () => { show(b); stopAuto(); }));
    if (current) current.remove(), (current = null);
    let started = false, auto;
    const stopAuto = () => clearInterval(auto);
    new IntersectionObserver((es, o) => {
      if (es[0].isIntersecting && !started) {
        started = true; o.disconnect(); show(tabs[0], true);
        if (!reduced) auto = setInterval(() => {
          const i = tabs.findIndex((b) => b.getAttribute("aria-selected") === "true");
          show(tabs[(i + 1) % tabs.length]);
        }, 4200);
      }
    }, { rootMargin: "200px" }).observe(box);
  }

  /* =========================================================
     HERO: tiles fly in and get laid, grouted & sealed on scroll
     ========================================================= */
  const lay = document.querySelector(".lay");
  if (!lay) return;
  const floor = lay.querySelector(".floor");
  const intro = lay.querySelector(".lay-intro");
  const final = lay.querySelector(".lay-final");
  const shade = lay.querySelector(".lay-shade");
  const laserH = lay.querySelector(".laser.h");
  const laserV = lay.querySelector(".laser.v");
  const steps = [...lay.querySelectorAll(".lay-steps li")];

  const TONES = [
    ["#ece6db", "#d9d0c1"], ["#e6dfd3", "#cfc5b4"], ["#f1ece4", "#ddd4c6"],
    ["#e1d8ca", "#c9bda9"], ["#ebe4d8", "#d4c9b8"], ["#d8cdbc", "#c2b49e"],
  ];
  let tiles = [], cols = 0, rows = 0;

  function build() {
    const mobile = window.innerWidth <= 700;
    const c = mobile ? 6 : 10, r = mobile ? 9 : 7;
    if (c === cols && r === rows) return;
    cols = c; rows = r;
    floor.innerHTML = "";
    tiles = [];
    const rand = mulberry(42);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const el = document.createElement("div");
        el.className = "tile";
        const t = TONES[Math.floor(rand() * TONES.length)];
        el.style.setProperty("--t1", t[0]);
        el.style.setProperty("--t2", t[1]);
        el.style.setProperty("--vein-a", 100 + rand() * 60 + "deg");
        el.style.setProperty("--vein-b", 10 + rand() * 50 + "deg");
        floor.appendChild(el);
        // Lay from the far corner outward, like a tiler working toward the door
        const order = (x + (rows - 1 - y)) / (cols + rows - 2);
        const side = x < cols / 2 ? -1 : 1;
        tiles.push({
          el,
          start: 0.12 + order * 0.32 + rand() * 0.04,
          dx: side * (150 + rand() * 450),
          dy: -250 - rand() * 400,
          dz: 120 + rand() * 280,
          rx: (rand() - 0.5) * 160,
          ry: (rand() - 0.5) * 160,
          rz: (rand() - 0.5) * 220,
        });
      }
    }
  }

  function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ?p=0.5 in the URL freezes the animation at that point (handy for previews)
  const qp = new URLSearchParams(location.search).get("p");
  const forcedP = qp === null ? null : clamp(parseFloat(qp) || 0);
  let ticking = false, lastP = -1;

  function render() {
    ticking = false;
    const rect = lay.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const p = forcedP !== null ? forcedP : reduced ? 1 : clamp(-rect.top / total);
    if (Math.abs(p - lastP) < 0.0005) return;
    lastP = p;

    // Intro headline lifts away
    const ip = range(p, 0.02, 0.16);
    intro.style.opacity = 1 - ip;
    intro.style.transform = `translateY(${-ip * 80}px) scale(${1 - ip * 0.08})`;

    // Floor tilt: starts as a perspective floor, rises to face the viewer at the end
    const tilt = easeInOut(range(p, 0.72, 0.92));
    const rx = lerp(58, 0, tilt), rz = lerp(-18, 0, tilt);
    const sc = lerp(0.86, 1.15, tilt);
    const ty = lerp(3, 0, tilt);
    floor.style.transform = `translateY(${ty}vh) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${sc})`;

    // Set-out: bed appears + laser lines sweep
    const bed = range(p, 0.04, 0.12);
    floor.style.setProperty("--bed", bed);
    const lz = range(p, 0.06, 0.5);
    const laserOn = lz > 0 && lz < 1 ? Math.sin(lz * Math.PI) : 0;
    laserH.style.opacity = laserOn;
    laserV.style.opacity = laserOn;
    laserH.style.top = lerp(8, 92, easeInOut(range(p, 0.06, 0.3))) + "%";
    laserV.style.left = lerp(6, 94, easeInOut(range(p, 0.1, 0.34))) + "%";

    // Tiles fly in
    for (const t of tiles) {
      const k = easeOut(range(p, t.start, t.start + 0.12));
      const inv = 1 - k;
      if (k >= 1) {
        if (t.done !== true) { t.el.style.transform = "none"; t.el.style.opacity = 1; t.done = true; }
        continue;
      }
      t.done = false;
      t.el.style.opacity = k <= 0 ? 0 : clamp(k * 3);
      t.el.style.transform =
        `translate3d(${t.dx * inv}px, ${t.dy * inv}px, ${t.dz * inv}px) rotateX(${t.rx * inv}deg) rotateY(${t.ry * inv}deg) rotateZ(${t.rz * inv}deg)`;
    }

    // Grout
    floor.style.setProperty("--grout", easeInOut(range(p, 0.58, 0.68)));

    // Seal — a shine sweeps across every tile
    const seal = range(p, 0.66, 0.78);
    floor.style.setProperty("--shine", lerp(-120, 120, seal) + "%");

    // Final message
    const fp = easeOut(range(p, 0.86, 0.97));
    final.style.opacity = fp;
    final.style.transform = `translateY(${(1 - fp) * 40}px)`;
    final.classList.toggle("live", fp > 0.6);
    shade.style.opacity = fp;

    // Stage labels
    const stage = p < 0.1 ? -1 : p < 0.2 ? 0 : p < 0.58 ? 1 : p < 0.66 ? 2 : 3;
    steps.forEach((s, i) => s.classList.toggle("on", i <= stage));
  }

  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };
  build();
  render();
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", () => { const oc = cols; build(); if (cols !== oc) tiles.forEach((t) => (t.done = null)); lastP = -1; request(); });
})();
