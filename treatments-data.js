/* =========================================================
   TREATMENT MENU — single source of truth for the site.
   groupKey links each treatment to its aftercare type:
   botox | filler | sculptra | rejuran | consultation
   minutes = duration (drives slot blocking), price in £.
   depositPercent = % taken as deposit (configurable).
   ========================================================= */
const DEPOSIT_PERCENT = 20;
const CURRENCY = "£";

const TREATMENTS = [
  // Consultations
  { id:"consult",      name:"Consultation",                    group:"consultations", groupKey:"consultation", price:150, minutes:60 },
  { id:"skin-consult", name:"Skin Consultation",               group:"consultations", groupKey:"consultation", price:159, minutes:60 },
  // Botox & neuromodulators
  { id:"botox-3",      name:"Botox — 3 Areas",                 group:"botox", groupKey:"botox", price:300, minutes:30 },
  { id:"botox-4",      name:"Botox — 4 Areas",                 group:"botox", groupKey:"botox", price:350, minutes:30 },
  { id:"botox-gummy",  name:"Botox — Gummy Smile",             group:"botox", groupKey:"botox", price:200, minutes:30 },
  { id:"botox-lipflip",name:"Botox — Lip Flip",                group:"botox", groupKey:"botox", price:200, minutes:30 },
  { id:"botox-chin",   name:"Botox — Dimple Chin",             group:"botox", groupKey:"botox", price:200, minutes:30 },
  { id:"botox-dao",    name:"Botox — DAO Lift",                group:"botox", groupKey:"botox", price:200, minutes:30 },
  { id:"botox-masseter",name:"Botox — Masseter",               group:"botox", groupKey:"botox", price:400, minutes:30 },
  // Dermal fillers
  { id:"filler-lips",  name:"Filler — Lips 1ml",               group:"fillers", groupKey:"filler", price:160, minutes:45 },
  { id:"filler-nlf",   name:"Filler — Nasolabial Folds",       group:"fillers", groupKey:"filler", price:180, minutes:45 },
  { id:"filler-chin",  name:"Filler — Chin",                   group:"fillers", groupKey:"filler", price:180, minutes:45 },
  { id:"filler-jaw",   name:"Filler — Jawline",                group:"fillers", groupKey:"filler", price:180, minutes:45 },
  // Sculptra & biostimulators
  { id:"sculptra-face",name:"Sculptra — Face",                 group:"sculptra", groupKey:"sculptra", price:550, minutes:60 },
  { id:"sculptra-neck",name:"Sculptra — Neck",                 group:"sculptra", groupKey:"sculptra", price:500, minutes:45 },
  { id:"sculptra-both",name:"Sculptra — Face & Neck",          group:"sculptra", groupKey:"sculptra", price:800, minutes:90 },
  // Skin therapy & Rejuran
  { id:"glass-skin",   name:"Korean Glass Skin Premium (Rejuran + Microneedling + Crio-infusion)", group:"skin", groupKey:"rejuran", price:630, minutes:60 },
  { id:"rejuran-face-1", name:"Rejuran Healer 2ml Full Face — 1 Session", group:"skin", groupKey:"rejuran", price:350, minutes:60 },
  { id:"rejuran-face-3", name:"Rejuran Healer 2ml Full Face — Course of 3 Sessions (£292/session)", group:"skin", groupKey:"rejuran", price:875, minutes:60 },
  { id:"rejuran-i",    name:"Rejuran I (1ml — Eyes)",          group:"skin", groupKey:"rejuran", price:330, minutes:45 },
  { id:"rejuran-hb",   name:"Rejuran HB (Hydration)",          group:"skin", groupKey:"rejuran", price:330, minutes:45 },
  { id:"rejuran-s",    name:"Rejuran S (Scars)",               group:"skin", groupKey:"rejuran", price:330, minutes:45 },
];

/* Clinic hours: slots offered each weekday. Adjust freely —
   the same list lives in the Apps Script (see automations/Code.gs). */
const CLINIC_DAYS = [1,2,3,4,5,6];        // Mon–Sat
const SLOT_TIMES = ["09:30","11:00","12:30","14:00","15:30","17:00"];

/* Which clinic this site is, in the shared booking script: sets the email
   branding, calendar and booking ID prefix. */
const BRAND = "aurelia";

/* Apps Script web app endpoint (project "TCB Automations").
   Currently deployed on the SAL Digital test account — redeploying keeps this
   URL stable, so this only changes if the whole project moves accounts. */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw7DgDV6oWGtmfW7sBgQIB522mNf8JFybI76ZNXkO7k1yeKl4yt4-HReqRm1E-r0Cm5/exec";
