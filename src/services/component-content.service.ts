import { AppError } from '../utils/app-error';
import { ComponentContentModel, IComponentContent } from '../models/component-content.model';

const HOME_COMPONENT_KEYS = [
  'home.hero',
  'home.wellnessSection',
] as const;

const ensureHomeComponentPayload = (payload: Partial<IComponentContent>) => {
  if (payload.page && payload.page !== 'home') {
    throw new AppError(400, 'Home component content must use page "home"');
  }

  if (payload.key && !HOME_COMPONENT_KEYS.includes(payload.key as (typeof HOME_COMPONENT_KEYS)[number])) {
    throw new AppError(400, 'Unsupported home component key');
  }
};

export const listComponentContent = async (query: { page?: string; includeInactive?: string | boolean }) => {
  const filter: Record<string, unknown> = {};
  if (query.page) filter.page = query.page;
  if (!query.includeInactive) filter.isActive = true;
  return ComponentContentModel.find(filter).sort({ page: 1, index: 1, label: 1 });
};

export const getComponentContentByKey = async (key: string) => {
  const content = await ComponentContentModel.findOne({ key });
  if (!content) {
    throw new AppError(404, 'Component content not found');
  }
  return content;
};

export const upsertComponentContent = async (payload: Partial<IComponentContent>) => {
  return ComponentContentModel.findOneAndUpdate(
    { key: payload.key },
    { $set: payload },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

export const updateComponentContent = async (id: string, payload: Partial<IComponentContent>) => {
  const content = await ComponentContentModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!content) {
    throw new AppError(404, 'Component content not found');
  }
  return content;
};

export const deleteComponentContent = async (id: string) => {
  const content = await ComponentContentModel.findByIdAndDelete(id);
  if (!content) {
    throw new AppError(404, 'Component content not found');
  }
  return content;
};

export const listHomeComponentContent = async (query: { includeInactive?: string | boolean }) => {
  const filter: Record<string, unknown> = {
    page: 'home',
    key: { $in: HOME_COMPONENT_KEYS },
  };
  if (!query.includeInactive) filter.isActive = true;
  return ComponentContentModel.find(filter).sort({ index: 1, label: 1 });
};

export const getHomeComponentContentByKey = async (key: string) => {
  if (!HOME_COMPONENT_KEYS.includes(key as (typeof HOME_COMPONENT_KEYS)[number])) {
    throw new AppError(400, 'Unsupported home component key');
  }

  const content = await ComponentContentModel.findOne({ key, page: 'home' });
  if (!content) {
    throw new AppError(404, 'Home component content not found');
  }
  return content;
};

export const saveHomeComponentContent = async (payload: Partial<IComponentContent>) => {
  ensureHomeComponentPayload(payload);
  return ComponentContentModel.findOneAndUpdate(
    { key: payload.key, page: 'home' },
    { $set: { ...payload, page: 'home' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

export const updateHomeComponentContent = async (id: string, payload: Partial<IComponentContent>) => {
  ensureHomeComponentPayload(payload);
  const content = await ComponentContentModel.findOneAndUpdate(
    { _id: id, page: 'home', key: { $in: HOME_COMPONENT_KEYS } },
    { $set: { ...payload, page: 'home' } },
    { new: true, runValidators: true }
  );
  if (!content) {
    throw new AppError(404, 'Home component content not found');
  }
  return content;
};

export const deleteHomeComponentContent = async (id: string) => {
  const content = await ComponentContentModel.findOneAndDelete({
    _id: id,
    page: 'home',
    key: { $in: HOME_COMPONENT_KEYS },
  });
  if (!content) {
    throw new AppError(404, 'Home component content not found');
  }
  return content;
};
