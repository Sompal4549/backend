import { FooterModel, IFooter } from '../models/footer.model.js';

const footerKey = 'main';

const defaultFooter = {
  companyDescription: '',
  quickLinks: [],
  productCategories: [],
  solutionLinks: [],
  contact: {
    address: '',
    phone: '',
    email: '',
  },
  socialLinks: [],
  legalLinks: [],
  copyrightText: '',
};

export const getFooter = async () => {
  const footer = await FooterModel.findOne({ key: footerKey });
  return footer ?? defaultFooter;
};

export const updateFooter = async (
  payload: Pick<
    IFooter,
    | 'companyDescription'
    | 'quickLinks'
    | 'productCategories'
    | 'solutionLinks'
    | 'contact'
    | 'socialLinks'
    | 'legalLinks'
    | 'copyrightText'
  >
) => {
  return FooterModel.findOneAndUpdate(
    { key: footerKey },
    { $set: { ...payload, key: footerKey } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};
