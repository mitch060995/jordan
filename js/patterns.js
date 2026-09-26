/* =========================================================
   Tile pattern renderer — draws real tile layouts on <canvas>
   Used by the service cards, the pattern studio and backgrounds.
   ========================================================= */
(function () {
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5), ((s ^ (s >>> 7)) >>> 0) / 4294967296);
  }

  const PALETTES = {
    stone:   { grout: "#bdb5a7", tones: ["#e9e3d8", "#e2dbcf", "#ddd5c7", "#efeae1", "#d8cfbf"] },
    charcoal:{ grout: "#8d8880", tones: ["#3b3a38", "#444240", "#353432", "#4b4845", "#3f3d3a"] },
    terracotta:{ grout: "#d8cdbb", tones: ["#b8633a", "#c46f45", "#a95a35", "#cf7b4f", "#b0603c"] },
    sage:    { grout: "#e8e3d9", tones: ["#8fa48e", "#98ad97", "#859a84", "#a3b6a1", "#7f947e"] },
    pool:    { grout: "#e6f1f2", tones: ["#1f7f9a", "#2a93ad", "#176a85", "#3aa6bd", "#5cc0cf", "#1a7390", "#86d2dc"] },
    sandstone:{ grout: "#6e675d", tones: ["#d9bf94", "#cfb286", "#e2c9a0", "#c7a878", "#dcc39c", "#bfa073", "#e6d2ae"] },
    marble:  { grout: "#d7d2ca", tones: ["#f3f1ec", "#eeebe5", "#f6f4f0", "#ebe7e0"] },
  };

  function shade(ctx, x, y, w, h, base, r) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, lighten(base, 0.06 + r() * 0.04));
    g.addColorStop(1, lighten(base, -0.05 - r() * 0.04));
    return g;
  }
  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let rr = (n >> 16) & 255, gg = (n >> 8) & 255, bb = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
    return `rgb(${f(rr)},${f(gg)},${f(bb)})`;
  }
  function pick(arr, r) { return arr[Math.floor(r() * arr.length)]; }

  function rectTile(ctx, x, y, w, h, pal, r, radius = 1.5) {
    ctx.fillStyle = shade(ctx, x, y, w, h, pick(pal.tones, r), r);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h);
    ctx.fill();
    // soft top highlight
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(x, y, w, Math.max(1, h * 0.08));
  }

  /* ---------- individual layouts ---------- */
  const layouts = {
    subway(ctx, W, H, r, s) {
      const pal = PALETTES.marble, g = 3 * s, tw = 120 * s, th = 40 * s;
      ctx.fillStyle = pal.grout; ctx.fillRect(0, 0, W, H);
      for (let row = 0, y = 0; y < H; row++, y += th) {
        const off = row % 2 ? -tw / 2 : 0;
        for (let x = off; x < W; x += tw) rectTile(ctx, x + g / 2, y + g / 2, tw - g, th - g, pal, r, 2 * s);
      }
    },

    herringbone(ctx, W, H, r, s) {
      const pal = PALETTES.stone, g = 3 * s, w = 34 * s, L = w * 3;
      ctx.fillStyle = pal.grout; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(Math.PI / 4);
      const R = Math.hypot(W, H);
      const bands = Math.ceil(R / L) + 2, steps = Math.ceil((R * 2) / w) + 2;
      for (let b = -bands; b <= bands; b++) {
        const bx = b * L, by = -b * L;
        for (let k = -steps; k <= steps; k++) {
          const x = bx + k * w, y = by + k * w;
          if (Math.abs(x) > R + L || Math.abs(y) > R + L) continue;
          rectTile(ctx, x + g / 2, y + g / 2, L - g, w - g, pal, r);         // horizontal plank
          rectTile(ctx, x + g / 2, y + w + g / 2, w - g, L - g, pal, r);     // vertical plank
        }
      }
      ctx.restore();
    },

    hex(ctx, W, H, r, s) {
      const pal = PALETTES.sage, R = 30 * s, g = 3 * s;
      ctx.fillStyle = pal.grout; ctx.fillRect(0, 0, W, H);
      const hw = Math.sqrt(3) * R, vh = 1.5 * R;
      for (let row = -1, y = 0; y < H + R; row++, y = row * vh) {
        const off = row % 2 ? hw / 2 : 0;
        for (let x = -hw + off; x < W + hw; x += hw) {
          const rr = R - g / 1.6;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + (i * Math.PI) / 3;
            ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
          }
          ctx.closePath();
          ctx.fillStyle = shade(ctx, x - rr, y - rr, rr * 2, rr * 2, pick(pal.tones, r), r);
          ctx.fill();
        }
      }
    },

    crazy(ctx, W, H, r, s) {
      // Voronoi "crazy pave" — irregular natural stone pieces with grout joints
      const pal = PALETTES.sandstone;
      const scale = 2; // render at half-res then upscale for speed
      const w = Math.ceil(W / scale), h = Math.ceil(H / scale);
      const n = Math.max(18, Math.round((w * h) / (1800 * s * s / 4)));
      const pts = [];
      for (let i = 0; i < n; i++) pts.push([r() * w, r() * h, pick(pal.tones, r), r() * 0.1 - 0.05]);
      const off = document.createElement("canvas");
      off.width = w; off.height = h;
      const octx = off.getContext("2d");
      const img = octx.createImageData(w, h), d = img.data;
      const groutC = hexRgb(pal.grout), gap = 1.6 * s;
      const cols = pts.map((p) => hexRgb(p[2]));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let d1 = 1e9, d2 = 1e9, i1 = 0;
          for (let i = 0; i < n; i++) {
            const dx = pts[i][0] - x, dy = pts[i][1] - y, dd = dx * dx + dy * dy;
            if (dd < d1) { d2 = d1; d1 = dd; i1 = i; } else if (dd < d2) d2 = dd;
          }
          const edge = Math.sqrt(d2) - Math.sqrt(d1);
          const o = (y * w + x) * 4;
          if (edge < gap) { d[o] = groutC[0]; d[o + 1] = groutC[1]; d[o + 2] = groutC[2]; }
          else {
            const c = cols[i1], k = 1 + pts[i1][3] + (Math.min(edge, 10) / 10) * 0.05 + (Math.random() - 0.5) * 0.06;
            d[o] = c[0] * k; d[o + 1] = c[1] * k; d[o + 2] = c[2] * k;
          }
          d[o + 3] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, 0, 0, W, H);
    },

    pool(ctx, W, H, r, s) {
      const pal = PALETTES.pool, t = 22 * s, g = 2.5 * s;
      ctx.fillStyle = pal.grout; ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += t)
        for (let x = 0; x < W; x += t) rectTile(ctx, x + g / 2, y + g / 2, t - g, t - g, pal, r, 1.5 * s);
      // waterline band
      const bandY = Math.round(H * 0.18 / t) * t;
      for (let x = 0; x < W; x += t) {
        ctx.fillStyle = (x / t) % 2 ? "#0f4d63" : "#e8f3f4";
        ctx.fillRect(x + g / 2, bandY + g / 2, t - g, t - g);
      }
    },

    large(ctx, W, H, r, s) {
      const pal = PALETTES.marble, g = 2 * s, tw = 300 * s, th = 150 * s;
      ctx.fillStyle = pal.grout; ctx.fillRect(0, 0, W, H);
      for (let row = 0, y = 0; y < H; row++, y += th) {
        const off = row % 2 ? -tw / 3 : 0;
        for (let x = off; x < W; x += tw) {
          rectTile(ctx, x + g / 2, y + g / 2, tw - g, th - g, pal, r, 1);
          ctx.save();
          ctx.beginPath(); ctx.rect(x + g / 2, y + g / 2, tw - g, th - g); ctx.clip();
          for (let v = 0; v < 2; v++) {
            ctx.strokeStyle = `rgba(${130 + r() * 30},${125 + r() * 25},${118 + r() * 25},${0.08 + r() * 0.14})`;
            ctx.lineWidth = (0.4 + r() * 1.1) * s;
            ctx.beginPath();
            let vx = x + r() * tw, vy = y - 10;
            ctx.moveTo(vx, vy);
            for (let k = 0; k < 6; k++) {
              vx += (r() - 0.25) * tw * 0.18; vy += th * 0.25;
              ctx.quadraticCurveTo(vx + (r() - 0.5) * 24 * s, vy - th * 0.12, vx, vy);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    },

    basket(ctx, W, H, r, s) {
      const pal = PALETTES.terracotta, g = 3 * s, u = 30 * s, B = u * 2;
      ctx.fillStyle = pal.grout; ctx.fillRect(0, 0, W, H);
      for (let by = 0, j = 0; by < H; by += B, j++)
        for (let bx = 0, i = 0; bx < W; bx += B, i++) {
          if ((i + j) % 2) {
            rectTile(ctx, bx + g / 2, by + g / 2, B - g, u - g, pal, r);
            rectTile(ctx, bx + g / 2, by + u + g / 2, B - g, u - g, pal, r);
          } else {
            rectTile(ctx, bx + g / 2, by + g / 2, u - g, B - g, pal, r);
            rectTile(ctx, bx + u + g / 2, by + g / 2, u - g, B - g, pal, r);
          }
        }
    },

    slate(ctx, W, H, r, s) {
      const pal = PALETTES.charcoal, g = 3 * s, t = 90 * s;
      ctx.fillStyle = pal.grout; ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += t)
        for (let x = 0; x < W; x += t) {
          rectTile(ctx, x + g / 2, y + g / 2, t - g, t - g, pal, r, 1);
          ctx.fillStyle = "rgba(255,255,255,0.025)";
          for (let k = 0; k < 5; k++) ctx.fillRect(x + g, y + g + r() * t, t - 2 * g, 1 * s);
        }
    },
  };

  function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  function draw(canvas, type, opts = {}) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(50, Math.round((opts.width || rect.width) * dpr));
    const H = Math.max(50, Math.round((opts.height || rect.height) * dpr));
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const fn = layouts[type] || layouts.subway;
    fn(ctx, W, H, rng(opts.seed || 7), dpr * (opts.scale || 1));
    // gentle vignette for depth
    if (opts.vignette !== false) {
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.28)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
  }

  window.TilePatterns = { draw, types: Object.keys(layouts) };
})();
