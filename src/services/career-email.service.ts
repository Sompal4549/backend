import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { sendEmail } from './email.service';
import { ICareerApplication } from '../models/career-application.model';
import { ICareer } from '../models/career.model';
import { getOrCreateCareerSettings } from '../models/career-settings.model';
import { generateSignedUrl } from './private-upload.service';
import { ScreeningModel } from '../models/screening.model';

async function getSafeSettings() {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      return await getOrCreateCareerSettings();
    }
  } catch {}
  return {
    hrEmails: ['careers@ensis.in'],
    hrContact: {
      email: 'careers@ensis.in',
      phone: '+91 96549 00525',
      address: '12/29, Site-II, Loni Road, Industrial Area, Mohan Nagar, Ghaziabad 201007, Uttar Pradesh',
    },
  };
}

const ENSIS_GREEN = '#0f3d2e';
const ENSIS_GOLD = '#c5922e';
const PAGE_BG = '#f6f3ee';
const BAR_GREEN = '#0e6b45';
const BAR_AMBER = '#b45309';
const BAR_RED = '#be123c';

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const API_BASE = (process.env.API_PUBLIC_URL || process.env.BACKEND_URL || 'https://api.ensis.in').replace(/\/$/, '');

export const CLOUDINARY_HR_HERO =
  'https://res.cloudinary.com/dn34qdd2q/image/upload/v1792648075/ensis/career-email/hr-hero-sunlit.png';
export const CLOUDINARY_CANDIDATE_HERO =
  'https://res.cloudinary.com/dn34qdd2q/image/upload/v1792648076/ensis/career-email/candidate-hero-banner.png';

/**
 * Email icons live in src/assets/career-email (shipped with the Docker image).
 * Templates reference them through `{{ci:key}}` tokens which are resolved at the end of
 * rendering: to `cid:` references (inline attachments) for real emails, or to data URIs
 * for browser previews. Each entry is [fileName, naturalWidth, naturalHeight].
 */
const ICON_FILES: Record<string, [string, number, number]> = {
  // Section badges — gold (HR email)
  badge_user: ['clean_badge_user.png', 132, 132],
  badge_briefcase_gold: ['clean_badge_briefcase.png', 132, 132],
  badge_chart: ['clean_badge_chart.png', 132, 132],
  badge_crown: ['clean_badge_crown.png', 132, 132],
  badge_bulb: ['clean_badge_bulb.png', 132, 132],
  badge_doc_gold: ['clean_badge_doc.png', 132, 132],
  badge_star: ['clean_badge_star.png', 115, 115],
  badge_gear: ['clean_badge_gear.png', 132, 132],
  badge_info_blue: ['clean_badge_info_blue.png', 39, 39],
  badge_headset: ['clean_badge_headset.jpeg', 45, 46],
  // Section badges — green (candidate email)
  badge_doc_green: ['application_details_document_badge.png', 42, 42],
  badge_chart_green: ['ai_screening_chart_badge.png', 48, 48],
  badge_crown_green: ['match_breakdown_crown_badge.png', 48, 48],
  badge_gear_green: ['next_steps_gear.png', 34, 34],
  badge_info_green: ['important_info_badge.png', 34, 34],
  badge_info_gold: ['information_notice_icon.png', 30, 29],
  badge_people_teal: ['creative_thinking_people.png', 29, 24],
  // Inline row icons
  icon_user: ['candidate_person.png', 67, 72],
  icon_email: ['candidate_email.png', 83, 63],
  icon_phone: ['candidate_phone.png', 71, 75],
  icon_location: ['candidate_location.png', 59, 82],
  icon_calendar: ['candidate_calendar.png', 84, 83],
  icon_linkedin: ['linkedin.png', 88, 89],
  icon_doc: ['application_document.png', 73, 90],
  icon_app_id: ['application_id.png', 25, 22],
  icon_cap: ['application_education.png', 105, 82],
  icon_briefcase: ['position_briefcase.png', 24, 22],
  icon_globe: ['clean_icon_globe.png', 24, 25],
  icon_clock: ['application_status_clock.png', 101, 100],
  icon_people: ['ai_profile_match_people.png', 25, 21],
  icon_date_small: ['application_date_calendar.png', 22, 22],
  icon_pin_small: ['preferred_location_pin.png', 18, 23],
  // Match breakdown icons
  match_education: ['education_graduation_cap.png', 29, 21],
  match_experience: ['relevant_experience_briefcase.png', 27, 26],
  match_technical: ['design_skills_leaf.png', 28, 30],
  match_creative: ['creative_thinking_people.png', 29, 24],
  match_communication: ['communication_document.png', 22, 30],
  match_portfolio: ['portfolio_target.png', 31, 31],
  // Pre-rendered heroes (background + copy baked in) so Outlook dark mode cannot recolour the text
  hero_hr: ['hero_hr.jpg', 1400, 524],
  hero_candidate: ['hero_candidate.jpg', 1400, 524],
  // Misc
  check_circle_green: ['clean_check_green.png', 120, 120],
  eligible_check: ['clean_eligible_check.png', 122, 122],
  check_circle_gold: ['success_check_badge.png', 80, 80],
  lotus_gold: ['decorative_wellness_leaf.png', 23, 15],
  pdf_badge: ['pdf.jpeg', 32, 41],
  arrow_step: ['step_arrow_1.png', 44, 96],
  // Next-step icons — gold (HR) and green (candidate)
  step_icon_review: ['clean_step1_gold.png', 32, 33],
  step_icon_people: ['clean_step2_gold.png', 39, 31],
  step_icon_calendar: ['clean_step3_gold.png', 27, 31],
  step_icon_email: ['clean_step4_gold.png', 35, 26],
  step_icon_review_green: ['step1_document_search.png', 32, 33],
  step_icon_people_green: ['step2_people.png', 39, 31],
  step_icon_calendar_green: ['step3_calendar.png', 27, 31],
  step_icon_email_green: ['step4_envelope.png', 35, 26],
};

export const EMAIL_ICONS = Object.fromEntries(
  Object.keys(ICON_FILES).map((key) => [key, `{{ci:${key}}}`])
) as Record<keyof typeof ICON_FILES, string>;

const ICON_TOKEN_RE = /\{\{ci:([a-z0-9_]+)\}\}/g;

function getEmailAssetsDir(): string {
  const candidates = [
    path.join(process.cwd(), 'src', 'assets', 'career-email'),
    path.join(__dirname, '..', 'assets', 'career-email'),
    path.join(__dirname, '..', '..', 'src', 'assets', 'career-email'),
  ];
  return candidates.find((dir) => fs.existsSync(dir)) || candidates[0];
}

function iconCid(key: string): string {
  return `ensis-icon-${key}@ensis`;
}

/** Resolve `{{ci:key}}` tokens to cid: refs (email) or base64 data URIs (preview). */
function resolveIconTokens(html: string, mode: 'cid' | 'data'): string {
  const dir = getEmailAssetsDir();
  return html.replace(ICON_TOKEN_RE, (_m, key: string) => {
    const entry = ICON_FILES[key];
    if (!entry) return '';
    if (mode === 'cid') return `cid:${iconCid(key)}`;
    const file = path.join(dir, entry[0]);
    if (!fs.existsSync(file)) return '';
    const mime = entry[0].endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  });
}

/** Build inline attachments for every icon referenced (via cid) in the final HTML. */
function collectIconAttachments(html: string): any[] {
  const dir = getEmailAssetsDir();
  const keys = new Set<string>();
  const re = /cid:ensis-icon-([a-z0-9_]+)@ensis/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) keys.add(m[1]);
  const attachments: any[] = [];
  for (const key of keys) {
    const entry = ICON_FILES[key];
    const file = entry && path.join(dir, entry[0]);
    if (!file || !fs.existsSync(file)) continue;
    attachments.push({
      filename: entry[0],
      path: file,
      cid: iconCid(key),
      contentDisposition: 'inline',
    });
  }
  return attachments;
}

/** Width/height that fit an icon inside a `size` box while keeping its aspect ratio. */
function fitIcon(src: string, size: number): { w: number; h: number } {
  const key = src.replace(/^\{\{ci:|\}\}$/g, '');
  const entry = ICON_FILES[key];
  if (!entry) return { w: size, h: size };
  const [, nw, nh] = entry;
  const scale = size / Math.max(nw, nh);
  return { w: Math.max(1, Math.round(nw * scale)), h: Math.max(1, Math.round(nh * scale)) };
}

/** <img> tag for an icon token, sized to fit a `size` box without distortion. */
function iconImg(src: string, size: number, alt = '', style = 'display: block !important;'): string {
  const { w, h } = fitIcon(src, size);
  return `<img src="${src}" width="${w}" height="${h}" alt="${alt}" border="0" style="${style} width: ${w}px !important; height: ${h}px !important; border: 0 !important; outline: none !important;" />`;
}

export function renderIcon(src: string, size = 15, alt = ''): string {
  const { w } = fitIcon(src, size);
  return iconImg(
    src,
    size,
    alt,
    `display: inline-block !important; vertical-align: middle !important; margin: 0 ${5 + size - w}px 0 0 !important;`
  );
}

export function renderBadge(src: string, size = 26, alt = ''): string {
  return iconImg(src, size, alt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

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

const BREAKDOWN_ICONS_MAP: Record<string, string> = {
  education: EMAIL_ICONS.match_education,
  experience: EMAIL_ICONS.match_experience,
  technical_skills: EMAIL_ICONS.match_technical,
  creative_thinking: EMAIL_ICONS.match_creative,
  communication: EMAIL_ICONS.match_communication,
  portfolio: EMAIL_ICONS.match_portfolio,
  location: EMAIL_ICONS.icon_location,
};

function normalizeBreakdown(raw: unknown): BreakdownItem[] {
  if (!raw) return [];
  let items: BreakdownItem[] = [];
  if (Array.isArray(raw)) {
    items = raw.map((item: any) => {
      const key = String(item?.key || '');
      return {
        key,
        label: String(item?.label || BREAKDOWN_LABELS[key] || key.replace(/_/g, ' ') || 'Competency'),
        score: Math.max(0, Math.min(100, Number(item?.score) || 0)),
      };
    });
  } else if (typeof raw === 'object') {
    items = Object.entries(raw as Record<string, number>).map(([key, score]) => ({
      key,
      label: BREAKDOWN_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      score: Math.max(0, Math.min(100, Number(score) || 0)),
    }));
  }
  return items;
}

/** Score as a number, or null when the application has no AI screening result. */
function scoreOf(application: ICareerApplication): number | null {
  const v = Number(application.screeningResult?.score);
  return application.screeningResult && Number.isFinite(v) ? Math.round(v) : null;
}

function levelMeta(level?: string) {
  if (level === 'unavailable') {
    return {
      title: 'No AI Score',
      color: '#64748b',
      boxBg: '#f1f5f9',
      recTitle: 'Manual Review Needed',
      recText: 'No AI screening result is stored for this application. Please review the CV and details manually.',
      candidateMsg: 'Our recruitment team will review your application and CV.',
      hrMsg: 'No AI screening result is stored for this application. Please review the CV manually.',
    };
  }
  if (level === 'partial') {
    return {
      title: 'Partial Match',
      color: BAR_AMBER,
      boxBg: '#fdf6e7',
      recTitle: 'Moderate Match',
      recText:
        'The candidate partially meets the requirements. A detailed HR review is suggested before deciding on the next stage of evaluation.',
      candidateMsg: 'Your profile partially matches this position. Our recruitment team will review your application.',
      hrMsg: "The candidate's profile partially matches the job requirements based on skills, experience and qualifications derived from the job description.",
    };
  }
  if (level === 'not_eligible') {
    return {
      title: 'Does Not Meet Requirements',
      color: BAR_RED,
      boxBg: '#fdf0f0',
      recTitle: 'Not Recommended',
      recText:
        'The candidate does not meet the minimum requirements for this role. Final decision to be taken by HR after detailed review.',
      candidateMsg: 'Based on our preliminary AI screening, your profile does not meet the minimum criteria for this position.',
      hrMsg: "The candidate's profile does not meet the minimum requirements derived from the job description.",
    };
  }
  return {
    title: 'Eligible to Apply',
    color: BAR_GREEN,
    boxBg: '#eef6f0',
    recTitle: 'Strong Match',
    recText:
      'The candidate is recommended to move to the next stage of evaluation based on skills, experience and qualifications. Final decision to be taken by HR after detailed review.',
    candidateMsg: 'You are eligible to apply for this position based on our AI screening.',
    hrMsg: "The candidate's profile matches well with the job requirements based on skills, experience and qualifications derived from the job description.",
  };
}

function statusText(status: string, forHr: boolean): string {
  if (status === 'shortlisted') return 'Shortlisted';
  if (status === 'interview_scheduled') return 'Interview Scheduled';
  if (status === 'rejected') return 'Not Shortlisted';
  if (status === 'hired') return 'Selected';
  return forHr ? 'Received – Under HR Review' : 'Received – Awaiting HR Review';
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme — two palettes so each email matches its own mockup
// ─────────────────────────────────────────────────────────────────────────────

type Theme = {
  title: string; // section titles
  text: string; // body copy
  label: string; // row labels
  value: string; // row values
  border: string;
  cardBg: string;
};

const HR_THEME: Theme = {
  title: '#14304f',
  text: '#2a4a78',
  label: '#2a4a78',
  value: '#13233d',
  border: '#ebe5d9',
  cardBg: '#ffffff',
};

const CANDIDATE_THEME: Theme = {
  title: '#0f3d2e',
  text: '#33403a',
  label: '#4b5a52',
  value: '#14241c',
  border: '#ede6d8',
  cardBg: '#fffefb',
};

const TD = `font-family: ${SANS}; mso-line-height-rule: exactly;`;

// ─────────────────────────────────────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────────────────────────────────────

export function sectionBadgeTitle(
  badgeUrl: string,
  title: string,
  subtitle?: string,
  opts?: { theme?: Theme; inlineNote?: string; right?: string; badgeSize?: number; titleSize?: number }
): string {
  const t = opts?.theme || HR_THEME;
  const badgeSize = opts?.badgeSize || 30;
  const titleSize = opts?.titleSize || 16;
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 8px 0;">
      <tr>
        <td width="${badgeSize + 10}" valign="middle" style="width: ${badgeSize + 10}px;">${renderBadge(badgeUrl, badgeSize, esc(title))}</td>
        <td valign="middle" style="${TD}">
          <div style="font-family: ${SERIF}; font-size: ${titleSize}px; font-weight: 700; color: ${t.title}; line-height: 1.2;">${esc(title)}${
            opts?.inlineNote
              ? ` <span style="font-family: ${SANS}; font-size: 11px; font-weight: 400; color: ${t.text};">${esc(opts.inlineNote)}</span>`
              : ''
          }</div>
          ${subtitle ? `<div style="font-family: ${SANS}; font-size: 9.5px; color: ${t.text}; margin-top: 3px; line-height: 1.35;">${esc(subtitle)}</div>` : ''}
        </td>
        ${opts?.right ? `<td align="right" valign="middle" style="${TD}">${opts.right}</td>` : ''}
      </tr>
    </table>`;
}

function card(inner: string, opts?: { bg?: string; border?: string; pad?: string }): string {
  const bg = opts?.bg || '#ffffff';
  const border = opts?.border || '#ebe5d9';
  const pad = opts?.pad || '12px 14px';
  return `
    <table width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}" style="background-color: ${bg}; border: 1px solid ${border}; border-radius: 10px; border-collapse: separate; height: 100%;">
      <tr><td valign="top" style="padding: ${pad}; ${TD}">${inner}</td></tr>
    </table>`;
}

function twoCol(leftHtml: string, rightHtml: string, gap = 10, leftPct = 50): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="stack" width="${leftPct}%" height="100%" valign="top" style="padding-right: ${gap / 2}px; height: 100%;">${leftHtml}</td>
        <td class="stack" width="${100 - leftPct}%" height="100%" valign="top" style="padding-left: ${gap / 2}px; height: 100%;">${rightHtml}</td>
      </tr>
    </table>`;
}

function editButton(href?: string): string {
  const inner = `<span style="font-size: 11px; color: ${HR_THEME.title};">&#9998;</span>&nbsp;<span style="font-family: ${SANS}; font-size: 10.5px; font-weight: 600; color: ${HR_THEME.title};">Edit</span>`;
  const style = `display: inline-block; border: 1px solid #e3ddd0; border-radius: 5px; padding: 4px 10px; background-color: #ffffff; text-decoration: none;`;
  return href ? `<a href="${esc(href)}" style="${style}">${inner}</a>` : `<span style="${style}">${inner}</span>`;
}

/**
 * Score ring in pure HTML: a bordered circle whose sides are coloured clockwise from the right
 * according to the score (one side ≈ 25%). Outlook falls back to a square — still readable.
 */
function renderRingHtml(score: number | null, opts: { arc: string; accent?: string; track?: string; numColor: string; size?: number }): string {
  const safe = score === null ? null : Math.max(0, Math.min(100, Math.round(score)));
  const size = opts.size || 118;
  const track = opts.track || '#e6e9e7';
  const filled = safe === null ? 0 : Math.max(1, Math.min(4, Math.round(safe / 25)));
  // clockwise order starting at the right side: right, bottom, left, top
  const sides = ['right', 'bottom', 'left', 'top'];
  const colours: Record<string, string> = {};
  sides.forEach((side, i) => {
    colours[side] = i < filled ? opts.arc : track;
  });
  if (opts.accent && filled >= 2) colours.right = opts.accent;
  const inner = size - 24;
  return `
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
      <tr>
        <td width="${inner}" height="${inner}" align="center" valign="middle" style="width: ${inner}px; height: ${inner}px; border-style: solid; border-width: 12px; border-top-color: ${colours.top}; border-right-color: ${colours.right}; border-bottom-color: ${colours.bottom}; border-left-color: ${colours.left}; border-radius: 50%; text-align: center; padding: 0; ${TD}">
          <div style="font-family: ${SANS}; font-size: 27px; font-weight: 700; color: ${opts.numColor}; line-height: 1; letter-spacing: -0.5px;">${safe === null ? '—' : `${safe}%`}</div>
          <div style="font-family: ${SANS}; font-size: 11.5px; font-weight: 500; color: ${opts.numColor}; line-height: 1.2; margin-top: 5px;">Match Score</div>
        </td>
      </tr>
    </table>`;
}

function eligibleBox(meta: ReturnType<typeof levelMeta>, message: string, theme: Theme, titleSize = 15): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${meta.boxBg}" style="background-color: ${meta.boxBg}; border-radius: 8px; border-collapse: separate;">
      <tr>
        <td width="30" valign="middle" style="padding: 10px 0 10px 10px; width: 30px;">${renderBadge(EMAIL_ICONS.eligible_check, 24, '✔')}</td>
        <td valign="middle" style="padding: 10px 10px 10px 8px; ${TD}">
          <div style="font-family: ${SERIF}; font-size: ${titleSize}px; font-weight: 700; color: ${theme.title}; line-height: 1.25; margin-bottom: 5px; white-space: nowrap;">${esc(meta.title)}</div>
          <div style="font-family: ${SANS}; font-size: 10px; color: ${theme.text}; line-height: 1.5;">${esc(message)}</div>
        </td>
      </tr>
    </table>`;
}

function renderBreakdownBarsHtml(breakdown: unknown, theme: Theme): string {
  const items = normalizeBreakdown(breakdown);
  if (items.length === 0) {
    return `<div style="font-family: ${SANS}; font-size: 10.5px; color: ${theme.text}; line-height: 1.5; padding: 4px 0 10px 0;">No AI match breakdown is available for this application.</div>`;
  }
  const cell = (item: BreakdownItem) => {
    const iconSrc = (item.key && BREAKDOWN_ICONS_MAP[item.key]) || EMAIL_ICONS.check_circle_green;
    const fill = item.score >= 70 ? '#0f5a3c' : item.score >= 50 ? BAR_AMBER : BAR_RED;
    return `
    <td class="stack" width="50%" valign="middle" style="padding: 0 6px 9px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="27" valign="middle" style="width: 27px;">${renderBadge(iconSrc, 20)}</td>
          <td valign="middle" style="${TD}">
            <div style="font-family: ${SANS}; font-size: 9px; color: ${theme.text}; line-height: 1.3; padding-bottom: 3px; white-space: nowrap;">${esc(item.label)}</div>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle" style="padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#e6e9e7" style="background-color: #e6e9e7; border-radius: 9999px; border-collapse: separate;">
                    <tr>
                      <td width="${item.score}%" height="8" bgcolor="${fill}" style="width: ${item.score}%; height: 8px; line-height: 8px; font-size: 0; background-color: ${fill}; background-image: linear-gradient(90deg, #0b4a30, ${fill === '#0f5a3c' ? '#1a7a52' : fill}); border-radius: 9999px;">&nbsp;</td>
                      <td width="${100 - item.score}%" height="8" style="width: ${100 - item.score}%; height: 8px; line-height: 8px; font-size: 0;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
                <td width="30" align="right" valign="middle" style="width: 30px; font-family: ${SANS}; font-size: 10px; font-weight: 700; color: ${theme.value};">${item.score}%</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>`;
  };

  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const right = items[i + 1] ? cell(items[i + 1]) : '<td class="stack" width="50%">&nbsp;</td>';
    rows.push(`<tr>${cell(items[i])}${right}</tr>`);
  }
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>`;
}

function checkList(items: string[], theme: Theme, fontSize = 11, checkSize = 17): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${items
        .map(
          (text) => `
      <tr>
        <td width="${checkSize + 9}" valign="top" style="width: ${checkSize + 9}px; padding: 2px 0 4px 0;">${renderBadge(EMAIL_ICONS.check_circle_green, checkSize, '✔')}</td>
        <td valign="middle" style="padding: 2px 0 4px 0; font-family: ${SANS}; font-size: ${fontSize}px; color: ${theme.text}; line-height: 1.45;">${esc(text)}</td>
      </tr>`
        )
        .join('')}
    </table>`;
}

function stepNumber(num: number, size = 24): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: separate;"><tr><td width="${size}" height="${size}" align="center" valign="middle" bgcolor="${ENSIS_GOLD}" style="width: ${size}px; height: ${size}px; background-color: ${ENSIS_GOLD}; border-radius: 50%; color: #ffffff; font-size: ${Math.round(size * 0.55)}px; font-weight: 700; font-family: ${SANS}; text-align: center; line-height: ${size}px; padding: 0;">${num}</td></tr></table>`;
}

type Step = { icon: string; title: string; body: string };

function stepsRow(steps: Step[], theme: Theme, opts: { bg: string; border: string; titleFont: string; titleColor: string }): string {
  const cells = steps
    .map((s, i) => {
      const box = `
      <td class="stack" width="23.5%" height="100%" valign="top" style="padding: 0; height: 100%;">
        <table width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${opts.bg}" style="background-color: ${opts.bg}; border: 1px solid ${opts.border}; border-radius: 8px; border-collapse: separate; height: 100%;">
          <tr>
            <td valign="top" style="padding: 10px 10px 10px 10px; ${TD}">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 6px;">
                <tr>
                  <td valign="middle">${stepNumber(i + 1)}</td>
                  <td valign="middle" style="padding-left: 10px;">${renderBadge(s.icon, 24)}</td>
                </tr>
              </table>
              <div style="font-family: ${opts.titleFont}; font-size: 12px; font-weight: 700; color: ${opts.titleColor}; line-height: 1.25; margin-bottom: 4px;">${esc(s.title)}</div>
              <div style="font-family: ${SANS}; font-size: 10px; color: ${theme.text}; line-height: 1.45;">${esc(s.body)}</div>
            </td>
          </tr>
        </table>
      </td>`;
      const arrow =
        i < steps.length - 1
          ? `<td class="hide-mobile" width="2%" valign="middle" align="center" style="padding: 0 2px; text-align: center;">${iconImg(EMAIL_ICONS.arrow_step, 14, '›', 'display: inline-block;')}</td>`
          : '';
      return box + arrow;
    })
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`;
}

function assistanceCard(settings: any, theme: Theme, forHr: boolean): string {
  const contact = settings?.hrContact || {};
  const subtitle = forHr
    ? 'If you need any further information or have queries regarding this application, please feel free to reach out to our HR Team.'
    : 'If you have any queries regarding your application, please feel free to contact our HR Department.';
  const row = (icon: string, html: string) => `
    <tr>
      <td width="24" valign="middle" style="width: 24px; padding: 3px 0;">${renderBadge(icon, 15)}</td>
      <td valign="middle" style="padding: 3px 0; font-family: ${SANS}; font-size: 10.5px; color: ${theme.text};">${html}</td>
    </tr>`;
  return card(
    `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="54" valign="top" style="width: 54px;">${renderBadge(EMAIL_ICONS.badge_headset, 42, '')}</td>
        <td valign="top" style="${TD}">
          <div style="font-family: ${SERIF}; font-size: 14.5px; font-weight: 700; color: ${theme.title}; line-height: 1.2; margin-bottom: 5px;">Need Any Assistance?</div>
          <div style="font-family: ${SANS}; font-size: 10.5px; color: ${theme.text}; line-height: 1.45; margin-bottom: 8px;">${subtitle}</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${row(EMAIL_ICONS.icon_email, `<a href="mailto:${esc(contact.email || 'careers@ensis.in')}" style="color: ${theme.text}; text-decoration: none;">${esc(contact.email || 'careers@ensis.in')}</a>`)}
            ${row(EMAIL_ICONS.icon_phone, `${esc(contact.phone || '+91 96549 00525')} &nbsp;(Mon – Fri, 10 AM – 6 PM)`)}
            ${row(EMAIL_ICONS.icon_location, esc(contact.address || 'ENSIS Corporate Office, Delhi NCR'))}
          </table>
        </td>
      </tr>
    </table>`,
    { bg: theme.cardBg, border: theme.border, pad: '14px 14px' }
  );
}

function pageShell(inner: string, title: string, bodyBg: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <title>${esc(title)}</title>
  <!-- Outlook.com / new Outlook dark mode recolours text but leaves the hero background image
       light, so the hero copy is pinned to its real colours. Kept in its own style block so
       Outlook does not drop it together with the VML rules below. -->
  <style>
    :root { color-scheme: light only; supported-color-schemes: light only; }
    [data-ogsc] .dm-green, .dm-green[data-ogsc] { color: ${ENSIS_GREEN} !important; }
    [data-ogsc] .dm-gold, .dm-gold[data-ogsc] { color: ${ENSIS_GOLD} !important; }
    [data-ogsc] .dm-navy, .dm-navy[data-ogsc] { color: #14304f !important; }
    [data-ogsc] .dm-blue, .dm-blue[data-ogsc] { color: #2a4a78 !important; }
    [data-ogsc] .dm-dark, .dm-dark[data-ogsc] { color: #14241c !important; }
    [data-ogsc] .dm-body, .dm-body[data-ogsc] { color: #33403a !important; }
    [data-ogsb] .dm-pill, .dm-pill[data-ogsb] { background-color: #dcefe2 !important; }
  </style>
  <style>
    v\\:* { behavior: url(#default#VML); display: inline-block; }
    o\\:* { behavior: url(#default#VML); }
    body { margin: 0; padding: 0; background-color: ${PAGE_BG}; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; }
    a { text-decoration: none; }
    @media only screen and (max-width: 680px) {
      .container { width: 100% !important; }
      .stack { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; padding-bottom: 10px !important; }
      .hide-mobile { display: none !important; }
      .hero-text { width: 100% !important; }
      .hero-spacer { display: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${PAGE_BG};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE_BG}" style="background-color: ${PAGE_BG};">
    <tr>
      <td align="center" style="padding: 16px 6px;">
        <table class="container" width="700" cellpadding="0" cellspacing="0" border="0" bgcolor="${bodyBg}" style="width: 700px; max-width: 700px; background-color: ${bodyBg}; border: 1px solid #ece5d6; border-radius: 14px; overflow: hidden; border-collapse: separate;">
          ${inner}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Hero as a single pre-rendered image (hero_*.jpg). To change the hero copy, render the email with
 * `{ liveHero: true }`, screenshot the 700×262 hero at 2x and save it as JPEG over the asset.
 */
function heroImageRow(src: string, alt: string, bg: string): string {
  return `
    <tr>
      <td width="700" bgcolor="${bg}" style="padding: 0; background-color: ${bg}; line-height: 0; font-size: 0;">
        <img src="${src}" width="700" alt="${esc(alt)}" border="0" style="display: block; width: 100%; max-width: 700px; height: auto; border: 0; outline: none;" />
      </td>
    </tr>`;
}

function heroCell(src: string, vmlSrc: string, height: number, bg: string, content: string): string {
  return `
    <tr>
      <td width="700" height="${height}" background="${src}" bgcolor="${bg}" valign="top" style="padding: 0; background-color: ${bg}; background-image: url('${src}'); background-size: 700px auto; background-position: left top; background-repeat: no-repeat; height: ${height}px;">
        <!--[if gte mso 9]>
        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:700px;height:${height}px;">
        <v:fill type="frame" src="${vmlSrc}" color="${bg}" />
        <v:textbox inset="0,0,0,0">
        <![endif]-->
        <div>${content}</div>
        <!--[if gte mso 9]>
        </v:textbox>
        </v:rect>
        <![endif]-->
      </td>
    </tr>`;
}

async function resolvePhotoUrl(application: ICareerApplication): Promise<string | undefined> {
  const pUrl = application.profile?.photoUrl;
  if (!pUrl) return undefined;
  if (String(pUrl).startsWith('http') || String(pUrl).startsWith('data:')) return String(pUrl);
  return `${API_BASE}${generateSignedUrl(String(pUrl), 60 * 24)}`;
}

async function resolveCvInfo(
  application: ICareerApplication
): Promise<{ fileName: string; size?: number; downloadUrl?: string }> {
  // Older applications store the CV as a full URL — show its file name and link to it
  const resume = String(application.resume || '');
  const isUrl = /^https?:\/\//i.test(resume);
  let fileName = isUrl
    ? decodeURIComponent(resume.split('?')[0].split('/').pop() || 'Resume.pdf').replace(/^\d{10,}-/, '')
    : resume || 'Resume.pdf';
  let size: number | undefined;
  let downloadUrl: string | undefined = isUrl ? resume : undefined;

  const doc = (application.documents || []).find((d) => d?.fileId);
  if (doc) {
    fileName = doc.fileName || doc.label || fileName;
    size = doc.size || size;
    downloadUrl = `${API_BASE}${generateSignedUrl(doc.fileId, 60 * 24)}`;
  } else if (application.screeningId) {
    const sc = await ScreeningModel.findOne({ screeningId: application.screeningId }).lean();
    if (sc?.cv?.fileId) {
      fileName = sc.cv.fileName || fileName;
      size = sc.cv.size || size;
      downloadUrl = `${API_BASE}${generateSignedUrl(sc.cv.fileId, 60 * 24)}`;
    }
  }
  return { fileName, size, downloadUrl };
}

function adminApplicationUrl(application: ICareerApplication): string | undefined {
  const base = (process.env.ADMIN_PUBLIC_URL || '').replace(/\/$/, '');
  const id = application.applicationId || (application as any)._id;
  return base && id ? `${base}/career-applications/${encodeURIComponent(String(id))}` : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate confirmation email
// ─────────────────────────────────────────────────────────────────────────────

export async function renderCandidateConfirmationEmailHtml(
  application: ICareerApplication,
  job: ICareer | null,
  _options?: { isEmailMime?: boolean; liveHero?: boolean }
): Promise<string> {
  const t = CANDIDATE_THEME;
  const settings = await getSafeSettings();
  const candidateName = application.profile?.fullName || application.fullName || 'Candidate';
  const jobTitle = job?.title || application.jobTitle || 'Open Position';
  const appId = application.applicationId || '—';
  const score = scoreOf(application);
  const meta = levelMeta(score === null ? 'unavailable' : application.screeningResult?.level || 'eligible');
  const submittedAt = application.createdAt || new Date();
  const subject = `Your Application Has Been Successfully Submitted! — ${appId}`;
  const preferredLocations = application.details?.preferredLocations?.length
    ? application.details.preferredLocations.join(', ')
    : (job as any)?.location || '—';

  const heroSrc = CLOUDINARY_CANDIDATE_HERO;
  const vmlHeroSrc = CLOUDINARY_CANDIDATE_HERO;

  const goldLine = `<td width="62" valign="middle" style="width: 62px; padding: 0;"><div style="height: 1px; line-height: 1px; font-size: 0; background-color: ${ENSIS_GOLD};">&nbsp;</div></td>`;

  const heroContent = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="height: 262px;">
      <tr>
        <td class="hero-text" width="380" valign="middle" align="center" style="width: 380px; padding: 26px 8px 22px 22px; text-align: center; ${TD}">
          ${iconImg(EMAIL_ICONS.check_circle_gold, 54, '✔', 'display: block; margin: 0 auto 12px auto;')}
          <div class="dm-green" style="font-family: ${SERIF}; font-size: 25px; font-weight: 700; color: ${ENSIS_GREEN}; line-height: 1.18;">Your Application Has Been</div>
          <div class="dm-gold" style="font-family: ${SERIF}; font-size: 25px; font-weight: 700; color: ${ENSIS_GOLD}; line-height: 1.25;">Successfully Submitted!</div>
          <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 9px auto 10px auto;">
            <tr>${goldLine}<td valign="middle" style="padding: 0 8px;">${iconImg(EMAIL_ICONS.lotus_gold, 18, '', 'display: block;')}</td>${goldLine}</tr>
          </table>
          <div class="dm-body" style="font-family: ${SANS}; font-size: 12px; color: #33403a; line-height: 1.45;">Thank you for choosing ENSIS – <strong class="dm-dark" style="color: #14241c;">Wellness Furniture for Healthier Spaces.</strong></div>
        </td>
        <td class="hero-spacer" valign="middle">&nbsp;</td>
      </tr>
    </table>`;

  const detailCell = (icon: string, label: string, valueHtml: string) => `
    <td class="stack" width="50%" valign="middle" height="100%" style="padding: 3px; height: 100%;">
      <table width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f9f6ef" style="background-color: #f9f6ef; border-radius: 6px; border-collapse: separate; height: 100%;">
        <tr>
          <td width="28" valign="middle" style="width: 28px; padding: 8px 0 8px 10px;">${renderBadge(icon, 17)}</td>
          <td width="104" valign="middle" style="width: 104px; padding: 8px 4px; font-family: ${SANS}; font-size: 10.5px; color: ${t.label};">${label}</td>
          <td valign="middle" style="padding: 6px 10px 6px 0; font-family: ${SANS}; font-size: 11px; font-weight: 700; color: ${t.value};">${valueHtml}</td>
        </tr>
      </table>
    </td>`;
  const statusPill = `<span style="display: inline-block; background-color: #e2f1e6; color: #14532d; border-radius: 4px; padding: 4px 7px; font-size: 10px; font-weight: 500; white-space: nowrap;">${esc(statusText(application.status || 'received', false))}</span>`;

  const inner = `
    ${
      _options?.liveHero
        ? heroCell(heroSrc, vmlHeroSrc, 262, '#fbf8f2', heroContent)
        : heroImageRow(EMAIL_ICONS.hero_candidate, 'Your Application Has Been Successfully Submitted! Thank you for choosing ENSIS – Wellness Furniture for Healthier Spaces.', '#fbf8f2')
    }

    <!-- GREETING + QUOTE -->
    <tr>
      <td style="padding: 22px 26px 8px 26px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stack" valign="top" style="padding-right: 18px; ${TD}">
              <div style="font-size: 19px; line-height: 1.25; color: #14241c;"><span style="font-family: ${SERIF};">Dear</span> <span style="font-family: ${SANS}; font-weight: 700;">${esc(candidateName)},</span></div>
              <div style="font-family: ${SANS}; font-size: 14px; font-weight: 700; color: ${ENSIS_GOLD}; margin: 10px 0 4px 0;">Namaste!</div>
              <div style="font-family: ${SANS}; font-size: 12px; color: ${t.text}; line-height: 1.6;">
                Thank you for your interest in becoming a part of <strong style="color: #14241c;">ENSIS.</strong><br/>
                We are pleased to confirm that your application has been successfully received for the position of
                <strong style="color: #14241c;">${esc(jobTitle)}.</strong> We appreciate the time and effort you have invested in sharing your professional qualifications, experience and aspirations with us.
              </div>
            </td>
            <td class="stack" width="190" valign="top" style="width: 190px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8f3e7" style="background-color: #f8f3e7; border-radius: 10px; border-collapse: separate;">
                <tr>
                  <td style="padding: 12px 18px 16px 18px; ${TD}">
                    <div style="font-family: ${SERIF}; font-size: 44px; line-height: 30px; height: 26px; color: #dcb878; font-weight: 700;">&ldquo;</div>
                    <div style="font-family: ${SERIF}; font-style: italic; font-size: 14px; color: ${ENSIS_GREEN}; line-height: 1.4; padding-left: 30px;">Creating<br/>Wellness Spaces<br/>For A Healthier<br/>Tomorrow</div>
                    <div style="margin: 8px 0 0 30px; width: 46px; height: 2px; line-height: 2px; font-size: 0; background-color: ${ENSIS_GOLD};">&nbsp;</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- YOUR APPLICATION DETAILS -->
    <tr>
      <td style="padding: 10px 22px 6px 22px;">
        ${card(
          `
          ${sectionBadgeTitle(EMAIL_ICONS.badge_doc_green, 'Your Application Details', undefined, { theme: t, badgeSize: 30, titleSize: 18 })}
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>${detailCell(EMAIL_ICONS.icon_app_id, 'Application ID', esc(appId))}${detailCell(EMAIL_ICONS.icon_date_small, 'Application Date', esc(fmtDateTime(submittedAt)))}</tr>
            <tr>${detailCell(EMAIL_ICONS.icon_briefcase, 'Position Applied For', esc(jobTitle))}${detailCell(EMAIL_ICONS.icon_people, 'AI Profile Match', score === null ? '—' : `${score}%`)}</tr>
            <tr>${detailCell(EMAIL_ICONS.icon_pin_small, 'Preferred Location', esc(preferredLocations))}${detailCell(EMAIL_ICONS.icon_clock, 'Application Status', statusPill)}</tr>
          </table>`,
          { bg: t.cardBg, border: t.border, pad: '14px 12px 10px 12px' }
        )}
      </td>
    </tr>

    <!-- AI SCREENING + MATCH BREAKDOWN -->
    <tr>
      <td style="padding: 6px 22px;">
        ${card(
          twoCol(
            `
            ${sectionBadgeTitle(EMAIL_ICONS.badge_chart_green, 'AI Screening Result', 'Here is your profile match and analysis for the applied position.', { theme: t, badgeSize: 30, titleSize: 16.5 })}
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="112" valign="middle" style="width: 112px; padding: 4px 0;">${renderRingHtml(score, { arc: '#0f5a3c', numColor: ENSIS_GREEN, size: 112 })}</td>
                <td valign="middle" style="padding-left: 8px;">${eligibleBox(meta, meta.candidateMsg, t, 13.5)}</td>
              </tr>
            </table>`,
            `
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-left: 1px solid ${t.border}; padding-left: 12px;">
            ${sectionBadgeTitle(EMAIL_ICONS.badge_crown_green, 'Match Breakdown', "Here's how your profile aligns with the job requirements:", { theme: t, badgeSize: 30, titleSize: 16.5 })}
            ${renderBreakdownBarsHtml(application.screeningResult?.breakdown, t)}
            </td></tr></table>`,
            8,
            49
          ),
          { bg: t.cardBg, border: t.border, pad: '14px 12px 8px 12px' }
        )}
      </td>
    </tr>

    <!-- DISCLAIMER STRIP -->
    <tr>
      <td style="padding: 6px 22px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf5e8" style="background-color: #faf5e8; border: 1px solid #f0e6cc; border-radius: 8px; border-collapse: separate;">
          <tr>
            <td width="36" valign="middle" style="width: 36px; padding: 10px 0 10px 12px;">${renderBadge(EMAIL_ICONS.badge_info_gold, 22, 'i')}</td>
            <td valign="middle" style="padding: 10px 14px 10px 6px; font-family: ${SANS}; font-size: 10.5px; color: ${t.text}; line-height: 1.5;">
              This is a preliminary AI assessment based on the information provided in your application. Final recruitment decisions are made by our authorised recruitment team after a complete review of your application, documents and further evaluation.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- WHAT HAPPENS NEXT -->
    <tr>
      <td style="padding: 14px 22px 6px 22px;">
        ${sectionBadgeTitle(EMAIL_ICONS.badge_gear_green, 'What Happens Next?', undefined, { theme: t, badgeSize: 28, titleSize: 18 })}
        ${stepsRow(
          [
            { icon: EMAIL_ICONS.step_icon_review_green, title: 'Application Review', body: 'Our recruitment team will review your application, qualifications and AI screening report.' },
            { icon: EMAIL_ICONS.step_icon_people_green, title: 'Shortlisting', body: 'Candidates whose profiles align with the requirements may be shortlisted for further evaluation.' },
            { icon: EMAIL_ICONS.step_icon_calendar_green, title: 'Interview & Assessment', body: 'If shortlisted, you will be contacted for an interview (online or in-person).' },
            { icon: EMAIL_ICONS.step_icon_email_green, title: 'Final Communication', body: 'You will receive further updates as the recruitment process progresses.' },
          ],
          t,
          { bg: '#fbf8f1', border: '#efe8d9', titleFont: SERIF, titleColor: '#14241c' }
        )}
      </td>
    </tr>

    <!-- IMPORTANT INFORMATION + ASSISTANCE -->
    <tr>
      <td style="padding: 10px 22px 6px 22px;">
        ${twoCol(
          card(
            `
            ${sectionBadgeTitle(EMAIL_ICONS.badge_info_green, 'Important Information', undefined, { theme: t, badgeSize: 28, titleSize: 15.5 })}
            ${checkList(
              [
                `Your Application ID (${appId}) is your reference number for future correspondence.`,
                'Your AI screening score is a preliminary assessment and does not guarantee selection.',
                'Final recruitment decisions are made by our authorised recruitment team.',
                'Please monitor your registered email address for further updates.',
              ],
              t,
              10,
              15
            )}`,
            { bg: t.cardBg, border: t.border, pad: '14px 14px 8px 14px' }
          ),
          assistanceCard(settings, t, false),
          10,
          57
        )}
      </td>
    </tr>

    <!-- CLOSING -->
    <tr>
      <td style="padding: 12px 26px 26px 26px; ${TD}">
        <div style="font-family: ${SANS}; font-size: 12px; color: ${t.text}; line-height: 1.7;">
          We look forward to the possibility of welcoming you to our team.<br/>
          Warm regards,<br/>
          <strong style="color: #14241c; font-size: 12.5px;">Talent Acquisition Team</strong><br/>
          <strong style="color: #14241c; font-size: 12.5px;">ENSIS – Wellness Furniture for Healthier Spaces</strong>
        </div>
      </td>
    </tr>
  `;

  return resolveIconTokens(pageShell(inner, subject, '#fffdf9'), _options?.isEmailMime ? 'cid' : 'data');
}

// ─────────────────────────────────────────────────────────────────────────────
// HR notification email
// ─────────────────────────────────────────────────────────────────────────────

export async function renderHrNotificationEmailHtml(
  application: ICareerApplication,
  job: ICareer | null,
  _options?: { isEmailMime?: boolean; liveHero?: boolean }
): Promise<string> {
  const t = HR_THEME;
  const settings = await getSafeSettings();
  const candidateName = application.profile?.fullName || application.fullName || 'Candidate';
  const jobTitle = job?.title || application.jobTitle || 'Open Position';
  const appId = application.applicationId || '—';
  const score = scoreOf(application);
  const meta = levelMeta(score === null ? 'unavailable' : application.screeningResult?.level || 'eligible');
  const cv = await resolveCvInfo(application);
  const submittedAt = application.createdAt || new Date();
  const photoUrl = await resolvePhotoUrl(application);
  const editHref = adminApplicationUrl(application);
  const subject = `[HR Notification] New Application Received: ${jobTitle} — ${candidateName}${score === null ? '' : ` (${score}% Match)`}`;

  const heroSrc = CLOUDINARY_HR_HERO;
  const vmlHeroSrc = CLOUDINARY_HR_HERO;

  const highlights =
    application.screeningResult?.strengths && application.screeningResult.strengths.length > 0
      ? application.screeningResult.strengths.slice(0, 6)
      : ['Profile details available in the attached CV and AI analysis.'];

  const email = application.profile?.email || application.email || '';
  const phone = application.profile?.phone || application.phone || '';
  const location = application.profile?.currentLocation || application.currentLocation || '';
  const dob = application.profile?.dateOfBirth ? fmtDate(application.profile.dateOfBirth) : '';
  const gender = application.profile?.gender || '';
  const linkedin = application.profile?.linkedin || '';

  const heroContent = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="hero-text" width="420" valign="top" style="width: 420px; padding: 70px 0 18px 28px; ${TD}">
          <table class="dm-pill" cellpadding="0" cellspacing="0" border="0" bgcolor="#dcefe2" style="background-color: #dcefe2; border-radius: 4px; border-collapse: separate; margin-bottom: 8px;">
            <tr>
              <td class="dm-pill" valign="middle" style="padding: 5px 4px 5px 10px; background-color: #dcefe2;">${renderBadge(EMAIL_ICONS.icon_email, 15)}</td>
              <td class="dm-pill dm-green" valign="middle" style="padding: 5px 10px 5px 6px; background-color: #dcefe2; font-family: ${SANS}; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; color: ${ENSIS_GREEN};">HR NOTIFICATION</td>
            </tr>
          </table>
          <div class="dm-green" style="font-family: ${SERIF}; font-size: 25px; font-weight: 700; line-height: 1.15; color: ${ENSIS_GREEN};">New Application <span class="dm-gold" style="color: ${ENSIS_GOLD};">Received</span></div>
          <div class="dm-blue" style="font-family: ${SANS}; font-size: 12.5px; color: ${t.text}; line-height: 1.35; margin-top: 4px;">Candidate Details, AI Screening Result &amp; Recommendation</div>
          <div class="dm-navy" style="font-family: ${SERIF}; font-size: 13px; font-weight: 700; color: ${t.title}; margin-top: 12px;">Dear HR Team,</div>
          <div class="dm-blue" style="font-family: ${SANS}; font-size: 10.5px; color: ${t.text}; line-height: 1.5; margin-top: 3px; max-width: 410px;">
            We have received a new application through the <strong class="dm-navy" style="color: ${t.value};">ENSIS Careers Portal</strong>.
            Please find below the candidate's profile, AI screening result and analysis. Kindly review the details and take the next steps as per the recruitment process.
          </div>
        </td>
        <td class="hero-spacer" valign="top">&nbsp;</td>
      </tr>
    </table>`;

  const profileRow = (icon: string, html: string, size = 15) => `
    <tr>
      <td width="18" valign="middle" style="width: 18px; padding: 3px 0;">${renderBadge(icon, size)}</td>
      <td width="10" style="width: 10px; font-size: 0; line-height: 0;">&nbsp;</td>
      <td valign="middle" style="padding: 3px 0; font-family: ${SANS}; font-size: 11px; color: ${t.text}; line-height: 1.3;">${html}</td>
    </tr>`;

  const photoHtml = photoUrl
    ? `<img src="${esc(photoUrl)}" alt="${esc(candidateName)}" width="104" height="122" style="display: block; width: 104px; height: 122px; border-radius: 6px; object-fit: cover; border: 0;" />`
    : `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: separate;"><tr><td width="104" height="122" align="center" valign="middle" bgcolor="#1d3a5c" style="width: 104px; height: 122px; background-color: #1d3a5c; border-radius: 6px; color: #ffffff; font-family: ${SERIF}; font-size: 36px; font-weight: 700;">${esc(candidateName.charAt(0).toUpperCase())}</td></tr></table>`;

  const profileCard = card(
    `
    ${sectionBadgeTitle(EMAIL_ICONS.badge_user, 'Candidate Profile', undefined, { theme: t, badgeSize: 30, titleSize: 16, right: editButton(editHref) })}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="104" valign="top" style="width: 104px;">${photoHtml}</td>
        <td width="14" style="width: 14px; font-size: 0; line-height: 0;">&nbsp;</td>
        <td valign="top">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${profileRow(EMAIL_ICONS.icon_user, `<span style="font-family: ${SERIF}; font-size: 13.5px; font-weight: 700; color: ${t.title};">${esc(candidateName)}</span>`)}
            ${email ? profileRow(EMAIL_ICONS.icon_email, `<a href="mailto:${esc(email)}" style="color: ${t.text}; text-decoration: none;">${esc(email)}</a>`) : ''}
            ${phone ? profileRow(EMAIL_ICONS.icon_phone, esc(phone)) : ''}
            ${location ? profileRow(EMAIL_ICONS.icon_location, esc(location)) : ''}
            ${dob || gender ? profileRow(EMAIL_ICONS.icon_calendar, [dob, gender].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')) : ''}
            ${linkedin ? profileRow(EMAIL_ICONS.icon_linkedin, `<a href="${esc(/^https?:/i.test(linkedin) ? linkedin : `https://${linkedin}`)}" style="color: ${t.text}; text-decoration: none;">${esc(linkedin.replace(/^https?:\/\/(www\.)?/, ''))}</a>`) : ''}
          </table>
        </td>
      </tr>
    </table>`,
    { bg: t.cardBg, border: t.border }
  );

  const detailRow = (icon: string, label: string, valueHtml: string, last = false) => {
    const b = last ? '' : `border-bottom: 1px solid #eef0f2;`;
    return `
      <tr>
        <td width="30" valign="middle" style="width: 30px; padding: 7px 0; ${b}">${renderBadge(icon, 17)}</td>
        <td width="100" valign="middle" style="width: 100px; padding: 7px 4px; font-family: ${SANS}; font-size: 10.5px; color: ${t.label}; ${b}">${label}</td>
        <td valign="middle" style="padding: 7px 0 7px 10px; border-left: 1px solid #eef0f2; font-family: ${SANS}; font-size: 11px; font-weight: 700; color: ${t.value}; ${b}">${valueHtml}</td>
      </tr>`;
  };
  const detailsCard = card(
    `
    ${sectionBadgeTitle(EMAIL_ICONS.badge_briefcase_gold, 'Application Details', undefined, { theme: t, badgeSize: 30, titleSize: 16, right: editButton(editHref) })}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${detailRow(EMAIL_ICONS.icon_doc, 'Application ID', esc(appId))}
      ${detailRow(EMAIL_ICONS.icon_cap, 'Position Applied For', esc(jobTitle))}
      ${detailRow(EMAIL_ICONS.icon_calendar, 'Application Date', esc(fmtDateTime(submittedAt)))}
      ${detailRow(EMAIL_ICONS.icon_globe, 'Application Source', 'ENSIS Careers Portal')}
      ${detailRow(
        EMAIL_ICONS.icon_clock,
        'Application Status',
        `<span style="display: block; background-color: #e2f1e6; color: #14532d; border-radius: 5px; padding: 6px 6px; font-size: 10px; font-weight: 600; text-align: center; white-space: nowrap;">${esc(statusText(application.status || 'received', true))}</span>`,
        true
      )}
    </table>`,
    { bg: t.cardBg, border: t.border }
  );

  const screeningCard = card(
    `
    ${sectionBadgeTitle(EMAIL_ICONS.badge_chart, 'AI Screening Result', "Here is the candidate's profile match and analysis based on the job requirements.", { theme: t, badgeSize: 30, titleSize: 16 })}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="114" valign="middle" style="width: 114px; padding: 2px 0;">${renderRingHtml(score, { arc: '#0d4f3a', accent: ENSIS_GOLD, numColor: '#1f3f8a', size: 114 })}</td>
        <td valign="middle" style="padding-left: 8px;">${eligibleBox(meta, meta.hrMsg, t, 13.5)}</td>
      </tr>
    </table>`,
    { bg: t.cardBg, border: t.border }
  );

  const breakdownCard = card(
    `
    ${sectionBadgeTitle(EMAIL_ICONS.badge_crown, 'Match Breakdown', "Here's how the candidate's profile aligns with the key requirements:", { theme: t, badgeSize: 30, titleSize: 16 })}
    ${renderBreakdownBarsHtml(application.screeningResult?.breakdown, t)}`,
    { bg: t.cardBg, border: t.border, pad: '14px 14px 4px 14px' }
  );

  const highlightsCard = card(
    `
    ${sectionBadgeTitle(EMAIL_ICONS.badge_bulb, 'Key Highlights', undefined, { theme: t, badgeSize: 30, titleSize: 16, inlineNote: '(from CV & AI Analysis)' })}
    <div style="padding-left: 8px;">${checkList(highlights, t, 11, 18)}</div>`,
    { bg: t.cardBg, border: t.border }
  );

  const downloadStyle = `display: inline-block; background-color: ${ENSIS_GREEN}; color: #ffffff; text-decoration: none; padding: 9px 14px; border-radius: 4px; font-family: ${SANS}; font-size: 11px; font-weight: 700; white-space: nowrap;`;
  const downloadInner = `<span style="font-size: 13px; line-height: 1;">&#8681;</span>&nbsp;&nbsp;Download CV`;
  const resumeCard = card(
    `
    ${sectionBadgeTitle(EMAIL_ICONS.badge_doc_gold, 'Resume & Documents', undefined, { theme: t, badgeSize: 30, titleSize: 16 })}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle" style="padding-right: 10px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #ece7dc; border-radius: 6px; border-collapse: separate;">
            <tr>
              <td width="44" valign="middle" style="width: 44px; padding: 8px 0 8px 10px;">${renderBadge(EMAIL_ICONS.pdf_badge, 34, 'PDF')}</td>
              <td valign="middle" style="padding: 8px 10px 8px 4px; ${TD}">
                <div style="font-family: ${SANS}; font-size: 11.5px; font-weight: 700; color: ${t.value}; word-break: break-all;">${esc(cv.fileName)}</div>
                <div style="font-family: ${SANS}; font-size: 9.5px; color: ${t.text}; margin-top: 3px;">${[formatFileSize(cv.size), fmtDateTime(submittedAt)].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ')}</div>
              </td>
            </tr>
          </table>
        </td>
        <td width="112" align="right" valign="middle" style="width: 112px;">
          ${cv.downloadUrl ? `<a href="${esc(cv.downloadUrl)}" style="${downloadStyle}">${downloadInner}</a>` : `<span style="${downloadStyle}">${downloadInner}</span>`}
        </td>
      </tr>
    </table>`,
    { bg: t.cardBg, border: t.border }
  );

  const recommendationCard = card(
    `
    ${sectionBadgeTitle(EMAIL_ICONS.badge_star, 'AI Recommendation', undefined, { theme: t, badgeSize: 30, titleSize: 16 })}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${meta.boxBg}" style="background-color: ${meta.boxBg}; border-radius: 8px; border-collapse: separate;">
      <tr>
        <td width="74" align="center" valign="middle" style="width: 74px; padding: 12px 0 12px 10px;">
          <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: separate;"><tr><td width="56" height="56" align="center" valign="middle" bgcolor="#dcece1" style="width: 56px; height: 56px; background-color: #dcece1; border-radius: 50%;">${iconImg(EMAIL_ICONS.badge_people_teal, 34, '', 'display: inline-block;')}</td></tr></table>
        </td>
        <td valign="middle" style="padding: 12px 12px 12px 8px; ${TD}">
          <div style="font-family: ${SERIF}; font-size: 15px; font-weight: 700; color: ${t.title}; margin-bottom: 4px;">${esc(meta.recTitle)}</div>
          <div style="font-family: ${SANS}; font-size: 10.5px; color: ${t.text}; line-height: 1.45;">${esc(meta.recText)}</div>
        </td>
      </tr>
    </table>`,
    { bg: t.cardBg, border: t.border }
  );

  const nextStepsCard = card(
    `
    ${sectionBadgeTitle(EMAIL_ICONS.badge_gear, 'Suggested Next Steps for HR', undefined, { theme: t, badgeSize: 30, titleSize: 16 })}
    ${stepsRow(
      [
        { icon: EMAIL_ICONS.step_icon_review, title: 'Review Application', body: "Go through the candidate's profile, CV and AI analysis in detail." },
        { icon: EMAIL_ICONS.step_icon_people, title: 'Shortlisting Decision', body: 'Mark as shortlisted or not shortlisted in the recruitment system.' },
        { icon: EMAIL_ICONS.step_icon_calendar, title: 'Schedule Interview', body: 'If shortlisted, coordinate for initial interview (phone / video / in-person).' },
        { icon: EMAIL_ICONS.step_icon_email, title: 'Update Candidate', body: 'Share the status with the candidate via email through the system.' },
      ],
      t,
      { bg: '#ffffff', border: '#ebe5d9', titleFont: SANS, titleColor: '#1d3f75' }
    )}`,
    { bg: t.cardBg, border: t.border }
  );

  const importantCard = card(
    `
    ${sectionBadgeTitle(EMAIL_ICONS.badge_info_blue, 'Important Note', undefined, { theme: t, badgeSize: 30, titleSize: 16 })}
    <div style="padding-left: 4px;">${checkList(
      [
        'The AI screening score is a preliminary assessment and does not guarantee selection.',
        'Final shortlisting and recruitment decisions are to be made by the HR team.',
        "Please verify the candidate's qualifications, experience and documents as per company policy.",
        'Keep the candidate updated through the recruitment system.',
      ],
      t,
      10,
      16
    )}</div>`,
    { bg: '#f3f7fd', border: '#e1e9f5', pad: '14px 14px 8px 14px' }
  );

  const inner = `
    ${
      _options?.liveHero
        ? heroCell(heroSrc, vmlHeroSrc, 262, '#fffdf9', heroContent)
        : heroImageRow(EMAIL_ICONS.hero_hr, 'HR Notification – New Application Received. Candidate Details, AI Screening Result & Recommendation.', '#fffdf9')
    }
    <tr><td style="padding: 10px 16px 5px 16px;">${twoCol(profileCard, detailsCard, 10)}</td></tr>
    <tr><td style="padding: 5px 16px;">${twoCol(screeningCard, breakdownCard, 10)}</td></tr>
    <tr><td style="padding: 5px 16px;">${twoCol(
      highlightsCard,
      `${resumeCard}<div style="height: 8px; line-height: 8px; font-size: 0;">&nbsp;</div>${recommendationCard}`,
      10
    )}</td></tr>
    <tr><td style="padding: 5px 16px;">${nextStepsCard}</td></tr>
    <tr><td style="padding: 5px 16px 18px 16px;">${twoCol(importantCard, assistanceCard(settings, t, true), 10, 59)}</td></tr>
  `;

  return resolveIconTokens(pageShell(inner, subject, '#fffdf9'), _options?.isEmailMime ? 'cid' : 'data');
}

/**
 * Send Candidate Confirmation Email
 */
export async function sendCandidateConfirmationEmail(
  application: ICareerApplication,
  job: ICareer | null
): Promise<void> {
  const toEmail = application.profile?.email || application.email;
  if (!toEmail) return;

  const jobTitle = job?.title || application.jobTitle || 'Open Position';
  const subject = `Application Received: ${jobTitle} — ${application.applicationId || 'ENSIS'}`;
  const html = await renderCandidateConfirmationEmailHtml(application, job, { isEmailMime: true });

  const attachments: any[] = collectIconAttachments(html);
  try {
    await sendEmail(
      toEmail,
      subject,
      `Your application for ${jobTitle} (ID: ${application.applicationId}) has been received by ENSIS.`,
      html,
      attachments
    );
  } catch (err) {
    console.error('[Career Email] Failed to send candidate confirmation:', (err as Error).message);
    throw err;
  }
}

/**
 * Send HR Notification Email
 */
export async function sendHrNotificationEmail(
  application: ICareerApplication,
  job: ICareer | null
): Promise<void> {
  const settings = await getSafeSettings();
  const recipients =
    settings.hrEmails && settings.hrEmails.length > 0 ? settings.hrEmails : ['careers@ensis.in'];
  const candidateName = application.profile?.fullName || application.fullName || 'Candidate';
  const jobTitle = job?.title || application.jobTitle || 'Open Position';
  const score = scoreOf(application);
  const level = application.screeningResult?.level || 'eligible';
  const levelText = level === 'eligible' ? 'ELIGIBLE' : level === 'partial' ? 'PARTIAL MATCH' : 'NOT ELIGIBLE';

  const subject = `[New Application] ${jobTitle} — ${candidateName}${score === null ? '' : ` (${score}% ${levelText})`}`;
  const html = await renderHrNotificationEmailHtml(application, job, { isEmailMime: true });

  const attachments: any[] = collectIconAttachments(html);
  try {
    // One message to all HR recipients: the ~0.8 MB of inline images is uploaded once, not per person
    await sendEmail(
      recipients.join(', '),
      subject,
      `New application received for ${jobTitle} from ${candidateName}.`,
      html,
      attachments
    );
  } catch (err) {
    console.error('[Career Email] Failed to send HR notification email:', (err as Error).message);
    throw err;
  }
}

/**
 * Send candidate status update email (shortlisted, interview, hired, rejected)
 */
export async function sendCandidateStatusUpdateEmail(
  application: ICareerApplication,
  job: ICareer,
  newStatus: string,
  note?: string,
  interviewDetails?: any
): Promise<void> {
  try {
    const toEmail = application.profile?.email || application.email;
    if (!toEmail) return;
    const candidateName = application.profile?.fullName || application.fullName || 'Candidate';
    const jobTitle = job?.title || application.jobTitle || 'Open Position';

    let statusTitle = 'Application Status Update';
    let statusMessage = '';

    if (newStatus === 'shortlisted') {
      statusTitle = 'Congratulations! You Have Been Shortlisted';
      statusMessage = `We are pleased to inform you that your application for <strong>${jobTitle}</strong> has been shortlisted. Our HR team will reach out to you shortly with next steps.`;
    } else if (newStatus === 'interview_scheduled') {
      statusTitle = 'Interview Scheduled';
      statusMessage = `Your interview for the role of <strong>${jobTitle}</strong> has been scheduled.
        ${interviewDetails?.date ? `<br><strong>Date:</strong> ${interviewDetails.date}` : ''}
        ${interviewDetails?.time ? `<br><strong>Time:</strong> ${interviewDetails.time}` : ''}
        ${interviewDetails?.mode ? `<br><strong>Mode:</strong> ${interviewDetails.mode}` : ''}
        ${interviewDetails?.linkOrLocation ? `<br><strong>Details:</strong> ${interviewDetails.linkOrLocation}` : ''}
        ${interviewDetails?.instructions ? `<br><strong>Instructions:</strong> ${interviewDetails.instructions}` : ''}
      `;
    } else if (newStatus === 'hired') {
      statusTitle = 'Welcome to Ensis!';
      statusMessage = `We are delighted to extend our congratulations on your selection for the position of <strong>${jobTitle}</strong> at ENSIS. Our team will share the formal offer and onboarding details.`;
    } else if (newStatus === 'rejected') {
      statusTitle = 'Update on Your Application';
      statusMessage = `Thank you for taking the time to apply for the position of <strong>${jobTitle}</strong> at ENSIS. While we were impressed with your qualifications, we have decided to proceed with other candidates whose experience more closely matches our current requirements. We will keep your resume in our talent network for future opportunities.`;
    } else {
      statusMessage = `Your application status for <strong>${jobTitle}</strong> has been updated to: <strong>${newStatus}</strong>.`;
    }

    const subject = `${statusTitle} — ${jobTitle} (${application.applicationId})`;

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
