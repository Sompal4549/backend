import { ComponentContentModel, IComponentContent } from '../models/component-content.model.js';

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
