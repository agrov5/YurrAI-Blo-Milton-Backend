import { Resend } from "resend";
import { MonthlyStatsObject } from "../models/MonthlyStats";

const resend = new Resend(process.env.RESEND_API_KEY);

// Must be a verified domain/sender in Resend. Override via EMAIL_FROM if needed.
const FROM_EMAIL = process.env.EMAIL_FROM || "Blo Milton Stats <blomilton@stats.yurrai.com>";

const currency = (n: number) =>
  `$${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const minutes = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)} min`;

const hoursLabel = (totalMinutes: number) => {
  const h = (Number.isFinite(totalMinutes) ? totalMinutes : 0) / 60;
  return h >= 10 ? `${Math.round(h)} hrs` : `${h.toFixed(1)} hrs`;
};

/** Builds the branded HTML body for the monthly stats report. */
export function renderMonthlyStatsEmail(stats: MonthlyStatsObject): string {
  // The three "what your AI did" headline cards.
  const cards: Array<{ value: string; label: string }> = [
    { value: String(stats.totalCalls), label: "Calls handled" },
    { value: hoursLabel(stats.totalDurationMinutes), label: "On the phone" },
    { value: minutes(stats.averageCallDurationMinutes), label: "Avg. per call" },
  ];

  const cardCells = cards
    .map(
      ({ value, label }) => `
              <td width="33.33%" valign="top" style="padding:0 6px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;border:1px solid #ececef;border-radius:12px;">
                  <tr><td style="padding:18px 12px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#18181b;">${value}</div>
                    <div style="font-size:12px;color:#71717a;margin-top:4px;letter-spacing:0.3px;">${label}</div>
                  </td></tr>
                </table>
              </td>`,
    )
    .join("");

  // Cost-of-service rows, framed against the revenue the AI generated.
  const detailRows: Array<[string, string]> = [
    ["Calls answered", `${stats.totalCalls}`],
    ["Total time on calls", hoursLabel(stats.totalDurationMinutes)],
    ["Average call length", minutes(stats.averageCallDurationMinutes)],
    ["Cost of AI service", currency(stats.totalCost)],
    ["Average cost per call", currency(stats.averageCostPerCall)],
  ];

  const detailTable = detailRows
    .map(
      ([label, value], i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fafafa"};">
          <td style="padding:13px 20px;font-size:14px;color:#52525b;border-bottom:1px solid #f0f0f2;">${label}</td>
          <td style="padding:13px 20px;font-size:15px;font-weight:600;color:#18181b;text-align:right;border-bottom:1px solid #f0f0f2;">${value}</td>
        </tr>`,
    )
    .join("");

  // Rough net value: revenue booked minus what the AI cost to run.
  const netValue = (stats.totalRevenueMade || 0) - (stats.totalCost || 0);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Your AI Receptionist — ${stats.month} ${stats.year}</title>
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      /*
       * Gmail (Android/iOS) and Outlook apply a "smart invert" in dark mode that
       * darkens light text sitting on our already-dark hero, which made the big
       * revenue figure collapse into near-black and disappear. These overrides
       * pin the hero text back to legible colors when a client recolors them.
       * [data-ogsc]/[data-ogsb] = Gmail; u + .body = the Gmail/Apple Mail wrapper.
       */
      [data-ogsc] .hero-amount, u + .body .hero-amount { color: #fafafa !important; }
      [data-ogsc] .hero-eyebrow, u + .body .hero-eyebrow { color: #c7c7d1 !important; }
      [data-ogsc] .hero-sub, u + .body .hero-sub { color: #c7c7d1 !important; }
      [data-ogsc] .hero-pill, u + .body .hero-pill { color: #ededf0 !important; }
    </style>
  </head>
  <body class="body" style="margin:0;padding:0;background:#0f0f11;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f11;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.25);">

            <!-- Hero: revenue the AI booked -->
            <tr>
              <td style="background:#0f0f11;background-image:linear-gradient(135deg,#18181b 0%,#27272a 100%);padding:40px 40px 44px;text-align:center;">
                <div class="hero-eyebrow" style="font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:#8b8b94;">Blo Milton · AI Receptionist</div>
                <div class="hero-sub" style="font-size:13px;color:#a1a1aa;margin-top:22px;">Revenue your AI booked in ${stats.month} ${stats.year}</div>
                <div class="hero-amount" style="font-size:52px;line-height:1.05;font-weight:800;color:#fafafa;margin-top:8px;letter-spacing:-1px;">${currency(stats.totalRevenueMade)}</div>
                <div class="hero-pill" style="display:inline-block;margin-top:18px;padding:7px 16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);border-radius:999px;font-size:13px;color:#e4e4e7;">
                  Answered every call · day &amp; night · ${stats.totalCalls} time${stats.totalCalls === 1 ? "" : "s"}
                </div>
              </td>
            </tr>

            <!-- Headline cards -->
            <tr>
              <td style="padding:28px 34px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cardCells}</tr></table>
              </td>
            </tr>

            <!-- Value narrative -->
            <tr>
              <td style="padding:20px 40px 4px;">
                <p style="margin:0;font-size:15px;color:#3f3f46;line-height:1.65;">
                  This month your AI receptionist picked up <strong>${stats.totalCalls} call${stats.totalCalls === 1 ? "" : "s"}</strong>,
                  spent <strong>${hoursLabel(stats.totalDurationMinutes)}</strong> on the phone with your clients,
                  and booked <strong>${currency(stats.totalRevenueMade)}</strong> in appointments —
                  ${netValue > 0
                    ? `roughly <strong>${currency(netValue)}</strong> in revenue after the cost of running it.`
                    : `all while running for just <strong>${currency(stats.totalCost)}</strong>.`}
                  That's time your team didn't spend on the phone, and bookings that didn't slip away after hours.
                </p>
              </td>
            </tr>

            <!-- Detail breakdown -->
            <tr>
              <td style="padding:24px 40px 8px;">
                <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#a1a1aa;margin-bottom:10px;">The breakdown</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f2;border-radius:12px;overflow:hidden;">
                  ${detailTable}
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 40px 34px;">
                <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                  Generated automatically from ${stats.callMongoIds.length} call${stats.callMongoIds.length === 1 ? "" : "s"} recorded this month.
                  Powered by YurrAI.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Sends the monthly stats report to ADMIN_EMAIL and DEV_EMAIL. */
export async function sendMonthlyStatsEmail(stats: MonthlyStatsObject) {
  const recipients = [process.env.ADMIN_EMAIL, process.env.DEV_EMAIL]
    .map((e) => e?.trim())
    .filter((e): e is string => !!e);

  if (recipients.length === 0) {
    throw new Error("No recipients configured — set ADMIN_EMAIL and/or DEV_EMAIL");
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipients,
    subject: `Blo Milton — ${stats.month} ${stats.year} Monthly Report`,
    html: renderMonthlyStatsEmail(stats),
  });

  if (error) {
    console.error("Error sending monthly stats email:", error);
    throw new Error(error.message || "Resend failed to send monthly stats email");
  }

  console.log("Monthly stats email sent:", data?.id, "to", recipients.join(", "));
  return data;
}

/** Sends an arbitrary email to a custom address (html and/or text). */
export async function sendCustomEmail(params: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  const { to, subject, html, text } = params;

  if (!to || (Array.isArray(to) && to.length === 0)) {
    throw new Error("Recipient 'to' is required");
  }
  if (!subject) throw new Error("'subject' is required");
  if (!html && !text) throw new Error("Either 'html' or 'text' is required");

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    // Resend's typings require html or text; provide a safe fallback.
    html: html ?? undefined,
    text: text ?? undefined,
  } as Parameters<typeof resend.emails.send>[0]);

  if (error) {
    console.error("Error sending custom email:", error);
    throw new Error(error.message || "Resend failed to send email");
  }

  console.log("Custom email sent:", data?.id, "to", Array.isArray(to) ? to.join(", ") : to);
  return data;
}
