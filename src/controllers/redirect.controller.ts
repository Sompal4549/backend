import { Request, Response } from 'express';
import { RedirectModel } from '../models/redirect.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { AuthRequest } from '../middlewares/auth.middleware';

const editorName = (req: AuthRequest) => (req.user as { name?: string } | undefined)?.name || '';

/** "/old-page/" -> "/old-page"; keeps "/" as is */
const stripTrailingSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') || '/' : path);

const normalizeSource = (value: unknown): string => {
  const source = typeof value === 'string' ? value.trim() : '';
  if (!source) throw new AppError(400, 'Source URL is required.');
  if (!source.startsWith('/') || source.startsWith('//')) {
    throw new AppError(400, 'Source URL must be a website path starting with "/" (e.g. /old-page).');
  }
  if (/[\s?#]/.test(source)) {
    throw new AppError(400, 'Source URL must be a plain path without spaces, "?" or "#".');
  }
  const normalized = stripTrailingSlash(source);
  if (normalized === '/') throw new AppError(400, 'The home page "/" cannot be redirected.');
  return normalized;
};

const normalizeDestination = (value: unknown): string => {
  const destination = typeof value === 'string' ? value.trim() : '';
  if (!destination) throw new AppError(400, 'Destination URL is required.');
  if (/\s/.test(destination)) throw new AppError(400, 'Destination URL must not contain spaces.');
  if (destination.startsWith('/') && !destination.startsWith('//')) return stripTrailingSlash(destination);
  try {
    const url = new URL(destination);
    if (url.protocol === 'http:' || url.protocol === 'https:') return destination;
  } catch {
    // falls through to the error below
  }
  throw new AppError(400, 'Destination URL must be a path starting with "/" or a full http(s):// URL.');
};

/** Path part of a site-relative destination, without query/hash, for loop checks */
const destinationPath = (destination: string) => stripTrailingSlash(destination.split(/[?#]/)[0]);

const assertNoLoop = async (source: string, destination: string, excludeId?: string) => {
  if (!destination.startsWith('/')) return;
  const target = destinationPath(destination);
  if (target === source) throw new AppError(400, 'A redirect cannot point to its own source URL.');

  // A -> B while B -> A already exists would bounce forever
  const reverse = await RedirectModel.findOne({
    source: target,
    isActive: true,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();
  if (reverse && reverse.destination.startsWith('/') && destinationPath(reverse.destination) === source) {
    throw new AppError(
      400,
      `This would create a redirect loop with the existing redirect ${reverse.source} -> ${reverse.destination}.`
    );
  }
};

const assertUniqueSource = async (source: string, excludeId?: string) => {
  const existing = await RedirectModel.findOne({ source, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).lean();
  if (existing) throw new AppError(409, `A redirect for ${source} already exists.`);
};

const isDuplicateKey = (err: unknown) => (err as { code?: number } | null)?.code === 11000;

// Website: active redirects only (source, destination, permanent), cacheable for 5 minutes
export const getPublicRedirects = asyncHandler(async (_req: Request, res: Response) => {
  const redirects = await RedirectModel.find({ isActive: true })
    .select('source destination permanent -_id')
    .sort({ source: 1 })
    .lean();
  res.set('Cache-Control', 'public, max-age=300');
  successResponse(res, redirects, 'Redirects retrieved');
});

export const getAllRedirectsAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const redirects = await RedirectModel.find().sort({ createdAt: -1 });
  successResponse(res, redirects, 'Redirects retrieved');
});

export const createRedirect = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body || {};
  const source = normalizeSource(body.source);
  const destination = normalizeDestination(body.destination);
  await assertUniqueSource(source);
  await assertNoLoop(source, destination);

  try {
    const redirect = await RedirectModel.create({
      source,
      destination,
      permanent: body.permanent === undefined ? true : Boolean(body.permanent),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      updatedBy: editorName(req),
    });
    successResponse(res, redirect, 'Redirect created', 201);
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError(409, `A redirect for ${source} already exists.`);
    throw err;
  }
});

export const updateRedirect = asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await RedirectModel.findById(req.params.id);
  if (!existing) throw new AppError(404, 'Redirect not found');

  const body = req.body || {};
  const source = 'source' in body ? normalizeSource(body.source) : existing.source;
  const destination = 'destination' in body ? normalizeDestination(body.destination) : existing.destination;
  if (source !== existing.source) await assertUniqueSource(source, existing.id);
  await assertNoLoop(source, destination, existing.id);

  existing.source = source;
  existing.destination = destination;
  if ('permanent' in body) existing.permanent = Boolean(body.permanent);
  if ('isActive' in body) existing.isActive = Boolean(body.isActive);
  existing.updatedBy = editorName(req);

  try {
    await existing.save();
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError(409, `A redirect for ${source} already exists.`);
    throw err;
  }
  successResponse(res, existing, 'Redirect updated');
});

export const deleteRedirect = asyncHandler(async (req: Request, res: Response) => {
  const redirect = await RedirectModel.findByIdAndDelete(req.params.id);
  if (!redirect) throw new AppError(404, 'Redirect not found');
  successResponse(res, null, 'Redirect deleted');
});
