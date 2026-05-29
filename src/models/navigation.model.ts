import { Schema, model, Document } from 'mongoose';

export interface INavigationChildLink {
  label: string;
  href: string;
  order?: number;
}

export interface INavigationLink {
  label: string;
  href: string;
  order: number;
  hasDropdown?: boolean;
  children?: INavigationChildLink[];
}

export interface INavigationSocialLink {
  label: string;
  href: string;
  icon?: string;
}

export interface INavigation extends Document {
  key: string;
  navLinks: INavigationLink[];
  socialLinks: INavigationSocialLink[];
}

const childLinkSchema = new Schema<INavigationChildLink>(
  {
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
    order: { type: Number },
  },
  { _id: false }
);

const navLinkSchema = new Schema<INavigationLink>(
  {
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    hasDropdown: { type: Boolean, default: false },
    children: { type: [childLinkSchema], default: [] },
  },
  { _id: false }
);

const navigationSocialLinkSchema = new Schema<INavigationSocialLink>(
  {
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
    icon: { type: String, trim: true },
  },
  { _id: false }
);

const navigationSchema = new Schema<INavigation>(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    navLinks: { type: [navLinkSchema], default: [] },
    socialLinks: { type: [navigationSocialLinkSchema], default: [] },
  },
  { timestamps: true }
);

export const NavigationModel = model<INavigation>('Navigation', navigationSchema);
