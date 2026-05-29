import { Schema, model, Document } from 'mongoose';

export interface IFooterLink {
  label: string;
  href: string;
}

export interface IFooterContact {
  address: string;
  phone: string;
  email: string;
  whatsappUrl?: string;
}

export interface IFooter extends Document {
  key: string;
  companyDescription: string;
  quickLinks: IFooterLink[];
  productCategories: IFooterLink[];
  solutionLinks: IFooterLink[];
  contact: IFooterContact;
  socialLinks: IFooterLink[];
  legalLinks: IFooterLink[];
  copyrightText: string;
}

const footerLinkSchema = new Schema<IFooterLink>(
  {
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const footerContactSchema = new Schema<IFooterContact>(
  {
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    whatsappUrl: { type: String, trim: true },
  },
  { _id: false }
);

const footerSchema = new Schema<IFooter>(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    companyDescription: { type: String, default: '' },
    quickLinks: { type: [footerLinkSchema], default: [] },
    productCategories: { type: [footerLinkSchema], default: [] },
    solutionLinks: { type: [footerLinkSchema], default: [] },
    contact: { type: footerContactSchema, default: () => ({}) },
    socialLinks: { type: [footerLinkSchema], default: [] },
    legalLinks: { type: [footerLinkSchema], default: [] },
    copyrightText: { type: String, default: '' },
  },
  { timestamps: true }
);

export const FooterModel = model<IFooter>('Footer', footerSchema);
