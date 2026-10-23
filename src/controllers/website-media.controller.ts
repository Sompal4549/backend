import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/app.config';
import { UserModel } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';
import { GalleryItemModel, GALLERY_STATUSES } from '../models/gallery-item.model';
import { GalleryMetaModel, GALLERY_META_KEY } from '../models/gallery-meta.model';
import { VideoHighlightModel, VIDEO_HIGHLIGHT_STATUSES } from '../models/video-highlight.model';
import { TestimonialsCarouselModel } from '../models/testimonials-carousel.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { isObjectIdString } from '../utils/object-id';

// Website media for the admin pages Gallery, Video Highlights and Testimonial Videos.
// Contract ported from organic_backend (modules/website/gallery, home/testimonialsCarousel).

const DEFAULT_GALLERY_CATEGORIES = ['Events', 'Projects', 'Team', 'Office'];
const DEFAULT_GALLERY_YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

const GALLERY_FIELDS = [
  'title',
  'year',
  'category',
  'image',
  'imageAlt',
  'uploadedBy',
  'date',
  'time',
  'status',
  'order',
  'size',
] as const;

const VIDEO_HIGHLIGHT_FIELDS = [
  'title',
  'category',
  'videoType',
  'videoUrl',
  'thumbnail',
  'objectPosition',
  'status',
  'order',
  'uploadedBy',
  'date',
  'time',
] as const;

const TESTIMONIAL_VIDEO_FIELDS = [
  '_id',
  'title',
  'location',
  'videoType',
  'videoUrl',
  'thumbnail',
  'showOverlay',
  'overlayGradient',
  'status',
  'author',
  'addedOn',
  'date',
] as const;

// Only known fields are written
const pick = (body: Record<string, unknown> | undefined, fields: readonly string[]) => {
  const data: Record<string, unknown> = {};
  if (!body || typeof body !== 'object') return data;
  for (const field of fields) {
    if (field in body) data[field] = body[field];
  }
  return data;
};

// Public GETs return published items only; a valid admin Bearer token also sees drafts.
const isAdminRequest = async (req: Request): Promise<boolean> => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return false;
  try {
    const payload = jwt.verify(header.split(' ')[1], config.jwtAccessSecret) as { userId?: string };
    if (!payload.userId) return false;
    const user = await UserModel.findById(payload.userId).select('role').lean();
    const role = (user as { role?: string } | null)?.role;
    return role === ROLE.ADMIN || role === ROLE.SUPERADMIN;
  } catch {
    return false;
  }
};

const assertId = (id: string, label: string) => {
  if (!isObjectIdString(id)) throw new AppError(404, `${label} not found`);
};

const parseIds = (body: Record<string, unknown> | undefined): string[] => {
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isObjectIdString)) {
    throw new AppError(400, 'Provide a non-empty array of valid ids in "ids"');
  }
  return ids as string[];
};

// An explicit order is respected; otherwise the new item goes after the current highest
const resolveOrder = async (
  value: unknown,
  findHighest: () => Promise<{ order?: number } | null>
): Promise<number> => {
  const requested = value === undefined || value === null || value === '' ? NaN : Number(value);
  if (Number.isFinite(requested)) return requested;
  const highest = await findHighest();
  return highest && typeof highest.order === 'number' ? highest.order + 1 : 1;
};

const isBlank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((x) => typeof x === 'string');

/* ---------------------------------- Gallery meta ---------------------------------- */

export const getGalleryMeta = asyncHandler(async (_req: Request, res: Response) => {
  const meta = await GalleryMetaModel.findOne({ key: GALLERY_META_KEY }).lean();
  successResponse(
    res,
    {
      categories: meta?.categories?.length ? meta.categories : DEFAULT_GALLERY_CATEGORIES,
      years: meta?.years?.length ? meta.years : DEFAULT_GALLERY_YEARS,
    },
    'Gallery metadata retrieved'
  );
});

export const saveGalleryMeta = asyncHandler(async (req: Request, res: Response) => {
  const update: Record<string, string[]> = {};
  if (isStringList(req.body?.categories)) {
    update.categories = req.body.categories.map((c: string) => c.trim()).filter(Boolean);
  }
  if (isStringList(req.body?.years)) {
    update.years = req.body.years.map((y: string) => y.trim()).filter(Boolean);
  }
  if (Object.keys(update).length === 0) {
    throw new AppError(400, 'Provide "categories" and/or "years" as string arrays');
  }

  const meta = await GalleryMetaModel.findOneAndUpdate(
    { key: GALLERY_META_KEY },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  successResponse(res, { categories: meta.categories, years: meta.years }, 'Gallery metadata saved');
});

/* ---------------------------------- Gallery items --------------------------------- */

// Highest order first = newest upload first (same order in the admin table and the website)
export const getGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const filter = (await isAdminRequest(req)) ? {} : { status: 'Published' };
  const items = await GalleryItemModel.find(filter).sort({ order: -1, createdAt: -1 });
  successResponse(res, items, 'Gallery items retrieved');
});

export const createGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const data = pick(req.body, GALLERY_FIELDS);
  data.order = await resolveOrder(data.order, () =>
    GalleryItemModel.findOne().sort({ order: -1 }).select('order').lean()
  );
  if (isBlank(data.title)) data.title = data.category || 'Photo Asset';
  const item = await GalleryItemModel.create(data);
  successResponse(res, item, 'Gallery item created', 201);
});

export const updateGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  assertId(req.params.id, 'Gallery item');
  const data = pick(req.body, GALLERY_FIELDS);
  // Partial updates (image replace / crop) omit title; only default it when it is sent blank
  if ('title' in data && isBlank(data.title)) data.title = data.category || 'Photo Asset';
  const item = await GalleryItemModel.findByIdAndUpdate(
    req.params.id,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!item) throw new AppError(404, 'Gallery item not found');
  successResponse(res, item, 'Gallery item updated');
});

export const updateGalleryItemStatus = asyncHandler(async (req: Request, res: Response) => {
  assertId(req.params.id, 'Gallery item');
  const status = req.body?.status;
  if (!GALLERY_STATUSES.includes(status)) {
    throw new AppError(400, `Status must be one of: ${GALLERY_STATUSES.join(', ')}`);
  }
  const item = await GalleryItemModel.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!item) throw new AppError(404, 'Gallery item not found');
  successResponse(res, item, 'Gallery item status updated');
});

export const deleteGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  assertId(req.params.id, 'Gallery item');
  const item = await GalleryItemModel.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError(404, 'Gallery item not found');
  successResponse(res, null, 'Gallery item deleted');
});

export const bulkDeleteGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const ids = parseIds(req.body);
  const result = await GalleryItemModel.deleteMany({ _id: { $in: ids } });
  successResponse(res, { deletedCount: result.deletedCount ?? 0 }, 'Gallery items deleted');
});

// Writes several order values in one round trip so a layout swap lands together
export const reorderGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const items = req.body?.items;
  const valid =
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (x) => x && isObjectIdString(x.id) && typeof x.order === 'number' && Number.isFinite(x.order)
    );
  if (!valid) throw new AppError(400, 'Provide a non-empty array of { id, order } in "items"');

  const result = await GalleryItemModel.bulkWrite(
    (items as { id: string; order: number }[]).map(({ id, order }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order } } },
    }))
  );
  successResponse(res, { modifiedCount: result.modifiedCount ?? 0 }, 'Gallery items reordered');
});

/* -------------------------------- Video highlights -------------------------------- */

export const getVideoHighlights = asyncHandler(async (req: Request, res: Response) => {
  const filter = (await isAdminRequest(req)) ? {} : { status: 'Published' };
  const items = await VideoHighlightModel.find(filter).sort({ order: -1, createdAt: -1 });
  successResponse(res, items, 'Video highlights retrieved');
});

export const createVideoHighlight = asyncHandler(async (req: Request, res: Response) => {
  const data = pick(req.body, VIDEO_HIGHLIGHT_FIELDS);
  data.order = await resolveOrder(data.order, () =>
    VideoHighlightModel.findOne().sort({ order: -1 }).select('order').lean()
  );
  if (isBlank(data.title)) data.title = data.category || 'Video Highlight';
  const item = await VideoHighlightModel.create(data);
  successResponse(res, item, 'Video highlight created', 201);
});

export const updateVideoHighlight = asyncHandler(async (req: Request, res: Response) => {
  assertId(req.params.id, 'Video highlight');
  const data = pick(req.body, VIDEO_HIGHLIGHT_FIELDS);
  if ('title' in data && isBlank(data.title)) data.title = data.category || 'Video Highlight';
  const item = await VideoHighlightModel.findByIdAndUpdate(
    req.params.id,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!item) throw new AppError(404, 'Video highlight not found');
  successResponse(res, item, 'Video highlight updated');
});

export const updateVideoHighlightStatus = asyncHandler(async (req: Request, res: Response) => {
  assertId(req.params.id, 'Video highlight');
  const status = req.body?.status;
  if (!VIDEO_HIGHLIGHT_STATUSES.includes(status)) {
    throw new AppError(400, `Status must be one of: ${VIDEO_HIGHLIGHT_STATUSES.join(', ')}`);
  }
  const item = await VideoHighlightModel.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!item) throw new AppError(404, 'Video highlight not found');
  successResponse(res, item, 'Video highlight status updated');
});

export const deleteVideoHighlight = asyncHandler(async (req: Request, res: Response) => {
  assertId(req.params.id, 'Video highlight');
  const item = await VideoHighlightModel.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError(404, 'Video highlight not found');
  successResponse(res, null, 'Video highlight deleted');
});

export const bulkDeleteVideoHighlights = asyncHandler(async (req: Request, res: Response) => {
  const ids = parseIds(req.body);
  const result = await VideoHighlightModel.deleteMany({ _id: { $in: ids } });
  successResponse(res, { deletedCount: result.deletedCount ?? 0 }, 'Video highlights deleted');
});

/* ------------------------------- Testimonial videos ------------------------------- */

export const getTestimonialsCarousel = asyncHandler(async (req: Request, res: Response) => {
  const doc = await TestimonialsCarouselModel.findOne().lean();
  const videos = doc?.videos ?? [];
  const visible = (await isAdminRequest(req)) ? videos : videos.filter((v) => v.status === 'Published');
  successResponse(res, { _id: doc?._id ?? null, videos: visible }, 'Testimonials retrieved');
});

// The admin always sends the full list; it replaces the stored one
export const updateTestimonialsCarousel = asyncHandler(async (req: Request, res: Response) => {
  let videos: unknown = req.body?.videos;
  if (typeof videos === 'string') {
    try {
      videos = JSON.parse(videos);
    } catch {
      throw new AppError(400, '"videos" must be a JSON array');
    }
  }
  if (!Array.isArray(videos)) throw new AppError(400, 'Provide "videos" as an array');

  const cleaned = videos.map((v: Record<string, unknown>) => {
    const data = pick(v, TESTIMONIAL_VIDEO_FIELDS);
    if ('_id' in data && !isObjectIdString(data._id)) delete data._id;
    return data;
  });

  const doc = await TestimonialsCarouselModel.findOneAndUpdate(
    {},
    { $set: { videos: cleaned } },
    { new: true, upsert: true, runValidators: true }
  );
  successResponse(res, doc, 'Testimonials updated');
});
