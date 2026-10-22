import { sendEmail } from './email.service';
import { ICareerApplication } from '../models/career-application.model';
import { ICareer } from '../models/career.model';
import { getOrCreateCareerSettings } from '../models/career-settings.model';
import { generateSignedUrl } from './private-upload.service';
import { ScreeningModel } from '../models/screening.model';

const ENSIS_GREEN = '#0f3d2e';
const ENSIS_GOLD = '#c9922e';
const ENSIS_GOLD_SOFT = '#c9a86a';
const ENSIS_CREAM = '#fbf7ef';
const PAGE_BG = '#f5f1e8';
const BAR_GREEN = '#0e6b45';
const BAR_AMBER = '#b45309';
const BAR_RED = '#be123c';

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const API_BASE = (process.env.API_PUBLIC_URL || process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
const ADMIN_BASE = (process.env.ADMIN_URL || 'http://localhost:3001').replace(/\/$/, '');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${fmtDate(d)}, ${String(h).padStart(2, '0')}:${m} ${ap}`;
}

function formatFileSize(size?: number): string {
  if (!size || !Number.isFinite(size)) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type BreakdownItem = { label: string; score: number; key?: string };

const BREAKDOWN_LABELS: Record<string, string> = {
  education: 'Educational Qualification',
  experience: 'Relevant Experience',
  technical_skills: 'Design & Technical Skills',
  creative_thinking: 'Creative & Design Thinking',
  communication: 'Communication Skills',
  portfolio: 'Portfolio Quality',
  location: 'Location Fit',
};

const BREAKDOWN_ICONS: Record<string, string> = {
  education: '🎓',
  experience: '💼',
  technical_skills: '🛠️',
  creative_thinking: '💡',
  communication: '💬',
  portfolio: '🎯',
  location: '📍',
};

function normalizeBreakdown(raw: unknown): BreakdownItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item: any) => {
      const key = String(item?.key || '');
      return {
        key,
        label: String(item?.label || BREAKDOWN_LABELS[key] || key.replace(/_/g, ' ') || 'Competency'),
        score: Math.max(0, Math.min(100, Number(item?.score) || 0)),
      };
    });
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, number>).map(([key, score]) => ({
      key,
      label: BREAKDOWN_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      score: Math.max(0, Math.min(100, Number(score) || 0)),
    }));
  }
  return [];
}

function barColor(score: number): string {
  return score >= 70 ? BAR_GREEN : score >= 50 ? BAR_AMBER : BAR_RED;
}

function renderBreakdownBarsHtml(breakdown: unknown): string {
  const items = normalizeBreakdown(breakdown);
  if (items.length === 0) return '';
  const cell = (item: BreakdownItem) => `
    <td width="50%" valign="top" style="padding: 0 8px 12px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size: 11.5px; color: #1f2d24; font-weight: 600; padding-bottom: 4px;">
            ${item.key && BREAKDOWN_ICONS[item.key] ? `${BREAKDOWN_ICONS[item.key]} ` : ''}${esc(item.label)}
          </td>
          <td width="34" align="right" style="font-size: 11.5px; font-weight: 700; color: ${barColor(item.score)}; padding-bottom: 4px;">
            ${item.score}%
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <div style="background-color: #e8ede9; height: 8px; border-radius: 9999px; overflow: hidden;">
              <div style="background-color: ${barColor(item.score)}; width: ${item.score}%; height: 8px; border-radius: 9999px;"></div>
            </div>
          </td>
        </tr>
      </table>
    </td>`;

  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const left = cell(items[i]);
    const right = items[i + 1] ? cell(items[i + 1]) : '<td width="50%" valign="top">&nbsp;</td>';
    rows.push(`<tr>${left}${right}</tr>`);
  }
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate;">${rows.join('')}</table>`;
}

function renderRingHtml(score: number): string {
  const ring = score >= 70 ? ENSIS_GREEN : score >= 50 ? BAR_AMBER : BAR_RED;
  return `
    <table width="140" cellpadding="0" cellspacing="0" align="center">
      <tr>
        <td align="center" valign="middle" style="width: 132px; height: 132px; border-radius: 50%; border: 11px solid ${ring}; border-top-color: ${ENSIS_GOLD}; border-right-color: ${ENSIS_GOLD}; background-color: #ffffff; text-align: center;">
          <div style="font-family: ${SANS}; font-size: 30px; font-weight: 800; color: ${ENSIS_GREEN}; line-height: 1.1;">${score}%</div>
          <div style="font-family: ${SANS}; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 2px;">Match Score</div>
        </td>
      </tr>
    </table>`;
}

function levelMeta(level?: string) {
  if (level === 'partial') {
    return {
      label: 'Partial Match',
      title: 'Partial Match — Review Recommended',
      color: BAR_AMBER,
      pillBg: '#fef3c7',
      pillText: '#92400e',
      candidateMsg:
        'Your profile partially matches this position. Our team will review your application in detail and get back to you.',
      hrMsg:
        "The candidate's profile partially matches the job requirements. A detailed manual review is recommended before the next stage.",
    };
  }
  if (level === 'not_eligible') {
    return {
      label: 'NOT ELIGIBLE',
      title: 'Does Not Meet Requirements',
      color: BAR_RED,
      pillBg: '#fee2e2',
      pillText: '#991b1b',
      candidateMsg: 'Based on our preliminary AI screening, your profile does not meet the requirements for this position.',
      hrMsg: "The candidate's profile does not meet the minimum requirements derived from the job description.",
    };
  }
  return {
    label: 'Eligible to Apply',
    title: 'Eligible to Apply',
    color: BAR_GREEN,
    pillBg: '#e7f5ec',
    pillText: '#0c5132',
    candidateMsg: 'You are eligible to apply for this position based on our AI screening.',
    hrMsg:
      "The candidate's profile matches well with the job requirements based on skills, experience and qualifications derived from the job description.",
  };
}

const STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  rejected: 'Rejected',
  hired: 'Hired',
};

function statusPill(status: string, forHr: boolean): string {
  const key = status || 'received';
  let text = STATUS_LABELS[key] || key;
  if (key === 'received') text = forHr ? 'Received – Under HR Review' : 'Received – Awaiting HR Review';
  const styles: Record<string, { bg: string; fg: string }> = {
    received: { bg: '#e7f5ec', fg: '#0c5132' },
    shortlisted: { bg: '#dcfce7', fg: '#15803d' },
    interview_scheduled: { bg: '#f3e8ff', fg: '#7e22ce' },
    rejected: { bg: '#fee2e2', fg: '#b91c1c' },
    hired: { bg: '#ecfdf5', fg: '#047857' },
  };
  const s = styles[key] || styles.received;
  return `<span style="display: inline-block; background-color: ${s.bg}; color: ${s.fg}; border-radius: 4px; padding: 5px 10px; font-size: 10.5px; font-weight: 700;">${esc(text)}</span>`;
}

function sectionTitle(icon: string, title: string, subtitle?: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 12px 0;">
      <tr>
        <td width="34" valign="middle">
          <div style="width: 30px; height: 30px; border-radius: 50%; background-color: ${ENSIS_GREEN}; color: ${ENSIS_GOLD_SOFT}; font-size: 14px; line-height: 30px; text-align: center;">${icon}</div>
        </td>
        <td valign="middle" style="padding-left: 10px;">
          <div style="font-family: ${SERIF}; font-size: 16.5px; font-weight: 700; color: ${ENSIS_GREEN};">${esc(title)}</div>
          ${subtitle ? `<div style="font-size: 10.5px; color: #6b7280; margin-top: 2px;">${esc(subtitle)}</div>` : ''}
        </td>
      </tr>
    </table>`;
}

function card(inner: string, opts?: { bg?: string; border?: string; pad?: string }): string {
  return `
    <div style="background-color: ${opts?.bg || '#ffffff'}; border: 1px solid ${opts?.border || '#e7e0d3'}; border-radius: 10px; padding: ${opts?.pad || '16px'};">
      ${inner}
    </div>`;
}

function infoRow(icon: string, label: string, value: string, opts?: { bold?: boolean; color?: string; link?: string; border?: boolean }): string {
  const borderStyle = opts?.border === false ? '' : 'border-bottom: 1px solid #efe9dc;';
  const val = opts?.link
    ? `<a href="${esc(opts.link)}" style="color: #0f5f8a; text-decoration: none;">${value}</a>`
    : value;
  return `
    <tr>
      <td width="26" valign="top" style="padding: 8px 6px 8px 10px; ${borderStyle} font-size: 13px;">${icon}</td>
      <td width="38%" valign="top" style="padding: 9px 6px; ${borderStyle} font-size: 11.5px; color: #5b6b60; font-weight: 600;">${esc(label)}</td>
      <td valign="top" style="padding: 9px 10px 9px 6px; ${borderStyle} font-size: 12px; color: ${opts?.color || '#16281f'}; font-weight: ${opts?.bold ? 700 : 600};">${val}</td>
    </tr>`;
}

function twoCol(leftHtml: string, rightHtml: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 12px 0; margin: 0 -12px;">
      <tr>
        <td width="50%" valign="top" style="padding: 0 12px;">${leftHtml}</td>
        <td width="50%" valign="top" style="padding: 0 12px;">${rightHtml}</td>
      </tr>
    </table>`;
}

function brandLogoHtml(): string {
  return `
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td valign="middle">
          <div style="font-family: ${SANS}; font-size: 30px; font-weight: 800; color: #1c3d6e; letter-spacing: -0.5px; line-height: 1;">
            ensis<span style="color: ${ENSIS_GOLD}; font-size: 14px; vertical-align: super;">®</span>
          </div>
          <div style="font-size: 8.5px; font-weight: 700; color: #4a5b70; letter-spacing: 0.4px; margin-top: 3px;">Wellness Furniture for Healthier Spaces</div>
        </td>
      </tr>
    </table>`;
}

function taglinePanelHtml(photoUrl?: string): string {
  const photo = photoUrl
    ? `<img src="${esc(photoUrl)}" alt="" width="210" style="width: 210px; height: 120px; object-fit: cover; border-radius: 8px; display: block;"/>`
    : `<div style="width: 210px; height: 110px; border-radius: 8px; background: linear-gradient(135deg, #e8f0e4 0%, #d8e6d8 55%, #cfe0d4 100%);"></div>`;
  return `
    <table cellpadding="0" cellspacing="0" align="right">
      <tr>
        <td align="right" style="padding-left: 12px;">
          ${photo}
          <div style="font-family: ${SERIF}; font-style: italic; font-size: 13px; color: ${ENSIS_GREEN}; text-align: right; line-height: 1.35; margin-top: 6px;">
            Wellness<br/>Spaces<br/>For A<br/>Healthier<br/>Tomorrow
          </div>
          <div style="width: 46px; height: 2px; background-color: ${ENSIS_GOLD}; margin-left: auto; margin-top: 6px;"></div>
        </td>
      </tr>
    </table>`;
}

function pageShell(inner: string, title: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>${esc(title)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${PAGE_BG}; font-family: ${SANS}; color: #1e293b;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${PAGE_BG}; padding: 24px 12px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 700px; background-color: #fffdf9; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(15, 61, 46, 0.06);">
            ${inner}
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

async function resolvePhotoUrl(application: ICareerApplication): Promise<string | undefined> {
  const pUrl = application.profile?.photoUrl;
  if (!pUrl) return undefined;
  if (String(pUrl).startsWith('http')) return String(pUrl);
  return `${API_BASE}${generateSignedUrl(String(pUrl), 60 * 24)}`;
}

async function resolveCvInfo(
  application: ICareerApplication
): Promise<{ fileName: string; size?: number; downloadUrl?: string }> {
  let fileName = application.resume || 'Candidate_CV';
  let size: number | undefined;
  let downloadUrl: string | undefined;

  const doc = (application.documents || []).find((d) => d?.fileId);
  if (doc) {
    fileName = doc.fileName || doc.label || fileName;
    size = doc.size;
    downloadUrl = `${API_BASE}${generateSignedUrl(doc.fileId, 60 * 24)}`;
  } else if (application.screeningId) {
    const sc = await ScreeningModel.findOne({ screeningId: application.screeningId }).lean();
    if (sc?.cv?.fileId) {
      fileName = sc.cv.fileName || fileName;
      size = sc.cv.size;
      downloadUrl = `${API_BASE}${generateSignedUrl(sc.cv.fileId, 60 * 24)}`;
    }
  }
  return { fileName, size, downloadUrl };
}

function highlightListHtml(items: string[]): string {
  if (!items || items.length === 0) return '';
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${items
        .map(
          (s) => `
        <tr>
          <td width="22" valign="top" style="padding: 4px 0 8px 0; color: ${BAR_GREEN}; font-size: 13px;">✔</td>
          <td style="padding: 2px 0 8px 0; font-size: 11.5px; color: #334155; line-height: 1.45;">${esc(s)}</td>
        </tr>`
        )
        .join('')}
    </table>`;
}

function assistanceHtml(settings: any): string {
  const contact = settings?.hrContact || {};
  return card(
    `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="40" valign="top">
          <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${ENSIS_GREEN}; color: #ffffff; font-size: 15px; line-height: 32px; text-align: center;">🎧</div>
        </td>
        <td valign="top" style="padding-left: 10px;">
          <div style="font-family: ${SERIF}; font-size: 14.5px; font-weight: 700; color: ${ENSIS_GREEN}; margin-bottom: 6px;">Need Any Assistance?</div>
          <div style="font-size: 11px; color: #5b6b60; line-height: 1.5; margin-bottom: 8px;">
            If you need any further information or have queries, please feel free to reach out to our HR Team.
          </div>
          <table cellpadding="2" cellspacing="0" style="font-size: 11.5px; color: #334155;">
            <tr><td width="20">✉</td><td><a href="mailto:${esc(contact.email || 'careers@ensis.in')}" style="color: #0f5f8a; text-decoration: none;">${esc(contact.email || 'careers@ensis.in')}</a></td></tr>
            <tr><td>📞</td><td>${esc(contact.phone || '+91 96549 00525')} <span style="color: #94a3b8;">(Mon – Fri, 10 AM – 6 PM)</span></td></tr>
            <tr><td>📍</td><td>${esc(contact.address || 'ENSIS Corporate Office, Delhi NCR')}</td></tr>
          </table>
        </td>
      </tr>
    `,
    { bg: ENSIS_CREAM, border: '#e7e0d3' }
  );
}

function nextStepCell(num: number, icon: string, title: string, body: string, withArrow: boolean): string {
  return `
    <td width="24%" valign="top" style="padding-right: ${withArrow ? '4px' : '0'};">
      <div style="background-color: #ffffff; border: 1px solid #e7e0d3; border-radius: 10px; padding: 12px 10px; height: 100%;">
        <table cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
          <tr>
            <td>
              <div style="width: 26px; height: 26px; border-radius: 50%; background-color: ${ENSIS_GOLD}; color: #ffffff; font-size: 12px; font-weight: 700; line-height: 26px; text-align: center;">${num}</div>
            </td>
            <td style="padding-left: 8px; font-size: 15px;">${icon}</td>
          </tr>
        </table>
        <div style="font-size: 11.5px; font-weight: 700; color: ${ENSIS_GREEN}; margin-bottom: 4px;">${esc(title)}</div>
        <div style="font-size: 10px; color: #64748b; line-height: 1.45;">${esc(body)}</div>
      </div>
    </td>
    ${
      withArrow
        ? `<td width="2%" valign="middle" style="color: ${ENSIS_GOLD}; font-size: 14px; font-weight: 700; text-align: center;">›</td>`
        : ''
    }`;
}

export async function sendCandidateConfirmationEmail(
  application: ICareerApplication,
  job: ICareer | null
): Promise<void> {
  const settings = await getOrCreateCareerSettings();
  const candidateName = application.profile?.fullName || application.fullName || 'Candidate';
  const toEmail = application.profile?.email || application.email;
  const jobTitle = job?.title || application.jobTitle || 'Open Position';
  const score = application.screeningResult?.score ?? 0;
  const level = application.screeningResult?.level || 'eligible';
  const meta = levelMeta(level);
  const photoUrl = await resolvePhotoUrl(application);
  const submittedAt = application.createdAt || new Date();

  const subject = `Application Received: ${jobTitle} — ${application.applicationId}`;
  const preferredLocations =
    application.details?.preferredLocations?.length
      ? application.details.preferredLocations.join(', ')
      : job?.location || '—';

  const inner = `
    <!-- HERO HEADER -->
    <tr>
      <td style="padding: 26px 28px 6px 28px; background-color: #fffdf9;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top" style="padding-bottom: 10px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top">
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                      <tr>
                        <td style="width: 42px; height: 42px; border-radius: 50%; background-color: ${ENSIS_GOLD}; color: #ffffff; font-size: 20px; line-height: 42px; text-align: center;">✔</td>
                      </tr>
                    </table>
                    <div style="font-family: ${SERIF}; font-size: 28px; font-weight: 700; color: ${ENSIS_GREEN}; line-height: 1.25;">
                      Your Application Has Been<br/>
                      <span style="color: ${ENSIS_GOLD};">Successfully Submitted!</span>
                    </div>
                    <div style="margin: 10px 0 12px 0; width: 120px; height: 2px; background: linear-gradient(90deg, ${ENSIS_GOLD}, transparent);"></div>
                    <div style="font-size: 12.5px; color: #475569;">
                      Thank you for choosing <strong>ENSIS</strong> – Wellness Furniture for Healthier Spaces.
                    </div>
                  </td>
                  <td valign="top" align="right">
                    <table cellpadding="0" cellspacing="0" align="right">
                      <tr>
                        <td align="right">
                          ${
                            photoUrl
                              ? `<img src="${esc(photoUrl)}" alt="" width="150" style="width: 150px; height: 110px; object-fit: cover; border-radius: 10px; display: block;"/>`
                              : `<div style="width: 150px; height: 110px; border-radius: 10px; background: linear-gradient(135deg, #e8f0e4, #d8e6d8);"></div>`
                          }
                          <div style="font-family: ${SERIF}; font-style: italic; font-size: 12px; color: ${ENSIS_GREEN}; text-align: right; line-height: 1.35; margin-top: 6px;">
                            Wellness Spaces<br/>For A<br/>Healthier Tomorrow
                          </div>
                          <div style="width: 40px; height: 2px; background-color: ${ENSIS_GOLD}; margin-left: auto; margin-top: 5px;"></div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- LOGO ROW -->
    <tr>
      <td style="padding: 4px 28px 14px 28px; background-color: #fffdf9; border-bottom: 1px solid #efe9dc;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td>${brandLogoHtml()}</td></tr>
        </table>
      </td>
    </tr>

    <!-- GREETING -->
    <tr>
      <td style="padding: 22px 28px 8px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top" width="66%">
              <div style="font-family: ${SERIF}; font-size: 17px; font-weight: 700; color: ${ENSIS_GREEN};">Dear ${esc(candidateName)},</div>
              <div style="font-family: ${SERIF}; font-size: 14px; font-weight: 700; color: ${ENSIS_GOLD}; margin: 4px 0 8px 0;">Namaste!</div>
              <div style="font-size: 12px; color: #475569; line-height: 1.6;">
                Thank you for your interest in becoming a part of <strong>ENSIS</strong>.<br/>
                We are pleased to confirm that your application has been successfully received for the position of
                <strong>${esc(jobTitle)}</strong>. We appreciate the time and effort you have invested in sharing your
                professional qualifications, experience and aspirations with us.
              </div>
            </td>
            <td valign="top" width="34%" style="padding-left: 14px;">
              <div style="background-color: ${ENSIS_CREAM}; border-radius: 10px; padding: 16px 14px; position: relative;">
                <div style="font-family: ${SERIF}; font-size: 26px; color: ${ENSIS_GOLD_SOFT}; line-height: 0.6;">&rdquo;</div>
                <div style="font-family: ${SERIF}; font-style: italic; font-size: 12.5px; color: ${ENSIS_GREEN}; line-height: 1.5; margin-top: 8px;">
                  Creating Wellness Spaces For A Healthier Tomorrow
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- APPLICATION DETAILS -->
    <tr>
      <td style="padding: 16px 28px 6px 28px;">
        ${card(`
          ${sectionTitle('📋', 'Your Application Details')}
          <table width="100%" cellpadding="0" cellspacing="0">
            ${infoRow('🪪', 'Application ID', esc(application.applicationId), { bold: true, border: true })}
            ${infoRow('📅', 'Application Date', esc(fmtDateTime(submittedAt)), { bold: true, border: true })}
            ${infoRow('💼', 'Position Applied For', esc(jobTitle), { bold: true, border: true })}
            ${infoRow('🎯', 'AI Profile Match', `${score}%`, { bold: true, color: meta.color, border: true })}
            ${infoRow('📍', 'Preferred Location', esc(preferredLocations), { bold: true, border: true })}
            <tr>
              <td width="26" valign="middle" style="padding: 8px 6px 8px 10px; font-size: 13px;">🕐</td>
              <td width="38%" valign="middle" style="padding: 9px 6px; font-size: 11.5px; color: #5b6b60; font-weight: 600;">Application Status</td>
              <td valign="middle" style="padding: 9px 10px 9px 6px;">${statusPill(application.status || 'received', false)}</td>
            </tr>
          </table>
        `)}
      </td>
    </tr>

    <!-- AI SCREENING + MATCH BREAKDOWN -->
    <tr>
      <td style="padding: 12px 28px 6px 28px;">
        ${twoCol(
          card(`
            ${sectionTitle('📊', 'AI Screening Result', 'Here is your profile match and analysis for the applied position.')}
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding: 6px 0 14px 0;">${renderRingHtml(score)}</td>
              </tr>
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${meta.pillBg}; border-radius: 8px;">
                    <tr>
                      <td width="34" align="center" valign="middle" style="padding: 12px 0 12px 10px;">
                        <div style="width: 26px; height: 26px; border-radius: 50%; background-color: ${meta.color}; color: #ffffff; font-size: 13px; line-height: 26px; text-align: center;">✔</div>
                      </td>
                      <td valign="middle" style="padding: 10px 12px 10px 8px;">
                        <div style="font-size: 12.5px; font-weight: 700; color: ${meta.color}; margin-bottom: 3px;">${esc(meta.title)}</div>
                        <div style="font-size: 10.5px; color: #475569; line-height: 1.5;">${esc(meta.candidateMsg)}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `),
          card(`
            ${sectionTitle('📈', 'Match Breakdown', "Here's how your profile aligns with the job requirements:")}
            ${renderBreakdownBarsHtml(application.screeningResult?.breakdown)}
          `)
        )}
      </td>
    </tr>

    <!-- DISCLAIMER STRIP -->
    <tr>
      <td style="padding: 6px 28px 6px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${ENSIS_CREAM}; border-radius: 8px;">
          <tr>
            <td width="30" align="center" valign="middle" style="padding: 10px 0 10px 10px; color: ${ENSIS_GOLD}; font-size: 14px; font-weight: 700;">ℹ</td>
            <td style="padding: 10px 12px 10px 6px; font-size: 10.5px; color: #5b6b60; line-height: 1.5;">
              This is a preliminary AI assessment based on the information provided in your application. Final recruitment
              decisions are made by our authorised recruitment team after a complete review of your application, documents
              and further evaluation.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- WHAT HAPPENS NEXT -->
    <tr>
      <td style="padding: 18px 28px 6px 28px;">
        ${sectionTitle('⚙️', 'What Happens Next?')}
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px;">
          <tr>
            ${nextStepCell(1, '📄', 'Application Review', 'Our recruitment team will review your application, qualifications and AI screening report.', true)}
            ${nextStepCell(2, '👥', 'Shortlisting', 'Candidates whose profiles align with the requirements may be shortlisted for further evaluation.', true)}
            ${nextStepCell(3, '📅', 'Interview & Assessment', 'If shortlisted, you will be contacted for an interview (online or in-person).', true)}
            ${nextStepCell(4, '✉️', 'Final Communication', 'You will receive further updates as the recruitment process progresses.', false)}
          </tr>
        </table>
      </td>
    </tr>

    <!-- IMPORTANT + ASSISTANCE -->
    <tr>
      <td style="padding: 18px 28px 8px 28px;">
        ${twoCol(
          card(`
            ${sectionTitle('ℹ️', 'Important Information')}
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                `Your Application ID (${application.applicationId}) is your reference number for future correspondence.`,
                'Your AI screening score is a preliminary assessment and does not guarantee selection.',
                'Final recruitment decisions are made by our authorised recruitment team.',
                'Please monitor your registered email address for further updates.',
              ]
                .map(
                  (t) => `
                <tr>
                  <td width="22" valign="top" style="padding: 4px 0 8px 0; color: ${BAR_GREEN}; font-size: 12px;">✔</td>
                  <td style="padding: 2px 0 8px 0; font-size: 10.5px; color: #475569; line-height: 1.5;">${esc(t)}</td>
                </tr>`
                )
                .join('')}
            </table>
          `),
          assistanceHtml(settings)
        )}
      </td>
    </tr>

    <!-- CLOSING -->
    <tr>
      <td style="padding: 12px 28px 28px 28px;">
        <div style="font-size: 12px; color: #475569; line-height: 1.6;">
          We look forward to the possibility of welcoming you to our team.<br/>
          Warm regards,<br/><br/>
          <strong style="color: ${ENSIS_GREEN};">Talent Acquisition Team</strong><br/>
          <strong style="color: ${ENSIS_GREEN};">ENSIS – Wellness Furniture for Healthier Spaces</strong>
        </div>
      </td>
    </tr>
  `;

  const html = pageShell(inner, subject);

  try {
    await sendEmail(
      toEmail,
      subject,
      `Your application for ${jobTitle} (ID: ${application.applicationId}) has been received by ENSIS.`,
      html
    );
  } catch (err) {
    console.error('[Career Email] Failed to send candidate confirmation:', (err as Error).message);
    throw err;
  }
}

export async function sendHrNotificationEmail(
  application: ICareerApplication,
  job: ICareer | null
): Promise<void> {
  const settings = await getOrCreateCareerSettings();
  const recipients =
    settings.hrEmails && settings.hrEmails.length > 0 ? settings.hrEmails : ['careers@ensis.in'];
  const candidateName = application.profile?.fullName || application.fullName || 'Candidate';
  const jobTitle = job?.title || application.jobTitle || 'Open Position';
  const score = application.screeningResult?.score ?? 0;
  const level = application.screeningResult?.level || 'eligible';
  const meta = levelMeta(level);
  const photoUrl = await resolvePhotoUrl(application);
  const cv = await resolveCvInfo(application);
  const submittedAt = application.createdAt || new Date();

  const recommendation =
    score >= 85
      ? {
          title: 'Strong Match',
          body: 'The candidate is recommended to move to the next stage of evaluation based on skills, experience and qualifications. Final decision to be taken by HR after detailed review.',
        }
    : score >= 70
      ? {
          title: 'Good Match',
          body: 'The candidate shows a good alignment with the role requirements. HR review is advised before progressing to the interview stage.',
        }
      : {
          title: 'Moderate Match',
          body: 'The candidate shows partial alignment with the role requirements. A detailed manual review is recommended.',
        };

  const subject = `[New Application] ${jobTitle} — ${candidateName} (${score}% ${level === 'eligible' ? 'ELIGIBLE' : level === 'partial' ? 'PARTIAL MATCH' : 'NOT ELIGIBLE'})`;

  const dobGenderRow =
    application.profile?.dateOfBirth || application.profile?.gender
      ? `${infoRow('🎂', 'Date of Birth / Gender', `${esc(fmtDate(application.profile?.dateOfBirth))}${application.profile?.gender ? ` &nbsp;|&nbsp; ${esc(application.profile.gender)}` : ''}`, {
          bold: true,
          border: false,
        })}`
      : '';

  const inner = `
    <!-- HEADER -->
    <tr>
      <td style="padding: 22px 28px 16px 28px; background-color: #fffdf9; border-bottom: 1px solid #efe9dc;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle">${brandLogoHtml()}</td>
            <td valign="middle" align="right">${taglinePanelHtml()}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- TITLE -->
    <tr>
      <td style="padding: 20px 28px 4px 28px;">
        <table cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
          <tr>
            <td style="background-color: ${ENSIS_GREEN}; color: #ffffff; border-radius: 5px; padding: 6px 12px; font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px;">✉ HR NOTIFICATION</td>
          </tr>
        </table>
        <div style="font-family: ${SERIF}; font-size: 27px; font-weight: 700; color: ${ENSIS_GREEN}; line-height: 1.25;">
          New Application <span style="color: ${ENSIS_GOLD};">Received</span>
        </div>
        <div style="font-family: ${SERIF}; font-size: 13.5px; color: #52665a; margin-top: 5px;">
          Candidate Details, AI Screening Result &amp; Recommendation
        </div>
      </td>
    </tr>

    <!-- GREETING -->
    <tr>
      <td style="padding: 16px 28px 8px 28px;">
        <div style="font-size: 12.5px; color: #334155; line-height: 1.65;">
          <strong style="font-family: ${SERIF}; font-size: 14px; color: ${ENSIS_GREEN};">Dear HR Team,</strong><br/>
          We have received a new application for the position of <strong>${esc(jobTitle)}</strong> at ENSIS.<br/>
          Please find below the candidate's profile, AI screening result and analysis. Kindly review the details and take
          the next steps as per the recruitment process.
        </div>
      </td>
    </tr>

    <!-- PROFILE + APPLICATION DETAILS -->
    <tr>
      <td style="padding: 14px 28px 6px 28px;">
        ${twoCol(
          card(`
            ${sectionTitle('👤', 'Candidate Profile')}
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td colspan="2" align="center" style="padding-bottom: 10px;">
                  ${
                    photoUrl
                      ? `<img src="${esc(photoUrl)}" alt="" width="96" style="width: 96px; height: 96px; border-radius: 10px; object-fit: cover; border: 2px solid ${ENSIS_GOLD_SOFT}; display: inline-block;"/>`
                      : `<div style="width: 96px; height: 96px; border-radius: 10px; background-color: ${ENSIS_CREAM}; border: 2px solid ${ENSIS_GOLD_SOFT}; color: ${ENSIS_GREEN}; font-size: 34px; font-weight: 700; line-height: 96px; text-align: center; display: inline-block;">${esc(candidateName.charAt(0).toUpperCase())}</div>`
                  }
                  <div style="font-family: ${SERIF}; font-size: 16px; font-weight: 700; color: ${ENSIS_GREEN}; margin-top: 8px;">${esc(candidateName)}</div>
                </td>
              </tr>
              ${infoRow('✉️', 'Email', esc(application.profile?.email || application.email || '—'), {
                link: `mailto:${application.profile?.email || application.email || ''}`,
                border: true,
              })}
              ${infoRow('📞', 'Phone', esc(application.profile?.phone || application.phone || '—'), { bold: true, border: true })}
              ${infoRow('📍', 'Location', esc(application.profile?.currentLocation || application.currentLocation || 'Not specified'), { border: true })}
              ${dobGenderRow}
              ${
                application.profile?.linkedin
                  ? infoRow('💼', 'LinkedIn', 'View Profile', {
                      link: application.profile.linkedin,
                      color: '#0f5f8a',
                      border: false,
                    })
                  : ''
              }
            </table>
          `),
          card(`
            ${sectionTitle('📝', 'Application Details')}
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoRow('🪪', 'Application ID', esc(application.applicationId), { bold: true, border: true })}
              ${infoRow('💼', 'Position Applied For', esc(jobTitle), { bold: true, border: true })}
              ${infoRow('📅', 'Application Date', esc(fmtDateTime(submittedAt)), { bold: true, border: true })}
              ${infoRow('🌐', 'Application Source', 'ENSIS Careers Portal', { border: true })}
              <tr>
                <td width="26" valign="middle" style="padding: 8px 6px 8px 10px; font-size: 13px;">🕐</td>
                <td width="38%" valign="middle" style="padding: 9px 6px; font-size: 11.5px; color: #5b6b60; font-weight: 600;">Application Status</td>
                <td valign="middle" style="padding: 9px 10px 9px 6px;">${statusPill(application.status || 'received', true)}</td>
              </tr>
              ${infoRow('💼', 'Notice Period', esc(application.details?.noticePeriod || '—'), { bold: true, border: true })}
              ${infoRow('💰', 'Expected CTC', esc(application.details?.expectedCtc || '—'), { bold: true, border: true })}
              ${infoRow('🤝', 'Joining Preference', esc(application.details?.joiningPreference || '—'), { border: false })}
            </table>
          `)
        )}
      </td>
    </tr>

    <!-- AI SCREENING + MATCH BREAKDOWN -->
    <tr>
      <td style="padding: 12px 28px 6px 28px;">
        ${twoCol(
          card(`
            ${sectionTitle('📊', 'AI Screening Result', "Here is the candidate's profile match and analysis based on the job requirements.")}
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding: 6px 0 14px 0;">${renderRingHtml(score)}</td>
              </tr>
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${meta.pillBg}; border-radius: 8px;">
                    <tr>
                      <td width="34" align="center" valign="middle" style="padding: 12px 0 12px 10px;">
                        <div style="width: 26px; height: 26px; border-radius: 50%; background-color: ${meta.color}; color: #ffffff; font-size: 13px; line-height: 26px; text-align: center;">✔</div>
                      </td>
                      <td valign="middle" style="padding: 10px 12px 10px 8px;">
                        <div style="font-size: 12.5px; font-weight: 700; color: ${meta.color}; margin-bottom: 3px;">${esc(meta.title)}</div>
                        <div style="font-size: 10.5px; color: #475569; line-height: 1.5;">${esc(meta.hrMsg)}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `),
          card(`
            ${sectionTitle('📈', 'Match Breakdown', "Here's how the candidate's profile aligns with the key requirements:")}
            ${renderBreakdownBarsHtml(application.screeningResult?.breakdown)}
          `)
        )}
      </td>
    </tr>

    <!-- HIGHLIGHTS + RESUME/AI RECOMMENDATION -->
    <tr>
      <td style="padding: 12px 28px 6px 28px;">
        ${twoCol(
          card(`
            ${sectionTitle('💡', 'Key Highlights', '(from CV & AI Analysis)')}
            ${highlightListHtml((application.screeningResult?.strengths || []).slice(0, 8))}
          `),
          `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom: 12px;">
                ${card(`
                  ${sectionTitle('📄', 'Resume & Documents')}
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="40" valign="middle" style="padding: 0 8px 10px 0;">
                        <div style="width: 34px; height: 40px; border-radius: 5px; background-color: #c0392b; color: #ffffff; font-size: 9px; font-weight: 700; line-height: 40px; text-align: center;">PDF</div>
                      </td>
                      <td valign="middle">
                        <div style="font-size: 11.5px; font-weight: 700; color: #16281f;">${esc(cv.fileName)}</div>
                        <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
                          ${cv.size ? `${esc(formatFileSize(cv.size))} &nbsp;|&nbsp; ` : ''}${esc(fmtDateTime(submittedAt))}
                        </div>
                      </td>
                    </tr>
                    ${
                      cv.downloadUrl
                        ? `<tr><td colspan="2" align="right" style="padding-top: 4px;">
                            <a href="${esc(cv.downloadUrl)}" style="display: inline-block; background-color: ${ENSIS_GREEN}; color: #ffffff; text-decoration: none; padding: 8px 14px; border-radius: 5px; font-size: 11px; font-weight: 700;">⬇ Download CV</a>
                          </td></tr>`
                        : ''
                    }
                  </table>
                `)}
              </td>
            </tr>
            <tr>
              <td>
                ${card(`
                  ${sectionTitle('⭐', 'AI Recommendation')}
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${ENSIS_CREAM}; border-radius: 8px;">
                    <tr>
                      <td width="46" align="center" valign="middle" style="padding: 12px 0 12px 10px;">
                        <div style="font-size: 22px;">👥</div>
                      </td>
                      <td valign="middle" style="padding: 10px 12px 10px 8px;">
                        <div style="font-family: ${SERIF}; font-size: 13.5px; font-weight: 700; color: ${ENSIS_GREEN}; margin-bottom: 3px;">${esc(recommendation.title)}</div>
                        <div style="font-size: 10.5px; color: #475569; line-height: 1.5;">${esc(recommendation.body)}</div>
                      </td>
                    </tr>
                  </table>
                `)}
              </td>
            </tr>
          </table>
          `
        )}
      </td>
    </tr>

    <!-- SUGGESTED NEXT STEPS -->
    <tr>
      <td style="padding: 16px 28px 6px 28px;">
        ${sectionTitle('⚙️', 'Suggested Next Steps for HR')}
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px;">
          <tr>
            ${nextStepCell(1, '🔍', 'Review Application', "Go through the candidate's profile, CV and AI analysis in detail.", true)}
            ${nextStepCell(2, '👥', 'Shortlisting Decision', 'Mark as shortlisted or not shortlisted in the recruitment system.', true)}
            ${nextStepCell(3, '📅', 'Schedule Interview', 'If shortlisted, coordinate for initial interview (phone / video / in-person).', true)}
            ${nextStepCell(4, '✉️', 'Update Candidate', 'Share the status with the candidate via email through the system.', false)}
          </tr>
        </table>
      </td>
    </tr>

    <!-- ADMIN CTA -->
    <tr>
      <td style="padding: 14px 28px 6px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${ENSIS_GREEN}; border-radius: 10px;">
          <tr>
            <td align="center" style="padding: 16px;">
              <div style="color: #ffffff; font-size: 12px; font-weight: 600; margin-bottom: 10px;">
                Access candidate resume &amp; review full profile in the Admin Panel
              </div>
              <a href="${ADMIN_BASE}/career-applications" style="display: inline-block; background-color: ${ENSIS_GOLD}; color: #ffffff; text-decoration: none; padding: 9px 18px; border-radius: 5px; font-size: 12px; font-weight: 700; margin: 3px;">Open Applications in Admin</a>
              ${
                cv.downloadUrl
                  ? `<a href="${esc(cv.downloadUrl)}" style="display: inline-block; background-color: #ffffff; color: ${ENSIS_GREEN}; text-decoration: none; padding: 9px 18px; border-radius: 5px; font-size: 12px; font-weight: 700; margin: 3px;">Download Candidate CV</a>`
                  : ''
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- IMPORTANT NOTE + ASSISTANCE -->
    <tr>
      <td style="padding: 14px 28px 8px 28px;">
        ${twoCol(
          card(`
            ${sectionTitle('ℹ️', 'Important Note')}
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                'The AI screening score is a preliminary assessment and does not guarantee selection.',
                'Final shortlisting and recruitment decisions are to be made by the HR team.',
                "Please verify the candidate's qualifications, experience and documents as per company policy.",
                'Keep the candidate updated through the recruitment system.',
              ]
                .map(
                  (t) => `
                <tr>
                  <td width="22" valign="top" style="padding: 4px 0 8px 0; color: ${BAR_GREEN}; font-size: 12px;">✔</td>
                  <td style="padding: 2px 0 8px 0; font-size: 10.5px; color: #475569; line-height: 1.5;">${esc(t)}</td>
                </tr>`
                )
                .join('')}
            </table>
          `),
          assistanceHtml(settings)
        )}
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="padding: 12px 28px 24px 28px; font-size: 9.5px; color: #94a3b8; text-align: center;">
        Automated HR notification sent by ENSIS Careers Portal • Confirmed recipients: ${esc(recipients.join(', '))}
      </td>
    </tr>
  `;

  const html = pageShell(inner, subject);

  try {
    for (const recipient of recipients) {
      await sendEmail(
        recipient,
        subject,
        `New application received for ${jobTitle} from ${candidateName} (${score}% match).`,
        html
      );
    }
  } catch (err) {
    console.error('[Career Email] Failed to send HR notification:', (err as Error).message);
    throw err;
  }
}

export async function sendCandidateStatusUpdateEmail(
  application: ICareerApplication,
  job: ICareer,
  newStatus: string,
  note?: string,
  interviewDetails?: any
): Promise<void> {
  try {
    const toEmail = application.profile.email;
    const candidateName = application.profile.fullName;

    let statusTitle = 'Application Status Update';
    let statusMessage = '';

    if (newStatus === 'shortlisted') {
      statusTitle = 'Congratulations! You Have Been Shortlisted';
      statusMessage = `We are pleased to inform you that your application for <strong>${job.title}</strong> has been shortlisted. Our HR team will reach out to you shortly with next steps.`;
    } else if (newStatus === 'interview_scheduled') {
      statusTitle = 'Interview Scheduled';
      statusMessage = `Your interview for the role of <strong>${job.title}</strong> has been scheduled.
        ${interviewDetails?.date ? `<br><strong>Date:</strong> ${interviewDetails.date}` : ''}
        ${interviewDetails?.time ? `<br><strong>Time:</strong> ${interviewDetails.time}` : ''}
        ${interviewDetails?.mode ? `<br><strong>Mode:</strong> ${interviewDetails.mode}` : ''}
        ${interviewDetails?.linkOrLocation ? `<br><strong>Details:</strong> ${interviewDetails.linkOrLocation}` : ''}
        ${interviewDetails?.instructions ? `<br><strong>Instructions:</strong> ${interviewDetails.instructions}` : ''}
      `;
    } else if (newStatus === 'hired') {
      statusTitle = 'Welcome to Ensis!';
      statusMessage = `We are delighted to extend our congratulations on your selection for the position of <strong>${job.title}</strong> at ENSIS. Our team will share the formal offer and onboarding details.`;
    } else if (newStatus === 'rejected') {
      statusTitle = 'Update on Your Application';
      statusMessage = `Thank you for taking the time to apply for the position of <strong>${job.title}</strong> at ENSIS. While we were impressed with your qualifications, we have decided to proceed with other candidates whose experience more closely matches our current requirements. We will keep your resume in our talent network for future opportunities.`;
    } else {
      statusMessage = `Your application status for <strong>${job.title}</strong> has been updated to: <strong>${newStatus}</strong>.`;
    }

    const subject = `${statusTitle} — ${job.title} (${application.applicationId})`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${subject}</title></head>
    <body style="font-family: -apple-system, sans-serif; background-color: #f8fafc; padding: 25px; color: #1e293b;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: ${ENSIS_GREEN}; padding: 20px 28px; border-bottom: 3px solid ${ENSIS_GOLD}; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px;">ENSIS</h2>
          <p style="margin: 3px 0 0 0; font-size: 10px; color: ${ENSIS_GOLD}; text-transform: uppercase;">Careers & Talent</p>
        </div>
        <div style="padding: 24px 28px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a;">${statusTitle}</h3>
          <p style="font-size: 13px; line-height: 1.6; color: #334155;">
            Dear <strong>${candidateName}</strong>,<br><br>
            ${statusMessage}
          </p>
          ${note ? `<div style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; margin: 15px 0;"><strong>Note from HR:</strong> ${note}</div>` : ''}
          <p style="font-size: 11px; color: #64748b; margin-top: 20px;">
            Application Reference: <strong>${application.applicationId}</strong>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    await sendEmail(toEmail, subject, statusMessage.replace(/<[^>]+>/g, ''), html);
  } catch (err) {
    console.error('[Career Email] Status update email failed:', (err as Error).message);
  }
}
