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

  /* ---------- Project photo lightbox ---------- */
  const box = document.querySelector(".lightbox");
  if (box && box.showModal) {
    const img = box.querySelector("img");
    document.querySelectorAll("[data-full]").forEach((btn) =>
      btn.addEventListener("click", () => {
        img.src = btn.dataset.full;
        img.alt = btn.querySelector("img").alt;
        box.showModal();
      })
    );
    box.querySelector(".lightbox-close").addEventListener("click", () => box.close());
    box.addEventListener("click", (e) => { if (e.target === box) box.close(); });
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

  // A different tiling job each visit (bathroom, crazy pave, pool…) — see scenes.js
  const sceneName = window.TileScenes.choose();
  const seed = Math.floor(Math.random() * 1e9);
  let tiles = [], layoutKey = "";

  function build() {
    const mobile = window.innerWidth <= 700;
    const key = mobile ? "m" : "d";
    if (key === layoutKey) return false;
    layoutKey = key;
    const rand = mulberry(seed);
    const aspect = mobile ? 3 / 4 : 16 / 10;
    const scene = window.TileScenes.build(sceneName, aspect, mobile, rand);
    floor.dataset.scene = sceneName;
    floor.style.setProperty("--grout-color", scene.grout);
    floor.style.setProperty("--floor-radius", scene.radius);
    floor.innerHTML = "";
    tiles = scene.tiles.map((t) => {
      const el = document.createElement("div");
      el.className = "tile";
      el.style.cssText =
        `left:${t.box.x}%;top:${t.box.y}%;width:${t.box.w}%;height:${t.box.h}%;background:${t.bg};` +
        (t.clip ? `clip-path:${t.clip};-webkit-clip-path:${t.clip};` : "");
      floor.appendChild(el);
      // Lay from the far corner outward, like a tiler working toward the door
      const order = (t.cx + (1 - t.cy)) / 2;
      const side = t.cx < 0.5 ? -1 : 1;
      return {
        el,
        start: 0.12 + order * 0.32 + rand() * 0.04,
        dx: side * (150 + rand() * 450),
        dy: -250 - rand() * 400,
        dz: 120 + rand() * 280,
        rx: (rand() - 0.5) * 160,
        ry: (rand() - 0.5) * 160,
        rz: (rand() - 0.5) * 220,
      };
    });
    return true;
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
    const narrow = layoutKey === "m";
    const rx = lerp(58, 0, tilt), rz = lerp(narrow ? -10 : -18, 0, tilt);
    const sc = lerp(narrow ? 0.8 : 0.86, 1.15, tilt);
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
  window.addEventListener("resize", () => { build(); lastP = -1; request(); });
})();
