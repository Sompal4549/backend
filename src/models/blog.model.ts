import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  author: string;
  isActive: boolean;
  isFeatured: boolean;
  isVoiceOfExperts: boolean;
  isPopular: boolean;
  viewCount: number;
  readBy: Types.ObjectId[];

  banner?: {
    title: string;
    highlight: string;
    date: string | Date;
    readingTime: string;
    category: string;
    backgroundImage: string;
    backgroundImageAlt: string;
  };

  blogImage?: {
    image: string;
    alt: string;
  };

  article?: {
    content: string;
  };

  aboutTheAuthor?: {
    title: string;
    name: string;
    description: string;
    socialLinks: {
      iconImage: string;
      title: string;
      link: string;
    }[];
  };

  onThisPage?: {
    title: string;
  };

  downloadMedia?: {
    title: string;
    image: string;
    description: string;
    link: string;
  };

  seo?: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    h1: string;
    canonical: string;
    ogJson: string;
    schema: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: { type: String, required: true },

    banner: {
      title: String,
      highlight: String,
      date: Date,
      readingTime: String,
      category: String,
      backgroundImage: String,
      backgroundImageAlt: String,
    },

    blogImage: {
      image: String,
      alt: String,
    },

    article: {
      content: { type: String },
    },

    aboutTheAuthor: {
      title: String,
      name: String,
      description: String,
      socialLinks: [{ iconImage: String, title: String, link: String }],
    },

    onThisPage: { title: String },

    downloadMedia: {
      title: String,
      image: String,
      description: String,
      link: String,
    },

    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      metaKeywords: { type: String, default: "" },
      h1: { type: String, default: "" },
      canonical: { type: String, default: "" },
      ogJson: { type: String, default: "" },
      schema: { type: String, default: "" },
    },

    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isVoiceOfExperts: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },

    viewCount: { type: Number, default: 0 },

    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const BlogModel = mongoose.model<IBlog>('Blog', BlogSchema);