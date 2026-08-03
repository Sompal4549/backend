import { Request, Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ComponentContentModel } from '../models/component-content.model';
import {
  deleteComponentContent,
  deleteHomeComponentContent,
  getComponentContentByKey,
  getHomeComponentContentByKey,
  listHomeComponentContent,
  listComponentContent,
  saveHomeComponentContent,
  updateComponentContent,
  updateHomeComponentContent,
  upsertComponentContent,
} from '../services/component-content.service';

export const getComponentContents = asyncHandler(async (req: Request, res: Response) => {
  const contents = await listComponentContent(req.query);
  successResponse(res, contents, 'Component contents retrieved');
});

export const getComponentsByPage = asyncHandler(async (req: Request, res: Response) => {
  const { page } = req.params;
  const { includeInactive } = req.query;

  const filter: any = { page };
  if (includeInactive !== 'true') {
    filter.isActive = true;
  }

  const contents = await ComponentContentModel.find(filter).sort({ index: 1 }).lean();
  successResponse(res, contents, `Components for page: ${page} retrieved`);
});

export const getComponentContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await getComponentContentByKey(req.params.key);
  successResponse(res, content, 'Component content retrieved');
});

export const saveComponentContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await upsertComponentContent(req.body);
  successResponse(res, content, 'Component content saved', 201);
});

export const editComponentContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await updateComponentContent(req.params.id, req.body);
  successResponse(res, content, 'Component content updated');
});

export const removeComponentContent = asyncHandler(async (req: Request, res: Response) => {
  await deleteComponentContent(req.params.id);
  successResponse(res, null, 'Component content deleted');
});

export const getHomeComponentContents = asyncHandler(async (req: Request, res: Response) => {
  const contents = await listHomeComponentContent(req.query);
  successResponse(res, contents, 'Home component contents retrieved');
});

export const getHomeComponentContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await getHomeComponentContentByKey(req.params.key);
  successResponse(res, content, 'Home component content retrieved');
});

export const saveHomeComponent = asyncHandler(async (req: Request, res: Response) => {
  const content = await saveHomeComponentContent(req.body);
  successResponse(res, content, 'Home component content saved', 201);
});

export const editHomeComponent = asyncHandler(async (req: Request, res: Response) => {
  const content = await updateHomeComponentContent(req.params.id, req.body);
  successResponse(res, content, 'Home component content updated');
});

export const removeHomeComponent = asyncHandler(async (req: Request, res: Response) => {
  await deleteHomeComponentContent(req.params.id);
  successResponse(res, null, 'Home component content deleted');
});
