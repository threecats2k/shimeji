/*
 * Tiny shimeji engine for the landing page.
 * Pets live in a fixed layer. They walk on the bottom of the viewport and on the top edge of any
 * element marked [data-perch] (riding along when the page scrolls), climb the viewport sides,
 * jump between perches, and can be dragged and thrown. A hard landing makes them dizzy.
 */
(function () {
  "use strict";

  const SPR = "assets/sprites/";
  const STAR = SPR + "dizzy_star.webp";

  function still(file) {
    return {
      stand: file,
      walk: [file],
      sit: file,
      air: file,
      dizzy: file,
      climb: file,
      roll: [file],
    };
  }
  function poses(dir) {
    const p = SPR + "skins/" + dir + "/";
    return {
      stand: p + "stand.webp",
      walk: [p + "stand.webp", p + "w1.webp", p + "stand.webp", p + "w2.webp"],
      sit: p + "sit.webp",
      air: p + "air.webp",
      dizzy: p + "dizzy.webp",
      climb: p + "stand.webp",
      roll: [p + "t1.webp", p + "air.webp", p + "t2.webp", p + "t3.webp"],
    };
  }
  const SKINS = [
    {
      stand: SPR + "s0.webp",
      walk: [SPR + "s0.webp"],
      sit: SPR + "s9.webp",
      air: SPR + "s2.webp",
      dizzy: SPR + "s5.webp",
      climb: SPR + "s0.webp",
      roll: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => SPR + "s" + i + ".webp"),
    },
    still(SPR + "skins/bee/stand.webp"),
    still(SPR + "skins/wizard/stand.webp"),
    still(SPR + "skins/berry/stand.webp"),
    still(SPR + "skins/sailor/stand.webp"),
    still(SPR + "skins/bunny/stand.webp"),
    still(SPR + "skins/dino/stand.webp"),
    still(SPR + "skins/noel/stand.webp"),
    still(SPR + "skins/tet/stand.webp"),
    still(SPR + "skins/ball/stand.webp"),
    poses("mooshi"),
    poses("fox"),
    poses("raccoon"),
    poses("corgi"),
    poses("husky"),
    poses("tabby"),
    poses("pom"),
    poses("cat"),
    poses("fold"),
  ];
  let skinCursor = 0;
  function takeSkin() {
    const skin = SKINS[skinCursor % SKINS.length];
    skinCursor += 1;
    return skin;
  }
  const preload = new Set([STAR]);
  SKINS.forEach((skin) => {
    [skin.stand, skin.sit, skin.air, skin.dizzy, skin.climb, ...skin.walk, ...skin.roll].forEach((src) => preload.add(src));
  });
  preload.forEach((src) => { const i = new Image(); i.src = src; });

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const G = 0.55; // px / frame²
  const MAX_PETS = 12;

  const layer = document.getElementById("pet-layer");
  const settings = { size: 72, speed: 1 };
  const pets = [];
  let perchEls = [];
  let rects = new Map();
  let phrases = ["hi!"];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;

  function refreshPerches() {
    perchEls = Array.from(document.querySelectorAll("[data-perch]"));
  }

  function measure() {
    rects = new Map();
    for (const el of perchEls) {
      const r = el.getBoundingClientRect();
      if (r.width < 110 || r.height < 30) continue;
      if (r.bottom < -400 || r.top > vh() + 400) continue;
      rects.set(el, r);
    }
  }

  /** Floor under x between yFrom and yTo (falling downward). */
  function landingFloor(x, yFrom, yTo) {
    let best = null;
    for (const [el, r] of rects) {
      if (x < r.left + 10 || x > r.right - 10) continue;
      if (r.top < 40 || r.top > vh() - 10) continue; // only perches on screen, under the nav
      if (yFrom <= r.top + 1 && yTo >= r.top) {
        if (!best || r.top < best.top) best = { el, top: r.top };
      }
    }
    if (yTo >= vh()) {
      if (!best || vh() < best.top) best = { el: null, top: vh() };
    }
    return best;
  }

  class Pet {
    constructor(x, y, skin) {
      this.skin = skin;
      this.x = x; this.y = y; this.vx = 0; this.vy = 0;
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.state = "fall";
      this.timer = 0;
      this.support = null; // element or null (= viewport floor)
      this.localX = 0;
      this.t = Math.random() * 100;
      this.rot = 0; this.rotV = 0;
      this.frame = skin.air;
      this.target = null;

      const el = (this.el = document.createElement("div"));
      el.className = "pet air";
      el.innerHTML =
        '<div class="body"><img alt="" draggable="false" /></div>' +
        '<span class="shadow"></span>' +
        '<span class="stars"><img alt="" src="' + STAR + '"/><img alt="" src="' + STAR + '"/><img alt="" src="' + STAR + '"/></span>' +
        '<span class="bubble"></span>';
      this.body = el.querySelector(".body");
      this.img = el.querySelector(".body img");
      this.bubble = el.querySelector(".bubble");
      this.img.src = this.frame;
      layer.appendChild(el);
      this.bindDrag();
    }

    get size() { return settings.size; }

    setFrame(src) {
      if (this.frame !== src) { this.frame = src; this.img.src = src; }
    }

    say(text, ms = 1600) {
      this.bubble.textContent = text;
      this.bubble.classList.add("show");
      clearTimeout(this.sayT);
      this.sayT = setTimeout(() => this.bubble.classList.remove("show"), ms);
    }

    emit(char) {
      const p = document.createElement("span");
      p.className = "particle";
      p.textContent = char;
      p.style.left = this.x + "px";
      p.style.top = this.y - this.size + "px";
      p.style.setProperty("--dx", rand(-30, 30) + "px");
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }

    bindDrag() {
      let samples = [];
      let start = null;
      let moved = false;
      const onMove = (e) => {
        if (!start) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        if (!moved) {
          moved = true;
          this.state = "drag";
          this.support = null;
          this.el.classList.add("dragging", "air");
          this.el.classList.remove("dizzy");
          this.say(pick(phrases), 900);
        }
        this.x = e.clientX;
        this.y = e.clientY + this.size * 0.35;
        const now = performance.now();
        samples.push({ x: this.x, y: this.y, t: now });
        samples = samples.filter((s) => now - s.t < 90);
      };
      const onUp = (e) => {
        if (!start) return;
        this.el.releasePointerCapture?.(e.pointerId);
        this.el.removeEventListener("pointermove", onMove);
        this.el.removeEventListener("pointerup", onUp);
        this.el.removeEventListener("pointercancel", onUp);
        start = null;
        this.el.classList.remove("dragging");
        if (!moved) { this.poke(); return; }
        const a = samples[0], b = samples[samples.length - 1];
        let vx = 0, vy = 0;
        if (a && b && b.t > a.t) {
          const k = 16.67 / (b.t - a.t);
          vx = (b.x - a.x) * k; vy = (b.y - a.y) * k;
        }
        this.vx = clamp(vx, -38, 38);
        this.vy = clamp(vy, -38, 38);
        this.state = "fall";
      };
      this.el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        start = { x: e.clientX, y: e.clientY };
        moved = false; samples = [];
        this.el.setPointerCapture?.(e.pointerId);
        this.el.addEventListener("pointermove", onMove);
        this.el.addEventListener("pointerup", onUp);
        this.el.addEventListener("pointercancel", onUp);
      });
    }

    poke() {
      if (this.state === "drag") return;
      this.emit(pick(["💜", "✨", "💖", "⭐"]));
      this.say(pick(phrases));
      if (this.onSurface()) this.jump(rand(-3, 3), -11);
    }

    onSurface() {
      return ["idle", "walk", "sit", "roll"].includes(this.state);
    }

    jump(vx, vy) {
      this.state = "fall";
      this.support = null;
      this.vx = vx; this.vy = vy;
      this.el.classList.add("air");
    }

    land(floor) {
      const impact = this.vy;
      this.y = floor.top;
      this.vy = 0;
      this.support = floor.el;
      if (floor.el) this.localX = this.x - rects.get(floor.el).left;
      this.el.classList.remove("air");
      if (impact > 22) {
        this.state = "dizzy"; this.timer = 100;
        this.el.classList.add("dizzy");
        this.vx = 0;
        this.say(document.documentElement.lang === "vi" ? "choáng quá…" : "ouch…", 1400);
      } else {
        this.vx *= 0.3;
        this.choose();
      }
    }

    supportRect() {
      if (!this.support) return { left: 0, right: vw(), top: vh() };
      return rects.get(this.support) || null;
    }

    choose() {
      const r = Math.random();
      this.el.classList.remove("dizzy");
      if (this.target != null && !this.support) {
        this.state = "walk"; this.timer = 400;
        return;
      }
      if (reduced) { this.state = r < 0.5 ? "idle" : "sit"; this.timer = rand(120, 300); return; }
      if (r < 0.22) { this.state = "idle"; this.timer = rand(60, 160); }
      else if (r < 0.34) { this.state = "sit"; this.timer = rand(140, 300); }
      else if (r < 0.44) { this.state = "roll"; this.timer = rand(40, 90); this.dir = Math.random() < 0.5 ? -1 : 1; }
      else if (r < 0.54 && this.tryJumpUp()) { /* jumped */ }
      else { this.state = "walk"; this.timer = rand(120, 320); if (Math.random() < 0.4) this.dir *= -1; }
    }

    /** Hop onto a perch above that's within reach. */
    tryJumpUp() {
      const candidates = [];
      for (const [el, r] of rects) {
        if (el === this.support) continue;
        const dy = this.y - r.top;
        if (dy < 50 || dy > 280 || r.top < 60) continue;
        const tx = clamp(this.x, r.left + 30, r.right - 30);
        if (Math.abs(tx - this.x) > 260) continue;
        candidates.push({ r, tx, dy });
      }
      if (!candidates.length) return false;
      const c = pick(candidates);
      const h = c.dy + 50;
      const vy0 = -Math.sqrt(2 * G * h);
      const T = -vy0 / G + Math.sqrt((2 * 50) / G);
      this.dir = c.tx >= this.x ? 1 : -1;
      this.jump((c.tx - this.x) / T, vy0);
      return true;
    }

    step(dt) {
      this.t += dt;
      const s = settings.speed;
      const bodyT = [];
      let lean = 0;

      // Ride the element we stand on.
      if (this.onSurface() || this.state === "dizzy") {
        const sr = this.supportRect();
        if (!sr) { this.jump(0, 0); }
        else {
          this.y = sr.top;
          if (this.support) this.x = sr.left + this.localX;
        }
      }

      switch (this.state) {
        case "idle":
          this.setFrame(this.skin.stand);
          bodyT.push(`scale(${1 + Math.sin(this.t * 0.08) * 0.015}, ${1 - Math.sin(this.t * 0.08) * 0.02})`);
          break;
        case "sit":
          this.setFrame(this.skin.sit);
          bodyT.push(`scale(1.04, ${0.94 + Math.sin(this.t * 0.05) * 0.02})`);
          break;
        case "walk":
        case "roll": {
          const rolling = this.state === "roll";
          if (this.target != null && !this.support) {
            this.dir = this.target > this.x ? 1 : -1;
            if (Math.abs(this.target - this.x) < 12) { this.target = null; this.state = "idle"; this.timer = 90; this.say(pick(phrases)); }
          }
          const v = (rolling ? 4.2 : 1.25) * s * this.dir * dt;
          this.x += v;
          if (this.support) this.localX += v;
          if (rolling) {
            this.setFrame(this.skin.roll[((this.t * 0.55 * s) | 0) % this.skin.roll.length]);
          } else if (this.skin.walk.length > 1) {
            this.setFrame(this.skin.walk[((this.t * 0.22 * s) | 0) % this.skin.walk.length]);
            const ph = this.t * 0.32 * s;
            bodyT.push(`translateY(${-Math.abs(Math.sin(ph)) * 4}px)`);
          } else {
            this.setFrame(this.skin.stand);
            const ph = this.t * 0.32 * s;
            bodyT.push(`translateY(${-Math.abs(Math.sin(ph)) * 5}px) rotate(${Math.sin(ph) * 6}deg)`);
          }
          const sr = this.supportRect();
          const half = this.size * 0.3;
          if (sr) {
            if (!this.support) {
              // Viewport floor: reach a side → sometimes climb, else turn.
              if (this.x < half || this.x > vw() - half) {
                this.x = clamp(this.x, half, vw() - half);
                if (!reduced && !rolling && Math.random() < 0.55) {
                  this.state = "climb"; this.side = this.x < vw() / 2 ? -1 : 1;
                  this.x = this.side < 0 ? this.size * 0.42 : vw() - this.size * 0.42;
                  this.timer = rand(120, 420);
                  this.el.classList.add("air");
                } else this.dir *= -1;
              }
            } else if (this.x < sr.left + 6 || this.x > sr.right - 6) {
              if (Math.random() < 0.45) { this.jump(this.dir * 2.2, -4); }
              else { this.dir *= -1; this.x = clamp(this.x, sr.left + 7, sr.right - 7); this.localX = this.x - sr.left; }
            }
          }
          break;
        }
        case "climb": {
          this.setFrame(this.skin.climb);
          this.y -= 1.1 * s * dt;
          const ph = this.t * 0.3 * s;
          bodyT.push(`rotate(${this.side * 90}deg) translateY(${-Math.abs(Math.sin(ph)) * 4}px)`);
          if (--this.timer <= 0 || this.y < this.size + 70) {
            this.say(pick(phrases), 900);
            this.jump(-this.side * rand(1.5, 4), -2);
          }
          break;
        }
        case "dizzy":
          this.setFrame(this.skin.dizzy);
          bodyT.push(`rotate(${Math.sin(this.t * 0.25) * 8}deg)`);
          break;
        case "drag": {
          this.setFrame(this.skin.sit);
          // Dangle: spring the body toward the opposite of motion.
          const last = this._lx ?? this.x;
          const want = clamp(-(this.x - last) * 2.4, -50, 50);
          this.rotV += (want - this.rot) * 0.15;
          this.rotV *= 0.78;
          this.rot += this.rotV;
          lean = this.rot;
          bodyT.push(`rotate(${lean}deg)`);
          break;
        }
        case "fall": {
          this.setFrame(this.skin.air);
          const prevY = this.y;
          this.vy = Math.min(this.vy + G * dt, 40);
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          const half = this.size * 0.4;
          if (this.x < half) { this.x = half; this.vx = Math.abs(this.vx) * 0.55; }
          if (this.x > vw() - half) { this.x = vw() - half; this.vx = -Math.abs(this.vx) * 0.55; }
          if (this.y < this.size) { this.y = this.size; this.vy = Math.abs(this.vy) * 0.3; }
          if (this.vx) this.dir = this.vx > 0 ? 1 : -1;
          this.rot += this.vx * 0.8 * dt;
          bodyT.push(`rotate(${this.rot}deg)`);
          if (this.vy > 0) {
            const floor = landingFloor(this.x, prevY, this.y);
            if (floor) { this.rot = 0; this.land(floor); }
          }
          break;
        }
      }

      if (this.state !== "fall" && this.state !== "drag") this.rot *= 0.8;
      this._lx = this.x;

      if (this.onSurface() || this.state === "dizzy") {
        this.timer -= dt;
        if (this.timer <= 0) this.choose();
      }

      const sz = this.size;
      this.el.style.setProperty("--size", sz + "px");
      this.el.style.transform = `translate3d(${this.x - sz / 2}px, ${this.y - sz}px, 0)`;
      const flip = this.state === "climb" ? 1 : -this.dir; // sprites face left
      this.body.style.transform = `scaleX(${flip}) ` + bodyT.join(" ");
    }

    destroy() { this.el.remove(); }
  }

  let last = performance.now();
  let running = true;
  function loop(now) {
    const dt = clamp((now - last) / 16.67, 0, 3);
    last = now;
    if (running && !layer.classList.contains("off")) {
      measure();
      for (const p of pets) p.step(dt);
    }
    requestAnimationFrame(loop);
  }

  function spawn(x, y) {
    if (pets.length >= MAX_PETS) {
      const p = pets[(Math.random() * pets.length) | 0];
      p.say(document.documentElement.lang === "vi" ? "đủ " + MAX_PETS + " bé rồi!" : MAX_PETS + " is the max!");
      return null;
    }
    const p = new Pet(x ?? rand(80, vw() - 80), y ?? -40, takeSkin());
    p.vx = rand(-3, 3);
    pets.push(p);
    return p;
  }

  window.MooshiPets = {
    init() {
      refreshPerches();
      measure();
      const n = vw() < 700 ? 5 : 10;
      // First pet lands on the floor near the hint; the rest drop in, each a different skin.
      const first = spawn(vw() * 0.62, vh() - 1);
      if (first) {
        first.state = "idle";
        first.timer = 90;
        first.el.classList.remove("air");
        first.setFrame(first.skin.stand);
      }
      for (let i = 1; i < n; i++) {
        const x = ((i + 0.45) / n) * vw();
        setTimeout(() => spawn(x, -30 - (i % 3) * 36), 280 * i);
      }
      document.addEventListener("visibilitychange", () => { running = !document.hidden; last = performance.now(); });
      requestAnimationFrame(loop);
    },
    spawn,
    refreshPerches,
    setSize(v) { settings.size = +v; },
    setSpeed(v) { settings.speed = +v; },
    setPhrases(list) { phrases = list; },
    /** Nearest floor-walking pet strolls toward x. */
    attract(x) {
      let best = null, bd = Infinity;
      for (const p of pets) {
        if (p.support || !p.onSurface()) continue;
        const d = Math.abs(p.x - x);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) { best.target = clamp(x, 40, vw() - 40); best.state = "walk"; best.timer = 600; }
    },
    party() {
      pets.forEach((p, i) => setTimeout(() => {
        if (p.state === "drag") return;
        p.jump(rand(-6, 6), rand(-16, -10));
        p.emit(pick(["🎉", "✨", "💜", "⭐"]));
      }, i * 120));
    },
    toggle(show) { layer.classList.toggle("off", !show); },
  };
})();
