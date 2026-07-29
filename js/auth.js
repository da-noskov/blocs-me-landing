/* ============================================================
   BLOCS-ME — auth page: intro, live feed loop, form modes
   ============================================================ */
(() => {
  "use strict";

  const I18N = window.BLOCS_I18N || {};
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animate = typeof window.gsap !== "undefined" && !prefersReduced;

  /* ---------- form: signup <-> signin ---------- */
  const form = $("#authForm");
  if (form) {
    $$("[data-switch]", form).forEach((b) => {
      b.addEventListener("click", () => {
        form.dataset.mode = b.dataset.switch;
        const pass = $("#authPass");
        if (pass) pass.setAttribute("autocomplete",
          form.dataset.mode === "signin" ? "current-password" : "new-password");
        if (animate) {
          gsap.fromTo(form, { autoAlpha: 0.4, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" });
        }
      });
    });

    const flagBad = (el, bad) => el && el.classList.toggle("is-bad", bad);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#authEmail");
      const pass = $("#authPass");
      const agree = $("#authAgree");
      const agreeWrap = $(".auth-agree", form);
      const signup = form.dataset.mode === "signup";

      const emailOk = email.checkValidity();
      const passOk = pass.checkValidity();
      const agreeOk = !signup || (agree && agree.checked);
      flagBad(email, !emailOk);
      flagBad(pass, !passOk);
      if (agreeWrap) agreeWrap.classList.toggle("is-bad", !agreeOk);

      if (!emailOk || !passOk || !agreeOk) {
        if (animate) gsap.fromTo(form, { x: 0 }, { x: -7, duration: 0.06, yoyo: true, repeat: 5, ease: "power1.inOut", clearProps: "x" });
        return;
      }

      // prototype: no backend yet — show a success state on the button
      const btn = $("#authSubmit");
      btn.disabled = true;
      btn.style.pointerEvents = "none";
      btn.innerHTML = signup ? (I18N.created || "Account created — check your email ✓") : (I18N.signed || "Signed in ✓");
    });

    ["authEmail", "authPass"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", () => el.classList.remove("is-bad"));
    });
    const agree = $("#authAgree");
    if (agree) agree.addEventListener("change", () => $(".auth-agree", form).classList.remove("is-bad"));
  }

  const google = $("#authGoogle");
  if (google) {
    google.addEventListener("click", () => {
      // prototype: wire your OAuth endpoint here
      google.textContent = I18N.connecting || "Connecting to Google…";
    });
  }

  /* ---------- language dropdown: close on outside click ---------- */
  document.addEventListener("click", (e) => {
    $$("details.lang-dd[open]").forEach((dd) => { if (!dd.contains(e.target)) dd.open = false; });
  });

  if (!animate) {
    // static fallback: show the first feed card
    const first = $(".auth-card");
    if (first) { first.style.opacity = 1; first.style.visibility = "visible"; }
    return;
  }

  /* ---------- intro ---------- */
  const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
  intro
    .from(".auth-line em", { yPercent: 115, duration: 1.1, stagger: 0.1, delay: 0.15 })
    .from(".auth-eyebrow", { y: 18, autoAlpha: 0, duration: 0.7 }, "-=0.8")
    .from(".auth-perks li", { x: -22, autoAlpha: 0, duration: 0.6, stagger: 0.09 }, "-=0.6")
    .from(".auth-feed", { y: 24, autoAlpha: 0, duration: 0.7 }, "-=0.4")
    .from(".auth-stats", { y: 16, autoAlpha: 0, duration: 0.6 }, "-=0.45")
    .from(".auth-panel__inner", { y: 34, autoAlpha: 0, duration: 0.9, ease: "power3.out" }, 0.35);

  /* ---------- counters ---------- */
  $$("[data-count]").forEach((el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const st = { v: 0 };
    gsap.to(st, {
      v: target,
      duration: 1.8,
      delay: 0.9,
      ease: "power2.out",
      onUpdate: () => { el.textContent = Math.round(st.v).toLocaleString("en-US"); },
    });
  });

  /* ---------- live feed: cards cycle forever ---------- */
  const cards = $$("#authFeed .auth-card");
  if (cards.length > 1) {
    const HOLD = 2.6;
    const feed = gsap.timeline({ repeat: -1, delay: 1.4 });
    cards.forEach((card) => {
      feed
        .fromTo(card,
          { autoAlpha: 0, y: 26, scale: 0.97 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.6)" })
        .to(card,
          { autoAlpha: 0, y: -18, scale: 0.98, duration: 0.45, ease: "power2.in" },
          "+=" + HOLD);
    });
    document.addEventListener("visibilitychange", () => {
      document.hidden ? feed.pause() : feed.play();
    });
  }
})();
