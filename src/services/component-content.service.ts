import { ComponentContentModel, IComponentContent } from '../models/component-content.model.ts';

const HOME_COMPONENT_KEYS = [
  'home.hero',
  'home.wellnessSection',
] as const;

const ensureHomeComponentPayload = (payload: Partial<IComponentContent>) => {
  if (payload.page && payload.page !== 'home') {
    const error = new Error('Home component content must use page "home"');
    (error as any).statusCode = 400;
    throw error;
  }

  if (payload.key && !HOME_COMPONENT_KEYS.includes(payload.key as (typeof HOME_COMPONENT_KEYS)[number])) {
    const error = new Error('Unsupported home component key');
    (error as any).statusCode = 400;
    throw error;
  }
};

export const listComponentContent = async (query: { page?: string; includeInactive?: string | boolean }) => {
  const filter: Record<string, unknown> = {};
  if (query.page) filter.page = query.page;
  if (!query.includeInactive) filter.isActive = true;
  return ComponentContentModel.find(filter).sort({ page: 1, label: 1 });
};

export const getComponentContentByKey = async (key: string) => {
  const content = await ComponentContentModel.findOne({ key, isActive: true });
  if (!content) {
    const error = new Error('Component content not found');
    (error as any).statusCode = 404;
    throw error;
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
    const error = new Error('Component content not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return content;
};

export const deleteComponentContent = async (id: string) => {
  const content = await ComponentContentModel.findByIdAndDelete(id);
  if (!content) {
    const error = new Error('Component content not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return content;
};

export const listHomeComponentContent = async (query: { includeInactive?: string | boolean }) => {
  const filter: Record<string, unknown> = {
    page: 'home',
    key: { $in: HOME_COMPONENT_KEYS },
  };
  if (!query.includeInactive) filter.isActive = true;
  return ComponentContentModel.find(filter).sort({ label: 1 });
};

export const getHomeComponentContentByKey = async (key: string) => {
  if (!HOME_COMPONENT_KEYS.includes(key as (typeof HOME_COMPONENT_KEYS)[number])) {
    const error = new Error('Unsupported home component key');
    (error as any).statusCode = 400;
    throw error;
  }

  const content = await ComponentContentModel.findOne({ key, page: 'home', isActive: true });
  if (!content) {
    const error = new Error('Home component content not found');
    (error as any).statusCode = 404;
    throw error;
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
    const error = new Error('Home component content not found');
    (error as any).statusCode = 404;
    throw error;
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
    const error = new Error('Home component content not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return content;
};
