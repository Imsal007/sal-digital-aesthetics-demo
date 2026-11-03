/* ============================================================
   TIME-ZONE-PROOF HELPERS  (paste into the Apps Script project)

   Rule: a booking's date and time are stored as TEXT ("2026-11-10",
   "09:30") and always interpreted in the clinic's zone below. Nothing
   depends on the script's or spreadsheet's own time zone, and nothing
   adds or subtracts "24 hours" to move between days, so the UK clock
   changes (last Sunday of March / October) cannot shift a booking,
   a reminder or an aftercare email.

   Also set Project Settings -> time zone = Europe/London and
   Spreadsheet File -> Settings -> time zone = London, as a second layer.
   ============================================================ */

const CLINIC_TZ = 'Europe/London';

/** "2026-11-10" + "09:30" -> a real Date at that London wall-clock time. */
function londonDate(dateStr, timeStr) {
  return Utilities.parseDate(dateStr + ' ' + (timeStr || '00:00'), CLINIC_TZ, 'yyyy-MM-dd HH:mm');
}

/** Date -> "yyyy-MM-dd" as seen in London (never the script's zone). */
function londonYMD(d) { return Utilities.formatDate(d, CLINIC_TZ, 'yyyy-MM-dd'); }
function londonHM(d)  { return Utilities.formatDate(d, CLINIC_TZ, 'HH:mm'); }

/** Today's date in London, plus n calendar days. Calendar maths, not 24h maths. */
function londonYMDPlus(n) {
  const p = londonYMD(new Date()).split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n, 12));   // noon UTC: no DST edge
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

/** 0 = Sunday ... 6 = Saturday for a "yyyy-MM-dd" string, zone-free. */
function weekdayOf(ymd) {
  const p = ymd.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).getUTCDay();
}

/** Hours from now until an appointment (what reminders should use). */
function hoursUntilBooking(dateStr, timeStr) {
  return (londonDate(dateStr, timeStr).getTime() - Date.now()) / 3600e3;
}

/** Whole calendar days between two "yyyy-MM-dd" strings (DST-safe). */
function daysBetweenYMD(a, b) {
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 864e5);
}

/** Sheets may hand back a Date or text; always return London text. */
function asYMD(v) { return (v instanceof Date) ? londonYMD(v) : String(v).slice(0, 10); }
function asHM(v)  { return (v instanceof Date) ? londonHM(v)  : String(v).slice(0, 5); }

/** Run once: forces Date/Time columns to plain text so Sheets never converts them. */
function lockBookingColumnsToText() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Bookings');
  [12, 13].forEach(function (c) { sh.getRange(2, c, sh.getMaxRows() - 1, 1).setNumberFormat('@'); });  // Date, Time
}

/** Self-test: run from the editor; every line should say OK. */
function testTimeHelpers() {
  const cases = [
    ['2026-10-24', '09:30'], ['2026-10-25', '09:30'],   // clocks go back 25 Oct 2026
    ['2027-03-27', '09:30'], ['2027-03-28', '09:30'],   // clocks go forward 28 Mar 2027
    ['2027-07-01', '17:00']
  ];
  cases.forEach(function (c) {
    const d = londonDate(c[0], c[1]);
    const ok = londonYMD(d) === c[0] && londonHM(d) === c[1];
    Logger.log((ok ? 'OK   ' : 'FAIL ') + c[0] + ' ' + c[1] + ' -> ' + d.toISOString());
  });
  Logger.log(daysBetweenYMD('2027-03-27', '2027-03-29') === 2 ? 'OK   days across spring change' : 'FAIL days');
  Logger.log(weekdayOf('2026-11-08') === 0 ? 'OK   weekday' : 'FAIL weekday');
}
