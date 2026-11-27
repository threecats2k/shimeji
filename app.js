(function () {
  "use strict";
  const C = window.MOOSHI_CONFIG;
  const I = window.MOOSHI_I18N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isAndroid = /android/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  /* ---------- links ---------- */
  const open = (a, href) => { a.href = href; a.target = "_blank"; a.rel = "noopener"; };
  // Lead is the conversion Meta ads optimize for. PageView is fired by the pixel in <head>.
  const trackStore = (name) => {
    if (!C.pixelId || typeof fbq !== "function") return;
    fbq("track", "Lead", { content_name: name, content_category: "app_install" });
  };
  $$(".js-play").forEach((a) => {
    open(a, C.playUrl);
    a.addEventListener("click", () => trackStore("google_play"));
  });
  $$(".js-ios").forEach((a) => {
    open(a, C.iosUrl);
    a.addEventListener("click", () => trackStore("app_store"));
  });
  // Nav "Get the app" follows the visitor's phone; desktop stays on Google Play.
  $$(".js-store").forEach((a) => {
    open(a, isIOS ? C.iosUrl : C.playUrl);
    a.addEventListener("click", () => trackStore(isIOS ? "app_store" : "google_play"));
  });
  $$(".js-discord").forEach((a) => { a.href = C.discordUrl; });
  if (isIOS) {
    $$(".store-row").forEach((row) => {
      const ios = $(".js-ios", row);
      if (ios) row.prepend(ios);
    });
  }

  /* ---------- i18n ---------- */
  const enCopy = new Map();
  $$("[data-i18n]").forEach((el) => enCopy.set(el, el.innerHTML));
  let lang = (localStorage.getItem("mooshi-lang") || navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en";

  function applyLang() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => {
      const k = el.dataset.i18n;
      el.innerHTML = lang === "vi" && I.vi[k] ? I.vi[k] : enCopy.get(el);
    });
    $("#lang-toggle").textContent = lang === "vi" ? "EN" : "VI";
    window.MooshiPets && MooshiPets.setPhrases(I.phrases[lang]);
    rotIdx = 0;
    const w = document.createElement("span");
    w.className = "rot-word grad";
    w.textContent = I.rotate[lang][0];
    rotHost.replaceChildren(w);
    setPetsLabel();
  }
  $("#lang-toggle").addEventListener("click", () => {
    lang = lang === "vi" ? "en" : "vi";
    localStorage.setItem("mooshi-lang", lang);
    applyLang();
  });

  /* ---------- rotating hero word ---------- */
  let rotIdx = 0;
  const rotHost = $(".rotator");
  function rotate() {
    const words = I.rotate[lang];
    const cur = $(".rot-word", rotHost);
    rotIdx = (rotIdx + 1) % words.length;
    cur.classList.add("out");
    setTimeout(() => {
      const n = document.createElement("span");
      n.className = "rot-word grad";
      n.textContent = words[rotIdx];
      rotHost.replaceChildren(n);
    }, 330);
  }
  if (!reduced) setInterval(rotate, 2400);

  /* ---------- reveal + counters ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      $$("[data-count]", e.target).forEach(countUp);
      if (e.target.matches("[data-count]")) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el, i) => { el.style.setProperty("--d", (i % 4) * 0.08 + "s"); io.observe(el); });

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const to = +el.dataset.count, suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = to + suffix; return; }
    const t0 = performance.now(), dur = 1400;
    (function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- nav hides on scroll down ---------- */
  let lastY = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY;
    $("#nav").classList.toggle("hidden", y > lastY && y > 200);
    lastY = y;
  }, { passive: true });

  /* ---------- cursor glow, tilt, magnetic, spotlight ---------- */
  if (fine && !reduced) {
    const glow = $(".cursor-glow");
    addEventListener("pointermove", (e) => {
      glow.style.setProperty("--mx", e.clientX + "px");
      glow.style.setProperty("--my", e.clientY + "px");
    }, { passive: true });

    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg)`;
        el.style.setProperty("--px", px * 100 + "%");
        el.style.setProperty("--py", py * 100 + "%");
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });

    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  // A pet walks over to whichever download button you're eyeing.
  $$(".js-play, .js-ios, .js-store").forEach((el) => el.addEventListener("pointerenter", () => {
    const r = el.getBoundingClientRect();
    window.MooshiPets && MooshiPets.attract(r.left + r.width / 2);
  }));

  /* ---------- community chat plays in ---------- */
  const chat = $(".chat-main");
  new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    $$(".msg", chat).forEach((m, i) => setTimeout(() => m.classList.add("show"), reduced ? 0 : 400 + i * 900));
  }, { threshold: 0.4 }).observe(chat);

  /* ---------- event code demo ---------- */
  const input = $("#redeem-input");
  const ticket = $("#ticket");
  let countdownT;
  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  });
  $("#redeem-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = input.value.trim() || input.placeholder;
    if (code.length < 4) {
      input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
      return;
    }
    // Only the demo code has a known reward; real codes are checked in the app, so don't
    // invent a name or an expiry for them.
    const demo = code === "MOOSHI-SNOW";
    $("#reward-name").textContent = demo ? "Snowy Mooshi" : lang === "vi" ? "Pet sự kiện bí ẩn" : "Mystery event pet";
    $("#countdown").parentElement.hidden = !demo;
    $("#open-in-app").href = redeemLink(code);
    ticket.classList.add("flipped");
    confetti($(".redeem"));
    if (demo) startCountdown();
  });
  $("#ticket-reset").addEventListener("click", () => {
    ticket.classList.remove("flipped");
    input.value = "";
    clearInterval(countdownT);
    setTimeout(() => input.focus(), 500);
  });

  // Shared links (Discord bot, socials): /?code=MOOSHI-SNOW#codes → prefilled, ready to claim.
  const sharedCode = new URLSearchParams(location.search).get("code");
  if (sharedCode) {
    input.value = sharedCode.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
    setTimeout(() => {
      $("#codes").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      setTimeout(() => $("#redeem-form").requestSubmit(), 900);
    }, 400);
  }


  /** Android opens the app's redeem sheet directly; iOS goes to the App Store; elsewhere, Play. */
  function redeemLink(code) {
    if (isIOS) return C.iosUrl;
    if (!isAndroid) return C.playUrl;
    return "intent://redeem?code=" + encodeURIComponent(code) +
      "#Intent;scheme=" + C.redeemScheme + ";package=" + C.packageId +
      ";S.browser_fallback_url=" + encodeURIComponent(C.playUrl) + ";end";
  }

  function startCountdown() {
    clearInterval(countdownT);
    const end = Date.now() + (2 * 86400 + 5 * 3600 + 17 * 60) * 1000;
    const out = $("#countdown");
    const tick = () => {
      let s = Math.max(0, ((end - Date.now()) / 1000) | 0);
      const d = (s / 86400) | 0; s -= d * 86400;
      const h = (s / 3600) | 0; s -= h * 3600;
      const m = (s / 60) | 0; s -= m * 60;
      out.textContent = `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };
    tick();
    countdownT = setInterval(tick, 1000);
  }

  function confetti(host) {
    if (reduced) return;
    const r = host.getBoundingClientRect();
    const colors = ["#8B34D6", "#B06CF0", "#F472B6", "#FACC15", "#4ADE80", "#60A5FA"];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      c.style.background = colors[i % colors.length];
      c.style.left = r.left + r.width / 2 + "px";
      c.style.top = r.top + r.height / 2 + "px";
      document.body.appendChild(c);
      const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 260;
      c.animate([
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v + 240}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ], { duration: 1200 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => c.remove();
    }
  }

  /* ---------- live pets ---------- */
  MooshiPets.setPhrases(I.phrases[lang]);
  MooshiPets.init();
  $("#ctl-size").addEventListener("input", (e) => MooshiPets.setSize(e.target.value));
  $("#ctl-speed").addEventListener("input", (e) => MooshiPets.setSpeed(e.target.value));
  $("#ctl-add").addEventListener("click", () => MooshiPets.spawn());
  $("#ctl-party").addEventListener("click", () => { MooshiPets.party(); confetti($("#ctl-party")); });

  let petsOn = localStorage.getItem("mooshi-pets") !== "off";
  function setPetsLabel() {
    const b = $("#pets-toggle");
    const key = petsOn ? "foot.hide" : "foot.show";
    b.dataset.i18n = key;
    b.textContent = lang === "vi" ? I.vi[key] : petsOn ? "Hide pets" : "Show pets";
  }
  $("#pets-toggle").addEventListener("click", () => {
    petsOn = !petsOn;
    localStorage.setItem("mooshi-pets", petsOn ? "on" : "off");
    MooshiPets.toggle(petsOn);
    setPetsLabel();
  });
  MooshiPets.toggle(petsOn);

  applyLang();
})();
