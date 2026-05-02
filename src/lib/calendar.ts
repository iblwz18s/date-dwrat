export interface CourseEvent {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  organizer?: string | null;
  location?: string | null;
  description?: string | null;
  registrationUrl?: string | null;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toLocalDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0);
}

function fmtUTC(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function buildGoogleCalendarUrl(ev: CourseEvent): string {
  const start = toLocalDateTime(ev.date, ev.startTime);
  const end = toLocalDateTime(ev.date, ev.endTime);
  const dates = `${fmtUTC(start)}/${fmtUTC(end)}`;
  const details = [
    ev.description ?? "",
    ev.organizer ? `الجهة المنظمة: ${ev.organizer}` : "",
    ev.registrationUrl ? `رابط التسجيل: ${ev.registrationUrl}` : "",
    "تذكير تلقائي قبل ٣٠ دقيقة.",
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates,
    details,
    location: ev.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsFile(ev: CourseEvent): string {
  const start = toLocalDateTime(ev.date, ev.startTime);
  const end = toLocalDateTime(ev.date, ev.endTime);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@course-extractor`;
  const now = fmtUTC(new Date());

  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

  const description = [
    ev.description ?? "",
    ev.organizer ? `الجهة المنظمة: ${ev.organizer}` : "",
    ev.registrationUrl ? `رابط التسجيل: ${ev.registrationUrl}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Course Extractor//AR//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmtUTC(start)}`,
    `DTEND:${fmtUTC(end)}`,
    `SUMMARY:${escape(ev.title)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${escape(ev.location ?? "")}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:تذكير الدورة",
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(ev: CourseEvent) {
  const ics = buildIcsFile(ev);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = ev.title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40) || "course";
  a.download = `${safeName}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}
