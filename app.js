/* ==========================================================================
   AQUA NOVA 2000 · app.js
   Sin dependencias. Cada módulo corre aislado (si uno falla, el resto sigue).
   Motor de scroll: un solo bucle rAF que suaviza el scroll y escribe variables
   CSS (--p, --e, --t, --c, --py) en las escenas visibles. Nada de listeners de
   "scroll", todo lo medible se cachea y se recalcula al cambiar el layout.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js', 'app');

  /* ---------- Utilidades ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const safe = (name, fn) => { try { fn(); } catch (err) { console.error('[aquanova]', name, err); } };

  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = mqReduce.matches;
  root.classList.toggle('rm', reduce);
  const mqDesk = matchMedia('(min-width: 900px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const vp = { w: innerWidth, h: innerHeight };
  let sy = scrollY;           // scroll suavizado
  let docH = 0;
  let dirty = true;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);

  const WA_NUMBER = '529932334699';
  const waLink = text => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  /* ======================================================================
     1. LOADER: la gota se llena de agua con una superficie ondulada
     ====================================================================== */
  function initLoader(onDone) {
    const el = $('#loader');
    if (!el) return onDone();
    const fill = $('#loaderFill');
    const num = $('#loaderNum');
    const t0 = performance.now();
    const dur = reduce ? 500 : 2600;
    let loaded = document.readyState === 'complete';
    addEventListener('load', () => { loaded = true; }, { once: true });
    setTimeout(() => { loaded = true; }, 5000);       // tope duro: nunca se queda pegado
    let p = 0;
    let finished = false;

    const paint = (pct, t) => {
      const n = 22, pts = [];
      const base = 100 - pct;
      const amp = pct >= 99.5 ? 0 : 2.6;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * 100;
        const y = clamp(base + Math.sin(i * 0.75 + t * 4.2) * amp, 0, 100);
        pts.push(`${x.toFixed(1)}% ${y.toFixed(2)}%`);
      }
      pts.push('100% 100%', '0% 100%');
      fill.style.clipPath = `polygon(${pts.join(',')})`;
    };

    const finish = () => {
      finished = true;
      num.textContent = '100';
      paint(100, 0);
      el.classList.add('is-done');
      setTimeout(() => {
        el.classList.add('is-leaving');
        root.classList.remove('is-loading');
        root.classList.add('ready');
        onDone();
        setTimeout(() => el.classList.add('is-gone'), 1400);
      }, reduce ? 50 : 700);
    };

    let prev = t0;
    const tick = now => {
      if (finished) return;
      const dt = Math.min(.1, (now - prev) / 1000); prev = now;
      const tt = clamp((now - t0) / dur);
      let target = easeIO(tt) * 100;
      if (!loaded) target = Math.min(target, 88);
      p += (target - p) * (1 - Math.exp(-dt * 9));
      if (target - p < 0.3) p = target;
      num.textContent = String(Math.round(p));
      paint(p, now / 1000);
      if (p >= 99.9 && tt >= 1 && loaded) return finish();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ======================================================================
     2. Imágenes: aparición suave y respaldo si una foto no carga
     ====================================================================== */
  function initImages() {
    $$('img[data-fade]').forEach(img => {
      if (img.complete && img.naturalWidth) return;
      img.classList.add('is-fading');
      const show = () => img.classList.remove('is-fading');
      img.addEventListener('load', show, { once: true });
      setTimeout(show, 6000);
    });
    document.addEventListener('error', e => {
      const t = e.target;
      if (t && t.tagName === 'IMG') {
        t.classList.remove('is-fading');
        t.style.visibility = 'hidden';
        const f = t.closest('figure');
        if (f) f.classList.add('is-broken');
      }
    }, true);
  }

  /* ======================================================================
     3. Revelado al entrar en pantalla
     ====================================================================== */
  function initReveal() {
    const els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(e => io.observe(e));
  }

  /* ======================================================================
     4. Burbujas constantes (hero y cierre)
     ====================================================================== */
  function initBubbles() {
    if (reduce) return;
    $$('.bubbles[data-bubbles]').forEach(box => {
      const n = +box.dataset.bubbles || 12;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        const b = document.createElement('span');
        b.className = 'bubble';
        const size = 10 + Math.random() * 44;
        b.style.setProperty('--x', (Math.random() * 96).toFixed(1) + '%');
        b.style.setProperty('--s', size.toFixed(0) + 'px');
        b.style.setProperty('--t', (16 + Math.random() * 18).toFixed(1) + 's');
        b.style.setProperty('--dl', (-Math.random() * 30).toFixed(1) + 's');
        b.style.setProperty('--sw', ((Math.random() - .5) * 90).toFixed(0) + 'px');
        frag.appendChild(b);
      }
      box.appendChild(frag);
    });
  }

  /* ======================================================================
     5. Navegación, menú móvil, enlaces activos
     ====================================================================== */
  const nav = { el: $('#nav'), stuck: false };

  function initNav() {
    const burger = $('#burger');
    const menu = $('#menu');
    if (!burger || !menu) return;
    const setMenu = open => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('is-open', open);
      menu.toggleAttribute('inert', !open);
      root.classList.toggle('menu-open', open);
    };
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    mqDesk.addEventListener('change', () => setMenu(false));

    // Enlace activo según la sección en el centro del viewport
    const links = $$('.nav__links a');
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          const a = map.get(en.target.id);
          links.forEach(l => l.classList.toggle('is-active', l === a));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main > section[id]').forEach(s => io.observe(s));
    }
  }

  /* ======================================================================
     6. Botones magnéticos + inclinación del hero (solo puntero fino)
     ====================================================================== */
  function initPointerFX() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 8).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = '0 0'; });
    });
    const hero = $('#inicio');
    const caps = $('.caps');
    if (hero && caps) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;
        const ny = (e.clientY - r.top) / r.height;
        caps.style.setProperty('--ry', ((nx - .5) * 9).toFixed(2) + 'deg');
        caps.style.setProperty('--rx', ((.5 - ny) * 6).toFixed(2) + 'deg');
      });
      hero.addEventListener('pointerleave', () => { caps.style.setProperty('--ry', '0deg'); caps.style.setProperty('--rx', '0deg'); });
    }
  }

  /* ======================================================================
     7. Hero WebGL: cáusticas de agua sobre fondo claro (con ondas del puntero)
     ====================================================================== */
  function initHeroGL() {
    const canvas = $('#heroGL');
    const hero = $('#inicio');
    if (!canvas || !hero || reduce) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;

    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
    const fs = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uR; uniform float uT; uniform vec3 uM;
const float TAU = 6.28318530718;
float caustic(vec2 uv, float t){
  vec2 p = mod(uv * TAU, TAU) - 250.0;
  vec2 i = p; float c = 1.0; float inten = .005;
  for (int n = 0; n < 4; n++){
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uR;
  float asp = uR.x / uR.y;
  vec2 q = vec2(uv.x * asp, uv.y);
  vec2 m = vec2(uM.x * asp, uM.y);
  vec2 dv = q - m; float d = length(dv);
  q += (dv / (d + 0.0001)) * sin(d * 34.0 - uT * 4.0) * 0.012 * uM.z * exp(-d * 3.5);
  float k = caustic(q * 0.5 + 0.2, uT * 0.28 + 23.0);
  vec3 bgA = vec3(0.965, 0.988, 1.0);
  vec3 bgB = vec3(0.835, 0.935, 0.985);
  float g = clamp(uv.y * 0.55 + (1.0 - uv.x) * 0.35, 0.0, 1.0);
  vec3 col = mix(bgA, bgB, g * 0.9);
  float calm = mix(0.30, 1.0, smoothstep(0.05, 0.85, uv.x));
  vec3 cy = vec3(0.17, 0.70, 0.90);
  col = mix(col, cy, clamp(k * 0.55 * calm, 0.0, 0.62));
  col += vec3(0.9, 1.0, 1.0) * pow(k, 3.0) * 0.18 * calm;
  gl_FragColor = vec4(col, 1.0);
}`;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const v = compile(gl.VERTEX_SHADER, vs), f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'uR');
    const uT = gl.getUniformLocation(prog, 'uT');
    const uM = gl.getUniformLocation(prog, 'uM');

    const resize = () => {
      const scale = Math.min(devicePixelRatio || 1, 1.25) * (innerWidth < 700 ? .5 : .6);
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    addEventListener('resize', resize);

    const mouse = { x: .7, y: .5, tx: .7, ty: .5, s: 0, ts: 0 };
    if (finePointer) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        mouse.tx = (e.clientX - r.left) / r.width;
        mouse.ty = 1 - (e.clientY - r.top) / r.height;
        mouse.ts = 1;
      });
    }

    let visible = true, last = 0;
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); visible = false; hero.classList.remove('gl-on'); });

    const t0 = performance.now();
    let first = true;
    const draw = now => {
      requestAnimationFrame(draw);
      if (!visible || document.hidden || now - last < 24) return;
      last = now;
      mouse.x = lerp(mouse.x, mouse.tx, .08);
      mouse.y = lerp(mouse.y, mouse.ty, .08);
      mouse.ts *= .985;
      mouse.s = lerp(mouse.s, mouse.ts, .1);
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.uniform3f(uM, mouse.x, mouse.y, mouse.s);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (first) { first = false; hero.classList.add('gl-on'); }
    };
    requestAnimationFrame(draw);
  }

  /* ======================================================================
     8. Simulación de filtrado (canvas 2D): el agua cruza 4 etapas
     ====================================================================== */
  class FilterSim {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.parts = []; this.drops = []; this.puffs = [];
      this.stage = 0; this.level = .25; this.levelT = .25;
      this.spawnT = 0; this.dropT = 0; this.time = 0; this.last = 0;
      this.visible = false; this.running = false;
      this.names = ['Sedimentos', 'Carbón', 'Ósmosis', 'Ultravioleta'];
      this.colors = ['#8B6B3E', '#6F8A4A', '#7C8DA3', '#B0524C'];
      this.resize();
      this.warm();
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = this.c.clientWidth || 300, h = this.c.clientHeight || 300;
      this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = w; this.h = h;
      const lab = w < 420 ? .32 : .27;
      this.tl = w * lab; this.tr = w * .94; this.tw = this.tr - this.tl;
      this.tt = h * .04; this.tb = h * .965;
      this.bands = [.2, .36, .52, .68].map(f => h * f);
      this.gy0 = h * .8; this.gy1 = h * .93;
      this.sc = h / 560;
      this.draw();
    }
    setStage(i) { if (i !== this.stage) { this.stage = i; if (!this.running) this.draw(); } }
    spawn() {
      const r = Math.random();
      const k = r < .34 ? 0 : r < .64 ? 1 : r < .9 ? 2 : 3;
      const size = [6, 4.2, 3, 2][k] * (.8 + Math.random() * .5);
      this.parts.push({
        k, x: this.tl + 14 + Math.random() * (this.tw - 28), y: this.tt + 8,
        vy: (34 + Math.random() * 26) * this.sc, ph: Math.random() * 6.28, r: size, caught: false, age: 0
      });
    }
    update(dt) {
      this.time += dt;
      this.spawnT -= dt; this.dropT -= dt;
      if (this.spawnT <= 0) { this.spawn(); this.spawnT = .14 + Math.random() * .1; }
      if (this.dropT <= 0) {
        this.drops.push({ x: this.tl + this.tw * (.38 + Math.random() * .24), y: this.bands[3] + 12, vy: 70 * this.sc });
        this.dropT = .3 + Math.random() * .12;
      }
      for (const p of this.parts) {
        if (!p.caught) {
          p.y += p.vy * dt;
          p.x += Math.sin(this.time * 2 + p.ph) * 9 * dt;
          const by = this.bands[p.k];
          if (p.y >= by - 3) {
            p.caught = true; p.y = by - 3 + (Math.random() - .5) * 4;
            this.puffs.push({ x: p.x, y: by, r: 3, k: p.k, a: .55 });
          }
        } else p.age += dt;
      }
      this.parts = this.parts.filter(p => p.age < 1);
      const surf = this.gy1 - (this.gy1 - this.gy0) * this.level;
      for (const d of this.drops) {
        d.vy += 260 * this.sc * dt; d.y += d.vy * dt;
        if (d.y >= surf) { d.dead = true; this.levelT = Math.min(1.02, this.levelT + .022); this.puffs.push({ x: d.x, y: surf, r: 2, k: 4, a: .5 }); }
      }
      this.drops = this.drops.filter(d => !d.dead);
      if (this.levelT >= 1) this.levelT = .22;
      this.level = lerp(this.level, this.levelT, .04);
      for (const f of this.puffs) { f.r += 18 * dt; f.a -= .9 * dt; }
      this.puffs = this.puffs.filter(f => f.a > 0);
    }
    warm() { for (let i = 0; i < 90; i++) this.update(.05); }
    rr(x, y, w, h, r) {
      const c = this.ctx; c.beginPath();
      c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    draw() {
      const c = this.ctx, w = this.w, h = this.h, t = this.time;
      c.clearRect(0, 0, w, h);
      // Tanque con zonas de claridad creciente
      c.save();
      this.rr(this.tl, this.tt, this.tw, this.tb - this.tt, 22); c.clip();
      const zones = [this.tt, ...this.bands, this.tb];
      const zc = ['rgba(150,118,66,.27)', 'rgba(143,140,92,.21)', 'rgba(120,168,180,.19)', 'rgba(80,184,224,.17)', 'rgba(43,179,230,.25)'];
      for (let i = 0; i < 5; i++) { c.fillStyle = zc[i]; c.fillRect(this.tl, zones[i], this.tw, zones[i + 1] - zones[i]); }
      c.restore();
      this.rr(this.tl, this.tt, this.tw, this.tb - this.tt, 22);
      c.strokeStyle = 'rgba(1,28,68,.2)'; c.lineWidth = 1.5; c.stroke();

      // Reservorio final
      const gx = this.tl + this.tw * .22, gw = this.tw * .56, gh = this.gy1 - this.gy0;
      c.save(); this.rr(gx, this.gy0, gw, gh, 14); c.clip();
      const surf = this.gy1 - gh * this.level;
      const g = c.createLinearGradient(0, surf, 0, this.gy1);
      g.addColorStop(0, 'rgba(92,200,240,.85)'); g.addColorStop(1, 'rgba(3,150,191,.9)');
      c.fillStyle = g; c.beginPath(); c.moveTo(gx, this.gy1);
      for (let x = 0; x <= gw; x += 4) c.lineTo(gx + x, surf + Math.sin(x * .09 + t * 3) * 2);
      c.lineTo(gx + gw, this.gy1); c.closePath(); c.fill();
      c.restore();
      this.rr(gx, this.gy0, gw, gh, 14); c.strokeStyle = 'rgba(1,28,68,.35)'; c.lineWidth = 1.5; c.stroke();

      // Partículas
      for (const p of this.parts) {
        const a = p.caught ? 1 - p.age : .88;
        const r = p.caught ? p.r * (1 - p.age * .6) : p.r;
        c.globalAlpha = Math.max(0, a); c.fillStyle = this.colors[p.k];
        c.beginPath(); c.arc(p.x, p.y, r, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
      for (const f of this.puffs) {
        c.globalAlpha = f.a; c.strokeStyle = f.k === 4 ? '#2BB3E6' : this.colors[f.k]; c.lineWidth = 1.4;
        c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.283); c.stroke();
      }
      c.globalAlpha = 1;
      for (const d of this.drops) {
        c.fillStyle = 'rgba(43,179,230,.95)'; c.beginPath(); c.arc(d.x, d.y, 2.8, 0, 6.283); c.fill();
        c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(d.x - .8, d.y - .8, .9, 0, 6.283); c.fill();
      }

      // Filtros (encima de las partículas capturadas)
      for (let k = 0; k < 4; k++) this.band(k, t);

      // Etiquetas
      c.font = `600 ${w < 420 ? 11 : 12.5}px Geist, system-ui, sans-serif`; c.textBaseline = 'middle';
      for (let k = 0; k < 4; k++) {
        c.fillStyle = k === this.stage ? '#011C44' : 'rgba(1,28,68,.42)';
        c.fillText(this.names[k], 10, this.bands[k]);
      }
    }
    band(k, t) {
      const c = this.ctx, y = this.bands[k], x = this.tl + 6, w = this.tw - 12, hh = 18;
      const active = k === this.stage; const a = active ? 1 : .6;
      c.save(); c.globalAlpha = a;
      this.rr(x, y - hh / 2, w, hh, 9);
      if (k === 0) {
        c.fillStyle = 'rgba(120,130,150,.22)'; c.fill(); c.save(); c.clip();
        c.strokeStyle = 'rgba(1,28,68,.4)'; c.lineWidth = 1;
        for (let i = -hh; i < w + hh; i += 7) { c.beginPath(); c.moveTo(x + i, y - hh / 2); c.lineTo(x + i + hh, y + hh / 2); c.moveTo(x + i + hh, y - hh / 2); c.lineTo(x + i, y + hh / 2); c.stroke(); }
        c.restore();
      } else if (k === 1) {
        c.fillStyle = 'rgba(1,28,68,.82)'; c.fill(); c.save(); c.clip();
        c.fillStyle = 'rgba(155,220,246,.35)';
        for (let i = 4; i < w; i += 9) for (let j = 0; j < 2; j++) { c.beginPath(); c.arc(x + i + (j ? 4 : 0), y - 4 + j * 8, 1.4, 0, 6.283); c.fill(); }
        c.restore();
      } else if (k === 2) {
        c.fillStyle = 'rgba(43,179,230,.32)'; c.fill();
        c.save(); c.clip();
        const gr = c.createLinearGradient(x, 0, x + w, 0), o = (t * .35) % 1;
        gr.addColorStop(clamp(o - .2), 'rgba(255,255,255,0)'); gr.addColorStop(clamp(o), 'rgba(255,255,255,.85)'); gr.addColorStop(clamp(o + .2), 'rgba(255,255,255,0)');
        c.fillStyle = gr; c.fillRect(x, y - 1.2, w, 2.4);
        c.strokeStyle = 'rgba(3,150,191,.8)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + w, y - 5); c.moveTo(x, y + 5); c.lineTo(x + w, y + 5); c.stroke();
        c.restore();
      } else {
        const pulse = .65 + Math.sin(t * 5) * .35;
        c.shadowColor = 'rgba(92,200,240,.95)'; c.shadowBlur = 16 * pulse;
        c.fillStyle = `rgba(214,244,255,${.55 + pulse * .4})`; c.fill();
        c.shadowBlur = 0; c.fillStyle = '#fff'; c.fillRect(x + 8, y - 1.3, w - 16, 2.6);
      }
      c.restore();
      if (active) { this.rr(x - 2, y - hh / 2 - 2, w + 4, hh + 4, 11); c.strokeStyle = '#2BB3E6'; c.lineWidth = 2; c.stroke(); }
    }
    start() {
      if (this.running || reduce) return;
      this.running = true; this.last = performance.now();
      const loop = now => {
        if (!this.running) return;
        const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
        this.update(dt); this.draw(); requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    stop() { this.running = false; }
  }

  /* ======================================================================
     9. Motor de escenas
     ====================================================================== */
  const scenes = [];
  const parallax = new Set();      // elementos con parallax visibles
  let panels = [];                 // pila de servicios
  let pool = null;                 // desplazamiento horizontal
  let sim = null;                  // simulación de filtrado
  let timeline = null;

  const stickyProgress = s => (s.h - vp.h > 1 ? clamp((sy - s.top) / (s.h - vp.h)) : 0);
  const near = s => sy + vp.h * 1.1 > s.top && sy < s.top + s.h + vp.h * .1;

  function addScene(el, update, kind = 'sticky') {
    const s = { el, update, kind, top: 0, h: 0 };
    s.measure = () => { const r = el.getBoundingClientRect(); s.top = r.top + scrollY; s.h = r.height; };
    scenes.push(s);
    return s;
  }

  function sceneWords() {
    const el = $('[data-scene="words"]');
    const text = $('[data-words]', el || document);
    if (!el || !text) return;
    const hl = /^(agua|limpia|energía|sol|calidad)/i;
    const words = text.textContent.trim().split(/\s+/);
    text.textContent = '';
    const spans = words.map((w, i) => {
      const s = document.createElement('span');
      s.className = 'w' + (hl.test(w) ? ' hl' : '');
      s.textContent = w;
      text.appendChild(s);
      if (i < words.length - 1) text.appendChild(document.createTextNode(' '));
      return s;
    });
    let lastN = -1;
    if (reduce) { spans.forEach(s => s.classList.add('on')); return; }
    addScene(el, p => {
      const n = Math.round(clamp((p - .06) / .74) * spans.length);
      if (n !== lastN) { spans.forEach((s, i) => s.classList.toggle('on', i < n)); lastN = n; }
    });
  }

  function sceneExpand() {
    const el = $('[data-scene="expand"]');
    if (!el || reduce) return;
    addScene(el, p => {
      el.style.setProperty('--p', p.toFixed(4));
      el.style.setProperty('--e', easeIO(clamp((p - .03) / .62)).toFixed(4));
      el.style.setProperty('--t', clamp((p - .6) / .25).toFixed(4));
    });
  }

  function sceneWater() {
    const el = $('[data-scene="water"]');
    const canvas = $('#waterCanvas');
    if (!el || !canvas) return;
    sim = new FilterSim(canvas);
    const stages = $$('.stage', el);
    let cur = 0;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { sim.visible = es[0].isIntersecting; sim.visible ? sim.start() : sim.stop(); }, { rootMargin: '120px' }).observe(canvas);
    }
    if (reduce) return;
    addScene(el, p => {
      const idx = Math.min(3, Math.floor(clamp((p - .03) / .9) * 4));
      if (idx !== cur) {
        cur = idx;
        stages.forEach((s, i) => s.classList.toggle('is-active', i === idx));
        sim.setStage(idx);
      }
    });
    addEventListener('resize', () => sim && sim.resize());
  }

  function poolLayout() {
    if (!pool) return;
    const { el, track } = pool;
    // Importante: nunca vaciar la altura antes de medir. Un recálculo con la escena
    // colapsada recorta el scroll al nuevo máximo y la página "salta" hacia arriba.
    if (mqDesk.matches && !reduce) {
      pool.shift = Math.max(0, track.scrollWidth - vp.w);
      const h = (pool.shift + vp.h) + 'px';
      if (el.style.height !== h) el.style.height = h;
    } else {
      pool.shift = 0;
      if (el.style.height) el.style.height = '';
      if (track.style.transform) track.style.transform = '';
    }
  }
  function scenePool() {
    const el = $('[data-scene="hscroll"]');
    const track = $('#poolTrack');
    if (!el || !track) return;
    pool = { el, track, shift: 0 };
    const s = addScene(el, p => { if (pool.shift) track.style.transform = `translate3d(${(-p * pool.shift).toFixed(1)}px,0,0)`; });
    s.isPool = true;
  }

  function sceneStack() {
    const stack = $('#stack');
    if (!stack) return;
    panels = $$('.panel', stack).map((el, i) => { el.style.setProperty('--i', i); return { el, nat: 0, h: 0, stick: 0 }; });
  }
  function measureStack() {
    if (!panels.length) return;
    const stack = $('#stack');
    const top = stack.getBoundingClientRect().top + scrollY;
    let acc = top;
    panels.forEach(p => {
      const cs = getComputedStyle(p.el);
      p.h = p.el.offsetHeight;
      p.nat = acc;
      p.stick = parseFloat(cs.top) || 0;
      acc += p.h + (parseFloat(cs.marginBottom) || 0);
    });
  }
  function updateStack() {
    const on = mqDesk.matches && !reduce;
    panels.forEach((p, i) => {
      let c = 0;
      if (on && i < panels.length - 1) {
        const nx = panels[i + 1];
        const d = nx.nat - sy;
        c = clamp(1 - (d - nx.stick) / (vp.h - nx.stick));
      }
      p.el.style.setProperty('--c', c.toFixed(3));
      p.el.style.transform = c > 0 ? `scale(${(1 - c * .05).toFixed(4)})` : '';
    });
  }

  function sceneProcess() {
    const wrap = $('#timeline');
    if (!wrap) return;
    const items = $$('.tl', wrap);
    const rail = $('.tl__rail', wrap);
    timeline = { wrap, items, rail, top: 0, first: 0, last: 0, tops: [] };
    if (reduce) return;
  }
  function measureTimeline() {
    if (!timeline) return;
    const { wrap, items, rail } = timeline;
    timeline.top = wrap.getBoundingClientRect().top + scrollY;
    timeline.tops = items.map(li => li.offsetTop + 26);
    timeline.first = timeline.tops[0];
    timeline.last = timeline.tops[timeline.tops.length - 1];
    rail.style.top = timeline.first + 'px';
    rail.style.bottom = 'auto';
    rail.style.height = (timeline.last - timeline.first) + 'px';
    wrap.style.setProperty('--rail-h', (timeline.last - timeline.first) + 'px');
  }
  function updateTimeline() {
    if (!timeline || reduce) return;
    const line = sy + vp.h * .58;
    const { top, first, last, tops, items, wrap } = timeline;
    const p = clamp((line - (top + first)) / (last - first));
    wrap.style.setProperty('--p', p.toFixed(4));
    items.forEach((li, i) => li.classList.toggle('is-on', line >= top + tops[i]));
  }

  function initParallax() {
    if (reduce) return;
    const els = $$('[data-parallax]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? parallax.add(e.target) : parallax.delete(e.target))), { rootMargin: '120px' });
    els.forEach(el => io.observe(el));
  }
  function updateParallax() {
    if (!parallax.size) return;
    const lag = scrollY - sy;
    const reads = [];
    parallax.forEach(el => {
      const par = el.parentElement.getBoundingClientRect();
      reads.push([el, par]);
    });
    reads.forEach(([el, r]) => {
      const speed = parseFloat(el.dataset.parallax) || .06;
      const c = r.top + lag + r.height / 2 - vp.h / 2;
      const lim = r.height * .08;
      el.style.setProperty('--py', clamp(-c * speed, -lim, lim).toFixed(1) + 'px');
    });
  }

  function measureAll() {
    vp.w = innerWidth; vp.h = innerHeight;
    poolLayout();
    docH = root.scrollHeight;
    scenes.forEach(s => s.measure());
    measureStack();
    measureTimeline();
    dirty = true;
  }

  function updateAll() {
    const ty = scrollY;
    const stuck = ty > 24;
    if (stuck !== nav.stuck && nav.el) { nav.stuck = stuck; nav.el.classList.toggle('is-stuck', stuck); }
    root.style.setProperty('--sp', clamp(ty / Math.max(1, docH - vp.h)).toFixed(4));
    for (const s of scenes) { if (near(s)) s.update(stickyProgress(s)); }
    updateStack();
    updateTimeline();
    updateParallax();
  }

  function startLoop() {
    let last = performance.now();
    const frame = now => {
      requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const ty = scrollY;
      const k = reduce ? 1 : 1 - Math.exp(-dt * 9);
      const prev = sy;
      sy += (ty - sy) * k;
      if (Math.abs(ty - sy) < .08) sy = ty;
      if (sy !== prev || dirty) { updateAll(); dirty = false; }
    };
    requestAnimationFrame(frame);

    let rt;
    const remeasure = () => { clearTimeout(rt); rt = setTimeout(measureAll, 140); };
    addEventListener('resize', remeasure);
    addEventListener('orientationchange', remeasure);
    addEventListener('load', measureAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
  }

  /* ======================================================================
     10. Calculadoras (aritmética sobre los datos del usuario)
     ====================================================================== */
  function initCalc() {
    const card = $('.calc__card');
    if (!card) return;
    const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const int = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
    const dec = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    const dim = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
    const tabsEl = $('.tabs', card);
    const tabs = $$('.tab', card);
    const panelsEl = $$('.tabpanel', card);
    const results = $$('.result', card);
    const liquid = $('.liquid__fill', card);
    const note = $('#res-note');
    const cta = $('#calc-cta');
    const ctaT = $('#calc-cta-t');
    const tweens = new WeakMap();

    const tween = (el, to, fmt) => {
      const from = el._v ?? 0; el._v = to;
      if (reduce) { el.textContent = fmt(to); return; }
      const id = (tweens.get(el) || 0) + 1; tweens.set(el, id);
      const t0 = performance.now();
      const step = now => {
        if (tweens.get(el) !== id) return;
        const t = clamp((now - t0) / 650);
        el.textContent = fmt(lerp(from, to, easeOut(t)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const fill = input => input.style.setProperty('--v', ((input.value - input.min) / (input.max - input.min) * 100).toFixed(1) + '%');
    const val = id => parseFloat($('#' + id).value) || 0;
    const out = (id, text) => { const o = $('#' + id); if (o) o.textContent = text; };

    const cfg = {
      agua: {
        note: 'Un purificador te da agua lista las 24 horas, sin cargar ni almacenar garrafones.',
        cta: 'Quiero dejar de comprar garrafones',
        calc() {
          const g = val('in-garrafones'), pr = val('in-precio'), year = g * pr * 12;
          out('out-garrafones', int.format(g));
          tween($('#res-agua-year'), year, money.format.bind(money));
          tween($('#res-agua-5'), year * 5, money.format.bind(money));
          return { lvl: g / 40, msg: `Hola Aqua Nova 2000, compro unos ${int.format(g)} garrafones al mes a ${money.format(pr)} (alrededor de ${money.format(year)} al año). Quiero información sobre un purificador de agua.` };
        }
      },
      solar: {
        note: 'Los paneles solares pueden reducir buena parte de lo que pagas. Te hacemos un estudio con tu consumo real.',
        cta: 'Pedir mi estudio solar con estos datos',
        calc() {
          const r = val('in-recibo'), year = r * 6;
          out('out-recibo', money.format(r));
          tween($('#res-solar-year'), year, money.format.bind(money));
          tween($('#res-solar-10'), year * 10, money.format.bind(money));
          return { lvl: r / 20000, msg: `Hola Aqua Nova 2000, mi recibo de luz es de aproximadamente ${money.format(r)} cada dos meses (${money.format(year)} al año). Quiero un estudio para instalar paneles solares.` };
        }
      },
      alberca: {
        note: 'Lo ideal es que el equipo filtre todo el volumen de la alberca cada 6 a 8 horas.',
        cta: 'Quiero el equipo ideal para mi alberca',
        calc() {
          const l = val('in-largo'), a = val('in-ancho'), d = val('in-prof');
          const vol = l * a * d, liters = vol * 1000;
          out('out-largo', dim.format(l)); out('out-ancho', dim.format(a)); out('out-prof', dim.format(d));
          tween($('#res-alb-l'), liters, int.format.bind(int));
          $('#res-alb-flow').textContent = `${dec.format(vol / 8)} a ${dec.format(vol / 6)} m³/h`;
          return { lvl: vol / 150, msg: `Hola Aqua Nova 2000, mi alberca mide ${dim.format(l)} x ${dim.format(a)} m con ${dim.format(d)} m de profundidad promedio (unos ${int.format(liters)} litros). Quiero cotizar equipo y mantenimiento.` };
        }
      }
    };
    let active = 'agua';

    const refresh = () => {
      $$('input[type="range"]', card).forEach(fill);
      const r = cfg[active].calc();
      liquid.style.setProperty('--lvl', (18 + clamp(r.lvl) * 66).toFixed(1));
      cta.href = waLink(r.msg);
    };
    const glide = () => {
      const t = tabs.find(x => x.dataset.tab === active);
      if (!t) return;
      tabsEl.style.setProperty('--tx', t.offsetLeft + 'px');
      tabsEl.style.setProperty('--tw', t.offsetWidth + 'px');
    };
    const select = (name, focus) => {
      active = name;
      tabs.forEach(t => {
        const on = t.dataset.tab === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panelsEl.forEach(p => { p.hidden = p.dataset.panel !== name; });
      results.forEach(r => { r.hidden = r.dataset.result !== name; });
      note.textContent = cfg[name].note;
      ctaT.textContent = cfg[name].cta;
      glide(); refresh();
    };

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t.dataset.tab));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        select(n.dataset.tab, true);
      });
    });
    $$('input', card).forEach(i => i.addEventListener('input', refresh));
    $$('[data-calc-tab]').forEach(a => a.addEventListener('click', () => select(a.dataset.calcTab)));
    addEventListener('resize', glide);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(glide);
    select('agua');
  }

  /* ======================================================================
     11. FAQ
     ====================================================================== */
  function initFaq() {
    $$('.qa').forEach(qa => {
      const btn = $('button', qa);
      btn.addEventListener('click', () => {
        const open = !qa.classList.contains('is-open');
        qa.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
    const first = $('.qa');
    if (first) { first.classList.add('is-open'); $('button', first).setAttribute('aria-expanded', 'true'); }
  }

  /* ======================================================================
     12. Formulario -> WhatsApp
     ====================================================================== */
  function initForm() {
    const form = $('#waForm');
    if (!form) return;
    const status = $('#formStatus');
    const fields = {
      name: { el: $('#f-name'), err: $('#e-name'), check: v => v.trim().length >= 2 || 'Escribe tu nombre.' },
      tel: { el: $('#f-tel'), err: $('#e-tel'), check: v => v.replace(/\D/g, '').length >= 10 || 'Escribe un teléfono de 10 dígitos.' },
      int: { el: $('#f-int'), err: $('#e-int'), check: v => !!v || 'Elige qué te interesa.' }
    };
    const validate = f => {
      const r = f.check(f.el.value);
      const ok = r === true;
      f.err.textContent = ok ? '' : r;
      f.el.setAttribute('aria-invalid', String(!ok));
      f.el.closest('.field').classList.toggle('has-error', !ok);
      return ok;
    };
    Object.values(fields).forEach(f => {
      f.el.addEventListener('blur', () => validate(f));
      f.el.addEventListener('input', () => { if (f.el.getAttribute('aria-invalid') === 'true') validate(f); });
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const results = Object.values(fields).map(validate);
      if (results.includes(false)) {
        const bad = Object.values(fields).find(f => f.el.getAttribute('aria-invalid') === 'true');
        if (bad) bad.el.focus();
        status.textContent = '';
        return;
      }
      const msg = $('#f-msg').value.trim();
      const text = `Hola Aqua Nova 2000, soy ${fields.name.el.value.trim()}. Me interesa: ${fields.int.el.value}.` +
        (msg ? ` ${msg.replace(/[.!?\s]*$/, '')}.` : '') + ` Mi teléfono es ${fields.tel.el.value.trim()}.`;
      const url = waLink(text);
      status.innerHTML = `Abriendo WhatsApp... Si no se abre, <a href="${url}" target="_blank" rel="noopener">haz clic aquí</a>.`;
      const w = window.open(url, '_blank', 'noopener');
      if (!w) location.href = url;
    });
  }

  /* ======================================================================
     13. WhatsApp flotante: sugerencia temporal
     ====================================================================== */
  function initWaTip() {
    const wa = $('#waFloat');
    if (!wa) return;
    setTimeout(() => { wa.classList.add('show-tip'); setTimeout(() => wa.classList.remove('show-tip'), 6500); }, 5200);
  }

  /* ======================================================================
     Arranque
     ====================================================================== */
  safe('images', initImages);
  safe('reveal', initReveal);
  safe('bubbles', initBubbles);
  safe('nav', initNav);
  safe('pointer', initPointerFX);
  safe('words', sceneWords);
  safe('expand', sceneExpand);
  safe('water', sceneWater);
  safe('pool', scenePool);
  safe('stack', sceneStack);
  safe('process', sceneProcess);
  safe('parallax', initParallax);
  safe('calc', initCalc);
  safe('faq', initFaq);
  safe('form', initForm);
  safe('gl', initHeroGL);
  safe('loop', () => { measureAll(); startLoop(); });
  safe('loader', () => initLoader(() => { safe('waTip', initWaTip); dirty = true; }));
})();
