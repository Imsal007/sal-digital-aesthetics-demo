/* =========================================================
   Tania's Curated Beauty — booking flow
   1. render treatment menu
   2. 4-step booking modal (treatment → day → time → details)
   3. checks live availability via Google Apps Script
   4. submits booking to Apps Script (sheet + calendar + emails)
   ========================================================= */

const fmtPrice = p => CURRENCY + p.toLocaleString("en-GB");

/* ---------- 1. Render the menu ---------- */
function renderMenu() {
  const perGroupIndex = {}; // stagger position within its own group, not the flat list
  TREATMENTS.forEach(t => {
    const row = document.createElement("div");
    row.className = "menu-row";
    row.style.setProperty("--i", perGroupIndex[t.group] = (perGroupIndex[t.group] || 0));
    perGroupIndex[t.group]++;
    row.innerHTML = `
      <span class="menu-name">${t.name}</span>
      <span class="menu-duration">${t.minutes} min</span>
      <span class="menu-price">${fmtPrice(t.price)}</span>
      <button class="btn btn-accent menu-book" data-book="${t.id}">Book</button>`;
    document.getElementById("menu-" + t.group).appendChild(row);
  });
}

/* ---------- 2. Modal wiring ---------- */
const modal = document.getElementById("bookingModal");
const modalPanel = modal.querySelector(".modal");
let chosenTreatment = null, chosenDate = null, chosenTime = null;
let lastFocused = null;

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
const visibleFocusable = () =>
  [...modalPanel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);

function openModal(treatmentId) {
  lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  chosenTreatment = treatmentId ? TREATMENTS.find(t => t.id === treatmentId) : null;
  chosenDate = chosenTime = null;
  showStep(1, "none");
  const sel = document.getElementById("treatmentSelect");
  sel.innerHTML = TREATMENTS.map(t =>
    `<option value="${t.id}" ${t.id === treatmentId ? "selected" : ""}>${t.name} — ${fmtPrice(t.price)}</option>`).join("");
  sel.value = treatmentId || TREATMENTS[0].id;
  const d = new Date(); d.setDate(d.getDate() + 1);
  const dateInput = document.getElementById("dateInput");
  dateInput.min = d.toISOString().split("T")[0];
  dateInput.value = dateInput.min;
  // focus the step's own first control, not the close button, so the
  // dialog announces what it is before how to leave it
  const step = modalPanel.querySelector(".booking-step:not([hidden])");
  const first = (step && step.querySelector(FOCUSABLE)) || visibleFocusable()[0];
  if (first) first.focus();
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
  if (lastFocused) lastFocused.focus();
}
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* dir: "fwd" slides in from the right (continuing through the flow),
   "back" from the left, "none" for the initial open (the modal itself
   already animates in, so the first step shouldn't animate twice). */
function showStep(n, dir = "fwd") {
  document.querySelectorAll(".booking-step").forEach(s => {
    const isTarget = +s.dataset.step === n;
    s.hidden = !isTarget;
    if (isTarget && dir !== "none" && !reducedMotion) {
      s.animate(
        [{ opacity: 0, transform: `translateX(${dir === "back" ? -14 : 14}px)` },
         { opacity: 1, transform: "translateX(0)" }],
        { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" }
      );
    }
  });
  modalPanel.scrollTop = 0;
}
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-book]");
  if (btn) { e.preventDefault(); openModal(btn.dataset.book || null); }
});
document.getElementById("modalClose").onclick = closeModal;
document.getElementById("modalDone").onclick = closeModal;
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.querySelectorAll("[data-back]").forEach(b =>
  b.onclick = () => showStep(+b.dataset.back, "back"));

/* step 1 → 2 */
document.getElementById("toStep2").onclick = () => {
  chosenTreatment = TREATMENTS.find(t => t.id === document.getElementById("treatmentSelect").value);
  showStep(2, "fwd");
};
/* step 2 → 3 */
document.getElementById("toStep3").onclick = () => {
  chosenDate = document.getElementById("dateInput").value;
  if (!chosenDate) return;
  loadSlots();
  showStep(3, "fwd");
};
/* step 3: fetch availability from Apps Script */
async function loadSlots() {
  const box = document.getElementById("timeSlots");
  const note = document.getElementById("slotNote");
  const next = document.getElementById("toStep4");
  next.disabled = true; chosenTime = null;
  box.innerHTML = SLOT_TIMES.map(t => `<button type="button" class="time-slot" data-time="${t}">${t}</button>`).join("");
  note.textContent = "Checking availability…";
  if (APPS_SCRIPT_URL.startsWith("PASTE_")) {
    note.textContent = "Live availability isn't connected yet — pick a time and I'll confirm it personally.";
    return;
  }
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "checkSlots", date: chosenDate, minutes: chosenTreatment.minutes, times: SLOT_TIMES })
    });
    const data = await res.json();
    // Apps Script replies { taken: [...] }; tolerate a bare array too
    const taken = Array.isArray(data) ? data : (data.taken || []);
    document.querySelectorAll(".time-slot").forEach(s => {
      if (taken.includes(s.dataset.time)) s.classList.add("taken");
    });
    note.textContent = taken.length === SLOT_TIMES.length
      ? "Fully booked that day — please choose another."
      : "Times shown are available.";
  } catch {
    note.textContent = "Could not check live availability — please try WhatsApp if unsure.";
  }
}
document.getElementById("timeSlots").addEventListener("click", e => {
  const slot = e.target.closest(".time-slot");
  if (!slot || slot.classList.contains("taken")) return;
  document.querySelectorAll(".time-slot").forEach(s => s.classList.remove("selected"));
  slot.classList.add("selected");
  chosenTime = slot.dataset.time;
  document.getElementById("toStep4").disabled = false;
});
const friendlyDate = iso =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-GB",
    { weekday: "long", day: "numeric", month: "long" });

/* step 3 → 4 */
document.getElementById("toStep4").onclick = () => {
  document.getElementById("bookingSummary").innerHTML =
    `<strong>${chosenTreatment.name}</strong><br>` +
    `${friendlyDate(chosenDate)} at ${chosenTime}<br>` +
    `${fmtPrice(chosenTreatment.price)}, deposit ${fmtPrice(Math.round(chosenTreatment.price * DEPOSIT_PERCENT / 100))}`;
  showStep(4, "fwd");
};
/* step 4: submit */
document.getElementById("submitBooking").onclick = async () => {
  const err = document.getElementById("formError");
  err.hidden = true;
  const name = document.getElementById("clientName").value.trim();
  const email = document.getElementById("clientEmail").value.trim();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    err.textContent = "Please enter your name and a valid email address."; err.hidden = false; return;
  }
  if (!document.getElementById("gdprConsent").checked) {
    err.textContent = "Please tick the consent box so I can contact you about your booking."; err.hidden = false; return;
  }
  const btn = document.getElementById("submitBooking");
  btn.disabled = true; btn.textContent = "Booking…";
  const payload = {
    action: "book",
    treatmentId: chosenTreatment.id, treatmentName: chosenTreatment.name,
    price: chosenTreatment.price, depositPercent: DEPOSIT_PERCENT,
    groupKey: chosenTreatment.groupKey, minutes: chosenTreatment.minutes,
    date: chosenDate, time: chosenTime,
    name, email,
    phone: document.getElementById("clientPhone").value.trim(),
    dob: document.getElementById("clientDob").value,
    referralCode: document.getElementById("referralCode").value.trim().toUpperCase(),
  };
  let ok = true, checkoutUrl = null;
  if (!APPS_SCRIPT_URL.startsWith("PASTE_")) {
    try {
      const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
      const out = await res.json();
      ok = out.ok !== false;
      checkoutUrl = out.checkoutUrl || null;
    } catch { ok = false; }
  }
  const wa = document.getElementById("waContinue");
  const msg = encodeURIComponent(`Hi, I've just booked ${chosenTreatment.name} on ${chosenDate} at ${chosenTime}. My name is ${name}.`);
  wa.href = `#`; // WhatsApp contact disabled for demo — will be configured per clinic`

  const payNow = document.getElementById("payNow");
  if (ok && checkoutUrl) {
    // Straight to payment rather than making them go find the link in their
    // inbox — the email carries the same link too, as the fallback if they
    // close this tab or come back to it later.
    payNow.href = checkoutUrl;
    payNow.hidden = false;
    wa.classList.replace("btn-accent", "btn-quiet"); // pay is now the primary action, WhatsApp secondary
    document.getElementById("successText").innerHTML =
      `Thank you, <strong>${name.split(" ")[0]}</strong> — your request for <strong>${chosenTreatment.name}</strong> on <strong>${friendlyDate(chosenDate)} at ${chosenTime}</strong> is in. One tap and your deposit is paid — taking you there now.`;
  } else {
    payNow.hidden = true;
    wa.classList.replace("btn-quiet", "btn-accent");
    document.getElementById("successText").innerHTML = ok
      ? `Thank you, <strong>${name.split(" ")[0]}</strong> — your request for <strong>${chosenTreatment.name}</strong> on <strong>${friendlyDate(chosenDate)} at ${chosenTime}</strong> is in. Check your inbox for confirmation and your deposit link. Once the deposit is paid, your appointment is fully confirmed.`
      : `Thank you, <strong>${name.split(" ")[0]}</strong> — tap below to send me your booking on WhatsApp and I'll confirm it personally.`;
  }
  showStep(5, "fwd");
  btn.disabled = false; btn.textContent = "Confirm booking";

  // Auto-continue to Stripe after a beat — long enough to register the
  // booking succeeded, not so long it feels like nothing is happening.
  // The button above is the fallback if a popup/extension blocks this.
  if (ok && checkoutUrl) setTimeout(() => { window.location.href = checkoutUrl; }, 1800);
};

/* ---------- 3. Keyboard: escape to close, tab stays inside ---------- */
document.addEventListener("keydown", e => {
  if (modal.hidden) return;
  if (e.key === "Escape") { closeModal(); return; }
  if (e.key !== "Tab") return;
  const items = visibleFocusable();
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ---------- 4. Navigation ---------- */
const nav = document.getElementById("mainNav");
const navToggle = document.getElementById("navToggle");

function setNav(open) {
  nav.classList.toggle("open", open);
  document.body.classList.toggle("nav-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}
navToggle.onclick = () => setNav(!nav.classList.contains("open"));
nav.addEventListener("click", e => { if (e.target.closest("a")) setNav(false); });

/* tap anywhere outside the sheet, or press Escape, to dismiss */
document.addEventListener("click", e => {
  if (!nav.classList.contains("open")) return;
  if (!e.target.closest("#mainNav") && !e.target.closest("#navToggle")) setNav(false);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && nav.classList.contains("open")) setNav(false);
});
/* rotating to a desktop width must not leave the body scroll-locked */
addEventListener("resize", () => { if (innerWidth > 760) setNav(false); });

/* ---------- 4b. WhatsApp panel — opens on tap, never on its own ---------- */
const waWrap = document.getElementById("wa");
const waCard = document.getElementById("waCard");
const waToggle = document.getElementById("waToggle");

function setWa(open) {
  waCard.hidden = !open;
  waToggle.setAttribute("aria-expanded", String(open));
  waToggle.setAttribute("aria-label", open ? "Close WhatsApp panel" : "Message on WhatsApp");
}
waToggle.onclick = () => setWa(waCard.hidden);
document.getElementById("waClose").onclick = () => { setWa(false); waToggle.focus(); };
document.addEventListener("click", e => {
  if (!waCard.hidden && !e.target.closest("#wa")) setWa(false);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !waCard.hidden) { setWa(false); waToggle.focus(); }
});

/* ---------- 4c. Contact form (Formspree) ---------- */
const contactForm = document.getElementById("contactForm");
const cfStatus = document.getElementById("cfStatus");

contactForm.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("cfSubmit");
  cfStatus.className = "form-status";

  if (contactForm.action.includes("PASTE_YOUR_FORMSPREE_ID")) {
    cfStatus.textContent = "The message form isn't connected yet — please use WhatsApp for now.";
    cfStatus.classList.add("err");
    return;
  }

  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Sending…";
  try {
    const res = await fetch(contactForm.action, {
      method: "POST",
      body: new FormData(contactForm),
      headers: { Accept: "application/json" }
    });
    if (res.ok) {
      contactForm.reset();
      cfStatus.textContent = "Thank you — your message is with me. I'll reply as soon as I can.";
      cfStatus.classList.add("ok");
    } else {
      cfStatus.textContent = "That didn't send. Please try again, or message me on WhatsApp.";
      cfStatus.classList.add("err");
    }
  } catch {
    cfStatus.textContent = "That didn't send. Please try again, or message me on WhatsApp.";
    cfStatus.classList.add("err");
  }
  btn.disabled = false;
  btn.textContent = original;
});

/* ---------- 5. Scroll state: masthead rule, thumb-zone book bar ---------- */
const masthead = document.querySelector(".masthead");
const bookBar = document.getElementById("bookBar");
const hero = document.querySelector(".hero");
const footer = document.querySelector(".footer");

const onScroll = () => {
  masthead.classList.toggle("is-stuck", window.scrollY > 8);
  const pastHero = window.scrollY > hero.offsetHeight * .6;
  /* Hide once the footer is in view — otherwise the bar sits fixed all the
     way to the bottom of the page with only a slim margin above the footer
     credit link, which real device chrome (dynamic address bar, safe-area
     insets, larger system font sizes) can easily eat into and cover. Nobody
     needs a floating "Book now" while they're already reading the footer. */
  const footerVisible = footer.getBoundingClientRect().top < innerHeight;
  bookBar.classList.toggle("is-shown", pastHero && !footerVisible);
};
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll, { passive: true });
onScroll();

document.getElementById("year").textContent = new Date().getFullYear();
renderMenu();

/* populate the treatment dropdown on page load so it always works */
document.getElementById("treatmentSelect").innerHTML = TREATMENTS.map(t =>
  `<option value="${t.id}">${t.name} — ${fmtPrice(t.price)}</option>`).join("");

/* ---------- 6. Reveal-once-on-scroll: price rows, before/after results ---------- */
if (!reducedMotion && "IntersectionObserver" in window) {
  const revealOnce = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      obs.unobserve(e.target);
    });
  }, { threshold: .15 });
  document.querySelectorAll(".menu").forEach(g => revealOnce.observe(g));
  const resultsGrid = document.querySelector(".results-grid");
  if (resultsGrid) revealOnce.observe(resultsGrid);
} else {
  // no IO, or the visitor asked for less motion: show everything as-is
  document.querySelectorAll(".menu, .results-grid").forEach(el => el.classList.add("is-in"));
}

/* ---------- 7. Hero stat count-up — only the numeric one ("7+ years") ---------- */
if (!reducedMotion) {
  document.querySelectorAll(".fact dd").forEach(dd => {
    const m = dd.textContent.match(/^(\d+)(.*)$/);
    if (!m) return; // "Every price listed" etc. aren't numeric — leave as-is
    const target = +m[1], suffix = m[2];
    dd.textContent = "0" + suffix;
    setTimeout(() => {
      const start = performance.now(), duration = 900;
      (function frame(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        dd.textContent = Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      })(start);
    }, 340); // matches .facts{animation-delay:.34s} in styles.css — counts up as the row arrives, not before
  });
}
