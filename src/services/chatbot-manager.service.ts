import {
  ChatbotConfigModel,
  CHATBOT_CONFIG_SECTIONS,
  ChatbotConfigSection,
  IChatbotConfigVersion,
} from '../models/chatbot-config.model';
import { AppError } from '../utils/app-error';

const MAX_SECTION_JSON = 500_000;
const KEEP_SNAPSHOTS = 20;

/** The single config document, created on first use */
const getConfigDoc = () =>
  ChatbotConfigModel.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

/** Newest first, without the snapshots */
const versionList = (versions: IChatbotConfigVersion[] = []) =>
  [...versions]
    .sort((a, b) => b.minor - a.minor)
    .map((v) => ({ minor: v.minor, note: v.note, by: v.by, date: v.date }));

/** How many items differ between draft and live (lists by id or position, anything else as one) */
const changedCount = (draft: unknown, live: unknown): number => {
  if (draft === undefined) return 0;
  if (Array.isArray(draft) || Array.isArray(live)) {
    const a = Array.isArray(draft) ? draft : [];
    const b = Array.isArray(live) ? live : [];
    const key = (x: any, i: number) => String(x?.id ?? x?._id ?? i);
    const liveById = new Map(b.map((x, i) => [key(x, i), JSON.stringify(x)]));
    const draftIds = new Set(a.map(key));
    const changed = a.filter((x, i) => liveById.get(key(x, i)) !== JSON.stringify(x)).length;
    const removed = b.filter((x, i) => !draftIds.has(key(x, i))).length;
    return changed + removed;
  }
  if (draft && typeof draft === 'object') {
    const d = draft as Record<string, unknown>;
    const l = (live || {}) as Record<string, unknown>;
    return Object.keys(d).filter((k) => JSON.stringify(d[k]) !== JSON.stringify(l[k])).length;
  }
  return JSON.stringify(draft) === JSON.stringify(live) ? 0 : 1;
};

export const getManagerService = async () => {
  const doc = await getConfigDoc();
  const draft = doc.draft || {};
  const live = doc.published || {};
  return {
    draft,
    pending: !!doc.pending,
    versions: versionList(doc.versions),
    changes: {
      buttons: changedCount(draft.buttons, live.buttons),
      answers: changedCount(draft.answers, live.answers),
      // Knowledge sources are not part of the Ensis chatbot yet
      sources: 0,
      forms: changedCount(draft.forms, live.forms) + changedCount(draft.rules, live.rules),
      settings: changedCount(draft.settings, live.settings),
    },
    ai: {
      configured: !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY),
      model: process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : process.env.GEMINI_API_KEY ? 'gemini-flash-lite-latest' : '',
    },
  };
};

export const saveDraftSectionService = async (section: string, data: unknown) => {
  if (!CHATBOT_CONFIG_SECTIONS.includes(section as ChatbotConfigSection)) {
    throw new AppError(400, 'Unknown section');
  }
  if (data === undefined) throw new AppError(400, 'data is required');
  if (JSON.stringify(data).length > MAX_SECTION_JSON) throw new AppError(400, 'This section is too large');

  const doc = await getConfigDoc();
  doc.set(`draft.${section}`, data);
  doc.markModified('draft');
  doc.pending = true;
  await doc.save();
  return { pending: true };
};

export const publishManagerService = async (note: string, by: string) => {
  const doc = await getConfigDoc();
  const minor = Math.max(0, ...(doc.versions || []).map((v) => v.minor)) + 1;
  doc.published = JSON.parse(JSON.stringify(doc.draft || {}));
  doc.markModified('published');
  doc.pending = false;
  doc.versions.push({
    minor,
    note: note.trim().slice(0, 300) || 'Published changes',
    by,
    date: new Date(),
    snapshot: doc.published,
  });

  // Older versions stay in the history without their (large) snapshot
  const keep = new Set(
    [...doc.versions].sort((a, b) => b.minor - a.minor).slice(0, KEEP_SNAPSHOTS).map((v) => v.minor)
  );
  doc.versions.forEach((v) => {
    if (!keep.has(v.minor)) v.snapshot = undefined;
  });
  doc.markModified('versions');
  await doc.save();
  return { versions: versionList(doc.versions), pending: false };
};

export const restoreVersionService = async (minor: number) => {
  const doc = await getConfigDoc();
  const version = doc.versions.find((v) => v.minor === minor);
  if (!version?.snapshot) throw new AppError(400, 'This version can no longer be restored.');
  doc.draft = JSON.parse(JSON.stringify(version.snapshot));
  doc.markModified('draft');
  doc.pending = true;
  await doc.save();
  return { draft: doc.draft, pending: true };
};

/** Published settings the website chatbot may read */
export const getPublishedConfigService = async () => {
  const doc = await getConfigDoc();
  return doc.published || {};
};

/** Unpublished draft, used by the admin "Test Reply" */
export const getDraftConfigService = async () => {
  const doc = await getConfigDoc();
  return doc.draft || {};
};
