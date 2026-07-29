/* ============================================================
   BLOCS-ME — interactions & scroll animations
   GSAP + ScrollTrigger + Lenis (all loaded via CDN, guarded)
   ============================================================ */
(() => {
  "use strict";

  const I18N = window.BLOCS_I18N || {};
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer    = window.matchMedia("(pointer: fine)").matches;
  const hasGSAP        = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const animate        = hasGSAP && !prefersReduced;

  // The "js" class arms the CSS reveal states (.fade-up hidden etc.).
  // Only add it when we can actually run the animations.
  if (animate) document.documentElement.classList.add("js");

  /* ---------- Footer year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Nav: scrolled state + hide on scroll down ---------- */
  const nav = $("#nav");
  let lastY = window.scrollY;
  let navTicking = false;

  function updateNav() {
    const y = window.scrollY;
    nav.classList.toggle("nav--scrolled", y > 12);
    if (y > lastY && y > 360 && !menuOpen) nav.classList.add("nav--hidden");
    else nav.classList.remove("nav--hidden");
    lastY = y;
    navTicking = false;
  }
  window.addEventListener("scroll", () => {
    if (!navTicking) { navTicking = true; requestAnimationFrame(updateNav); }
  }, { passive: true });
  updateNav();

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  const menu   = $("#mobileMenu");
  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    burger.classList.toggle("is-open", open);
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (burger && menu) {
    burger.addEventListener("click", () => setMenu(!menuOpen));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) setMenu(false); });
  }

  /* ---------- Anchor links ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    });
  });

  /* ---------- FAQ accordion ---------- */
  $$(".faq__item").forEach((item) => {
    const q = $(".faq__q", item);
    if (!q) return;
    q.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      // close siblings
      $$(".faq__item.is-open").forEach((other) => {
        if (other !== item) {
          other.classList.remove("is-open");
          const oq = $(".faq__q", other);
          if (oq) oq.setAttribute("aria-expanded", "false");
        }
      });
      item.classList.toggle("is-open", willOpen);
      q.setAttribute("aria-expanded", String(willOpen));
    });
  });

  /* ---------- Scale rigs: desktop layouts shrunk on small screens ---------- */
  const makeRig = (rigSel, hostSel, baseW, bp, fixWidth) => {
    const rig = $(rigSel);
    const host = $(hostSel);
    if (!rig || !host) return null;
    return () => {
      if (window.innerWidth <= bp) {
        const cs = getComputedStyle(host);
        const w = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const s = Math.min(1, w / baseW);
        if (fixWidth) rig.style.width = baseW + "px";
        rig.style.transformOrigin = document.documentElement.dir === "rtl" ? "top right" : "top left";
        rig.style.transform = `scale(${s})`;
        host.style.height = rig.offsetHeight * s + "px";
      } else {
        rig.style.width = "";
        rig.style.transform = "";
        host.style.height = "";
      }
    };
  };
  const rigs = [
    makeRig(".demo-scale", ".hero__demo", 1100, 1024, true),
    makeRig(".ppage-scale", ".ppage-wrap", 1100, 1024, true),
  ].filter(Boolean);
  const fitRigs = () => rigs.forEach((f) => f());
  window.addEventListener("resize", fitRigs);
  fitRigs();

  /* ---------- Pricing: seller / buyer tabs ---------- */
  const ptabs = $$(".ptabs button");
  if (ptabs.length) {
    ptabs.forEach((b) => {
      b.addEventListener("click", () => {
        ptabs.forEach((x) => {
          x.classList.toggle("is-on", x === b);
          x.setAttribute("aria-selected", String(x === b));
        });
        $$(".ppane").forEach((p) => p.classList.toggle("is-on", p.dataset.pane === b.dataset.tab));
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  }

  /* ---------- Dot-matrix map fills (geo continents / UAE) ---------- */
  const SVGNS = "http://www.w3.org/2000/svg";
  const fillDotMatrix = (mapSel, landSel, dotsSel, warm) => {
    const map = $(mapSel);
    if (!map || !map.createSVGPoint) return;
    const lands = $$(landSel, map);
    const dotsG = $(dotsSel, map);
    if (!lands.length || !dotsG) return;
    const vb = map.viewBox.baseVal;
    const p = map.createSVGPoint();
    const frag = document.createDocumentFragment();
    const STEP = warm.step || 13;
    // clean uniform grid: fixed radius, no jitter
    for (let gy = 10; gy < vb.height - 4; gy += STEP) {
      for (let gx = 8; gx < vb.width - 4; gx += STEP) {
        p.x = gx; p.y = gy;
        if (!lands.some((l) => l.isPointInFill && l.isPointInFill(p))) continue;
        const c = document.createElementNS(SVGNS, "circle");
        c.setAttribute("cx", gx);
        c.setAttribute("cy", gy);
        c.setAttribute("r", "1.5");
        const d = Math.hypot(gx - warm.x, gy - warm.y);
        c.setAttribute("fill", d < warm.r ? warm.color : "#3D3D37");
        frag.appendChild(c);
      }
    }
    dotsG.appendChild(frag);
  };
  fillDotMatrix("#geoMap", "#geoLand *", "#geoDots", { x: 266, y: 278, r: 70, color: "#7A6428" });

  /* ============================================================
     Everything below requires GSAP + motion allowed
     ============================================================ */
  if (!animate) return;

  /* ---------- Split-line wrapping ---------- */
  $$(".split").forEach((line) => {
    const inner = document.createElement("span");
    inner.className = "split__inner";
    while (line.firstChild) inner.appendChild(line.firstChild);
    line.appendChild(inner);
  });

  /* ---------- Hero intro timeline ---------- */
  const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });
  heroTl
    .from(".hero__title .split__inner", {
      yPercent: 115,
      duration: 1.25,
      stagger: 0.12,
      delay: 0.2,
    })
    .from('[data-anim="hero-sub"]',     { y: 30, autoAlpha: 0, duration: 0.8 }, "-=0.6")
    .from('[data-anim="hero-cta"]',     { y: 30, autoAlpha: 0, duration: 0.8 }, "-=0.65")
    .from('[data-anim="hero-trust"]',   { y: 18, autoAlpha: 0, duration: 0.7 }, "-=0.6")
    .from('[data-anim="hero-demo"]',    { y: 90, autoAlpha: 0, duration: 1.3, ease: "power3.out" }, "-=0.45");

  /* demo panel straightens as it scrolls into view */
  gsap.fromTo(".demo",
    { rotateX: 8 },
    {
      rotateX: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero__demo",
        start: "top 95%",
        end: "top 40%",
        scrub: 0.5,
      },
    }
  );

  /* ---------- Map demo: looping cursor scenario ----------
     cursor → click pin → project card opens → cursor → click
     "Participate in tender" → request sent → close → repeat  */
  const mapEl   = $("#demoMap");
  const mZoom   = $("#mapZoom");
  const mCursor = $("#mapCursor");
  const mPin    = $("#mapPin");
  const mCard   = $("#mapCard");
  const mBtn    = $("#mapCardBtn");
  const mHov1   = $("#mapHov1");
  const mHov2   = $("#mapHov2");

  if (mapEl && mZoom && mCursor && mPin && mCard && mBtn) {
    const pinInner = mPin.querySelector("b") || mPin;
    const btnLabel = mBtn.textContent;

    // center of an element in map-local coordinates (function-based,
    // re-evaluated on every loop via repeatRefresh → resize-safe)
    const pointOf = (el, oy = 0) => {
      const m = mapEl.getBoundingClientRect();
      const k = m.width / mapEl.offsetWidth || 1; // ancestor scale (mobile rig)
      const r = el.getBoundingClientRect();
      return {
        x: (r.left - m.left + r.width / 2) / k,
        y: (r.top - m.top + r.height / 2 + oy) / k,
      };
    };

    gsap.set(mCard, { autoAlpha: 0, scale: 0.9, transformOrigin: "55% 110%" });

// three demo projects: every click opens its own card
    const ASSETS = window.BLOCS_ASSETS || "";
    const cardData = I18N.cardData || [
      {
        photo: ASSETS + "assets/photos/p07.jpg",
        cat: "Residential & Mixed-Use",
        title: "Marina Gate Waterfront / Plot 194502",
        addr: "UAE \u2013 Dubai \u2013 58QF+W2M \u2013 Dubai Marina \u2013 Al Sufouh Second",
        money: "<b>$999K</b> relevant &nbsp;&middot;&nbsp; <b>$14M</b> total",
        tenderName: "Fa\u00e7ade & glazing package",
        tenderNote: "RFQ closes in 9 days",
      },
      {
        photo: ASSETS + "assets/photos/p11.jpg",
        cat: "Healthcare & Hospitals",
        title: "Business Bay Medical Campus / Plot 118246",
        addr: "UAE \u2013 Dubai \u2013 62JR+8C5 \u2013 Business Bay \u2013 Burj Khalifa District",
        money: "<b>$500K</b> relevant &nbsp;&middot;&nbsp; <b>$6.2M</b> total",
        tenderName: "Full MEP package",
        tenderNote: "RFQ closes in 6 days",
      },
      {
        photo: ASSETS + "assets/photos/p03.jpg",
        cat: "Healthcare & Hospitals",
        title: "Iconic Residence by Mered / Plot 382077",
        addr: "UAE \u2013 Dubai \u2013 67CP+H4Q \u2013 Sheikh Zayed Rd \u2013 Trade Center Second",
        money: "<b>$1.2M</b> relevant &nbsp;&middot;&nbsp; <b>$8.5M</b> total",
        tenderName: "Supply of 1,000 doors",
        tenderNote: "RFQ closes in 12 days",
      },
    ];
    const setCard = (d) => {
      const img = mCard.querySelector(".mcard__photo img");
      if (img) img.src = d.photo;
      mCard.querySelector(".mcard__cat").textContent = d.cat;
      mCard.querySelector(".mcard__title").textContent = d.title;
      mCard.querySelector(".mcard__addr").textContent = d.addr;
      mCard.querySelector(".mcard__money").innerHTML = d.money;
      const tSpan = mCard.querySelector(".mcard__tender > span");
      if (tSpan) tSpan.innerHTML = "<strong>" + d.tenderName + "</strong>" + d.tenderNote;
    };
    const hovAt = (el) => ({
      x: () => pointOf(el || mPin).x,
      y: () => pointOf(el || mPin).y,
    });

    const loop = gsap.timeline({
      repeat: -1,
      repeatDelay: 1.4,
      repeatRefresh: true,
      defaults: { ease: "power2.inOut" },
    });

    loop
      .call(() => { mBtn.classList.remove("is-sent"); mBtn.textContent = btnLabel; })
      .set(mCursor, {
        x: () => mapEl.clientWidth * 0.14,
        y: () => mapEl.clientHeight * 0.82,
        scale: 1,
        autoAlpha: 0,
      })
      // zoom into the map first
      .fromTo(mZoom,
        { scale: 1, transformOrigin: "41% 62%" },
        { scale: 1.3, duration: 1.8, ease: "power2.inOut" })
      .to(mCursor, { autoAlpha: 1, duration: 0.3 }, "-=0.3")

      // ---- object 1: click the first pill, its card pops up ----
      .to(mCursor, { x: hovAt(mHov1).x, y: hovAt(mHov1).y, duration: 1.0, ease: "power3.inOut" })
      .call(() => { if (mHov1) mHov1.classList.add("is-hov"); setCard(cardData[0]); })
      .to(mCursor, { scale: 0.78, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" }, "+=0.1")
      .to(mCard, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)" })
      .to({}, { duration: 1.6 })
      .to(mCard, { autoAlpha: 0, scale: 0.92, duration: 0.35, ease: "power2.in" })
      .call(() => { if (mHov1) mHov1.classList.remove("is-hov"); })

      // ---- object 2: same for the second pill ----
      .to(mCursor, { x: hovAt(mHov2).x, y: hovAt(mHov2).y, duration: 0.95, ease: "power3.inOut" }, "+=0.15")
      .call(() => { if (mHov2) mHov2.classList.add("is-hov"); setCard(cardData[1]); })
      .to(mCursor, { scale: 0.78, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" }, "+=0.1")
      .to(mCard, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)" })
      .to({}, { duration: 1.6 })
      .to(mCard, { autoAlpha: 0, scale: 0.92, duration: 0.35, ease: "power2.in" })
      .call(() => { if (mHov2) mHov2.classList.remove("is-hov"); })

      // ---- object 3: the active marker — here we join the tender ----
      .to(mCursor, {
        x: () => pointOf(mPin).x,
        y: () => pointOf(mPin).y,
        duration: 1.0,
        ease: "power3.inOut",
      }, "+=0.15")
      .call(() => setCard(cardData[2]))
      .to(mCursor, { scale: 0.78, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" }, "+=0.1")
      .fromTo(pinInner,
        { scale: 1, transformOrigin: "50% 50%" },
        { scale: 1.18, duration: 0.16, yoyo: true, repeat: 1 }, "<")
      .to(mCard, { autoAlpha: 1, scale: 1, duration: 0.55, ease: "back.out(1.6)" }, "-=0.05")
      // read, then move to the tender button
      .to(mCursor, {
        x: () => pointOf(mBtn).x,
        y: () => pointOf(mBtn).y,
        duration: 1.2,
        ease: "power3.inOut",
      }, "+=1.0")
      // click "Participate in tender"
      .to(mCursor, { scale: 0.78, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" }, "+=0.15")
      .call(() => { mBtn.classList.add("is-sent"); mBtn.textContent = I18N.requestSent || "Request sent \u2713"; })
      .to({}, { duration: 1.7 })
      // close the card, zoom back out, cursor drifts off
      .to(mCard, { autoAlpha: 0, scale: 0.92, duration: 0.4, ease: "power2.in" })
      .to(mCursor, {
        x: () => mapEl.clientWidth * 0.72,
        y: () => mapEl.clientHeight * 0.6,
        autoAlpha: 0,
        duration: 0.9,
      }, "<")
      .to(mZoom, { scale: 1, duration: 1.2, ease: "power2.inOut" }, "<");
  }

  /* ---------- Section title line reveals ---------- */
  $$(".h2, .cta__title").forEach((heading) => {
    const inners = $$(".split__inner", heading);
    if (!inners.length) return;
    gsap.from(inners, {
      yPercent: 115,
      duration: 1.1,
      stagger: 0.1,
      ease: "power4.out",
      scrollTrigger: { trigger: heading, start: "top 86%", once: true },
    });
  });

  /* ---------- Generic fade-up reveals (batched) ---------- */
  ScrollTrigger.batch(".fade-up", {
    start: "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        ease: "power3.out",
        stagger: 0.09,
        overwrite: true,
      }),
  });
  // Safety net: anything already past the viewport on load
  ScrollTrigger.addEventListener("refreshInit", () => {
    $$(".fade-up").forEach((el) => {
      if (el.getBoundingClientRect().top < 0) gsap.set(el, { y: 0, autoAlpha: 1 });
    });
  });

  /* ---------- Animated counters ---------- */
  $$("[data-count]").forEach((el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const state = { v: 0 };
    gsap.to(state, {
      v: target,
      duration: 1.9,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => { el.textContent = Math.round(state.v).toLocaleString("en-US"); },
    });
  });

  /* ---------- Marquee: nudge with scroll velocity ---------- */
  const marqueeTrack = $(".marquee__track");
  if (marqueeTrack) {
    ScrollTrigger.create({
      trigger: ".marquee",
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-1, 1, self.getVelocity() / 2400);
        gsap.to(marqueeTrack, { skewX: v * 4, duration: 0.4, overwrite: "auto" });
      },
    });
  }

  /* ---------- language dropdown: close on outside click ---------- */
  document.addEventListener("click", (e) => {
    $$("details.lang-dd[open]").forEach((dd) => { if (!dd.contains(e.target)) dd.open = false; });
  });

  /* ---------- Platform slider: endless drift, scroll speeds it up ---------- */
  const slTrack = $("#psliderTrack");
  if (slTrack) {
    // duplicate the set once → xPercent -50 loops seamlessly
    slTrack.innerHTML += slTrack.innerHTML;
    // in RTL the track overhangs to the left, so the loop must travel right
    const slDir = document.documentElement.dir === "rtl" ? 50 : -50;
    const drift = gsap.to(slTrack, {
      xPercent: slDir,
      ease: "none",
      duration: 46,
      repeat: -1,
      paused: true,
    });
    ScrollTrigger.create({
      trigger: ".pslider",
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => (self.isActive ? drift.play() : drift.pause()),
      onUpdate: (self) => {
        drift.timeScale(1 + Math.min(Math.abs(self.getVelocity()) / 300, 9));
        gsap.to(drift, { timeScale: 1, duration: 1.1, ease: "power2.out", overwrite: true });
      },
    });
  }

  /* ---------- Project page: guided highlight tour ---------- */
  const ppPanel = $(".ppage");
  const ppSpot = $("#ppSpot");
  if (ppPanel && ppSpot) {
    const ppLabel = $("#ppSpotLabel");
    const ppStep = $("#ppSpotStep");

    // per-stop micro-animations, re-fired on every visit
    const countText = (el, to, dur, fmt) => {
      if (!el) return;
      const st = { v: 0 };
      gsap.to(st, {
        v: to, duration: dur, ease: "power2.out",
        onUpdate: () => { el.textContent = fmt(st.v); },
      });
    };
    // tab activation + view swap (tender / developer / contractor content)
    const viewOf = (name) => $(".ppage__view[data-view='" + name + "']");
    let ppView = "tender";
    const setTab = (tab) => {
      $$(".ppage__tabs span").forEach((t) => t.classList.remove("is-hot", "is-on"));
      const active = tab || $("#ppTabTender");
      if (active) active.classList.add("is-on");
      if (tab) tab.classList.add("is-hot");
    };
    const switchView = (name) => {
      if (name === ppView) return;
      const from = viewOf(ppView);
      const to = viewOf(name);
      ppView = name;
      if (!from || !to) return;
      gsap.to(from, { autoAlpha: 0, y: -8, duration: 0.28, ease: "power2.in", overwrite: true });
      gsap.fromTo(to,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.45, delay: 0.16, ease: "power2.out", overwrite: true });
      const stakes = to.querySelectorAll(".ppage__stake");
      if (stakes.length) {
        gsap.fromTo(stakes,
          { autoAlpha: 0, x: -14 },
          { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.13, delay: 0.22, ease: "power2.out" });
      }
    };
    const fx = {
      "#ppTimeline": () => {
        setTab(null); switchView("tender");
        gsap.fromTo(".ppage__track i", { width: "10%" }, { width: "48%", duration: 1.2, ease: "power2.inOut" });
        gsap.fromTo(".ppage__events li",
          { autoAlpha: 0, x: -14 },
          { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.15, ease: "power2.out" });
      },
      "#ppTender": () => {
        setTab(null); switchView("tender");
        const nums = [60, 45, 4, 10, 1];
        $$(".ppage__tiles b").forEach((b, i) => countText(b, nums[i] ?? 0, 0.9, (v) => String(Math.round(v))));
        gsap.fromTo(".ppage__btn", { scale: 0.85 }, { scale: 1, duration: 0.7, ease: "back.out(2.6)" });
      },
      "#ppContractor": () => { setTab($("#ppContractor")); switchView("contractor"); },
      "#ppDeveloper": () => { setTab($("#ppDeveloper")); switchView("developer"); },
      "#ppProgress": () => {
        setTab(null); switchView("tender");
        countText($("#ppProgressNum"), 50, 1, (v) => Math.round(v) + "%");
      },
      "#ppValue": () => {
        setTab(null); switchView("tender");
        countText($("#ppValueNum"), 164000000, 1.1,
          (v) => Math.round(v).toLocaleString("en-US") + ".00 USD");
      },
    };

    const stops = [
      ["#ppTimeline", "Timeline — monthly site updates"],
      ["#ppTender", "Tenders — 60 on this project"],
      ["#ppContractor", "Contractor — direct contacts"],
      ["#ppDeveloper", "Developer — verified stakeholders"],
      ["#ppProgress", "Progress — tracked on site"],
      ["#ppValue", "Value — verified budget"],
    ].map(([s, n], i) => [$(s), (I18N.tourStops && I18N.tourStops[i]) || n, s]).filter(([el]) => el);

    if (stops.length) {
      const PAD = 7;
      // layout-space coords (transform-independent: the panel tilts in 3D on entry)
      const rectOf = (el) => {
        let x = 0, y = 0, n = el;
        while (n && n !== ppPanel) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
        return {
          left: x - PAD,
          top: y - PAD,
          width: el.offsetWidth + PAD * 2,
          height: el.offsetHeight + PAD * 2,
        };
      };
      // park the spot on the last stop so the first move eases in like every loop
      gsap.set(ppSpot, { autoAlpha: 0, ...rectOf(stops[stops.length - 1][0]) });

      const tour = gsap.timeline({ repeat: -1, repeatRefresh: true, paused: true });
      stops.forEach(([el, name, sel], i) => {
        tour
          .call(() => {
            if (ppStep) ppStep.textContent =
              String(i + 1).padStart(2, "0") + "/" + String(stops.length).padStart(2, "0");
            ppLabel.textContent = name;
          })
          .to(ppSpot, {
            left: () => rectOf(el).left,
            top: () => rectOf(el).top,
            width: () => rectOf(el).width,
            height: () => rectOf(el).height,
            autoAlpha: 1,
            duration: 0.85,
            ease: "back.out(1.3)",
          })
          .fromTo(".ppage__spotlabel",
            { y: 8, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.35, ease: "power2.out" }, "-=0.3")
          .call(() => { const f = fx[sel]; if (f) f(); })
          .to({}, { duration: 2 });
      });

      // panel "stands up" out of the dark section as it scrolls in
      gsap.fromTo(ppPanel,
        { rotationX: 12, y: 60, transformOrigin: "50% 100%" },
        {
          rotationX: 0, y: 0, ease: "none",
          scrollTrigger: { trigger: ".ppage", start: "top bottom", end: "top 32%", scrub: 1 },
        });

      ScrollTrigger.create({
        trigger: ".ppage",
        start: "top 78%",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? tour.play() : tour.pause()),
      });
    }
  }

  /* ---------- Results: case slider — endless drift, scroll speeds it up.
     On phones: no auto-motion, native finger swipe with snap instead. ---------- */
  const casesTrack = $("#casesTrack");
  if (casesTrack && !window.matchMedia("(max-width: 768px)").matches) {
    casesTrack.innerHTML += casesTrack.innerHTML; // duplicate set → seamless one-copy loop
    const caseDir = document.documentElement.dir === "rtl" ? 50 : -50;
    const caseDrift = gsap.to(casesTrack, {
      xPercent: caseDir,
      ease: "none",
      duration: 70,
      repeat: -1,
      paused: true,
    });
    ScrollTrigger.create({
      trigger: ".cases",
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => (self.isActive ? caseDrift.play() : caseDrift.pause()),
      onUpdate: (self) => {
        caseDrift.timeScale(1 + Math.min(Math.abs(self.getVelocity()) / 300, 8));
        gsap.to(caseDrift, { timeScale: 1, duration: 1.1, ease: "power2.out", overwrite: true });
      },
    });
  }

  /* ---------- Data dashboard: entrance + live data loop ---------- */
  const dash = $(".dash");
  if (dash) {
    // revenue bar chart columns
    const barsWrap = $("#dashBars");
    const barEls = [];
    if (barsWrap) {
      for (let i = 0; i < 14; i++) {
        const col = document.createElement("i");
        const fill = document.createElement("b");
        col.appendChild(fill);
        barsWrap.appendChild(col);
        barEls.push(fill);
      }
    }
    // dot matrices
    $$(".dash__dots", dash).forEach((box) => {
      const total = 48;
      const lit = Math.round(total * (parseFloat(box.dataset.fill) / 100));
      for (let i = 0; i < total; i++) {
        const d = document.createElement("i");
        if (i < lit) d.classList.add("is-on");
        box.appendChild(d);
      }
    });

    const fmt = (el, v) =>
      (el.textContent = el.dataset.dfmt === "dec" ? v.toFixed(1) : Math.round(v).toLocaleString("en-US"));

    const setBars = (initial) => {
      barEls.forEach((b, i) => {
        const trend = 22 + (i / barEls.length) * 58;
        const h = Math.min(98, Math.max(10, trend + gsap.utils.random(-11, 13)));
        gsap.to(b, {
          height: h + "%",
          duration: initial ? 0.9 : 0.8,
          delay: initial ? 0.35 + i * 0.05 : i * 0.025,
          ease: initial ? "power3.out" : "power2.inOut",
        });
      });
    };

    let dashRevVal = 0;
    let dashEntered = false;
    const dashEnter = () => {
      dashEntered = true;
      $$("[data-dnum]", dash).forEach((el) => {
        const target = parseFloat(el.dataset.dnum);
        const st = { v: 0 };
        gsap.to(st, { v: target, duration: 1.6, ease: "power2.out", onUpdate: () => fmt(el, st.v) });
      });
      const rev = $("#dashRev");
      const rs = { v: 0 };
      gsap.to(rs, {
        v: 4.2, duration: 1.8, ease: "power2.out",
        onUpdate: () => { dashRevVal = rs.v; rev.textContent = rs.v.toFixed(2); },
      });
      $$(".frow__bar b", dash).forEach((b, i) => {
        gsap.fromTo(b, { width: "0%" },
          { width: b.dataset.w + "%", duration: 1.1, delay: 0.15 + i * 0.14, ease: "power3.out" });
      });
      setBars(true);
      dashLive.play(2.8); // skip the first refresh, entrance already set bars
    };

    // endless "new data coming in": chart refresh + revenue ticking up
    const dashLive = gsap.timeline({ repeat: -1, paused: true });
    dashLive
      .call(() => {
        setBars(false);
        dashRevVal = Math.min(9.9, dashRevVal + gsap.utils.random(0.01, 0.04));
        const rev = $("#dashRev");
        if (rev) rev.textContent = dashRevVal.toFixed(2);
      })
      .to({}, { duration: 2.8 });

    gsap.fromTo(dash,
      { rotationX: 12, y: 60, autoAlpha: 0.5, transformPerspective: 1300, transformOrigin: "50% 100%" },
      {
        rotationX: 0, y: 0, autoAlpha: 1, ease: "none",
        scrollTrigger: { trigger: ".dash", start: "top bottom", end: "top 35%", scrub: 1 },
      });

    ScrollTrigger.create({ trigger: ".dash", start: "top 78%", once: true, onEnter: dashEnter });
    ScrollTrigger.create({
      trigger: ".dash",
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => { if (dashEntered) (self.isActive ? dashLive.play() : dashLive.pause()); },
    });
  }

  /* ---------- Geo map: routes converge on Dubai ---------- */
  const geoArcs = $$(".geo-arc");
  if (geoArcs.length) {
    const SVGNS = "http://www.w3.org/2000/svg";
    const pulsesG = $("#geoPulses");

    // panel "stands up" out of the page as it scrolls in
    gsap.fromTo($(".geo__tilt"),
      { rotationX: 16, y: 56, transformOrigin: "50% 100%" },
      {
        rotationX: 0, y: 0, ease: "none",
        scrollTrigger: { trigger: ".geo", start: "top bottom", end: "top 30%", scrub: 1 },
      });

    // arcs draw themselves in on first view
    geoArcs.forEach((a) => {
      const L = a.getTotalLength();
      gsap.set(a, { strokeDasharray: L, strokeDashoffset: L });
    });
    gsap.to(geoArcs, {
      strokeDashoffset: 0,
      duration: 1.5,
      ease: "power2.inOut",
      stagger: 0.1,
      scrollTrigger: { trigger: ".geo", start: "top 72%", once: true },
    });
    gsap.from($$("#geoCities > *"), {
      autoAlpha: 0,
      duration: 0.6,
      stagger: 0.045,
      delay: 0.5,
      scrollTrigger: { trigger: ".geo", start: "top 72%", once: true },
    });

    // endless sparks travelling along every route into Dubai
    const geoTweens = [];
    geoArcs.forEach((a, i) => {
      const L = a.getTotalLength();
      const dot = document.createElementNS(SVGNS, "circle");
      dot.setAttribute("r", "2.1");
      dot.setAttribute("fill", window.BLOCS_ACCENT || "#FBBB21");
      dot.setAttribute("opacity", "0");
      pulsesG.appendChild(dot);
      const s = { t: 0 };
      geoTweens.push(gsap.to(s, {
        t: 1,
        duration: 1.7 + (i % 4) * 0.4,
        delay: 1.2 + i * 0.45,
        repeat: -1,
        repeatDelay: 0.5 + (i % 3) * 0.7,
        ease: "power1.inOut",
        paused: true,
        onUpdate: () => {
          const pt = a.getPointAtLength(s.t * L);
          dot.setAttribute("cx", pt.x.toFixed(1));
          dot.setAttribute("cy", pt.y.toFixed(1));
          dot.setAttribute("opacity",
            (s.t < 0.08 ? s.t / 0.08 : s.t > 0.9 ? (1 - s.t) / 0.1 : 1).toFixed(2));
        },
      }));
    });
    // pulsing rings around the Dubai hub
    $$(".geo-ring").forEach((r, k) => {
      geoTweens.push(gsap.fromTo(r,
        { attr: { r: 6 }, opacity: 0.75 },
        { attr: { r: 36 }, opacity: 0, duration: 2.6, repeat: -1, delay: k * 1.3, ease: "power1.out", paused: true }));
    });
    ScrollTrigger.create({
      trigger: ".geo",
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => geoTweens.forEach((t) => (self.isActive ? t.play() : t.pause())),
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer) {
    $$(".magnetic").forEach((btn) => {
      const strength = 0.32;
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        gsap.to(btn, { x: dx * strength, y: dy * strength, duration: 0.45, ease: "power3.out" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
      });
    });
  }

  /* ---------- 3D tilt on cards / CTA panel ---------- */
  if (finePointer) {
    $$(".tilt, .tilt-soft").forEach((card) => {
      const max = card.classList.contains("tilt-soft") ? 2.5 : 6;
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, {
          rotateY: px * max,
          rotateX: -py * max,
          transformPerspective: 900,
          duration: 0.55,
          ease: "power2.out",
        });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.9, ease: "power3.out" });
      });
    });
  }

})();
