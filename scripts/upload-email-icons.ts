import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dn34qdd2q',
  api_key: process.env.CLOUDINARY_API_KEY || '919292836798442',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'dXj7_Mr8Y-1QDtl7D0bzCYAJ0iQ',
});

const ENSIS_GREEN = '#0f3d2e';
const BAR_GREEN = '#0e6b45';
const ENSIS_GOLD = '#c5922e';
const INFO_BLUE = '#0284c7';

// Map of icon SVGs to generate
const ICONS_SVG: Record<string, { svg: string; width: number; height: number }> = {
  // Circular Section Badges (white icon on colored circle)
  badge_user: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${ENSIS_GOLD}"/>
      <circle cx="32" cy="24" r="10" fill="#ffffff"/>
      <path d="M14 50 C14 38, 22 36, 32 36 C42 36, 50 38, 50 50 Z" fill="#ffffff"/>
    </svg>`,
  },
  badge_briefcase_gold: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${ENSIS_GOLD}"/>
      <rect x="15" y="24" width="34" height="24" rx="4" fill="#ffffff"/>
      <path d="M23 24 V19 C23 16.8 24.8 15 27 15 H37 C39.2 15 41 16.8 41 19 V24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M15 32 H49 M29 32 V36 H35 V32" stroke="${ENSIS_GOLD}" stroke-width="2.5" fill="none"/>
    </svg>`,
  },
  badge_doc_green: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${BAR_GREEN}"/>
      <path d="M20 16 H36 L44 24 V48 H20 Z" fill="#ffffff"/>
      <path d="M36 16 V24 H44" fill="${BAR_GREEN}" opacity="0.3"/>
      <line x1="25" y1="30" x2="39" y2="30" stroke="${BAR_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="25" y1="36" x2="39" y2="36" stroke="${BAR_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="25" y1="42" x2="33" y2="42" stroke="${BAR_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },
  badge_chart: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${BAR_GREEN}"/>
      <rect x="18" y="34" width="6" height="15" rx="2" fill="#ffffff"/>
      <rect x="29" y="25" width="6" height="24" rx="2" fill="#ffffff"/>
      <rect x="40" y="16" width="6" height="33" rx="2" fill="#ffffff"/>
    </svg>`,
  },
  badge_crown: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${BAR_GREEN}"/>
      <path d="M16 43 L20 22 L28 32 L32 18 L36 32 L44 22 L48 43 Z" fill="#ffffff"/>
      <circle cx="32" cy="46" r="2" fill="${BAR_GREEN}"/>
    </svg>`,
  },
  badge_bulb: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${ENSIS_GOLD}"/>
      <path d="M32 15 C24.3 15 18 21.3 18 29 C18 34.2 21.2 38.6 25 41 V45 C25 46 26 47 27 47 H37 C38 47 39 46 39 45 V41 C42.8 38.6 46 34.2 46 29 C46 21.3 39.7 15 32 15 Z" fill="#ffffff"/>
      <line x1="28" y1="50" x2="36" y2="50" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  badge_doc_gold: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${ENSIS_GOLD}"/>
      <path d="M20 16 H36 L44 24 V48 H20 Z" fill="#ffffff"/>
      <path d="M36 16 V24 H44" fill="${ENSIS_GOLD}" opacity="0.3"/>
      <line x1="25" y1="30" x2="39" y2="30" stroke="${ENSIS_GOLD}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="25" y1="36" x2="39" y2="36" stroke="${ENSIS_GOLD}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="25" y1="42" x2="33" y2="42" stroke="${ENSIS_GOLD}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },
  badge_star: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${ENSIS_GOLD}"/>
      <polygon points="32,15 37,26 49,27 40,35 43,47 32,41 21,47 24,35 15,27 27,26" fill="#ffffff"/>
    </svg>`,
  },
  badge_gear: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${ENSIS_GOLD}"/>
      <circle cx="32" cy="32" r="16" fill="none" stroke="#ffffff" stroke-width="6"/>
      <circle cx="32" cy="32" r="6" fill="#ffffff"/>
      <line x1="32" y1="12" x2="32" y2="17" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="32" y1="47" x2="32" y2="52" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="12" y1="32" x2="17" y2="32" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="47" y1="32" x2="52" y2="32" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="18" y1="18" x2="22" y2="22" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="42" y1="42" x2="46" y2="46" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="18" y1="46" x2="22" y2="42" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
      <line x1="42" y1="22" x2="46" y2="18" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  },
  badge_info_blue: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${INFO_BLUE}"/>
      <circle cx="32" cy="21" r="3.5" fill="#ffffff"/>
      <rect x="29" y="28" width="6" height="18" rx="2.5" fill="#ffffff"/>
    </svg>`,
  },
  badge_info_green: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${BAR_GREEN}"/>
      <circle cx="32" cy="21" r="3.5" fill="#ffffff"/>
      <rect x="29" y="28" width="6" height="18" rx="2.5" fill="#ffffff"/>
    </svg>`,
  },
  badge_headset: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${ENSIS_GREEN}"/>
      <path d="M18 34 C18 24 24 16 32 16 C40 16 46 24 46 34" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="15" y="32" width="6" height="12" rx="3" fill="#ffffff"/>
      <rect x="43" y="32" width="6" height="12" rx="3" fill="#ffffff"/>
      <path d="M44 42 C44 47 38 48 35 48" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <circle cx="34" cy="48" r="2.5" fill="#ffffff"/>
    </svg>`,
  },

  // Row Field Icons (24x24) in ENSIS Green (#0f3d2e / #0e6b45)
  icon_user: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="11" r="5" fill="${ENSIS_GREEN}"/>
      <path d="M7 26 C7 20 11 18 16 18 C21 18 25 20 25 26 Z" fill="${ENSIS_GREEN}"/>
    </svg>`,
  },
  icon_email: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="24" height="16" rx="3" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5"/>
      <path d="M4 10 L16 19 L28 10" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },
  icon_phone: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 6 C8 5 9 4 10 4 L14 4 C15 4 15.8 4.6 16 5.5 L17 9 C17.2 9.8 16.8 10.6 16 11 L14.5 12 C16 15 17 16 20 17.5 L21 16 C21.4 15.2 22.2 14.8 23 15 L26.5 16 C27.4 16.2 28 17 28 18 L28 22 C28 23 27 24 26 24 C16 24 8 16 8 6 Z" fill="${ENSIS_GREEN}"/>
    </svg>`,
  },
  icon_location: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4 C11 4 7 8 7 13 C7 19.5 16 28 16 28 C16 28 25 19.5 25 13 C25 8 21 4 16 4 Z" fill="${ENSIS_GREEN}"/>
      <circle cx="16" cy="12" r="3.5" fill="#ffffff"/>
    </svg>`,
  },
  icon_calendar: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="7" width="22" height="19" rx="3" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5"/>
      <line x1="5" y1="13" x2="27" y2="13" stroke="${ENSIS_GREEN}" stroke-width="2"/>
      <line x1="10" y1="4" x2="10" y2="9" stroke="${ENSIS_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="22" y1="4" x2="22" y2="9" stroke="${ENSIS_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="11" cy="18" r="1.5" fill="${ENSIS_GREEN}"/>
      <circle cx="16" cy="18" r="1.5" fill="${ENSIS_GREEN}"/>
      <circle cx="21" cy="18" r="1.5" fill="${ENSIS_GREEN}"/>
      <circle cx="11" cy="22" r="1.5" fill="${ENSIS_GREEN}"/>
      <circle cx="16" cy="22" r="1.5" fill="${ENSIS_GREEN}"/>
    </svg>`,
  },
  icon_linkedin: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="24" rx="4" fill="#0a66c2"/>
      <circle cx="10" cy="10" r="2" fill="#ffffff"/>
      <rect x="8.5" y="13.5" width="3" height="10" fill="#ffffff"/>
      <path d="M14.5 13.5 H17.5 V15 C18.2 13.8 19.5 13.2 21 13.2 C23.5 13.2 24.5 14.8 24.5 17.5 V23.5 H21.5 V18 C21.5 16.5 21 15.5 19.8 15.5 C18.5 15.5 17.5 16.5 17.5 18 V23.5 H14.5 Z" fill="#ffffff"/>
    </svg>`,
  },
  icon_doc: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5 H18 L24 11 V27 H8 Z" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M18 5 V11 H24" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2"/>
      <line x1="12" y1="16" x2="20" y2="16" stroke="${ENSIS_GREEN}" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="20" x2="20" y2="20" stroke="${ENSIS_GREEN}" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  icon_cap: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,6 28,12 16,18 4,12" fill="${ENSIS_GREEN}"/>
      <path d="M8 14.5 V21 C8 24 11.5 26 16 26 C20.5 26 24 24 24 21 V14.5" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5"/>
      <path d="M26 13 V22" stroke="${ENSIS_GREEN}" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  icon_briefcase: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="11" width="22" height="16" rx="3" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5"/>
      <path d="M11 11 V8 C11 6.8 12 6 13.2 6 H18.8 C20 6 21 6.8 21 8 V11" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5"/>
      <line x1="5" y1="17" x2="27" y2="17" stroke="${ENSIS_GREEN}" stroke-width="2"/>
    </svg>`,
  },
  icon_globe: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="11" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5"/>
      <line x1="5" y1="16" x2="27" y2="16" stroke="${ENSIS_GREEN}" stroke-width="2"/>
      <ellipse cx="16" cy="16" rx="5" ry="11" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2"/>
    </svg>`,
  },
  icon_clock: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="11" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5"/>
      <polyline points="16,10 16,16 20,18" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },
  icon_people: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="11" r="4" fill="${ENSIS_GREEN}"/>
      <path d="M5 24 C5 19 8 18 12 18 C16 18 19 19 19 24 Z" fill="${ENSIS_GREEN}"/>
      <circle cx="21" cy="11" r="3" fill="${ENSIS_GREEN}" opacity="0.8"/>
      <path d="M19 19 C20 18 22 18 24 19 C26 20 27 22 27 24 H19 Z" fill="${ENSIS_GREEN}" opacity="0.8"/>
    </svg>`,
  },
  icon_leaf: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 6 C17 6 7 14 7 24 C17 24 26 15 26 6 Z" fill="${ENSIS_GREEN}"/>
      <path d="M7 24 L16 15" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  icon_target: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="11" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="6" fill="none" stroke="${ENSIS_GREEN}" stroke-width="2"/>
      <circle cx="16" cy="16" r="2.5" fill="${ENSIS_GREEN}"/>
    </svg>`,
  },
  check_circle_green: {
    width: 32,
    height: 32,
    svg: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${BAR_GREEN}"/>
      <polyline points="10,16 14,20 22,12" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  check_circle_gold: {
    width: 48,
    height: 48,
    svg: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="${ENSIS_GOLD}"/>
      <polyline points="14,24 21,31 34,18" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  lotus_gold: {
    width: 48,
    height: 32,
    svg: `<svg width="48" height="32" viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4 C24 16 28 26 34 26 C28 26 24 20 24 4 Z" fill="${ENSIS_GOLD}"/>
      <path d="M24 4 C24 16 20 26 14 26 C20 26 24 20 24 4 Z" fill="${ENSIS_GOLD}"/>
      <path d="M24 10 C24 20 34 28 42 24 C34 24 27 20 24 10 Z" fill="${ENSIS_GOLD}" opacity="0.8"/>
      <path d="M24 10 C24 20 14 28 6 24 C14 24 21 20 24 10 Z" fill="${ENSIS_GOLD}" opacity="0.8"/>
    </svg>`,
  },
  pdf_badge: {
    width: 36,
    height: 42,
    svg: `<svg width="36" height="42" viewBox="0 0 36 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2 H24 L32 10 V38 C32 39 31 40 30 40 H4 C3 40 2 39 2 38 V4 C2 3 3 2 4 2 Z" fill="#e11d48"/>
      <path d="M24 2 V10 H32" fill="#be123c"/>
      <text x="17" y="27" font-family="-apple-system, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">PDF</text>
    </svg>`,
  },
  download_icon: {
    width: 24,
    height: 24,
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4 V14 M8 10 L12 14 L16 10" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M4 17 V18 C4 19 5 20 6 20 H18 C19 20 20 19 20 18 V17" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`,
  },
  badge_people_teal: {
    width: 64,
    height: 64,
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#115e59"/>
      <circle cx="32" cy="22" r="6" fill="#ffffff"/>
      <path d="M20 44 C20 36 25 34 32 34 C39 34 44 36 44 44 Z" fill="#ffffff"/>
      <circle cx="19" cy="25" r="4.5" fill="#ffffff" opacity="0.8"/>
      <path d="M12 44 C12 38 15 37 19 37 C21 37 22.5 37.5 24 38.5 C22.5 40 21.5 42 21.5 44 Z" fill="#ffffff" opacity="0.8"/>
      <circle cx="45" cy="25" r="4.5" fill="#ffffff" opacity="0.8"/>
      <path d="M52 44 C52 38 49 37 45 37 C43 37 41.5 37.5 40 38.5 C41.5 40 42.5 42 42.5 44 Z" fill="#ffffff" opacity="0.8"/>
    </svg>`,
  },

  // Steps Badges (Numbered gold circles)
  step_num_1: {
    width: 48,
    height: 48,
    svg: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="${ENSIS_GOLD}"/>
      <text x="24" y="32" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">1</text>
    </svg>`,
  },
  step_num_2: {
    width: 48,
    height: 48,
    svg: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="${ENSIS_GOLD}"/>
      <text x="24" y="32" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">2</text>
    </svg>`,
  },
  step_num_3: {
    width: 48,
    height: 48,
    svg: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="${ENSIS_GOLD}"/>
      <text x="24" y="32" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">3</text>
    </svg>`,
  },
  step_num_4: {
    width: 48,
    height: 48,
    svg: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="${ENSIS_GOLD}"/>
      <text x="24" y="32" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">4</text>
    </svg>`,
  },

  // Steps illustration icons
  step_icon_review: {
    width: 48,
    height: 48,
    svg: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="24" height="34" rx="4" fill="none" stroke="${BAR_GREEN}" stroke-width="3"/>
      <line x1="14" y1="14" x2="26" y2="14" stroke="${BAR_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="14" y1="20" x2="26" y2="20" stroke="${BAR_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="14" y1="26" x2="20" y2="26" stroke="${BAR_GREEN}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="30" cy="32" r="6" fill="#ffffff" stroke="${ENSIS_GOLD}" stroke-width="3"/>
      <line x1="34" y1="36" x2="40" y2="42" stroke="${ENSIS_GOLD}" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`,
  },
  step_icon_people: {
    width: 48,
    height: 48,
    svg: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="15" r="6" fill="${BAR_GREEN}"/>
      <path d="M12 36 C12 28 17 26 24 26 C31 26 36 28 36 36 Z" fill="${BAR_GREEN}"/>
      <circle cx="35" cy="18" r="4.5" fill="${ENSIS_GOLD}"/>
      <path d="M33 36 C34.5 31 38 30 42 30 C44 30 45 31 46 32 C46 34 46 36 46 36 Z" fill="${ENSIS_GOLD}"/>
      <circle cx="13" cy="18" r="4.5" fill="${ENSIS_GOLD}"/>
      <path d="M15 36 C13.5 31 10 30 6 30 C4 30 3 31 2 32 C2 34 2 36 2 36 Z" fill="${ENSIS_GOLD}"/>
    </svg>`,
  },
  step_icon_calendar: {
    width: 48,
    height: 48,
    svg: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="10" width="32" height="28" rx="4" fill="none" stroke="${BAR_GREEN}" stroke-width="3"/>
      <line x1="8" y1="18" x2="40" y2="18" stroke="${BAR_GREEN}" stroke-width="2.5"/>
      <line x1="16" y1="6" x2="16" y2="12" stroke="${ENSIS_GOLD}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="32" y1="6" x2="32" y2="12" stroke="${ENSIS_GOLD}" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="16" cy="25" r="2.5" fill="${BAR_GREEN}"/>
      <circle cx="24" cy="25" r="2.5" fill="${BAR_GREEN}"/>
      <circle cx="32" cy="25" r="2.5" fill="${BAR_GREEN}"/>
      <circle cx="16" cy="32" r="2.5" fill="${BAR_GREEN}"/>
      <circle cx="24" cy="32" r="2.5" fill="${BAR_GREEN}"/>
    </svg>`,
  },
  step_icon_email: {
    width: 48,
    height: 48,
    svg: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="12" width="36" height="24" rx="4" fill="none" stroke="${BAR_GREEN}" stroke-width="3"/>
      <path d="M6 14 L24 28 L42 14" fill="none" stroke="${ENSIS_GOLD}" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  arrow_step: {
    width: 24,
    height: 24,
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <polyline points="9,6 15,12 9,18" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // 85% Match Ring (rendered as complete crisp circular PNG badge)
  ring_85_green: {
    width: 140,
    height: 140,
    svg: `<svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="70" r="56" fill="#ffffff" stroke="#e8ede9" stroke-width="12"/>
      <circle cx="70" cy="70" r="56" fill="none" stroke="${BAR_GREEN}" stroke-width="12" stroke-dasharray="351.85" stroke-dashoffset="52.78" stroke-linecap="round" transform="rotate(-90 70 70)"/>
      <text x="70" y="73" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="32" font-weight="800" fill="${ENSIS_GREEN}">85%</text>
      <text x="70" y="90" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="9.5" font-weight="700" fill="#64748b" letter-spacing="0.5">MATCH SCORE</text>
    </svg>`,
  },
};

async function main() {
  console.log('Generating PNG icons and uploading to Cloudinary...');
  const uploadedUrls: Record<string, string> = {};

  for (const [name, def] of Object.entries(ICONS_SVG)) {
    try {
      const pngBuffer = await sharp(Buffer.from(def.svg), { density: 300 })
        .resize(def.width * 2, def.height * 2) // 2x resolution for retina displays
        .png({ quality: 100 })
        .toBuffer();

      const uploadRes = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'ensis/career-email/icons',
            public_id: name,
            overwrite: true,
            resource_type: 'image',
          },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
        stream.end(pngBuffer);
      });

      uploadedUrls[name] = uploadRes.secure_url;
      console.log(`Uploaded ${name} -> ${uploadRes.secure_url}`);
    } catch (err) {
      console.error(`Failed to generate/upload ${name}:`, err);
    }
  }

  console.log('\n--- UPLOADED ASSETS MAP ---');
  console.log(JSON.stringify(uploadedUrls, null, 2));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
