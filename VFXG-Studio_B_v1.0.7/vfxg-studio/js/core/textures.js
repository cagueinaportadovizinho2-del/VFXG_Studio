// Texturas procedurais (desenhadas em 128x128 lógicos, geradas em 256x256) + texturas importadas pelo usuário.
VFX.textures = (function () {
  const S = 128, cache = {};
  function radial(ctx, r, stops) {
    const g = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, r);
    stops.forEach(s => g.addColorStop(s[0], s[1])); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }
  const makers = {
    soft(ctx) { radial(ctx, S/2, [[0,'rgba(255,255,255,1)'],[0.4,'rgba(255,255,255,.5)'],[1,'rgba(255,255,255,0)']]); },
    spark(ctx) { radial(ctx, S/2, [[0,'rgba(255,255,255,1)'],[0.18,'rgba(255,255,255,.9)'],[0.35,'rgba(255,255,255,0)']]); },
    star(ctx) {
      radial(ctx, S/3, [[0,'rgba(255,255,255,1)'],[1,'rgba(255,255,255,0)']]);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fillRect(S/2 - 1.5, 4, 3, S - 8); ctx.fillRect(4, S/2 - 1.5, S - 8, 3);
    },
    ring(ctx) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(S/2, S/2, S/2 - 16, 0, Math.PI*2); ctx.stroke(); },
    smoke(ctx) {
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 14; i++) {
        const x = S/2 + (rnd()-.5)*40, y = S/2 + (rnd()-.5)*40, r = 22 + rnd()*22;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      }
      ctx.globalCompositeOperation = 'destination-in';
      radial(ctx, S/2, [[0.6,'#fff'],[1,'rgba(255,255,255,0)']]);
    },
    // gota d'água: disco translúcido com borda mais forte e brilho no canto
    drop(ctx) {
      radial(ctx, S/2, [[0,'rgba(255,255,255,.55)'],[0.7,'rgba(255,255,255,.75)'],[0.88,'rgba(255,255,255,.95)'],[1,'rgba(255,255,255,0)']]);
      const g = ctx.createRadialGradient(S*.38, S*.36, 0, S*.38, S*.36, S*.18);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    },
    // gota de chuva: traço vertical, ponta brilhante embaixo (frente da gota que cai)
    streak(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.95)');
      ctx.fillStyle = g; ctx.fillRect(S/2 - 1.5, 4, 3, S - 8);
    },
    // raio: linha irregular de cima a baixo com brilho e um ramo
    bolt(ctx) {
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const pts = []; let x = S/2;
      for (let y = 0; y <= S; y += 8) { x = Math.max(24, Math.min(S - 24, x + (rnd() - .5) * 20)); pts.push([x, y]); }
      const line = (arr, w, a, blur) => { ctx.beginPath(); arr.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
        ctx.lineJoin = 'round'; ctx.lineWidth = w; ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.shadowColor = '#fff'; ctx.shadowBlur = blur; ctx.stroke(); };
      const b = pts[6], branch = [[b[0], b[1]], [b[0] + 14, b[1] + 14], [b[0] + 10, b[1] + 28], [b[0] + 24, b[1] + 44]];
      [[pts, 7, .3, 14], [pts, 3, .9, 6], [pts, 1.5, 1, 0], [branch, 3, .6, 6], [branch, 1.2, 1, 0]].forEach(a => line(...a));
    }
  };
  const user = () => (VFX.assets && VFX.assets.textures) || {};
  return {
    names: Object.keys(makers),
    all() { return this.names.concat(Object.keys(user())); },
    canvas(name) {
      if (user()[name]) return user()[name].canvas;
      const c = document.createElement('canvas'); c.width = c.height = S * 2;
      const ctx = c.getContext('2d'); ctx.scale(2, 2); makers[name](ctx); return c;
    },
    get(name) { if (user()[name]) return user()[name].tex; return cache[name] || (cache[name] = new THREE.CanvasTexture(this.canvas(name))); }
  };
})();
