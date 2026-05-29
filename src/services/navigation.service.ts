import { INavigation, NavigationModel } from '../models/navigation.model.js';

const navigationKey = 'main';

const defaultNavigation = {
  navLinks: [],
  socialLinks: [],
};

export const getNavigation = async () => {
  const navigation = await NavigationModel.findOne({ key: navigationKey });
  return navigation ?? defaultNavigation;
};

export const updateNavigation = async (payload: Pick<INavigation, 'navLinks' | 'socialLinks'>) => {
  return NavigationModel.findOneAndUpdate(
    { key: navigationKey },
    { $set: { ...payload, key: navigationKey } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};
