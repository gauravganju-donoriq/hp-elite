import { formatDateDisplay } from "@/lib/dates";
import { parseTimeToMinutes } from "@/lib/time";

/** Days listed in full before the email collapses the rest into a summary line. */
const MAX_DAYS_SHOWN = 8;

export interface ReminderSession {
  date: string;
  startTime: string;
  endTime: string;
}

export interface AvailabilityReminderInput {
  firstName: string;
  scheduleName: string;
  missingSessions: ReminderSession[];
  appUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTimeLabel(time: string): string {
  const total = parseTimeToMinutes(time);
  if (Number.isNaN(total)) return time;
  const minutes = total % 60;
  const hours24 = Math.floor(total / 60);
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

interface DayGroup {
  date: string;
  label: string;
  times: string[];
}

function groupByDay(sessions: ReminderSession[]): DayGroup[] {
  const byDate = new Map<string, string[]>();
  for (const session of sessions) {
    const range = `${formatTimeLabel(session.startTime)} – ${formatTimeLabel(session.endTime)}`;
    const existing = byDate.get(session.date);
    if (existing) existing.push(range);
    else byDate.set(session.date, [range]);
  }
  return [...byDate.entries()].map(([date, times]) => ({
    date,
    label: formatDateDisplay(date).shortLong,
    times,
  }));
}

export function renderAvailabilityReminder(
  input: AvailabilityReminderInput
): RenderedEmail {
  const { firstName, scheduleName, missingSessions, appUrl } = input;

  const subject = `Availability needed: ${scheduleName}`;
  const availabilityUrl = `${appUrl.replace(/\/$/, "")}/availability`;

  const days = groupByDay(missingSessions);
  const shownDays = days.slice(0, MAX_DAYS_SHOWN);
  const hiddenDayCount = days.length - shownDays.length;

  const sessionCount = pluralize(missingSessions.length, "session");
  const dayCount = pluralize(days.length, "day");
  const dateRange =
    days.length > 1
      ? `${formatDateDisplay(days[0].date).monthDay} – ${formatDateDisplay(days[days.length - 1].date).monthDay}`
      : days.length === 1
        ? formatDateDisplay(days[0].date).monthDay
        : "";

  const summary = dateRange
    ? `${sessionCount} across ${dayCount} · ${dateRange}`
    : sessionCount;

  const text = [
    `Hi ${firstName},`,
    "",
    `Please submit your availability for "${scheduleName}". You have ${sessionCount} still awaiting a response.`,
    "",
    ...shownDays.map((day) => `${day.label}\n${day.times.map((t) => `    ${t}`).join("\n")}`),
    ...(hiddenDayCount > 0
      ? ["", `...and ${pluralize(hiddenDayCount, "more day")}. See the full list in the app.`]
      : []),
    "",
    `Submit your availability: ${availabilityUrl}`,
    "",
    "Thanks!",
  ].join("\n");

  const dayRows = shownDays
    .map((day, index) => {
      const isLast = index === shownDays.length - 1 && hiddenDayCount === 0;
      const border = isLast ? "none" : "1px solid #f1f2f4";
      const times = day.times
        .map(
          (t) =>
            `<div style="color:#4b5563;font-size:13px;line-height:1.7;white-space:nowrap;">${escapeHtml(t)}</div>`
        )
        .join("");
      return `<tr>
                    <td style="padding:12px 0;border-bottom:${border};vertical-align:top;">
                      <span style="color:#111827;font-size:14px;font-weight:600;">${escapeHtml(day.label)}</span>
                    </td>
                    <td align="right" style="padding:12px 0;border-bottom:${border};vertical-align:top;">${times}</td>
                  </tr>`;
    })
    .join("");

  const moreRow =
    hiddenDayCount > 0
      ? `<tr>
                    <td colspan="2" style="padding:12px 0 0;">
                      <span style="color:#6b7280;font-size:13px;">and ${escapeHtml(pluralize(hiddenDayCount, "more day"))} &mdash; see the full list in the app</span>
                    </td>
                  </tr>`
      : "";

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(summary)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 20px;">
                <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(scheduleName)}</p>
                <h1 style="margin:0 0 14px;color:#111827;font-size:20px;font-weight:700;line-height:1.3;">Your availability is needed</h1>
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
                  Hi ${escapeHtml(firstName)}, you have <strong>${escapeHtml(sessionCount)}</strong> still awaiting a response. It only takes a minute.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #eceef1;border-radius:10px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <span style="color:#111827;font-size:13px;font-weight:600;">${escapeHtml(summary)}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${dayRows}${moreRow}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:#111827;">
                      <a href="${escapeHtml(availabilityUrl)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Submit availability</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">Thanks! &mdash; HP Elite</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
