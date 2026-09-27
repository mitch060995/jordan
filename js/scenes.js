/* =========================================================
   Hero scenes — a different tiling job is laid on each visit.
   Each scene returns a list of tile polygons (in floor units:
   width = aspect ratio, height = 1) plus a CSS background.
   ========================================================= */
(function () {
  const G = 0.0038; // half the grout joint, in floor units

  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
    return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

  /* ---------- Scenes ---------- */
  const SCENES = {
    bathroom: {
      label: "Bathroom",
      grout: "#d4d8dc",
      tiles(W, mobile, r) {
        const rows = mobile ? 7 : 5, h = 1 / rows, w = h * 2.2, out = [];
        for (let y = 0; y < rows; y++) {
          const off = y % 2 ? -w / 2 : 0;
          for (let x = off; x < W; x += w) out.push(rect(x, y * h, w, h));
        }
        return out;
      },
      bg(r) {
        const t = pick(["#f5f6f7", "#eef0f2", "#f8f8f6", "#e9ecef", "#f2f3f1"], r);
        return `linear-gradient(115deg, transparent 32%, rgba(255,255,255,.65) 46%, transparent 60%),
                linear-gradient(180deg, ${shade(t, 0.4)}, ${shade(t, -0.06)})`;
      },
    },

    crazypave: {
      label: "Crazy pave",
      grout: "#ebe7e0",
      tiles(W, mobile, r) {
        // Natural stones: Voronoi cells around jittered seed points (5–7 sided, like real crazy pave)
        const cols = mobile ? 4 : 7, rows = mobile ? 6 : 5;
        const cw = W / cols, ch = 1 / rows, seeds = [];
        for (let j = 0; j < rows; j++)
          for (let i = 0; i < cols; i++) {
            seeds.push([(i + 0.5 + (r() - 0.5) * 0.8) * cw, (j + 0.5 + (r() - 0.5) * 0.8) * ch]);
            if (r() < 0.25) seeds.push([(i + r()) * cw, (j + r()) * ch]); // the odd smaller stone
          }
        return seeds.map((si) => {
          let poly = rect(-0.1, -0.1, W + 0.2, 1.2);
          for (const sj of seeds) {
            if (sj === si) continue;
            const nx = sj[0] - si[0], ny = sj[1] - si[1];
            const mx = (si[0] + sj[0]) / 2, my = (si[1] + sj[1]) / 2;
            poly = clipHalf(poly, (q) => (q[0] - mx) * nx + (q[1] - my) * ny);
            if (poly.length < 3) break;
          }
          return poly;
        });
      },
      bg(r) {
        const t = pick(["#e2d6c3", "#d8c9b1", "#e8ded0", "#d1c0a5", "#ddd0bb", "#cbb99c", "#e4dacb"], r);
        const a = Math.round(r() * 30 - 15);
        return `repeating-linear-gradient(${a}deg, rgba(120,95,60,.07) 0 2px, transparent 2px 7px, rgba(255,255,255,.06) 7px 9px, transparent 9px 15px),
                linear-gradient(${150 + a}deg, ${shade(t, 0.12)}, ${shade(t, -0.08)})`;
      },
    },

    pool: {
      label: "Pool",
      grout: "#eaf4f5",
      tiles(W, mobile) {
        // Mosaic sheets
        const rows = mobile ? 6 : 5, s = 1 / rows, out = [];
        for (let y = 0; y < rows; y++) for (let x = 0; x < W; x += s) out.push(rect(x, y * s, s, s));
        return out;
      },
      bg(r) { return `url(${mosaicSheet(r)}) center / cover`; },
    },

    floor: {
      label: "Large format floor",
      grout: "#9d9a94",
      tiles(W, mobile) {
        const rows = mobile ? 5 : 4, h = 1 / rows, w = h * 2, out = [];
        for (let y = 0; y < rows; y++) {
          const off = -(y % 3) * (w / 3);
          for (let x = off; x < W; x += w) out.push(rect(x, y * h, w, h));
        }
        return out;
      },
      bg(r) {
        const t = pick(["#bcb8b1", "#c4c0b9", "#b2aea7", "#c9c5bf", "#b8b3ab"], r);
        return `radial-gradient(120% 90% at ${Math.round(r() * 100)}% 0%, rgba(255,255,255,.16), transparent 60%),
                linear-gradient(160deg, ${shade(t, 0.06)}, ${shade(t, -0.08)})`;
      },
    },

    hexagon: {
      label: "Ensuite floor",
      grout: "#e9e7e0",
      tiles(W, mobile) {
        const rows = mobile ? 7 : 5, R = 1 / (1.5 * rows - 0.5), hw = Math.sqrt(3) * R, out = [];
        for (let row = 0; row <= rows + 1; row++) {
          const cy = row * 1.5 * R, off = row % 2 ? hw / 2 : 0;
          for (let cx = -hw + off; cx < W + hw; cx += hw) {
            const p = [];
            for (let k = 0; k < 6; k++) {
              const ang = Math.PI / 6 + (k * Math.PI) / 3;
              p.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
            }
            out.push(p);
          }
        }
        return out;
      },
      bg(r) {
        const t = pick(["#9fb3a0", "#a9bca9", "#93a894", "#b3c4b2", "#8fa38f"], r);
        return `linear-gradient(115deg, transparent 35%, rgba(255,255,255,.3) 48%, transparent 60%),
                linear-gradient(160deg, ${shade(t, 0.12)}, ${shade(t, -0.1)})`;
      },
    },
  };

  /* ---------- Pool mosaic sheet texture ---------- */
  const sheets = [];
  function mosaicSheet(r) {
    if (sheets.length < 6) {
      const c = document.createElement("canvas"), n = 5, px = 120, g = 3;
      c.width = c.height = px;
      const x = c.getContext("2d"), s = px / n;
      x.fillStyle = "#eaf4f5"; x.fillRect(0, 0, px, px);
      const blues = ["#1f7f9a", "#2a93ad", "#176a85", "#3aa6bd", "#5cc0cf", "#1a7390", "#86d2dc"];
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const gr = x.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
          const b = pick(blues, r);
          gr.addColorStop(0, shade(b, 0.18)); gr.addColorStop(1, shade(b, -0.1));
          x.fillStyle = gr;
          x.fillRect(i * s + g / 2, j * s + g / 2, s - g, s - g);
        }
      sheets.push(c.toDataURL("image/png"));
    }
    return sheets[Math.floor(r() * sheets.length)];
  }

  /* ---------- Geometry helpers ---------- */
  function clipToFloor(poly, W) {
    const edges = [
      (p) => p[0] >= 0, (p) => p[0] <= W, (p) => p[1] >= 0, (p) => p[1] <= 1,
    ];
    const cut = [
      (a, b) => lerpAt(a, b, (0 - a[0]) / (b[0] - a[0])),
      (a, b) => lerpAt(a, b, (W - a[0]) / (b[0] - a[0])),
      (a, b) => lerpAt(a, b, (0 - a[1]) / (b[1] - a[1])),
      (a, b) => lerpAt(a, b, (1 - a[1]) / (b[1] - a[1])),
    ];
    let out = poly;
    for (let e = 0; e < 4 && out.length; e++) {
      const inp = out; out = [];
      for (let i = 0; i < inp.length; i++) {
        const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length];
        const ci = edges[e](cur), pi = edges[e](prev);
        if (ci) { if (!pi) out.push(cut[e](prev, cur)); out.push(cur); }
        else if (pi) out.push(cut[e](prev, cur));
      }
    }
    return out;
  }
  // Keep the part of a convex polygon where f(point) <= 0
  function clipHalf(poly, f) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
      const fc = f(cur), fp = f(prev);
      if (fc <= 0) { if (fp > 0) out.push(lerpAt(prev, cur, fp / (fp - fc))); out.push(cur); }
      else if (fp <= 0) out.push(lerpAt(prev, cur, fp / (fp - fc)));
    }
    return out;
  }
  const lerpAt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function area(p) {
    let s = 0;
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return Math.abs(s) / 2;
  }

  // Move every edge inward by the grout half-width so joints are an even width everywhere
  function inset(p) {
    let sa = 0;
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; sa += a[0] * b[1] - b[0] * a[1]; }
    const sign = sa > 0 ? 1 : -1, n = p.length, lines = [];
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < 1e-9) continue;
      const nx = (-dy / len) * sign, ny = (dx / len) * sign; // inward normal
      lines.push({ px: a[0] + nx * G, py: a[1] + ny * G, dx, dy });
    }
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const L1 = lines[(i + lines.length - 1) % lines.length], L2 = lines[i];
      const den = L1.dx * L2.dy - L1.dy * L2.dx;
      if (Math.abs(den) < 1e-12) { out.push([L2.px, L2.py]); continue; }
      const t = ((L2.px - L1.px) * L2.dy - (L2.py - L1.py) * L2.dx) / den;
      out.push([L1.px + L1.dx * t, L1.py + L1.dy * t]);
    }
    const c = p.reduce((m, q) => [m[0] + q[0] / n, m[1] + q[1] / n], [0, 0]);
    return { poly: out, c };
  }

  /* ---------- Public ---------- */
  const names = Object.keys(SCENES);

  // Random scene each visit, never the same one twice in a row. ?scene=pool forces one.
  function choose() {
    let forced = null, last = null;
    try { forced = new URLSearchParams(location.search).get("scene"); } catch (e) {}
    if (forced && SCENES[forced]) return forced;
    try { last = localStorage.getItem("heroScene"); } catch (e) {}
    const options = names.filter((n) => n !== last);
    const name = options[Math.floor(Math.random() * options.length)];
    try { localStorage.setItem("heroScene", name); } catch (e) {}
    return name;
  }

  // Returns [{ box: {x,y,w,h} as % of the floor, clip: CSS polygon or "", bg, cx, cy }]
  function build(name, W, mobile, r) {
    const sc = SCENES[name];
    const tiles = [];
    for (const raw of sc.tiles(W, mobile, r)) {
      const clipped = clipToFloor(raw, W);
      if (clipped.length < 3 || area(clipped) < 0.002) continue;
      const { poly, c } = inset(clipped);
      if (poly.length < 3 || area(poly) < 0.0012 || area(poly) > area(clipped)) continue; // too small once grouted
      const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
      const x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0, bh = Math.max(...ys) - y0;
      const isRect = poly.length === 4 && poly.every((q) => (q[0] === x0 || Math.abs(q[0] - x0 - bw) < 1e-9) && (q[1] === y0 || Math.abs(q[1] - y0 - bh) < 1e-9));
      tiles.push({
        box: { x: (x0 / W) * 100, y: y0 * 100, w: (bw / W) * 100, h: bh * 100 },
        clip: isRect ? "" : "polygon(" + poly.map((q) => `${(((q[0] - x0) / bw) * 100).toFixed(2)}% ${(((q[1] - y0) / bh) * 100).toFixed(2)}%`).join(",") + ")",
        bg: sc.bg(r),
        cx: c[0] / W, cy: c[1],
      });
    }
    return { tiles, grout: sc.grout, label: sc.label };
  }

  window.TileScenes = { choose, build };
})();
